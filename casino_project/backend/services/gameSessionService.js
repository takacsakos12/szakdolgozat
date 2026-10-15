const mongoose = require("mongoose");
const User = require("../models/User");
const GameHistory = require("../models/GameHistory");
const {
  getOrCreateActiveSeed,
  reserveNonce,
  createRandomGenerator,
} = require("./provablyFairService");

function createRequestError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeRequestId(requestId) {
  if (typeof requestId !== "string") {
    throw createRequestError("A kérés azonosítója hiányzik.");
  }

  const normalizedRequestId = requestId.trim();

  if (normalizedRequestId.length < 8 || normalizedRequestId.length > 100) {
    throw createRequestError(
      "A kérésazonosítója hossza 8 és 100 karakter között kell legyen.",
    );
  }

  return normalizedRequestId;
}

function verifyExistingRequest(
  existingHistory,
  { gameMode, baseBet, selectedSymbol = null },
) {
  const differentGame = existingHistory.gameMode !== gameMode;

  const differentBet = Number(existingHistory.baseBet) !== Number(baseBet);

  const differentFeatureSymbol =
    gameMode === "FEATURE_SPIN" &&
    selectedSymbol !== null &&
    existingHistory.result?.expandingSymbol !== selectedSymbol;

  if (differentGame || differentBet || differentFeatureSymbol) {
    throw createRequestError(
      "A kérésazonosítót már másik játékkéréshez használták.",
      409,
    );
  }
}

function toSettlement(history, replayed = false) {
  return {
    requestId: history.requestId,
    gameMode: history.gameMode,
    result: history.result,
    provablyFair: history.provablyFair,
    balanceBefore: history.balanceBefore,
    balanceAfter: history.balanceAfter,
    netResult: history.netResult,
    historyId: history._id,
    replayed,
  };
}

async function settleGameResult({
  userId,
  gameType,
  gameMode,
  configVersion,
  baseBet,
  requestId,
  gameDomain,
  createGameResult,
  selectedSymbol = null,
}) {
  if (!userId) {
    throw createRequestError("Az userId hiányzik.");
  }

  if (!Number.isFinite(baseBet) || baseBet <= 0) {
    throw createRequestError("Az alaptét érvénytelen.");
  }

  if (typeof createGameResult !== "function") {
    throw createRequestError(
      "A játékeredményt előállító függvény hiányzik.",
      500,
    );
  }

  if (typeof gameDomain !== "string" || !gameDomain.trim()) {
    throw createRequestError("A Provably Fair játékazonosító hiányzik.", 500);
  }

  const normalizedRequestId = normalizeRequestId(requestId);

  await getOrCreateActiveSeed({ userId });

  const session = await mongoose.startSession();

  try {
    let settlement;

    await session.withTransaction(async () => {
      const existingHistory = await GameHistory.findOne({
        userId,
        requestId: normalizedRequestId,
      }).session(session);

      if (existingHistory) {
        verifyExistingRequest(existingHistory, {
          gameMode,
          baseBet,
          selectedSymbol,
        });

        settlement = toSettlement(existingHistory, true);
        return;
      }

      const fairSeed = await reserveNonce({
        userId,
        session,
      });

      const randomGenerator = createRandomGenerator({
        serverSeed: fairSeed.serverSeed,
        clientSeed: fairSeed.clientSeed,
        nonce: fairSeed.nonce,
        gameDomain,
      });

      const gameData = createGameResult(() => randomGenerator.randomFloat());

      if (!gameData || typeof gameData !== "object") {
        throw createRequestError("A játékeredmény formátuma érvénytelen.", 500);
      }

      const { result, slotDetails } = gameData;
      const cost = result?.cost;
      const winAmount = result?.totalWin;

      if (!Number.isFinite(cost) || cost <= 0) {
        throw createRequestError("A költség érvénytelen.");
      }

      if (!Number.isFinite(winAmount) || winAmount < 0) {
        throw createRequestError("A nyeremény érvénytelen.");
      }

      const netResult = winAmount - cost;

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          balance: { $gte: cost },
        },
        {
          $inc: { balance: netResult },
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

      const balanceAfter = user.balance;
      const balanceBefore = balanceAfter - netResult;

      const [history] = await GameHistory.create(
        [
          {
            requestId: normalizedRequestId,
            userId,
            gameType,
            gameMode,
            configVersion,
            baseBet,
            cost,
            winAmount,
            netResult,
            result,
            slotDetails,
            provablyFair: {
              seedId: fairSeed.seedId,
              serverSeedHash: fairSeed.serverSeedHash,
              clientSeed: fairSeed.clientSeed,
              nonce: fairSeed.nonce,
              gameDomain,
              algorithmVersion: fairSeed.algorithmVersion,
            },
            balanceBefore,
            balanceAfter,
          },
        ],
        { session },
      );

      settlement = toSettlement(history, false);
    });

    return settlement;
  } catch (error) {
    if (error?.code === 11000) {
      const existingHistory = await GameHistory.findOne({
        userId,
        requestId: normalizedRequestId,
      });

      if (existingHistory) {
        verifyExistingRequest(existingHistory, {
          gameMode,
          baseBet,
          selectedSymbol,
        });

        return toSettlement(existingHistory, true);
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { settleGameResult };
