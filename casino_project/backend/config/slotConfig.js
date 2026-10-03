const CONFIG_VERSION = "0.5.0";

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

  // A Book of the Fallenhez hasonlóan ugyanaz a szimbólum
  // működik Wildként és Scatterként.
  WILD: "BOOK",
  SCATTER: "BOOK",
};

const MAX_WIN_MULTIPLIER = 5000;
const BONUS_BUY_COST_MULTIPLIER = 100;
const FEATURE_SPIN_COST_MULTIPLIER = 10;

/*
 * A kifizetések vonaltét-szorzók.
 *
 * Saját szimbólumaink megfeleltetése:
 * SCARAB  -> Ankh
 * FALCON  -> Anubis
 * ANUBIS  -> Pharaoh
 * PHARAOH -> John Hunter, vagyis a legértékesebb szimbólum
 */
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
  minimumReelsForExpansion: 3,

  bonusTypes: {
    CHOICE: "CHOICE",
    RANDOM: "RANDOM",
  },

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

/*
 * Virtuális tárcsánkénti szimbólumsúlyok.
 *
 * Az eltérő gyakoriságok biztosítják, hogy a különböző értékű
 * szimbólumokkal is körülbelül azonos legyen a 100x bónusz RTP-je.
 */
const FEATURE_TARGET_COUNTS = {
  TEN: [340, 340, 340, 340, 340],
  JACK: [376, 376, 376, 376, 376],
  QUEEN: [341, 341, 341, 341, 341],

  KING: [265, 265, 265, 265, 265],
  ACE: [267, 267, 267, 267, 267],

  SCARAB: [148, 148, 148, 148, 148],
  FALCON: [144, 144, 144, 144, 144],

  ANUBIS: [108, 108, 108, 108, 108],
  PHARAOH: [80, 80, 80, 80, 80],
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

/*
 * Tízszeres felbontású virtuális tárcsák.
 *
 * Erre azért van szükség, mert az 50 körüli hosszúságú tárcsákon
 * egyetlen szimbólum hozzáadása több százalékponttal módosította
 * az RTP-t. Az 500 körüli hossz finomabb kalibrációt tesz lehetővé.
 */
const REEL_STRIP_SCALE = 10;
const BASE_REEL_SEED_SALT = 31;

const BASE_REEL_SYMBOL_COUNTS = [
  {
    TEN: 9,
    JACK: 8,
    QUEEN: 7,
    KING: 7,
    ACE: 6,
    SCARAB: 5,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.7,
  },
  {
    TEN: 9,
    JACK: 7,
    QUEEN: 8,
    KING: 7,
    ACE: 6,
    SCARAB: 5,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.7,
  },
  {
    TEN: 8,
    JACK: 8,
    QUEEN: 7,
    KING: 8,
    ACE: 6,
    SCARAB: 5,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.7,
  },
  {
    TEN: 9,
    JACK: 7,
    QUEEN: 7,
    KING: 8,
    ACE: 6,
    SCARAB: 5,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.7,
  },
  {
    TEN: 8,
    JACK: 8,
    QUEEN: 8,
    KING: 7,
    ACE: 6,
    SCARAB: 5,
    FALCON: 4,
    ANUBIS: 3,
    PHARAOH: 2,
    BOOK: 1.7,
  },
];

const REEL_SYMBOL_COUNTS = BASE_REEL_SYMBOL_COUNTS.map(
  (reelCounts) =>
    Object.fromEntries(
      Object.entries(reelCounts).map(([symbol, count]) => [
        symbol,
        count * REEL_STRIP_SCALE,
      ])
    )
);

function createDeterministicStrip(
  symbolCounts,
  reelIndex,
  seedSalt = 0
) {
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

    [strip[index], strip[targetIndex]] = [
      strip[targetIndex],
      strip[index],
    ];
  }

  return strip;
}

/*
 * Fontos, hogy itt ne ezt használjuk:
 *
 * REEL_SYMBOL_COUNTS.map(createDeterministicStrip)
 *
 * A map ugyanis egy harmadik argumentumot is átadna,
 * amely véletlenül a seedSalt helyére kerülne.
 */
const REEL_STRIPS = REEL_SYMBOL_COUNTS.map(
  (symbolCounts, reelIndex) =>
    createDeterministicStrip(
      symbolCounts,
      reelIndex,
      BASE_REEL_SEED_SALT
    )
);

function createFeatureSymbolCounts(
  baseCounts,
  targetSymbol,
  targetCount
) {
  const counts = { ...baseCounts };
  let remainingIncrease =
    targetCount - counts[targetSymbol];

  counts[targetSymbol] = targetCount;

  const donorSymbols = BOOK_BONUS.expandableSymbols
    .filter((symbol) => symbol !== targetSymbol)
    .sort((left, right) => counts[right] - counts[left]);

  let donorIndex = 0;

  while (remainingIncrease > 0) {
    const donorSymbol =
      donorSymbols[donorIndex % donorSymbols.length];

    if (counts[donorSymbol] > 1) {
      counts[donorSymbol] -= 1;
      remainingIncrease -= 1;
    }

    donorIndex += 1;
  }

  return counts;
}

const FEATURE_REEL_STRIPS_BY_SYMBOL =
  Object.fromEntries(
    BOOK_BONUS.expandableSymbols.map(
      (targetSymbol, symbolIndex) => {
        const targetCounts =
          FEATURE_TARGET_COUNTS[targetSymbol];

        const strips = REEL_SYMBOL_COUNTS.map(
          (baseCounts, reelIndex) => {
            const counts = createFeatureSymbolCounts(
              baseCounts,
              targetSymbol,
              targetCounts[reelIndex]
            );

            return createDeterministicStrip(
              counts,
              reelIndex,
              symbolIndex * 104729
            );
          }
        );

        return [targetSymbol, strips];
      }
    )
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
  FEATURE_TARGET_COUNTS,

  PAYLINES,
  REEL_SYMBOL_COUNTS,
  REEL_STRIPS,
  FEATURE_REEL_STRIPS_BY_SYMBOL,
};