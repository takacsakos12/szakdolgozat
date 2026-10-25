import "../pages/BlackjackPage.css";

const SUITS = {
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

function PlayingCard(rank, suit) {
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

  rank = RANK_LABELS[card.rank] ?? card.rank;
  suit = SUITS[card.suit];
  const isRed = card.suit === "HEARTS" || card.suit === "DIAMONDS";

  return (
    <div className={`playing-card ${isRed ? "card-red" : "card-black"}`}>
      <span className="card-rank">{rank}</span>
      <span className="card-suit">{suit}</span>
      <span className="card-rank">{rank}</span>
    </div>
  );
}

export default PlayingCard;
