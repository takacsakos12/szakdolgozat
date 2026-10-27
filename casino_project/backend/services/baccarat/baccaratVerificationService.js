const { isDeepStrictEqual } = require("node:util");
const GameHistory = require("../../models/GameHistory");
const {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
} = require("../../config/baccaratConfig");

const { playBaccaratGame } = require("./baccaratEngine");

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

async function verifyBaccaratGameResult({ userId, historyId }) {
  const history = await GameHistory.findOne({
    _id: historyId,
    userId,
    gameType: GAME_TYPE,
  }).lean();

  if (!history) {
    throw createServiceError("A játékelőzmény nem található.", 404);
  }

  if (history.gameMode !== GAME_MODE) {
    throw createServiceError(
      "A játékmód nem egyezik a játékelőzményben szereplővel.",
      400,
    );
  }

  const fairData = history.provablyFair;

  if (!fairData) {
    throw createServiceError(
      "A játékelőzmény nem tartalmaz provably fair adatokat.",
      400,
    );
  }

  if (fairData.algorithmVersion !== ALGORITHM_VERSION) {
    throw createServiceError(
      "A játékelőzményben szereplő algoritmus verzió nem egyezik a jelenlegi verzióval.",
      400,
    );
  }

  if (!Number.isSafeInteger(fairData.nonce) || fairData.nonce < 0) {
    throw createServiceError(
      "A játékelőzményben szereplő nonce érvénytelen.",
      400,
    );
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
    revealedSeed.serverSeedHash === fairData.serverSeedHash &&
    revealedSeed.clientSeed === fairData.clientSeed &&
    revealedSeed.algorithmVersion === fairData.algorithmVersion &&
    fairData.nonce < revealedSeed.finalNoncenonce &&
    fairData.gameDomain === GAME_DOMAIN;

  const { preparedBets, requestBets, totalBetAmount } = prepareBaccaratBets(
    history.result?.bets,
  );

  const recreatedFingerprint = createFingerprint({
    gameType: GAME_TYPE,
    gameMode: GAME_MODE,
    baseBet: totalBetAmount,
    requestData: { bets: requestBets },
  });

  const fingerprintMatches =
    history.fingerprintVersion === FINGERPRINT_VERSION &&
    history.requestFingerprint === recreatedFingerprint;

  const randomGenerator = createRandomGenerator({
    serverSeed: revealedSeed.serverSeed,
    clientSeed: revealedSeed.clientSeed,
    nonce: fairData.nonce,
    gameDomain: GAME_DOMAIN,
  });

  const recreatedResult = playBaccaratGame({
    preparedBets,
    totalBetAmount,
    randomInt: (range) => randomGenerator.randomInt(range),
  });

  const settlementMatches =
    amountsMatch(history.baseBet, recreatedResult.cost) &&
    amountsMatch(history.cost, recreatedResult.cost) &&
    amountsMatch(history.winAmount, recreatedResult.totalWin) &&
    amountsMatch(history.netResult, recreatedResult.netResult) &&
    amountsMatch(
      history.balanceAfter,
      history.balanceBefore + history.netResult,
    );

  return {
    verified:
      seedHashMatches &&
      seedDetailsMatch &&
      fingerprintMatches &&
      gameresultMatches &&
      settlementMatches,

    seedHashMatches,
    seedDetailsMatch,
    fingerprintMatches,
    gameresultMatches,
    settlementMatches,

    historyId: history._id,
    gameType: history.gameType,
    gameMode: history.gameMode,
    configVersion: history.configVersion,
    algorithmVersion: fairData.algorithmVersion,
  };
}

module.exports = { verifyBaccaratGameResult };
