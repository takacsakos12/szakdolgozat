const { isDeepStrictEqual } = require("node:util");

const GameHistory = require("../../models/GameHistory");

const { CONFIG_VERSION } = require("../../config/slotConfig");

const { spin, featureSpin, buyBookBonus } = require("./slotEngine");

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

const GAME_DOMAINS = {
  BASE_GAME: "SLOT:BASE_GAME",
  BONUS_BUY: "SLOT:BONUS_BUY",
  FEATURE_SPIN: "SLOT:FEATURE_SPIN",
};

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

function normalizeResultForComparison(result) {
  return JSON.parse(JSON.stringify(result));
}

function amountsMatch(first, second) {
  return (
    Number.isFinite(first) &&
    Number.isFinite(second) &&
    Math.abs(first - second) < 1e-8
  );
}

function getFeatureSymbol(history) {
  const selectedSymbol =
    history.result?.expandingSymbol ?? history.slotDetails?.expandingSymbol;

  if (!selectedSymbol) {
    throw createServiceError(
      "A Feature Spin kiválasztott szimbóluma hiányzik.",
      409,
    );
  }

  return selectedSymbol;
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

    case "FEATURE_SPIN":
      return featureSpin({
        baseBet: history.baseBet,
        selectedSymbol: getFeatureSymbol(history),
        random,
      });

    default:
      throw createServiceError("A játékmód ellenőrzése nem támogatott.", 409);
  }
}

async function verifySlotGameResult({ userId, historyId }) {
  if (!userId || !historyId) {
    throw createServiceError(
      "A felhasználó azonosítója és a játékelőzmény azonosítója kötelező.",
      400,
    );
  }

  const history = await GameHistory.findOne({
    _id: historyId,
    userId,
  }).lean();

  if (!history) {
    throw createServiceError("A játékelőzmény nem található.", 404);
  }

  if (history.gameType !== "SLOT") {
    throw createServiceError("A játéktípus ellenőrzése nem támogatott.", 409);
  }

  if (history.configVersion !== CONFIG_VERSION) {
    throw createServiceError("A játékkonfiguráció verziója nem egyezik.", 409);
  }

  if (!Object.hasOwn(GAME_DOMAINS, history.gameMode)) {
    throw createServiceError("A játékmód ellenőrzése nem támogatott.", 409);
  }

  const fairData = history.provablyFair;
  const expectedGameDomain = GAME_DOMAINS[history.gameMode];

  if (!fairData) {
    throw createServiceError("A Provably Fair adatok hiányoznak.", 409);
  }

  if (fairData.algorithmVersion !== ALGORITHM_VERSION) {
    throw createServiceError(
      "A Provably Fair algoritmus verziója nem egyezik.",
      409,
    );
  }

  if (!Number.isSafeInteger(fairData.nonce) || fairData.nonce < 0) {
    throw createServiceError("A mentett nonce érvénytelen.", 409);
  }

  const requestData =
    history.gameMode === "FEATURE_SPIN"
      ? {
          selectedSymbol: getFeatureSymbol(history),
        }
      : {};

  const recreatedFingerprint = createFingerprint({
    gameType: "SLOT",
    gameMode: history.gameMode,
    baseBet: history.baseBet,
    requestData,
  });

  const fingerprintMatches =
    history.fingerprintVersion === FINGERPRINT_VERSION &&
    history.requestFingerprint === recreatedFingerprint;

  const revealedSeed = await getRevealedSeed({
    userId: history.userId,
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
    fairData.gameDomain === expectedGameDomain;

  const randomGenerator = createRandomGenerator({
    serverSeed: revealedSeed.serverSeed,
    clientSeed: fairData.clientSeed,
    nonce: fairData.nonce,

    // A támogatott játékmódhoz tartozó domaint használjuk.
    gameDomain: expectedGameDomain,
  });

  const recreatedResult = recreatedSlotResult(history, () =>
    randomGenerator.randomFloat(),
  );

  const gameResultMatches = isDeepStrictEqual(
    normalizeResultForComparison(recreatedResult),
    normalizeResultForComparison(history.result),
  );

  const expectedNetResult = recreatedResult.totalWin - recreatedResult.cost;

  const settlementMatches =
    amountsMatch(history.baseBet, recreatedResult.baseBet) &&
    amountsMatch(history.cost, recreatedResult.cost) &&
    amountsMatch(history.winAmount, recreatedResult.totalWin) &&
    amountsMatch(history.netResult, expectedNetResult) &&
    Number.isFinite(history.balanceBefore) &&
    history.balanceBefore >= 0 &&
    Number.isFinite(history.balanceAfter) &&
    history.balanceAfter >= 0 &&
    amountsMatch(
      history.balanceAfter,
      history.balanceBefore + expectedNetResult,
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

module.exports = {
  verifySlotGameResult,
};
