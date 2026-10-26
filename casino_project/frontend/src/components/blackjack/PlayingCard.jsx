const SUIT_SYMBOLS = {
  HEARTS: "♥",
  DIAMONDS: "♦",
  CLUBS: "♣",
  SPADES: "♠",
};

const RANK_LABELS = {
  JACK: "J",
  QUEEN: "Q",
  KING: "K",
  ACE: "A",
};

function PlayingCard({ card }) {
  if (card.hidden) {
    return (
      <div
        className="playing-card playing-card-back"
        aria-label="Rejtett kártya"
      >
        <span aria-hidden="true">♠</span>
      </div>
    );
  }

  const rank = RANK_LABELS[card.rank] ?? card.rank;
  const suit = SUIT_SYMBOLS[card.suit];
  const isRed = card.suit === "HEARTS" || card.suit === "DIAMONDS";

  return (
    <div className={`playing-card ${isRed ? "card-red" : "card-black"}`}>
      <span className="playing-card-rank">{rank}</span>
      <span className="playing-card-suit">{suit}</span>
      <span className="playing-card-rank">{rank}</span>
    </div>
  );
}

export default PlayingCard;
