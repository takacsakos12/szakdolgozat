const {
  DECK_COUNT,
  SUITS,
  RANKS,
  CARD_VALUES,
  RULES,
  BET_TYPES,
  SIDE_BETS,
  MIN_BET,
  MAX_BET,
} = require("../../config/baccaratConfig");

function createShoe() {
  const cards = [];

  for (let deck = 0; deck < DECK_COUNT; deck++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${deck}-${suit}-${rank}`, rank, suit });
      }
    }
  }

  return cards;
}

function shuffleShoe(shoe, randomInt) {
  if (typeof randomInt !== "function") {
    throw new Error("A randomInt függvény nem lett megadva.");
  }

  const shuffledCards = [...shoe];

  for (let index = shuffledCards.length - 1; index > 0; index--) {
    const otherIndex = randomInt(index + 1);
    [shuffledCards[index], shuffledCards[otherIndex]] = [
      shuffledCards[otherIndex],
      shuffledCards[index],
    ];
  }

  return shuffledCards;
}

function calculateHandValue(hand) {
  let totalValue = 0;

  for (const card of hand) {
    totalValue += CARD_VALUES[card.rank];
  }

  return totalValue % 10;
}

function shouldBankerDraw(bankerValue, playerThirdCardValue) {
  if (playerThirdCardValue === null) {
    return bankerValue <= 5;
  }
  if (bankerValue <= 2) {
    return true;
  }
  if (bankerValue === 3) {
    return playerThirdCardValue !== 8;
  }
  if (bankerValue === 4) {
    return playerThirdCardValue >= 2 && playerThirdCardValue <= 7;
  }
  if (bankerValue === 5) {
    return playerThirdCardValue >= 4 && playerThirdCardValue <= 7;
  }
  if (bankerValue === 6) {
    return playerThirdCardValue === 6 || playerThirdCardValue === 7;
  }
  return false;
}

function dealBaccaratHands(shoe) {
  const playerHand = [shoe[0], shoe[2]];
  const bankerHand = [shoe[1], shoe[3]];

  let nextCardIndex = 4;

  const initialPlayerValue = calculateHandValue(playerHand);
  const initialBankerValue = calculateHandValue(bankerHand);

  const natural =
    RULES.naturalValue.includes(initialPlayerValue) ||
    RULES.naturalValue.includes(initialBankerValue);

  if (!natural) {
    let playerThirdCardValue = null;

    if (initialPlayerValue <= RULES.playerDrawMaxValue) {
      const card = shoe[nextCardIndex++];

      playerHand.push(card);
      playerThirdCardValue = CARD_VALUES[card.rank];
    }

    if (shouldBankerDraw(initialBankerValue, playerThirdCardValue)) {
      bankerHand.push(shoe[nextCardIndex++]);
    }
  }

  const playerValue = calculateHandValue(playerHand);
  const bankerValue = calculateHandValue(bankerHand);

  let winner = "TIE";

  if (playerValue > bankerValue) {
    winner = "PLAYER";
  } else if (bankerValue > playerValue) {
    winner = "BANKER";
  }

  return {
    playerHand,
    bankerHand,
    initialPlayerValue,
    initialBankerValue,
    playerValue,
    bankerValue,
    natural,
    winner,
    nextCardIndex,
  };
}

function createBaccaratError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function prepareBaccaratBets(bets) {
  if (!Array.isArray(bets) || bets.length === 0) {
    throw createBaccaratError("Legalább egy fogadás szükséges.");
  }

  const betConfigs = {
    ...BET_TYPES,
    ...SIDE_BETS,
  };

  const amounts = new Map();
  let totalBetAmount = 0;

  for (const bet of bets) {
    if (!bet || !Object.hasOwn(betConfigs, bet.type)) {
      throw createBaccaratError("Érvénytelen fogadástípus.");
    }
    if (!Number.isSafeInteger(bet.amount) || bet.amount < MIN_BET) {
      throw createBaccaratError(
        `A fogadás összege legalább ${MIN_BET} CR egész szám legyen.`,
      );
    }
    if (bet.amount > MAX_BET - totalBetAmount) {
      throw createBaccaratError(`A maximális össztét ${MAX_BET} CR.`);
    }

    totalBetAmount += bet.amount;

    amounts.set(bet.type, (amounts.get(bet.type) ?? 0) + bet.amount);
  }

  const requestBets = [...amounts.entries()]
    .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
    .map(([type, amount]) => ({
      type,
      amount,
    }));

  const preparedBets = requestBets.map((bet) => ({
    ...bet,
    payout: betConfigs[bet.type].payout,
  }));

  return {
    preparedBets,
    requestBets,
    totalBetAmount,
  };
}

function evaluateBets(bets, playerHand, bankerHand) {
  const playerValue = calculateHandValue(playerHand);
  const bankerValue = calculateHandValue(bankerHand);

  const playerPair = playerHand[0].rank === playerHand[1].rank;

  const bankerPair = bankerHand[0].rank === bankerHand[1].rank;

  const playerPerfectPair =
    playerPair && playerHand[0].suit === playerHand[1].suit;

  const bankerPerfectPair =
    bankerPair && bankerHand[0].suit === bankerHand[1].suit;

  const isTie = playerValue === bankerValue;

  const winningBets = {
    PLAYER: playerValue > bankerValue,
    BANKER: bankerValue > playerValue,
    TIE: isTie,

    PLAYER_PAIR: playerPair,
    BANKER_PAIR: bankerPair,
    EITHER_PAIR: playerPair || bankerPair,
    PERFECT_PAIR: playerPerfectPair || bankerPerfectPair,
  };

  return bets.map((bet) => {
    const isWinner = winningBets[bet.type];

    const isPush =
      RULES.mainBetsPushOnTie &&
      isTie &&
      (bet.type === "PLAYER" || bet.type === "BANKER");

    const returnMultiplierInCents = Math.round((bet.payout + 1) * 100);

    const winAmountInCents = isWinner
      ? bet.amount * returnMultiplierInCents
      : isPush
        ? bet.amount * 100
        : 0;

    return {
      type: bet.type,
      amount: bet.amount,
      payout: bet.payout,
      isWinner,
      isPush,
      winAmount: winAmountInCents / 100,
    };
  });
}

function playBaccaratGame({ preparedBets, totalBetAmount, randomInt }) {
  const shoe = shuffleShoe(createShoe(), randomInt);

  const dealt = dealBaccaratHands(shoe);

  const evaluatedBets = evaluateBets(
    preparedBets,
    dealt.playerHand,
    dealt.bankerHand,
  );

  const totalWinInCents = evaluatedBets.reduce(
    (sum, bet) => sum + Math.round(bet.winAmount * 100),
    0,
  );

  return {
    playerHand: dealt.playerHand,
    bankerHand: dealt.bankerHand,

    initialPlayerValue: dealt.initialPlayerValue,
    initialBankerValue: dealt.initialBankerValue,

    playerValue: dealt.playerValue,
    bankerValue: dealt.bankerValue,

    natural: dealt.natural,
    winner: dealt.winner,

    bets: evaluatedBets,

    cost: totalBetAmount,
    totalWin: totalWinInCents / 100,
    netResult: (totalWinInCents - totalBetAmount * 100) / 100,
  };
}

module.exports = {
  createShoe,
  shuffleShoe,
  calculateHandValue,
  shouldBankerDraw,
  dealBaccaratHands,

  prepareBaccaratBets,
  evaluateBets,
  playBaccaratGame,
};
