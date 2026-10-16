const {
  NUMBER_COLORS,
  BET_TYPES,
  ROULETTE_POSITIONS,
  MIN_BET_AMOUNT,
  MAX_BET_PER_POSITION,
  MAX_TOTAL_BET_AMOUNT,
} = require("../config/RouletteConfig");

const UINT32_RANGE = 0x100000000;

function createRouletteError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function positionKey(numbers) {
  return [...numbers].sort((first, second) => first - second).join("-");
}

const VALID_POSITION_KEYS = Object.fromEntries(
  Object.entries(ROULETTE_POSITIONS).map(([type, positions]) => [
    type,
    new Set(positions.map(positionKey)),
  ]),
);

function prepareBet(bet) {
  const betConfig = BET_TYPES[bet?.type];
  if (!bet || typeof bet !== "object" || !betConfig) {
    throw createRouletteError("Érvénytelen fogadás.");
  }

  if (
    !Number.isInteger(bet.amount) ||
    bet.amount < MIN_BET_AMOUNT ||
    bet.amount > MAX_BET_PER_POSITION
  ) {
    throw createRouletteError("Érvénytelen tétösszeg.");
  }

  const validPositions = VALID_POSITION_KEYS[bet.type];

  if (validPositions) {
    const numbers = Array.isArray(bet.numbers)
      ? [...bet.numbers].sort((first, second) => first - second)
      : [];

    return {
      type: bet.type,
      amount: bet.amount,
      numbers,
      winningNumbers: numbers,
      payout: betConfig.payout,
    };
  }

  return {
    type: bet.type,
    amount: bet.amount,
    numbers: [],
    winningNumbers: betConfig.numbers(),
    payout: betConfig.payout,
  };
}

function prepareRouletteBets(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    throw createRouletteError("Legalább egy fogadás szükséges.");
  }
  const preparedBets = bets.map(prepareBet);

  const totalBetAmount = preparedBets.reduce(
    (total, bet) => total + bet.amount,
    0,
  );

  if (totalBetAmount > MAX_TOTAL_BET_AMOUNT) {
    throw createRouletteError(
      "A teljes tét meghaladja a megengedett maximumot.",
    );
  }

  return {
    preparedBets,
    totalBetAmount,
  };
}

function getRandomInteger(random, range) {
  const maxAcceptableValue = UINT32_RANGE - (UINT32_RANGE % range);

  while (true) {
    const randomValue = random();

    const randomInteger = Math.floor(randomValue * UINT32_RANGE);

    if (randomInteger < maxAcceptableValue) {
      return randomInteger % range;
    }
  }
}

function evaluateBet(bet, winningNumber) {
  const isWinner = bet.winningNumbers.includes(winningNumber);

  return {
    type: bet.type,
    numbers: bet.numbers,
    amount: bet.amount,
    payout: bet.payout,
    isWinner,
    winAmount: isWinner ? bet.amount * (bet.payout + 1) : 0,
  };
}

function playRouletteGame({ bets, random = Math.random }) {
  const { preparedBets, totalBetAmount } = prepareRouletteBets(bets);

  const winningNumber = getRandomInteger(random, 37);

  const evaluatedBets = preparedBets.map((bet) =>
    evaluateBet(bet, winningNumber),
  );

  const totalWin = evaluatedBets.reduce(
    (total, bet) => total + bet.winAmount,
    0,
  );

  return {
    winningNumber,
    winningColor: NUMBER_COLORS[winningNumber],
    bets: evaluatedBets,
    cost: totalBetAmount,
    totalWin,
    netResult: totalWin - totalBetAmount,
  };
}

module.exports = {
  prepareRouletteBets,
  playRouletteGame,
};
