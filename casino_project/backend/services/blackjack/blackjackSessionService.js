const mongoose = require("mongoose");

const User = require("../../models/User");
const GameHistory = require("../../models/GameHistory");
const BlackjackSession = require("../../models/BlackjackSession");

const {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
  RULES,
} = require("../../config/blackjackConfig");

const {
  startBlackjackRound,
  applyBlackjackAction,
  calculateHandValue,
  getAvailableActions,
} = require("./blackjackEngine");

const {
  getOrCreateActiveSeed,
  reserveNonce,
  createRandomGenerator,
} = require("../provablyFairService");

const {
  FINGERPRINT_VERSION,
  createFingerprint,
  verifyRequestFingerprint,
} = require("../fingerprintService");

function createRequestError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeRequestId(requestId) {
  if (
    typeof requestId !== "string" ||
    requestId.trim().length < 8 ||
    requestId.trim().length > 100
  ) {
    throw createRequestError(
      "A kérésazonosító hossza 8 és 100 karakter között legyen.",
    );
  }

  return requestId.trim();
}

function verifyStartRequest(game, fingerprint) {
  if (game.fingerprintVersion !== FINGERPRINT_VERSION) {
    throw createRequestError(
      "A kérés fingerprint-verziója nem támogatott.",
      409,
    );
  }

  verifyRequestFingerprint(game.requestFingerprint, fingerprint);
}

// A paklit és az aktív kör rejtett osztólapját nem küldjük el.
function toPublicSession(game, balance, replayed = false) {
  const round = game.round;
  const finished = round.phase === "FINISHED";

  const availableActions = getAvailableActions(round).filter((action) => {
    if (action === "DOUBLE_DOWN" || action === "SPLIT") {
      return balance >= round.hands[round.activeHandIndex].bet;
    }

    if (action === "INSURANCE") {
      const insuranceAmount =
        game.initialBets.baseBet * RULES.maxInsuranceBetRatio;

      return balance >= insuranceAmount;
    }

    return true;
  });

  return {
    sessionId: game._id,
    version: game.__v,
    status: game.status,
    phase: round.phase,
    activeHandIndex: round.activeHandIndex,

    hands: round.hands.map((hand) => ({
      cards: hand.cards.map(({ rank, suit }) => ({ rank, suit })),
      bet: hand.bet,
      fromSplit: hand.fromSplit,
      status: hand.status,
      ...calculateHandValue(hand.cards),
    })),

    dealerHand: round.dealerHand.map((card, index) =>
      finished || index === 0
        ? { rank: card.rank, suit: card.suit }
        : { hidden: true },
    ),

    cost: round.cost,
    insuranceBet: round.insuranceBet,
    sideBets: round.sideBets,
    availableActions,

    result: finished ? round.result : null,
    provablyFair: game.provablyFair,
    historyId: game.historyId,
    balance,
    replayed,
  };
}

async function getSessionResponse(game, replayed = false, session = null) {
  const user = await User.findById(game.userId)
    .select("balance")
    .session(session)
    .lean();

  if (!user) {
    throw createRequestError("A felhasználó nem található.", 404);
  }

  return toPublicSession(game, user.balance, replayed);
}

// Csak az előzményt menti, az egyenleget nem módosítja.
async function saveFinishedHistory({ game, balanceAfter, session }) {
  if (game.round.phase !== "FINISHED" || game.historyId) {
    return;
  }

  const result = game.round.result;

  const [history] = await GameHistory.create(
    [
      {
        userId: game.userId,
        gameType: GAME_TYPE,
        gameMode: GAME_MODE,
        configVersion: game.configVersion,

        requestId: game.requestId,
        requestFingerprint: game.requestFingerprint,
        fingerprintVersion: game.fingerprintVersion,

        baseBet: game.initialBets.baseBet,
        cost: result.cost,
        winAmount: result.totalWin,
        netResult: result.netResult,
        result,

        provablyFair: game.provablyFair,
        balanceBefore: game.balanceBefore,
        balanceAfter,
      },
    ],
    { session },
  );

  game.status = "FINISHED";
  game.historyId = history._id;

  await game.save({ session });
}

async function getActiveBlackjackSession({ userId }) {
  const game = await BlackjackSession.findOne({
    userId,
    status: "ACTIVE",
  })
    .select("+round")
    .lean();

  return game ? getSessionResponse(game) : null;
}

async function startBlackjackSession({
  userId,
  requestId,
  baseBet,
  perfectPairsBet = 0,
  twentyOnePlusThreeBet = 0,
}) {
  const normalizedRequestId = normalizeRequestId(requestId);

  const initialBets = {
    baseBet,
    perfectPairsBet,
    twentyOnePlusThreeBet,
  };

  const requestFingerprint = createFingerprint({
    gameType: GAME_TYPE,
    gameMode: GAME_MODE,
    baseBet,
    requestData: {
      perfectPairsBet,
      twentyOnePlusThreeBet,
    },
  });

  await getOrCreateActiveSeed({ userId });

  try {
    return await mongoose.connection.transaction(async (session) => {
      const existingGame = await BlackjackSession.findOne({
        userId,
        requestId: normalizedRequestId,
      })
        .select("+round")
        .session(session)
        .lean();

      if (existingGame) {
        verifyStartRequest(existingGame, requestFingerprint);

        return getSessionResponse(existingGame, true, session);
      }

      const activeGame = await BlackjackSession.exists({
        userId,
        status: "ACTIVE",
      }).session(session);

      if (activeGame) {
        throw createRequestError(
          "Előbb fejezd be a folyamatban lévő blackjackkört.",
          409,
        );
      }

      const existingHistory = await GameHistory.exists({
        userId,
        requestId: normalizedRequestId,
      }).session(session);

      if (existingHistory) {
        throw createRequestError(
          "A kérésazonosítót már másik játékkéréshez használták.",
          409,
        );
      }

      const fairSeed = await reserveNonce({ userId, session });

      const generator = createRandomGenerator({
        serverSeed: fairSeed.serverSeed,
        clientSeed: fairSeed.clientSeed,
        nonce: fairSeed.nonce,
        gameDomain: GAME_DOMAIN,
      });

      const round = startBlackjackRound({
        ...initialBets,
        randomInt: (range) => generator.randomInt(range),
      });

      if (!Number.isSafeInteger(round.cost)) {
        throw createRequestError("A teljes tét összege érvénytelen.");
      }

      const finished = round.phase === "FINISHED";
      const winAmount = finished ? round.result.totalWin : 0;
      const balanceChange = winAmount - round.cost;

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          balance: { $gte: round.cost },
        },
        {
          $inc: { balance: balanceChange },
        },
        {
          returnDocument: "after",
          runValidators: true,
          session,
        },
      );

      if (!user) {
        throw createRequestError("Nincs elegendő egyenleg.");
      }

      const [game] = await BlackjackSession.create(
        [
          {
            userId,
            status: finished ? "FINISHED" : "ACTIVE",
            configVersion: CONFIG_VERSION,

            requestId: normalizedRequestId,
            requestFingerprint,
            fingerprintVersion: FINGERPRINT_VERSION,

            initialBets,
            balanceBefore: user.balance - balanceChange,
            round,

            provablyFair: {
              seedId: fairSeed.seedId,
              serverSeedHash: fairSeed.serverSeedHash,
              clientSeed: fairSeed.clientSeed,
              nonce: fairSeed.nonce,
              gameDomain: GAME_DOMAIN,
              algorithmVersion: fairSeed.algorithmVersion,
            },
          },
        ],
        { session },
      );

      await saveFinishedHistory({
        game,
        balanceAfter: user.balance,
        session,
      });

      return toPublicSession(game.toObject(), user.balance);
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const existingGame = await BlackjackSession.findOne({
      userId,
      requestId: normalizedRequestId,
    })
      .select("+round")
      .lean();

    if (!existingGame) {
      throw createRequestError(
        "A körindítás ütközött egy másik kéréssel. Töltsd vissza az aktuális játékot.",
        409,
      );
    }

    verifyStartRequest(existingGame, requestFingerprint);

    return getSessionResponse(existingGame, true);
  }
}

async function performBlackjackAction({
  userId,
  sessionId,
  requestId,
  expectedVersion,
  action,
  insuranceAmount = null,
}) {
  const normalizedRequestId = normalizeRequestId(requestId);

  if (typeof sessionId !== "string" || !mongoose.isValidObjectId(sessionId)) {
    throw createRequestError("A blackjackkör azonosítója érvénytelen.");
  }

  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw createRequestError("A játékállapot verziója érvénytelen.");
  }

  const requestFingerprint = createFingerprint({
    gameType: GAME_TYPE,
    gameMode: GAME_MODE,
    sessionId,
    expectedVersion,
    action,
    insuranceAmount,
  });

  try {
    return await mongoose.connection.transaction(async (session) => {
      const game = await BlackjackSession.findOne({
        _id: sessionId,
        userId,
      })
        .select("+round")
        .session(session);

      if (!game) {
        throw createRequestError("A blackjackkör nem található.", 404);
      }

      if (
        game.configVersion !== CONFIG_VERSION ||
        game.fingerprintVersion !== FINGERPRINT_VERSION
      ) {
        throw createRequestError(
          "A kör konfigurációs vagy fingerprint-verziója nem támogatott.",
          409,
        );
      }

      if (normalizedRequestId === game.requestId) {
        throw createRequestError(
          "A művelethez a körindítástól eltérő kérésazonosító szükséges.",
          409,
        );
      }

      const existingAction = game.actions.find(
        (entry) => entry.requestId === normalizedRequestId,
      );

      if (existingAction) {
        verifyRequestFingerprint(
          existingAction.requestFingerprint,
          requestFingerprint,
        );

        return getSessionResponse(game.toObject(), true, session);
      }

      if (game.status !== "ACTIVE") {
        throw createRequestError("Ez a kör már lezárult.", 409);
      }

      if (game.__v !== expectedVersion) {
        throw createRequestError(
          "A játékállapot megváltozott. Töltsd vissza az aktuális kört.",
          409,
        );
      }

      if (!Number.isFinite(game.balanceBefore)) {
        throw createRequestError("A kör kezdőegyenlege nincs eltárolva.", 409);
      }

      const nextRound = applyBlackjackAction(
        game.round,
        action,
        insuranceAmount ?? undefined,
      );

      const additionalCost = nextRound.cost - game.round.cost;
      const finished = nextRound.phase === "FINISHED";

      // A teljes nyeremény csak a kör lezárásakor jár.
      const winAmount = finished ? nextRound.result.totalWin : 0;

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          balance: { $gte: additionalCost },
        },
        {
          $inc: {
            balance: winAmount - additionalCost,
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          session,
        },
      );

      if (!user) {
        throw createRequestError("Nincs elegendő egyenleg a művelethez.");
      }

      game.round = nextRound;

      game.actions.push({
        requestId: normalizedRequestId,
        requestFingerprint,
        action,
        insuranceAmount,
      });

      if (finished) {
        await saveFinishedHistory({
          game,
          balanceAfter: user.balance,
          session,
        });
      } else {
        await game.save({ session });
      }

      return toPublicSession(game.toObject(), user.balance);
    });
  } catch (error) {
    if (error.name === "VersionError") {
      throw createRequestError(
        "A játékállapot közben megváltozott. Töltsd vissza az aktuális kört.",
        409,
      );
    }

    throw error;
  }
}

module.exports = {
  startBlackjackSession,
  getActiveBlackjackSession,
  performBlackjackAction,
};
