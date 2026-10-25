const { isDeepStrictEqual } = require("node:util");

const GameHistory = require("../../models/GameHistory");
const BlackjackSession = require("../../models/BlackjackSession");

const {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
} = require("../../config/blackjackConfig");

const {
  startBlackjackRound,
  applyBlackjackAction,
} = require("./blackjackEngine");

const {
  FINGERPRINT_VERSION,
  createFingerprint,
} = require("../fingerprintService");

const {
  ALGORITHM_VERSION,
  createRandomGenerator,
  getRevealedSeed,
  verifyServerSeed,
} = require("../provablyFairService");

function createServiceError(message, statusCode = 409) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function objectsMatch(first, second) {
  return isDeepStrictEqual(
    JSON.parse(JSON.stringify(first)),
    JSON.parse(JSON.stringify(second)),
  );
}

async function verifyBlackjackGameResult({ userId, historyId }) {
  const history = await GameHistory.findOne({
    _id: historyId,
    userId,
    gameType: GAME_TYPE,
  }).lean();

  if (!history) {
    throw createServiceError("A játékelőzmény nem található.", 404);
  }

  const game = await BlackjackSession.findOne({
    userId,
    historyId: history._id,
  })
    .select("+round")
    .lean();

  if (!game || game.status !== "FINISHED") {
    throw createServiceError("Nem található lezárt blackjack-session.");
  }

  if (
    history.gameMode !== GAME_MODE ||
    history.configVersion !== CONFIG_VERSION ||
    game.configVersion !== CONFIG_VERSION
  ) {
    throw createServiceError(
      "A játék módja vagy konfigurációs verziója nem támogatott.",
    );
  }

  const fairData = history.provablyFair;

  if (!fairData || !game.provablyFair) {
    throw createServiceError("A Provably Fair adatok hiányoznak.");
  }

  if (fairData.algorithmVersion !== ALGORITHM_VERSION) {
    throw createServiceError(
      "A Provably Fair algoritmus verziója nem támogatott.",
    );
  }

  if (!Number.isSafeInteger(fairData.nonce) || fairData.nonce < 0) {
    throw createServiceError("A mentett nonce érvénytelen.");
  }

  const revealedSeed = await getRevealedSeed({
    userId,
    seedId: fairData.seedId,
  });

  const seedHashMatches = verifyServerSeed({
    serverSeed: revealedSeed.serverSeed,
    serverSeedHash: fairData.serverSeedHash,
  });

  const seedDetailsMatch =
    objectsMatch(game.provablyFair, fairData) &&
    revealedSeed.serverSeedHash === fairData.serverSeedHash &&
    revealedSeed.clientSeed === fairData.clientSeed &&
    revealedSeed.algorithmVersion === fairData.algorithmVersion &&
    fairData.nonce < revealedSeed.finalNonce &&
    fairData.gameDomain === GAME_DOMAIN;

  const { baseBet, perfectPairsBet, twentyOnePlusThreeBet } = game.initialBets;

  const fingerprint = createFingerprint({
    gameType: GAME_TYPE,
    gameMode: GAME_MODE,
    baseBet,
    requestData: {
      perfectPairsBet,
      twentyOnePlusThreeBet,
    },
  });

  const fingerprintMatches =
    game.fingerprintVersion === FINGERPRINT_VERSION &&
    history.fingerprintVersion === FINGERPRINT_VERSION &&
    game.requestFingerprint === fingerprint &&
    history.requestFingerprint === fingerprint &&
    game.requestId === history.requestId;

  const generator = createRandomGenerator({
    serverSeed: revealedSeed.serverSeed,
    clientSeed: fairData.clientSeed,
    nonce: fairData.nonce,
    gameDomain: GAME_DOMAIN,
  });

  let recreatedRound;

  try {
    recreatedRound = startBlackjackRound({
      baseBet,
      perfectPairsBet,
      twentyOnePlusThreeBet,
      randomInt: (range) => generator.randomInt(range),
    });

    const requestIds = new Set([game.requestId]);

    for (const entry of game.actions) {
      if (requestIds.has(entry.requestId)) {
        throw createServiceError(
          "Ismétlődő kérésazonosító szerepel a műveletek között.",
        );
      }

      requestIds.add(entry.requestId);

      recreatedRound = applyBlackjackAction(
        recreatedRound,
        entry.action,
        entry.insuranceAmount ?? undefined,
      );
    }
  } catch (error) {
    if (error.statusCode === 400) {
      throw createServiceError(
        "A mentett tétek vagy műveletek nem játszhatók újra.",
      );
    }

    throw error;
  }

  if (recreatedRound.phase !== "FINISHED") {
    throw createServiceError("A mentett döntések nem zárják le a kört.");
  }

  const recreatedResult = recreatedRound.result;

  const roundStateMatches = objectsMatch(recreatedRound, game.round);

  const gameResultMatches = objectsMatch(recreatedResult, history.result);

  const settlementMatches =
    history.baseBet === baseBet &&
    history.cost === recreatedResult.cost &&
    history.winAmount === recreatedResult.totalWin &&
    history.netResult === recreatedResult.netResult &&
    history.balanceBefore + history.netResult === history.balanceAfter;

  return {
    verified:
      seedHashMatches &&
      seedDetailsMatch &&
      fingerprintMatches &&
      roundStateMatches &&
      gameResultMatches &&
      settlementMatches,

    seedHashMatches,
    seedDetailsMatch,
    fingerprintMatches,
    roundStateMatches,
    gameResultMatches,
    settlementMatches,

    historyId: history._id,
    sessionId: game._id,
    gameType: history.gameType,
    gameMode: history.gameMode,
    configVersion: history.configVersion,
    algorithmVersion: fairData.algorithmVersion,
  };
}

module.exports = {
  verifyBlackjackGameResult,
};
