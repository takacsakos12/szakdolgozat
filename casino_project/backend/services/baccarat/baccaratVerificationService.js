const { isDeepStrictEqual } = require("node:util");
const GameHistory = require("../../models/GameHistory");
const {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
} = require("../../config/baccaratConfig");

const { prepareBaccaratBets, playBaccaratGame } = require("./baccaratEngine");

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

function amountsMatch(first, second) {
  return (
    Number.isFinite(first) &&
    Number.isFinite(second) &&
    Math.abs(first - second) < 0.000001
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
    );
  }

  if (history.configVersion !== CONFIG_VERSION) {
    throw createServiceError("A játék konfigurációs verziója nem egyezik.");
  }

  const fairData = history.provablyFair;

  if (!fairData) {
    throw createServiceError(
      "A játékelőzmény nem tartalmaz provably fair adatokat.",
    );
  }

  if (fairData.algorithmVersion !== ALGORITHM_VERSION) {
    throw createServiceError(
      "A játékelőzményben szereplő algoritmus verzió nem egyezik a jelenlegi verzióval.",
    );
  }

  if (!Number.isSafeInteger(fairData.nonce) || fairData.nonce < 0) {
    throw createServiceError("A játékelőzményben szereplő nonce érvénytelen.");
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
    Number.isSafeInteger(revealedSeed.finalNonce) &&
    fairData.nonce < revealedSeed.finalNonce &&
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
    typeof history.requestFingerprint === "string" &&
    history.requestFingerprint === recreatedFingerprint;

  const randomGenerator = createRandomGenerator({
    serverSeed: revealedSeed.serverSeed,
    clientSeed: fairData.clientSeed,
    nonce: fairData.nonce,
    gameDomain: GAME_DOMAIN,
  });

  const recreatedResult = playBaccaratGame({
    preparedBets,
    totalBetAmount,
    randomInt: (range) => randomGenerator.randomInt(range),
  });

  const gameResultMatches = objectsMatch(recreatedResult, history.result);

  const settlementMatches =
    amountsMatch(history.baseBet, recreatedResult.cost) &&
    amountsMatch(history.cost, recreatedResult.cost) &&
    amountsMatch(history.winAmount, recreatedResult.totalWin) &&
    amountsMatch(history.netResult, recreatedResult.netResult) &&
    amountsMatch(
      history.balanceAfter,
      history.balanceBefore + recreatedResult.netResult,
    );

  return {
    verified:
      seedHashMatches &&
      seedDetailsMatch &&
      fingerprintMatches &&
      gameResultMatches &&
      settlementMatches,

    seedHashMatches,
    seedDetailsMatch,
    fingerprintMatches,
    gameResultMatches,
    settlementMatches,

    historyId: history._id,
    gameType: history.gameType,
    gameMode: history.gameMode,
    configVersion: history.configVersion,
    algorithmVersion: fairData.algorithmVersion,
  };
}

module.exports = { verifyBaccaratGameResult };
