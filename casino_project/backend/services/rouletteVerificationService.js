const { isDeepStrictEqual } = require("node:util");
const GameHistory = require("../models/GameHistory");

const {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
} = require("../config/rouletteConfig");

const { prepareRouletteBets, playRouletteGame } = require("./rouletteEngine");

const {
  ALGORITHM_VERSION,
  createRandomGenerator,
  getRevealedSeed,
  verifyServerSeed,
} = require("./provablyFairService");

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function verifyRouletteGameResult({ userId, historyId }) {
  const history = await GameHistory.findOne({
    _id: historyId,
    userId,
    gameType: GAME_TYPE,
  }).lean();

  if (!history) {
    throw createServiceError("A játék története nem található.", 404);
  }
  if (history.gameType !== GAME_TYPE || history.gameMode !== GAME_MODE) {
    throw createServiceError("A játék típusa vagy módja nem egyezik.", 409);
  }

  if (history.configVersion !== CONFIG_VERSION) {
    throw createServiceError(
      "A játék konfigurációs verziója nem egyezik.",
      409,
    );
  }

  const fairData = history.provablyFair;

  if (!fairData) {
    throw createServiceError(
      "A játék története nem tartalmazza a provably fair adatokat.",
      409,
    );
  }

  if (fairData.algorithmVersion !== ALGORITHM_VERSION) {
    throw createServiceError(
      "A provably fair algoritmus verziója nem egyezik.",
      409,
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
    Number.isSafeInteger(fairData.nonce) &&
    fairData.nonce >= 0 &&
    fairData.nonce < revealedSeed.finalNonce &&
    fairData.gameDomain === GAME_DOMAIN;

  const randomGenerator = createRandomGenerator({
    serverSeed: revealedSeed.serverSeed,
    clientSeed: fairData.clientSeed,
    nonce: fairData.nonce,
    gameDomain: fairData.gameDomain,
  });

  const { preparedBets, totalBetAmount } = prepareRouletteBets(
    history.result?.bets,
  );

  const recreatedResult = playRouletteGame({
    preparedBets,
    totalBetAmount,
    randomInt: (range) => randomGenerator.randomInt(range),
  });

  const gameResultMatches = isDeepStrictEqual(
    JSON.parse(JSON.stringify(recreatedResult)),
    JSON.parse(JSON.stringify(history.result)),
  );

  const settlementMatches =
    history.baseBet === recreatedResult.cost &&
    history.cost === recreatedResult.cost &&
    history.winAmount === recreatedResult.totalWin &&
    history.netResult === recreatedResult.netResult &&
    history.balanceAfter === history.balanceBefore + recreatedResult.netResult;

  return {
    verified:
      seedHashMatches &&
      seedDetailsMatch &&
      gameResultMatches &&
      settlementMatches,
    seedHashMatches,
    seedDetailsMatch,
    gameResultMatches,
    settlementMatches,

    historyId: history._id,
    gameType: history.gameType,
    gameMode: history.gameMode,
    configVersion: history.configVersion,
    algorithmVersion: fairData.algorithmVersion,
  };
}

module.exports = { verifyRouletteGameResult };
