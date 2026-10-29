const CONFIG_VERSION = "BlackjackConfig_v1.1.0";

const GAME_TYPE = "BLACKJACK";
const GAME_MODE = "STANDARD";
const GAME_DOMAIN = "BLACKJACK:STANDARD";

const DECK_COUNT = 8;

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
  10: 10,
  JACK: 10,
  QUEEN: 10,
  KING: 10,
  ACE: [1, 11],
};

const RULES = {
  dealerStandValue: 17,
  dealerHitsSoft17: false,
  dealerChecksBlackjack: true,
  doubleDownAllowed: true,
  doubleOnlyOnFirstTwoCards: true,
  doubleAfterSplitAllowed: true,
  splitEnabled: true,
  splitByValue: true,
  maxHands: 2,
  splitAcesOnlyOneCard: true,
  insuranceAllowed: true,
  maxInsuranceBetRatio: 0.5,
};

const PAYOUTS = {
  BLACKJACK: 3 / 2,
  WIN: 1,
  INSURANCE_WIN: 2,
};

const allowedChipValues = [1, 5, 10, 25, 50, 100];

const MIN_BET = 1;
const MAX_BET = 1000;

const SIDE_BETS = {
  PERFECT_PAIRS: {
    enabled: true,
    minBet: 1,
    maxBet: 1000,

    payouts: {
      PERFECT_PAIR: 25,
      COLOURED_PAIR: 12,
      MIXED_PAIR: 6,
    },
  },

  TWENTY_ONE_PLUS_THREE: {
    enabled: true,
    minBet: 1,
    maxBet: 1000,

    payouts: {
      SUITED_TRIPS: 100,
      STRAIGHT_FLUSH: 40,
      THREE_OF_A_KIND: 30,
      STRAIGHT: 10,
      FLUSH: 5,
    },
  },
};

module.exports = {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
  DECK_COUNT,
  SUITS,
  RANKS,
  CARD_VALUES,
  RULES,
  PAYOUTS,
  allowedChipValues,
  MIN_BET,
  MAX_BET,
  SIDE_BETS,
};
