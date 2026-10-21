const {
  NUMBER_COLORS,
  BET_TYPES,
  ROULETTE_POSITIONS,
  MIN_BET_AMOUNT,
  MAX_TOTAL_BET_AMOUNT,
} = require("../config/rouletteConfig");

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
  if (!bet || typeof bet !== "object" || !Object.hasOwn(BET_TYPES, bet.type)) {
    throw createRouletteError("Érvénytelen fogadás.");
  }

  if (!Number.isSafeInteger(bet.amount) || bet.amount < MIN_BET_AMOUNT) {
    throw createRouletteError("Érvénytelen tétösszeg.");
  }

  const betConfig = BET_TYPES[bet.type];
  const validPositions = VALID_POSITION_KEYS[bet.type];

  if (validPositions) {
    if (!Array.isArray(bet.numbers) || !bet.numbers.every(Number.isInteger)) {
      throw createRouletteError("Érvénytelen fogadási számok.");
    }

    const numbers = [...bet.numbers].sort((first, second) => first - second);

    if (!validPositions.has(positionKey(numbers))) {
      throw createRouletteError("Érvénytelen fogadási pozíció.");
    }

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

  if (
    !Number.isSafeInteger(totalBetAmount) ||
    totalBetAmount > MAX_TOTAL_BET_AMOUNT
  ) {
    throw createRouletteError(
      "A teljes tét meghaladja a megengedett maximumot.",
    );
  }

  const mergedBets = new Map();

  for (const bet of preparedBets) {
    const numbers = [...bet.numbers].sort((first, second) => first - second);

    const key = `${bet.type}:${numbers.join("-")}`;
    const existingBet = mergedBets.get(key);

    if (existingBet) {
      existingBet.amount += bet.amount;
    } else {
      mergedBets.set(key, {
        type: bet.type,
        numbers,
        amount: bet.amount,
      });
    }
  }

  const requestBets = [...mergedBets.entries()]
    .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
    .map(([, bet]) => bet);

  return {
    preparedBets,
    totalBetAmount,
    requestBets,
  };
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

function playRouletteGame({ preparedBets, totalBetAmount, randomInt }) {
  if (typeof randomInt !== "function") {
    throw createRouletteError("A véletlenszám-generátor hiányzik.", 500);
  }

  const winningNumber = randomInt(37);

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
