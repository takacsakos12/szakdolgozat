const fs = require("fs");
const path = require("path");

const slotConfig =
  require("../config/slotConfig");

const {
  spin,
  featureSpin,
  buyBookBonus,
} = require("../services/slotEngine");

const MODES = {
  BASE: "base-book",
  FEATURE: "feature-spin",
  BONUS: "bonus-book",

  /*
   * Kizárólag statisztikai vizsgálathoz.
   * A játékban a bónusz szimbóluma mindig random.*/
  BONUS_SYMBOL: "bonus-symbol",
};

function hashSeed(text) {
  let hash = 2166136261;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    hash ^=
      text.charCodeAt(index);

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed);

  return function random() {
    state += 0x6d2b79f5;

    let value = state;

    value =
      Math.imul(
        value ^
          (value >>> 15),
        value | 1
      );

    value ^=
      value +
      Math.imul(
        value ^
          (value >>> 7),
        value | 61
      );

    return (
      (
        value ^
        (value >>> 14)
      ) >>> 0
    ) / 4294967296;
  };
}

function playRound({
  mode,
  totalBet,
  random,
  selectedSymbol,
}) {
  if (mode === MODES.BASE) {
    return spin({
      totalBet,
      random,
    });
  }

  if (
    mode === MODES.FEATURE
  ) {
    return featureSpin({
      totalBet,
      selectedSymbol,
      random,
    });
  }

  if (
    mode === MODES.BONUS
  ) {
    return buyBookBonus({
      totalBet,
      random,
    });
  }

  if (
    mode ===
    MODES.BONUS_SYMBOL
  ) {
    return buyBookBonus({
      totalBet,
      random,

      forcedSymbol:
        selectedSymbol,
    });
  }

  throw new Error(
    `Ismeretlen szimulációs mód: ${mode}`
  );
}

function getWager(
  result,
  mode
) {
  if (mode === MODES.BASE) {
    return result.totalBet;
  }

  if (
    mode === MODES.FEATURE
  ) {
    return result.featureCost;
  }

  return result.purchaseCost;
}

function getReferenceBet(
  result
) {
  return result.totalBet;
}

function runSimulation({
  mode,
  roundCount,
  seed,
  selectedSymbol = null,
  totalBet = 1,
}) {
  if (
    !Object
      .values(MODES)
      .includes(mode)
  ) {
    throw new Error(
      "Használható módok: " +
      "base-book, feature-spin, " +
      "bonus-book, bonus-symbol."
    );
  }

  if (
    (
      mode === MODES.FEATURE ||
      mode === MODES.BONUS_SYMBOL
    ) &&
    !slotConfig
      .BOOK_BONUS
      .expandableSymbols
      .includes(selectedSymbol)
  ) {
    throw new Error(
      "A feature-spin és bonus-symbol módhoz " +
      "adj meg érvényes szimbólumot."
    );
  }

  const random =
    createSeededRandom(seed);

  const checkpoints =
    new Set(
      [
        1000,
        10000,
        100000,
        1000000,
        10000000,
        100000000,
      ].filter(
        (value) =>
          value <= roundCount
      )
    );

  const convergence = [];

  let totalWager = 0;
  let totalWin = 0;
  let winningRounds = 0;

  let maximumWinMultiplier = 0;
  let maxWinHits = 0;

  let winsAtLeast100x = 0;
  let winsAtLeast500x = 0;
  let winsAtLeast1000x = 0;
  let winsAtLeast2000x = 0;

  let meanReturn = 0;
  let squareSum = 0;

  for (
    let index = 1;
    index <= roundCount;
    index += 1
  ) {
    const result =
      playRound({
        mode,
        totalBet,
        random,
        selectedSymbol,
      });

    const wager =
      getWager(
        result,
        mode
      );

    const referenceBet =
      getReferenceBet(
        result
      );

    const winMultiplier =
      result.totalWin /
      referenceBet;

    const returnMultiplier =
      result.totalWin /
      wager;

    totalWager += wager;
    totalWin += result.totalWin;

    if (
      result.totalWin > 0
    ) {
      winningRounds += 1;
    }

    if (
      result.maxWinReached
    ) {
      maxWinHits += 1;
    }

    maximumWinMultiplier =
      Math.max(
        maximumWinMultiplier,
        winMultiplier
      );

    if (
      winMultiplier >= 100
    ) {
      winsAtLeast100x += 1;
    }

    if (
      winMultiplier >= 500
    ) {
      winsAtLeast500x += 1;
    }

    if (
      winMultiplier >= 1000
    ) {
      winsAtLeast1000x += 1;
    }

    if (
      winMultiplier >= 2000
    ) {
      winsAtLeast2000x += 1;
    }

    const difference =
      returnMultiplier -
      meanReturn;

    meanReturn +=
      difference / index;

    squareSum +=
      difference *
      (
        returnMultiplier -
        meanReturn
      );

    if (
      checkpoints.has(index)
    ) {
      convergence.push({
        rounds: index,

        rtpPercent:
          (
            totalWin /
            totalWager
          ) * 100,
      });
    }
  }

  const variance =
    roundCount > 1
      ? squareSum /
        (roundCount - 1)
      : 0;

  return {
    configVersion:
      slotConfig.CONFIG_VERSION,

    mode,

    selectedSymbol:
      mode === MODES.FEATURE ||
      mode === MODES.BONUS_SYMBOL
        ? selectedSymbol
        : null,

    seed,
    roundCount,
    totalBet,
    totalWager,
    totalWin,

    rtpPercent:
      (
        totalWin /
        totalWager
      ) * 100,

    hitRatePercent:
      (
        winningRounds /
        roundCount
      ) * 100,

    maximumWinMultiplier,
    maxWinHits,
    winsAtLeast100x,
    winsAtLeast500x,
    winsAtLeast1000x,
    winsAtLeast2000x,

    standardDeviation:
      Math.sqrt(variance),

    convergence,
  };
}

function saveResult(result) {
  const root =
    path.resolve(
      __dirname,
      "../../../szabalyrendszerek/slot"
    );

  const runDirectory =
    path.join(
      root,
      "runs"
    );

  const configDirectory =
    path.join(
      root,
      "configurations"
    );

  fs.mkdirSync(
    runDirectory,
    {
      recursive: true,
    }
  );

  fs.mkdirSync(
    configDirectory,
    {
      recursive: true,
    }
  );

  const configPath =
    path.join(
      configDirectory,
      `v${slotConfig.CONFIG_VERSION}.json`
    );

  if (
    !fs.existsSync(configPath)
  ) {
    fs.writeFileSync(
      configPath,

      JSON.stringify(
        slotConfig,
        null,
        2
      ),

      "utf8"
    );
  }

  const safeSeed =
    result.seed.replace(
      /[^a-zA-Z0-9_-]/g,
      "_"
    );

  const symbolPart =
    result.selectedSymbol
      ? `-${result.selectedSymbol}`
      : "";

  const runPath =
    path.join(
      runDirectory,

      `v${slotConfig.CONFIG_VERSION}-` +
      `${result.mode}` +
      `${symbolPart}-` +
      `${safeSeed}.json`
    );

  fs.writeFileSync(
    runPath,

    JSON.stringify(
      result,
      null,
      2
    ),

    "utf8"
  );

  return {
    configPath,
    runPath,
  };
}

if (
  require.main === module
) {
  const mode =
    process.argv[2] ||
    MODES.BASE;

  const roundCount =
    Number.parseInt(
      process.argv[3] ||
      "1000000",
      10
    );

  const seed =
    process.argv[4] ||
    (
      `v${slotConfig.CONFIG_VERSION}-` +
      `${mode}-run-1`
    );

  const selectedSymbol =
    process.argv[5] &&
    process.argv[5] !== "-"
      ? process.argv[5]
          .toUpperCase()
      : null;

  const totalBet =
    Number.parseFloat(
      process.argv[6] || "1"
    );

  if (
    !Number.isInteger(
      roundCount
    ) ||
    roundCount <= 0
  ) {
    throw new Error(
      "A körök száma pozitív egész szám legyen."
    );
  }

  if (
    !Number.isFinite(totalBet) ||
    totalBet <= 0
  ) {
    throw new Error(
      "A teljes tét pozitív szám legyen."
    );
  }

  const result = {
    ...runSimulation({
      mode,
      roundCount,
      seed,
      selectedSymbol,
      totalBet,
    }),

    createdAt:
      new Date()
        .toISOString(),
  };

  const saved =
    saveResult(result);

  const {
    convergence,
    ...summary
  } = result;

  console.table(summary);
  console.table(convergence);

  console.log(
    "Eredményfájl:",
    saved.runPath
  );
}

module.exports = {
  MODES,
  createSeededRandom,
  runSimulation,
  saveResult,
};