const CONFIG_VERSION = "0.6.1";

const ROW_COUNT = 3;
const REEL_COUNT = 5;

const SYMBOLS = {
  TEN: "TEN",
  JACK: "JACK",
  QUEEN: "QUEEN",
  KING: "KING",
  ACE: "ACE",
  SCARAB: "SCARAB",
  FALCON: "FALCON",
  ANUBIS: "ANUBIS",
  PHARAOH: "PHARAOH",
  WILD: "BOOK",
  SCATTER: "BOOK",
};

const MAX_WIN_MULTIPLIER = 5000;
const BONUS_BUY_COST_MULTIPLIER = 100;
const FEATURE_SPIN_COST_MULTIPLIER = 10;

const PAYTABLE = {
  TEN: { 3: 0.5, 4: 2.5, 5: 10 },
  JACK: { 3: 0.5, 4: 2.5, 5: 10 },
  QUEEN: { 3: 0.5, 4: 2.5, 5: 10 },
  KING: { 3: 0.5, 4: 4, 5: 15 },
  ACE: { 3: 0.5, 4: 4, 5: 15 },
  SCARAB: { 2: 0.5, 3: 3, 4: 10, 5: 75 },
  FALCON: { 2: 0.5, 3: 3, 4: 10, 5: 75 },
  ANUBIS: { 2: 0.5, 3: 4, 4: 40, 5: 200 },
  PHARAOH: { 2: 1, 3: 10, 4: 100, 5: 500 },
};

const SCATTER_PAYTABLE = {
  3: 2,
  4: 20,
  5: 200,
};

const BOOK_BONUS = {
  triggerScatterCount: 3,
  initialFreeSpins: 10,
  retriggerFreeSpins: 10,

  expandableSymbols: [
    SYMBOLS.TEN,
    SYMBOLS.JACK,
    SYMBOLS.QUEEN,
    SYMBOLS.KING,
    SYMBOLS.ACE,
    SYMBOLS.SCARAB,
    SYMBOLS.FALCON,
    SYMBOLS.ANUBIS,
    SYMBOLS.PHARAOH,
  ],
};

const BONUS_TARGET_COUNTS = {
  TEN: [102, 102, 103, 103, 103],
  JACK: [106, 107, 107, 107, 107],
  QUEEN: [104, 104, 103, 104, 104],

  KING: [90, 90, 90, 90, 89],
  ACE: [89, 90, 90, 90, 90],

  SCARAB: [53, 53, 53, 54, 53],
  FALCON: [52, 53, 54, 53, 53],

  ANUBIS: [40, 40, 40, 40, 41],
  PHARAOH: [36, 36, 37, 35, 8],
};

const FEATURE_SPIN_TARGET_COUNTS = {
  TEN: [110, 110, 110, 110, 110],
  JACK: [113, 113, 113, 113, 113],
  QUEEN: [110, 111, 110, 111, 111],

  KING: [93, 94, 94, 93, 92],
  ACE: [97, 97, 97, 97, 97],

  SCARAB: [55, 54, 54, 55, 55],
  FALCON: [56, 57, 57, 56, 56],

  ANUBIS: [41, 41, 41, 40, 41],
  PHARAOH: [39, 39, 40, 39, 8],
};

const PAYLINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 2, 1, 0, 1],
];

const REEL_STRIP_SCALE = 10;
const BASE_REEL_SEED_SALT = 31;
const BASE_REEL_SYMBOL_COUNTS = [
  {
    TEN: 9.1,
    JACK: 8.1,
    QUEEN: 7.1,
    KING: 7.1,
    ACE: 6.1,
    SCARAB: 5.1,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.1,
  },
  {
    TEN: 9.1,
    JACK: 7.1,
    QUEEN: 8.1,
    KING: 7.1,
    ACE: 6.1,
    SCARAB: 5,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.2,
  },
  {
    TEN: 8.1,
    JACK: 8.1,
    QUEEN: 7.1,
    KING: 8.1,
    ACE: 6.1,
    SCARAB: 5,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.2,
  },
  {
    TEN: 9.1,
    JACK: 7.1,
    QUEEN: 7.1,
    KING: 8.1,
    ACE: 6,
    SCARAB: 5,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.3,
  },
  {
    TEN: 8.1,
    JACK: 8.1,
    QUEEN: 8.1,
    KING: 7.1,
    ACE: 6.1,
    SCARAB: 5.1,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.1,
  },
];
const REEL_SYMBOL_COUNTS = BASE_REEL_SYMBOL_COUNTS.map((reelCounts) =>
  Object.fromEntries(
    Object.entries(reelCounts).map(([symbol, count]) => [
      symbol,
      count * REEL_STRIP_SCALE,
    ]),
  ),
);
const BONUS_BASE_REEL_SYMBOL_COUNTS = [
  {
    TEN: 90,
    JACK: 80,
    QUEEN: 70,
    KING: 70,
    ACE: 60,
    SCARAB: 50,
    FALCON: 40,
    ANUBIS: 30,
    PHARAOH: 20,
    BOOK: 17,
  },
  {
    TEN: 90,
    JACK: 70,
    QUEEN: 80,
    KING: 70,
    ACE: 60,
    SCARAB: 50,
    FALCON: 40,
    ANUBIS: 30,
    PHARAOH: 20,
    BOOK: 17,
  },
  {
    TEN: 80,
    JACK: 80,
    QUEEN: 70,
    KING: 80,
    ACE: 60,
    SCARAB: 50,
    FALCON: 40,
    ANUBIS: 30,
    PHARAOH: 20,
    BOOK: 17,
  },
  {
    TEN: 90,
    JACK: 70,
    QUEEN: 70,
    KING: 80,
    ACE: 60,
    SCARAB: 50,
    FALCON: 40,
    ANUBIS: 30,
    PHARAOH: 20,
    BOOK: 17,
  },
  {
    TEN: 80,
    JACK: 80,
    QUEEN: 80,
    KING: 70,
    ACE: 60,
    SCARAB: 50,
    FALCON: 40,
    ANUBIS: 30,
    PHARAOH: 20,
    BOOK: 17,
  },
];

function createDeterministicStrip(symbolCounts, reelIndex, seedSalt = 0) {
  const strip = [];

  for (const [symbol, count] of Object.entries(symbolCounts)) {
    for (let index = 0; index < count; index += 1) {
      strip.push(symbol);
    }
  }

  let state = 1009 + reelIndex * 7919 + seedSalt;

  for (let index = strip.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;

    const targetIndex = state % (index + 1);

    [strip[index], strip[targetIndex]] = [strip[targetIndex], strip[index]];
  }

  return strip;
}

const REEL_STRIPS = REEL_SYMBOL_COUNTS.map((symbolCounts, reelIndex) =>
  createDeterministicStrip(symbolCounts, reelIndex, BASE_REEL_SEED_SALT),
);

function createFeatureSymbolCounts(baseCounts, targetSymbol, targetCount) {
  const counts = { ...baseCounts };

  const originalTargetCount = counts[targetSymbol];

  counts[targetSymbol] = targetCount;

  const donorSymbols = BOOK_BONUS.expandableSymbols
    .filter((symbol) => symbol !== targetSymbol)
    .sort((left, right) => counts[right] - counts[left]);

  const difference = targetCount - originalTargetCount;

  if (difference > 0) {
    let remainingRemoval = difference;

    let donorIndex = 0;

    while (remainingRemoval > 0) {
      const donorSymbol = donorSymbols[donorIndex % donorSymbols.length];

      if (counts[donorSymbol] > 1) {
        counts[donorSymbol] -= 1;
        remainingRemoval -= 1;
      }

      donorIndex += 1;
    }
  } else if (difference < 0) {
    const remainingAddition = -difference;

    for (let index = 0; index < remainingAddition; index += 1) {
      const donorSymbol = donorSymbols[index % donorSymbols.length];

      counts[donorSymbol] += 1;
    }
  }

  return counts;
}

function createReelStripsBySymbol(targetCountsBySymbol, seedSaltOffset) {
  return Object.fromEntries(
    BOOK_BONUS.expandableSymbols.map((targetSymbol, symbolIndex) => {
      const targetCounts = targetCountsBySymbol[targetSymbol];

      const strips = BONUS_BASE_REEL_SYMBOL_COUNTS.map(
        (baseCounts, reelIndex) => {
          const counts = createFeatureSymbolCounts(
            baseCounts,
            targetSymbol,
            targetCounts[reelIndex],
          );

          return createDeterministicStrip(
            counts,
            reelIndex,
            seedSaltOffset + symbolIndex * 104729,
          );
        },
      );

      return [targetSymbol, strips];
    }),
  );
}

const BONUS_REEL_STRIPS_BY_SYMBOL = createReelStripsBySymbol(
  BONUS_TARGET_COUNTS,
  0,
);
const FEATURE_SPIN_REEL_STRIPS_BY_SYMBOL = createReelStripsBySymbol(
  FEATURE_SPIN_TARGET_COUNTS,
  700001,
);
module.exports = {
  CONFIG_VERSION,
  ROW_COUNT,
  REEL_COUNT,
  SYMBOLS,

  MAX_WIN_MULTIPLIER,
  BONUS_BUY_COST_MULTIPLIER,
  FEATURE_SPIN_COST_MULTIPLIER,

  REEL_STRIP_SCALE,
  BASE_REEL_SEED_SALT,

  PAYTABLE,
  SCATTER_PAYTABLE,
  BOOK_BONUS,
  BONUS_TARGET_COUNTS,
  FEATURE_SPIN_TARGET_COUNTS,

  PAYLINES,
  REEL_SYMBOL_COUNTS,
  BONUS_BASE_REEL_SYMBOL_COUNTS,
  REEL_STRIPS,
  BONUS_REEL_STRIPS_BY_SYMBOL,
  FEATURE_SPIN_REEL_STRIPS_BY_SYMBOL,
};
