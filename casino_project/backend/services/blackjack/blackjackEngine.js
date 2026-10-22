const {
  DECK_COUNT,
  SUITS,
  RANKS,
  CARD_VALUES,
  SIDE_BETS,
  RULES,
  PAYOUTS,
} = require("../../config/blackjackConfig");

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

function dealInitialHands(shoe) {
  return {
    playerHand: [shoe[0], shoe[2]],
    dealerHand: [shoe[1], shoe[3]],
    nextCardIndex: 4,
  };
}

function calculateHandValue(hand) {
  let totalValue = 0;
  let aceCount = 0;

  for (const card of hand) {
    if (card.rank === "ACE") {
      aceCount++;
      totalValue += 11; // Treat Ace as 11 initially
    } else {
      totalValue += CARD_VALUES[card.rank];
    }
  }

  while (totalValue > 21 && aceCount > 0) {
    totalValue -= 10; // Treat one Ace as 1 instead of 11
    aceCount--;
  }

  return {
    totalValue,
    isSoft: aceCount > 0,
    isBust: totalValue > 21,
  };
}

function isNaturalBlackjack(hand, fromSplit = false) {
  return (
    !fromSplit &&
    hand.length === 2 &&
    calculateHandValue(hand).totalValue === 21
  );
}

function getColorCard(card) {
  return card.suit === "HEARTS" || card.suit === "DIAMONDS" ? "RED" : "BLACK";
}

function evaluatePerfectPairs(hand) {
  const [firstCard, secondCard] = hand;

  if (firstCard.rank !== secondCard.rank) {
    return null;
  }

  if (firstCard.suit === secondCard.suit) {
    return "PERFECT_PAIR";
  }

  if (getColorCard(firstCard) === getColorCard(secondCard)) {
    return "COLOURED_PAIR";
  }

  return "MIXED_PAIR";
}

function evaluate21Plus3(hand, dealerUpCard) {
  const cards = [...hand, dealerUpCard];

  const sameRank = cards.every((card) => card.rank === cards[0].rank);
  const sameSuit = cards.every((card) => card.suit === cards[0].suit);

  const rankValues = cards
    .map((card) => RANKS.indexOf(card.rank) + 2)
    .sort((first, second) => first - second);

  const [first, second, third] = rankValues;

  const isStraight =
    (first + 1 === second && second + 1 === third) ||
    (first === 2 && second === 3 && third === 14);

  if (sameRank && sameSuit) {
    return "SUITED_TRIPS";
  }

  if (sameSuit && isStraight) {
    return "STRAIGHT_FLUSH";
  }

  if (sameRank) {
    return "THREE_OF_A_KIND";
  }

  if (isStraight) {
    return "STRAIGHT";
  }

  if (sameSuit) {
    return "FLUSH";
  }
  return null;
}

function evaluateSideBets({
  playerHand,
  dealerUpCard,
  perfectPairsBet = 0,
  twentyOnePlusThreeBet = 0,
}) {
  const categories = {
    PERFECT_PAIRS: evaluatePerfectPairs(playerHand),
    TWENTY_ONE_PLUS_THREE: evaluate21Plus3(playerHand, dealerUpCard),
  };
  const amounts = {
    PERFECT_PAIRS: perfectPairsBet,
    TWENTY_ONE_PLUS_THREE: twentyOnePlusThreeBet,
  };

  const bets = Object.entries(amounts).map(([type, amount]) => {
    const category = amount > 0 ? categories[type] : null;
    const payout = category ? SIDE_BETS[type].payouts[category] : 0;

    return {
      type,
      amount,
      category,
      payout,
      winAmount: category ? amount * (payout + 1) : 0,
    };
  });

  return {
    bets,
    cost: perfectPairsBet + twentyOnePlusThreeBet,
    totalWin: bets.reduce((sum, bet) => sum + bet.winAmount, 0),
  };
}

function drawCard(round) {
  const card = round.shoe[round.nextCardIndex];

  if (!card) {
    throw new Error("Nincs több kártya a cipőben.");
  }
  round.nextCardIndex++;
  return card;
}

function createHand(cards, bet, fromSplit = false) {
  return {
    cards,
    bet,
    fromSplit,
    status: "ACTIVE",
  };
}

function finishBlackjackRound(round) {
  let dealerHandValue = calculateHandValue(round.dealerHand);

  const dealerBlackjack = isNaturalBlackjack(round.dealerHand);

  const dealerNeedsToPlay = round.hands.some(
    (hand) =>
      !calculateHandValue(hand.cards).isBust &&
      !isNaturalBlackjack(hand.cards, hand.fromSplit),
  );

  if (dealerNeedsToPlay && !dealerBlackjack) {
    while (
      dealerHandValue.totalValue < RULES.dealerStandValue ||
      (RULES.dealerHitsSoft17 &&
        dealerHandValue.totalValue === RULES.dealerStandValue &&
        dealerHandValue.isSoft)
    ) {
      round.dealerHand.push(drawCard(round));

      dealerHandValue = calculateHandValue(round.dealerHand);
    }
  }

  const hands = round.hands.map((hand) => {
    const handValue = calculateHandValue(hand.cards);

    const blackjack = isNaturalBlackjack(hand.cards, hand.fromSplit);

    let outcome;
    let winAmount = 0;

    if (handValue.isBust) {
      outcome = "BUST";
    } else if (dealerBlackjack) {
      outcome = blackjack ? "PUSH" : "LOSE";
      winAmount = blackjack ? hand.bet : 0;
    } else if (blackjack) {
      outcome = "BLACKJACK";
      winAmount = hand.bet * (PAYOUTS.BLACKJACK + 1);
    } else if (
      dealerHandValue.isBust ||
      handValue.totalValue > dealerHandValue.totalValue
    ) {
      outcome = "WIN";
      winAmount = hand.bet * (PAYOUTS.WIN + 1);
    } else if (handValue.totalValue === dealerHandValue.totalValue) {
      outcome = "PUSH";
      winAmount = hand.bet;
    } else {
      outcome = "LOSE";
    }

    return {
      ...hand,
      status: "FINISHED",
      totalValue: handValue.totalValue,
      outcome,
      winAmount,
    };
  });

  const insuranceWin =
    round.insuranceBet > 0 && dealerBlackjack
      ? round.insuranceBet * (PAYOUTS.INSURANCE_WIN + 1)
      : 0;

  const totalWin =
    hands.reduce((sum, hand) => sum + hand.winAmount, 0) +
    insuranceWin +
    round.sideBets.totalWin;

  round.hands = hands;
  round.phase = "FINISHED";
  round.activeHandIndex = null;

  round.result = {
    hands,
    dealerHand: round.dealerHand,
    dealerTotalValue: dealerHandValue.totalValue,
    sideBets: round.sideBets,

    insurance: {
      amount: round.insuranceBet,
      winAmount: insuranceWin,
    },

    cost: round.cost,
    totalWin,
    netResult: totalWin - round.cost,
  };
}

function advanceHand(round) {
  const nextIndex = round.hands.findIndex(
    (hand, index) => hand.status === "ACTIVE" && index >= round.activeHandIndex,
  );

  if (nextIndex === -1) {
    finishBlackjackRound(round);
  } else {
    round.activeHandIndex = nextIndex;
  }
}

function resolveOpening(round) {
  const playerBlackjack = isNaturalBlackjack(round.hands[0].cards);

  const dealerBlackjack = isNaturalBlackjack(round.dealerHand);

  if (playerBlackjack || (RULES.dealerChecksBlackjack && dealerBlackjack)) {
    finishBlackjackRound(round);
  } else {
    round.phase = "PLAYER_TURN";
  }
}

function startBlackjackRound({
  baseBet,
  randomInt,
  perfectPairsBet = 0,
  twentyOnePlusThreeBet = 0,
}) {
  const shoe = shuffleShoe(createShoe(), randomInt);
  const opening = dealInitialHands(shoe);
  const sideBets = evaluateSideBets({
    playerHand: opening.playerHand,
    dealerUpCard: opening.dealerHand[0],
    perfectPairsBet,
    twentyOnePlusThreeBet,
  });
  const round = {
    shoe,
    nextCardIndex: opening.nextCardIndex,
    dealerHand: opening.dealerHand,
    hands: [createHand(opening.playerHand, baseBet)],
    activeHandIndex: 0,
    baseBet,
    cost: baseBet + sideBets.cost,
    insuranceBet: 0,
    sideBets,
    phase: "PLAYER_TURN",
    result: null,
  };

  if (RULES.insuranceAllowed && round.dealerHand[0].rank === "ACE") {
    round.phase = "INSURANCE";
  } else {
    resolveOpening(round);
  }

  return round;
}

function getAvailableActions(round) {
  if (round.phase === "INSURANCE") {
    return ["INSURANCE", "DECLINE_INSURANCE"];
  }

  if (round.phase !== "PLAYER_TURN") {
    return [];
  }

  const hand = round.hands[round.activeHandIndex];

  if (!hand || hand.status !== "ACTIVE") {
    return [];
  }

  const actions = ["HIT", "STAND"];
  const twoCardHand = hand.cards.length === 2;

  if (
    RULES.doubleDownAllowed &&
    (!RULES.doubleOnlyOnFirstTwoCards || twoCardHand) &&
    (!hand.fromSplit || RULES.doubleAfterSplitAllowed)
  ) {
    actions.push("DOUBLE_DOWN");
  }

  if (
    RULES.splitEnabled &&
    twoCardHand &&
    round.hands.length < RULES.maxHands
  ) {
    const [firstCard, secondCard] = hand.cards;
    const matchingCards = RULES.splitByValue
      ? calculateHandValue([firstCard]).totalValue ===
        calculateHandValue([secondCard]).totalValue
      : firstCard.rank === secondCard.rank;

    if (matchingCards) {
      actions.push("SPLIT");
    }
  }

  return actions;
}

function applyBlackjackAction(round, action, insuranceAmount) {
  if (!getAvailableActions(round).includes(action)) {
    const error = new Error("Ez a művelet most nem engedélyezett.");

    error.statusCode = 400;
    throw error;
  }

  const next = structuredClone(round);

  if (action === "INSURANCE" || action === "DECLINE_INSURANCE") {
    if (action === "INSURANCE") {
      const maximum = next.baseBet * RULES.maxInsuranceBetRatio;

      const amount = insuranceAmount ?? maximum;

      if (
        !Number.isSafeInteger(amount * 2) ||
        amount <= 0 ||
        amount > maximum
      ) {
        const error = new Error("Érvénytelen biztosítási összeg.");

        error.statusCode = 400;
        throw error;
      }

      next.insuranceBet = amount;
      next.cost += amount;
    }

    resolveOpening(next);
    return next;
  }

  const hand = next.hands[next.activeHandIndex];

  if (action === "HIT") {
    hand.cards.push(drawCard(next));

    const handValue = calculateHandValue(hand.cards);

    if (handValue.isBust || handValue.totalValue === 21) {
      hand.status = handValue.isBust ? "BUST" : "STAND";
      advanceHand(next);
    }
  } else if (action === "STAND") {
    hand.status = "STAND";
    advanceHand(next);
  } else if (action === "DOUBLE_DOWN") {
    next.cost += hand.bet;
    hand.bet *= 2;

    hand.cards.push(drawCard(next));

    hand.status = calculateHandValue(hand.cards).isBust ? "BUST" : "STAND";

    advanceHand(next);
  } else if (action === "SPLIT") {
    const [firstCard, secondCard] = hand.cards;

    next.cost += hand.bet;

    const splitHands = [
      createHand([firstCard, drawCard(next)], hand.bet, true),
      createHand([secondCard, drawCard(next)], hand.bet, true),
    ];

    const splitAces = firstCard.rank === "ACE" && secondCard.rank === "ACE";

    for (const splitHand of splitHands) {
      if (
        (splitAces && RULES.splitAcesOnlyOneCard) ||
        calculateHandValue(splitHand.cards).totalValue === 21
      ) {
        splitHand.status = "STAND";
      }
    }

    next.hands.splice(next.activeHandIndex, 1, ...splitHands);

    advanceHand(next);
  }

  return next;
}

module.exports = {
  createShoe,
  shuffleShoe,
  dealInitialHands,
  calculateHandValue,
  isNaturalBlackjack,
  evaluatePerfectPairs,
  evaluate21Plus3,
  evaluateSideBets,
  startBlackjackRound,
  getAvailableActions,
  applyBlackjackAction,
};
