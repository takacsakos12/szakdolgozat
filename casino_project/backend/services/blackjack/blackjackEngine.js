const {
  DECK_COUNT,
  SUITS,
  RANKS,
  CARD_VALUES,
  SIDE_BETS,
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
        !fromSplit && hand.length === 2 && calculateHandValue(hand).totalValue === 21
    );
}

function getColorCard(card) {
    return card.suit === "HEARTS" || card.suit === "DIAMONDS" ? "RED" : "BLACK";
}

function evaluatePerfectPairs(hand) {
    const [firstCard, secondCard] = hand;

    if (firsCard.rank !== secondCard.rank) {
        return null;
    }

    if (firstCard.suit === secondCard.suit) {
        return "PERFECT_PAIR";
    }

    if (getColorCard(firstCard) === getColorCard(secondCard)) {
        return "COLORED_PAIR";
    }

    return "MIXED_PAIR";
}


function evaluate21Plus3(hand, dealerUpCard) {
    const cards = [...hand, dealerUpCard];

    const sameRank = cards.every((card) => card.rank === cards[0].rank);
    const sameSuit = cards.every((card) => card.suit === cards[0].suit);

    const rankValues = cards.map((card) => RANKS.indexOf(card.rank) + 2).sort((first, second) => first - second);
    
    const [first, second, third] = rankValues;

    const isStraight = (first + 1 === second && second + 1 === third) || (first === 2 && second === 3 && third === 14);

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

