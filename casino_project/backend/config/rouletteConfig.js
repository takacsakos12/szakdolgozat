const CONFIG_VERSION = "ROULETTE_V1";

const GAME_TYPE = "ROULETTE";
const GAME_MODE = "STANDARD";
const GAME_DOMAIN = "ROULETTE:STANDARD";

const TABLE_NUMBERS = Array.from({ length: 36 }, (_, index) => index + 1);

const RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

const BLACK_NUMBERS = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
];

const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const NUMBER_COLORS = {
  0: "GREEN",
};

for (const number of RED_NUMBERS) {
  NUMBER_COLORS[number] = "RED";
}

for (const number of BLACK_NUMBERS) {
  NUMBER_COLORS[number] = "BLACK";
}

const DOZENS = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
  3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
};

const COLUMNS = {
  1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
};

const OUTSIDE_BETS = {
  RED: RED_NUMBERS,
  BLACK: BLACK_NUMBERS,
  EVEN: TABLE_NUMBERS.filter((number) => number % 2 === 0),
  ODD: TABLE_NUMBERS.filter((number) => number % 2 !== 0),
  LOW: TABLE_NUMBERS.slice(0, 18),
  HIGH: TABLE_NUMBERS.slice(18),
};

const BET_TYPES = {
  STRAIGHT: {
    payout: 35,
  },

  SPLIT: {
    payout: 17,
  },

  TRIO: {
    payout: 11,
  },

  STREET: {
    payout: 11,
  },

  CORNER: {
    payout: 8,
  },

  FIRST_FOUR: {
    payout: 8,
  },

  SIX_LINE: {
    payout: 5,
  },

  FIRST_DOZEN: {
    payout: 2,
    numbers: () => DOZENS[1],
  },

  SECOND_DOZEN: {
    payout: 2,
    numbers: () => DOZENS[2],
  },

  THIRD_DOZEN: {
    payout: 2,
    numbers: () => DOZENS[3],
  },

  FIRST_COLUMN: {
    payout: 2,
    numbers: () => COLUMNS[1],
  },

  SECOND_COLUMN: {
    payout: 2,
    numbers: () => COLUMNS[2],
  },

  THIRD_COLUMN: {
    payout: 2,
    numbers: () => COLUMNS[3],
  },

  RED: {
    payout: 1,
    numbers: () => RED_NUMBERS,
  },

  BLACK: {
    payout: 1,
    numbers: () => BLACK_NUMBERS,
  },

  EVEN: {
    payout: 1,
    numbers: () => OUTSIDE_BETS.EVEN,
  },

  ODD: {
    payout: 1,
    numbers: () => OUTSIDE_BETS.ODD,
  },

  LOW: {
    payout: 1,
    numbers: () => OUTSIDE_BETS.LOW,
  },

  HIGH: {
    payout: 1,
    numbers: () => OUTSIDE_BETS.HIGH,
  },
};

const STRAIGHTS = Array.from({ length: 37 }, (_, number) => [number]);

const SPLITS = [
  [0, 1],
  [0, 2],
  [0, 3],
];

const TRIOS = [
  [0, 1, 2],
  [0, 2, 3],
];

const STREETS = [];
const CORNERS = [];
const SIX_LINES = [];

const FIRST_FOUR = [[0, 1, 2, 3]];

for (let number = 1; number <= 36; number += 1) {
  if (number % 3 !== 0) {
    SPLITS.push([number, number + 1]);
  }

  if (number <= 33) {
    SPLITS.push([number, number + 3]);
  }
}

for (let first = 1; first <= 34; first += 3) {
  STREETS.push([first, first + 1, first + 2]);
}

for (let first = 1; first <= 31; first += 3) {
  CORNERS.push([first, first + 1, first + 3, first + 4]);

  CORNERS.push([first + 1, first + 2, first + 4, first + 5]);

  SIX_LINES.push([
    first,
    first + 1,
    first + 2,
    first + 3,
    first + 4,
    first + 5,
  ]);
}

const ROULETTE_POSITIONS = {
  STRAIGHT: STRAIGHTS,
  SPLIT: SPLITS,
  TRIO: TRIOS,
  STREET: STREETS,
  CORNER: CORNERS,
  FIRST_FOUR,
  SIX_LINE: SIX_LINES,
};

const ALLOWED_CHIP_VALUES = [1, 2, 5, 10, 25, 50, 100];

const MIN_BET_AMOUNT = 1;
const MAX_BET_PER_POSITION = 1000;
const MAX_TOTAL_BET_AMOUNT = 2000;

const THEORETICAL_RTP = 36 / 37;
const HOUSE_EDGE = 1 / 37;

module.exports = {
  CONFIG_VERSION,

  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,

  RED_NUMBERS,
  BLACK_NUMBERS,
  EUROPEAN_WHEEL_ORDER,
  NUMBER_COLORS,

  DOZENS,
  COLUMNS,
  OUTSIDE_BETS,

  BET_TYPES,
  ROULETTE_POSITIONS,

  ALLOWED_CHIP_VALUES,
  MIN_BET_AMOUNT,
  MAX_BET_PER_POSITION,
  MAX_TOTAL_BET_AMOUNT,

  THEORETICAL_RTP,
  HOUSE_EDGE,
};
