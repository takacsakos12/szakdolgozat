const CONFIG_VERSION = "BaccaratConfig_v1.0.0";

const GAME_TYPE = "BACCARAT";
const GAME_MODE = "STANDARD";
const GAME_DOMAIN = "BACCARAT:STANDARD";
const DECK_COUNT = 8;
const MIN_BET = 1;
const MAX_BET = 2000;

const SUITS = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];

const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "JACK",
  "QUEEN",
  "KING",
  "ACE",
];

const CARD_VALUES = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 0,
  JACK: 0,
  QUEEN: 0,
  KING: 0,
  ACE: 1,
};

const BET_TYPES = {
  PLAYER: {
    payout: 1,
  },
  BANKER: {
    payout: 0.95,
  },
  TIE: {
    payout: 8,
  },
};

const SIDE_BETS = {
  PLAYER_PAIR: {
    payout: 11,
  },
  BANKER_PAIR: {
    payout: 11,
  },
  EITHER_PAIR: {
    payout: 5,
  },
  PERFECT_PAIR: {
    payout: 25,
  },
};

const RULES = {
  naturalValue: [8, 9],
  playerDrawMaxValue: 5,
  mainBetsPushOnTie: true,
};

const CHIPS = [1, 5, 10, 25, 50, 100];

module.exports = {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
  DECK_COUNT,
  MIN_BET,
  MAX_BET,
  SUITS,
  RANKS,
  CARD_VALUES,
  BET_TYPES,
  RULES,
  CHIPS,
  SIDE_BETS,
};
