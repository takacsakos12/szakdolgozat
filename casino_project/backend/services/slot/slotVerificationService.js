const { isDeepStrictEqual } = require("node:util");

const GameHistory = require("../../models/GameHistory");
const { CONFIG_VERSION } = require("../../config/slotConfig");

const { spin, featureSpin, buyBookBonus } = require("../slot/slotEngine");

const { ALGORITHM_VERSION, createRandomGenerator, getRevealedSeed, verifyServerSeed} = require("../provablyFairService");

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeResultForComparison(result) {
  return JSON.parse(JSON.stringify(result));
}

function recreatedSlotResult(history, random) {
  switch (history.gameMode) {
    case "BASE_GAME":
      return spin({
        baseBet: history.baseBet,
        random,
      });

    case "BONUS_BUY":
      return buyBookBonus({
        baseBet: history.baseBet,
        random,
      });

    case "FEATURE_SPIN": {
      const selectedSymbol =
        history.slotDetails?.expandingSymbol || history.result?.expandingSymbol;

      if (!selectedSymbol) {
        throw createServiceError(
          "A Feature Spin kiválasztott szimbóluma hiányzik.",
          409,
        );
      }

      return featureSpin({
        baseBet: history.baseBet,
        selectedSymbol,
        random,
      });
    }

    default:
      throw createServiceError("A játékmód ellenőrzése nem támogatott.", 409);
  }
}

async function verifySlotGameResult({ userId, historyId }) {
  if (!userId || !historyId) {
    throw createServiceError("A felhasználó azonosítója és a történelem azonosítója kötelező.", 400);
  }

  const history = await GameHistory.findOne({ _id: historyId, userId }).lean();

  if (!history) {
    throw createServiceError("A játékelőzmény nem található.", 404);
  }

  if (history.gameType !== "SLOT") {
    throw createServiceError("A játéktípus ellenőrzése nem támogatott.", 409);
  }

  if (history.configVersion !== CONFIG_VERSION) {
     throw createServiceError("A játékkonfiguráció verziója nem egyezik.", 409);
  }

  if (history.provablyFair.algorithmVersion !== ALGORITHM_VERSION) {
    throw createServiceError("A provably fair algoritmus verziója nem egyezik.", 409);
  }

  const revealedSeed = await getRevealedSeed({userId: history.userId, seedId: history.provablyFair.seedId});

  const seedHashMatches = verifyServerSeed({serverSeed: revealedSeed.serverSeed, serverSeedHash: history.provablyFair.serverSeedHash});

  const seedDetailsMatch =
    revealedSeed.serverSeedHash === history.provablyFair.serverSeedHash &&
    revealedSeed.clientSeed === history.provablyFair.clientSeed &&
    revealedSeed.algorithmVersion === history.provablyFair.algorithmVersion &&
    history.provablyFair.nonce < revealedSeed.finalNonce;

  const randomGenerator = createRandomGenerator({
    serverSeed: revealedSeed.serverSeed,
    clientSeed: history.provablyFair.clientSeed,
    nonce: history.provablyFair.nonce,
    gameDomain: history.provablyFair.gameDomain,
  });

  const recreatedResult = recreatedSlotResult(history, () => randomGenerator.randomFloat());

  const gameResultMatches = isDeepStrictEqual(
    normalizeResultForComparison(recreatedResult),
    normalizeResultForComparison(history.result),
  );

  return {
    verified: seedHashMatches && seedDetailsMatch && gameResultMatches,

    seedHashMatches,
    seedDetailsMatch,
    gameResultMatches,

    historyId: history._id,
    gameType: history.gameType,
    gameMode: history.gameMode,
    configVersion: history.configVersion,
    algorithmVersion: history.provablyFair.algorithmVersion,
  };
}

module.exports = { verifySlotGameResult };
