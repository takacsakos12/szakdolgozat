const crypto = require("crypto");
const mongoose = require("mongoose");
const { isDeepStrictEqual } = require("node:util");

const ProvablyFairSeed = require("../models/ProvablyFairSeed");
const GameHistory = require("../models/GameHistory");

const { CONFIG_VERSION } = require("../config/slotConfig");

const { spin, featureSpin, buyBookBonus } = require("./slotEngine");

const UINT32_RANGE = 0x100000000;
const ALGORITHM_VERSION = "HMAC_SHA512_V1";

function createServiceError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function generateServerSeed() {
  return crypto.randomBytes(32).toString("hex");
}

function generateClientSeed() {
  return crypto.randomBytes(16).toString("hex");
}

function hashServerSeed(serverSeed) {
  return crypto.createHash("sha256").update(serverSeed).digest("hex");
}

function normalizeClientSeed(clientSeed) {
  if (typeof clientSeed !== "string") {
    throw createServiceError("A kliensseed megadása kötelező.");
  }

  const normalizedClientSeed = clientSeed.trim();

  if (normalizedClientSeed.length < 1 || normalizedClientSeed.length > 128) {
    throw createServiceError(
      "A kliensseed hossza 1 és 128 karakter között lehet.",
    );
  }

  return normalizedClientSeed;
}

function normalizeGameDomain(gameDomain) {
  if (typeof gameDomain !== "string") {
    throw createServiceError("A játék azonosítója hiányzik.");
  }

  const normalizedGameDomain = gameDomain.trim().toUpperCase();

  if (normalizedGameDomain.length < 1 || normalizedGameDomain.length > 100) {
    throw createServiceError("A játék azonosítója érvénytelen.");
  }

  if (!/^[A-Z0-9:_-]+$/.test(normalizedGameDomain)) {
    throw createServiceError(
      "A játék azonosítója nem támogatott karaktert tartalmaz.",
    );
  }

  return normalizedGameDomain;
}

function toPublicSeed(seed) {
  return {
    seedId: seed._id,
    serverSeedHash: seed.serverSeedHash,
    clientSeed: seed.clientSeed,
    nonce: seed.nonce,
    algorithmVersion: seed.algorithmVersion,
    createdAt: seed.createdAt,
  };
}

async function getOrCreateActiveSeed({ userId, clientSeed }) {
  if (!userId) {
    throw createServiceError("Az userId hiányzik.");
  }

  const existingSeed = await ProvablyFairSeed.findOne({
    userId,
    status: "ACTIVE",
  });

  if (existingSeed) {
    return toPublicSeed(existingSeed);
  }

  const newServerSeed = generateServerSeed();
  const newClientSeed = clientSeed
    ? normalizeClientSeed(clientSeed)
    : generateClientSeed();

  try {
    const createdSeed = await ProvablyFairSeed.create({
      userId,
      serverSeed: newServerSeed,
      serverSeedHash: hashServerSeed(newServerSeed),
      clientSeed: newClientSeed,
      nonce: 0,
      status: "ACTIVE",
      algorithmVersion: ALGORITHM_VERSION,
    });

    return toPublicSeed(createdSeed);
  } catch (error) {
    if (error?.code === 11000) {
      const concurrentlyCreatedSeed = await ProvablyFairSeed.findOne({
        userId,
        status: "ACTIVE",
      });

      if (concurrentlyCreatedSeed) {
        return toPublicSeed(concurrentlyCreatedSeed);
      }
    }

    throw error;
  }
}

async function getCurrentSeed(userId) {
  return getOrCreateActiveSeed({ userId });
}

async function reserveNonce({ userId, session }) {
  if (!userId) {
    throw createServiceError("Az userId hiányzik.");
  }

  const query = ProvablyFairSeed.findOneAndUpdate(
    {
      userId,
      status: "ACTIVE",
      nonce: {
        $lt: Number.MAX_SAFE_INTEGER,
      },
    },
    {
      $inc: {
        nonce: 1,
      },
    },
    {
      returnDocument: "before",
      runValidators: true,
    },
  ).select("+serverSeed");

  if (session) {
    query.session(session);
  }

  const seed = await query;

  if (!seed) {
    throw createServiceError(
      "Nem található aktív seedpár, vagy a nonce elérte a maximális értéket.",
      409,
    );
  }

  return {
    seedId: seed._id,
    serverSeed: seed.serverSeed,
    serverSeedHash: seed.serverSeedHash,
    clientSeed: seed.clientSeed,
    nonce: seed.nonce,
    algorithmVersion: seed.algorithmVersion,
  };
}

function* createUint32Stream({ serverSeed, clientSeed, nonce, gameDomain }) {
  if (typeof serverSeed !== "string" || !/^[a-f0-9]{64}$/.test(serverSeed)) {
    throw createServiceError("A szerverseed érvénytelen.");
  }

  const normalizedClientSeed = normalizeClientSeed(clientSeed);

  if (!Number.isSafeInteger(nonce) || nonce < 0) {
    throw createServiceError("A nonce érvénytelen.");
  }

  const normalizedGameDomain = normalizeGameDomain(gameDomain);

  let cursor = 0;

  while (true) {
    const message =
      `${normalizedClientSeed}:` +
      `${nonce}:` +
      `${normalizedGameDomain}:` +
      `${cursor}`;

    const digest = crypto
      .createHmac("sha512", serverSeed)
      .update(message)
      .digest();

    for (let offset = 0; offset < digest.length; offset += 4) {
      yield digest.readUInt32BE(offset);
    }

    cursor += 1;
  }
}

function getUnbiasedInteger(stream, range) {
  if (!Number.isSafeInteger(range) || range <= 0 || range > UINT32_RANGE) {
    throw createServiceError("A véletlenszám tartománya érvénytelen.");
  }

  const maxAcceptable = UINT32_RANGE - (UINT32_RANGE % range);

  while (true) {
    const nextValue = stream.next();

    if (nextValue.done) {
      throw createServiceError("A véletlenszám-adatfolyam elfogyott.", 500);
    }

    if (nextValue.value < maxAcceptable) {
      return nextValue.value % range;
    }
  }
}

function createRandomGenerator({ serverSeed, clientSeed, nonce, gameDomain }) {
  const stream = createUint32Stream({
    serverSeed,
    clientSeed,
    nonce,
    gameDomain,
  });

  return {
    randomInt(range) {
      return getUnbiasedInteger(stream, range);
    },

    randomFloat() {
      const nextValue = stream.next();

      if (nextValue.done) {
        throw createServiceError("A véletlenszám-adatfolyam elfogyott.", 500);
      }

      return nextValue.value / UINT32_RANGE;
    },

    pick(values) {
      if (!Array.isArray(values) || values.length === 0) {
        throw createServiceError("Nem választható elem üres listából.");
      }

      return values[getUnbiasedInteger(stream, values.length)];
    },
  };
}

async function rotateSeed({ userId, clientSeed }) {
  if (!userId) {
    throw createServiceError("Az userId hiányzik.");
  }

  await getOrCreateActiveSeed({ userId });

  const newClientSeed = clientSeed
    ? normalizeClientSeed(clientSeed)
    : generateClientSeed();

  const session = await mongoose.startSession();

  try {
    let rotationResult;

    await session.withTransaction(async () => {
      const revealedAt = new Date();

      const oldSeed = await ProvablyFairSeed.findOneAndUpdate(
        {
          userId,
          status: "ACTIVE",
        },
        {
          $set: {
            status: "REVEALED",
            revealedAt,
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
          session,
        },
      ).select("+serverSeed");

      if (!oldSeed) {
        throw createServiceError(
          "Nem található lecserélhető aktív seedpár.",
          409,
        );
      }

      const newServerSeed = generateServerSeed();

      const [createdSeed] = await ProvablyFairSeed.create(
        [
          {
            userId,
            serverSeed: newServerSeed,
            serverSeedHash: hashServerSeed(newServerSeed),
            clientSeed: newClientSeed,
            nonce: 0,
            status: "ACTIVE",
            algorithmVersion: ALGORITHM_VERSION,
          },
        ],
        {
          session,
        },
      );

      rotationResult = {
        previousSeed: {
          seedId: oldSeed._id,
          serverSeed: oldSeed.serverSeed,
          serverSeedHash: oldSeed.serverSeedHash,
          clientSeed: oldSeed.clientSeed,
          finalNonce: oldSeed.nonce,
          algorithmVersion: oldSeed.algorithmVersion,
          revealedAt,
        },

        currentSeed: toPublicSeed(createdSeed),
      };
    });

    return rotationResult;
  } finally {
    await session.endSession();
  }
}

async function getRevealedSeed({ userId, seedId }) {
  if (!userId || !seedId) {
    throw createServiceError("A felhasználó vagy a seed azonosítója hiányzik.");
  }

  const seed = await ProvablyFairSeed.findOne({
    _id: seedId,
    userId,
    status: "REVEALED",
  }).select("+serverSeed");

  if (!seed) {
    throw createServiceError("A felfedett seedpár nem található.", 404);
  }

  return {
    seedId: seed._id,
    serverSeed: seed.serverSeed,
    serverSeedHash: seed.serverSeedHash,
    clientSeed: seed.clientSeed,
    finalNonce: seed.nonce,
    algorithmVersion: seed.algorithmVersion,
    revealedAt: seed.revealedAt,
  };
}

function verifyServerSeed({ serverSeed, serverSeedHash }) {
  if (typeof serverSeed !== "string" || typeof serverSeedHash !== "string") {
    return false;
  }

  return hashServerSeed(serverSeed) === serverSeedHash.toLowerCase();
}

function normalizeResultForComparison(result) {
  return JSON.parse(JSON.stringify(result));
}

function recreateSlotResult(history, random) {
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

async function verifyGameResult({ userId, historyId }) {
  if (!userId) {
    throw createServiceError("Az userId hiányzik.");
  }

  if (!mongoose.isValidObjectId(historyId)) {
    throw createServiceError("A játékelőzmény azonosítója érvénytelen.");
  }

  const history = await GameHistory.findOne({
    _id: historyId,
    userId,
  }).lean();

  if (!history) {
    throw createServiceError("A játékelőzmény nem található.", 404);
  }

  if (history.gameType !== "SLOT") {
    throw createServiceError(
      "Jelenleg csak sloteredmény ellenőrzése támogatott.",
      409,
    );
  }

  if (!history.provablyFair) {
    throw createServiceError(
      "A játékelőzmény nem tartalmaz Provably Fair adatokat.",
      409,
    );
  }

  if (history.configVersion !== CONFIG_VERSION) {
    throw createServiceError(
      `A ${history.configVersion} konfigurációverzió ellenőrzése jelenleg nem támogatott.`,
      409,
    );
  }

  if (history.provablyFair.algorithmVersion !== ALGORITHM_VERSION) {
    throw createServiceError(
      `A ${history.provablyFair.algorithmVersion} algoritmusverzió ellenőrzése jelenleg nem támogatott.`,
      409,
    );
  }

  const revealedSeed = await getRevealedSeed({
    userId,
    seedId: history.provablyFair.seedId,
  });

  const seedHashMatches = verifyServerSeed({
    serverSeed: revealedSeed.serverSeed,
    serverSeedHash: history.provablyFair.serverSeedHash,
  });

  const seedDetailsMatch =
    String(revealedSeed.seedId) === String(history.provablyFair.seedId) &&
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

  const recreatedResult = recreateSlotResult(history, () =>
    randomGenerator.randomFloat(),
  );

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

module.exports = {
  ALGORITHM_VERSION,
  generateServerSeed,
  hashServerSeed,
  getOrCreateActiveSeed,
  getCurrentSeed,
  reserveNonce,
  createRandomGenerator,
  rotateSeed,
  getRevealedSeed,
  verifyServerSeed,
  verifyGameResult,
};
