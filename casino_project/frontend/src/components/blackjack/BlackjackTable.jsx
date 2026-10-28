import { useRef } from "react";
import DealtCard from "../DealtCards";

const OUTCOME_LABELS = {
  WIN: "Nyertél!",
  LOSE: "Vesztettél!",
  PUSH: "Döntetlen!",
  BUST: "Besokalltál!",
  BLACKJACK: "Blackjack!",
};

function BlackjackTable({ game, isAnimating = false }) {
  const deckRef = useRef(null);

  const finished = game?.phase === "FINISHED" && !isAnimating;

  return (
    <section
      className="blackjack-table"
      aria-label="Blackjack asztal"
      aria-busy={isAnimating}
    >
      <div ref={deckRef} className="blackjack-shoe" aria-hidden="true" />

      <div className="blackjack-dealer">
        <h2>Osztó</h2>

        {finished && (
          <span className="blackjack-hand-value">
            {game.result.dealerTotalValue}
          </span>
        )}

        <div className="blackjack-cards">
          {game?.dealerHand.map((card, index) => (
            <DealtCard
              key={`${game.sessionId}-dealer-${index}`}
              card={card}
              deckRef={deckRef}
              animate={card.animateDeal === true}
            />
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
              !isAnimating &&
              game.phase === "PLAYER_TURN" &&
              game.activeHandIndex === index;

            const outcome = game.result?.hands[index]?.outcome;

            return (
              <div
                key={`${game.sessionId}-hand-${index}`}
                className={`blackjack-hand ${
                  isActive ? "blackjack-hand-active" : ""
                }`}
              >
                <h2>
                  {game.hands.length > 1 ? `${index + 1}. kéz` : "Saját kéz"}
                </h2>

                <span className="blackjack-hand-value">
                  {isAnimating ? "—" : hand.totalValue}

                  {!isAnimating && hand.isSoft && " (soft)"}
                </span>

                <div className="blackjack-cards">
                  {hand.cards.map((card, cardIndex) => (
                    <DealtCard
                      key={`${game.sessionId}-player-${index}-${cardIndex}`}
                      card={card}
                      deckRef={deckRef}
                      animate={card.animateDeal === true}
                    />
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
