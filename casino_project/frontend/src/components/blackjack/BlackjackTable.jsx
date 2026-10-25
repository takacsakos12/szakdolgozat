import PlayingCard from "./PlayingCard";

const OUTCOME_LABELS = {
  WIN: "Nyertél!",
  LOSE: "Vesztettél!",
  PUSH: "Döntetlen!",
  BUST: "Besokalltál!",
  BLACKJACK: "Blackjack!",
};

function BlackjackTable({ game }) {
  const finished = game?.phase === "FINISHED";

  return (
    <section className="blackjack-table" aria-label="Blackjack asztal">
      <div className="blackjack-dealer">
        <h2>Osztó</h2>
        {finished && (
          <span className="blackjack-hand-value">
            {game.result.dealerTotalValue}
          </span>
        )}
        <div className="blackjack-cards">
          {game?.dealerHand.map((card, index) => (
            <PlayingCard key={index} card={card} />
          ))}
        </div>
      </div>
      {!game ? (
        <p className="blackjack-table-message">
          Válassz tétet és kezdj el játszani!
        </p>
      ) : (
        <div className="blackjack-player-hands">
          {game.hands.map((hand, index) => {
            const isActive =
              game.phase === "PLAYER_TURN" && game.activeHandIndex === index;
            const outcome = game.result?.hands[index]?.outcome;

            return (
              <div
                key={index}
                className={`blackjack-hand ${isActive ? "active" : ""}`}
              >
                <h2>
                  {game.hands.length > 1 ? `${index + 1}. kéz` : "Saját kéz"}
                </h2>
                <span className="blackjack-hand-value">
                  {hand.totalValue}
                  {hand.isSoft && " (soft)"}
                </span>
                <div className="blackjack-cards">
                  {hand.cards.map((card, cardIndex) => (
                    <PlayingCard key={cardIndex} card={card} />
                  ))}
                </div>

                <span className="blackjack-hand-bet">Tét: {hand.bet} CR</span>

                {finished && (
                  <strong className="blackjack-hand-outcome">
                    {OUTCOME_LABELS[outcome] ?? outcome}
                  </strong>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default BlackjackTable;
