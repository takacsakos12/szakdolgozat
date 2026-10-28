import { useRef } from "react";
import DealtCards from "../DealtCards";
const CHIP_COLORS = {
  1: "#dce1e8",
  2: "#778395",
  5: "#b9404d",
  10: "#3578bc",
  25: "#32875d",
  50: "#8957b2",
  100: "#292d38",
};

const MAIN_BETS = [
  { type: "PLAYER", label: "Player" },
  { type: "TIE", label: "Tie" },
  { type: "BANKER", label: "Banker" },
];

const SIDE_BETS = [
  { type: "PLAYER_PAIR", label: "Player Pair" },
  { type: "BANKER_PAIR", label: "Banker Pair" },
  { type: "EITHER_PAIR", label: "Either Pair" },
  { type: "PERFECT_PAIR", label: "Perfect Pair" },
];

function getBetChips(amount, chipValues) {
  const denominations = [...chipValues].sort((first, second) => second - first);

  const chips = [];

  for (const value of denominations) {
    const count = Math.floor(amount / value);

    for (let index = 0; index < count; index++) {
      chips.push(value);
    }

    amount -= count * value;
  }

  return chips;
}

function BaccaratTable({
  config,
  result,
  bets,
  disabled = false,
  isDealing = false,
  onPlaceBet,
  children,
}) {
  const deckRef = useRef(null);

  const amounts = new Map();

  for (const bet of bets) {
    amounts.set(bet.type, (amounts.get(bet.type) ?? 0) + bet.amount);
  }

  function renderChips(amount) {
    if (amount === 0) {
      return <span className="baccarat-empty-bet">+</span>;
    }

    const chips = getBetChips(amount, config.chips);

    return (
      <span className="baccarat-bet-chips" aria-hidden="true">
        {chips.slice(0, 6).map((value, index) => (
          <span
            key={index}
            className="baccarat-bet-chip"
            style={{
              "--chip-color": CHIP_COLORS[value] ?? "#3578bc",
              "--chip-text": value === 1 ? "#252a34" : "#ffffff",
              "--chip-stripe": value === 1 ? "#657084" : "#f3f0e7",
            }}
          >
            <span>{value}</span>
          </span>
        ))}

        {chips.length > 6 && (
          <span className="baccarat-chip-count">×{chips.length}</span>
        )}
      </span>
    );
  }

  function renderBet({ type, label }) {
    const betConfig = config.betTypes[type] ?? config.sideBets[type];

    if (!betConfig) {
      return null;
    }

    const amount = amounts.get(type) ?? 0;

    const won =
      result?.bets.some((bet) => bet.type === type && bet.isWinner) ?? false;

    return (
      <button
        key={type}
        type="button"
        className={[
          "baccarat-bet",
          `baccarat-bet-${type.toLowerCase()}`,
          won ? "baccarat-bet-won" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        onClick={() => onPlaceBet({ type })}
        aria-label={`${label}, ${betConfig.payout}:1 kifizetés. Tét: ${amount} CR`}
      >
        <span className="baccarat-bet-label">{label}</span>

        <span className="baccarat-bet-payout">{betConfig.payout}:1</span>

        <span className="baccarat-bet-position">{renderChips(amount)}</span>

        <span className="baccarat-bet-amount">{amount} CR</span>
      </button>
    );
  }

  function renderHand(side, label, cards, value) {
    const won = result?.winner === side;

    return (
      <div
        className={["baccarat-hand", won ? "baccarat-hand-won" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="baccarat-hand-heading">
          <h2>{label}</h2>

          <span className="baccarat-hand-value">
            {isDealing ? "—" : (value ?? "—")}
          </span>
        </div>

        <div className="baccarat-cards">
          {Array.from({ length: 3 }, (_, index) => {
            const card = cards?.[index];

            return card ? (
              <DealtCards key={card.id} card={card} deckRef={deckRef} />
            ) : (
              <div
                key={`empty-${index}`}
                className="dealt-card-empty"
                aria-hidden="true"
              />
            );
          })}
        </div>

        <span className="baccarat-hand-status">
          {isDealing
            ? "Osztás..."
            : result
              ? result.winner === "TIE"
                ? "Döntetlen"
                : won
                  ? "Nyert"
                  : "Veszített"
              : "Fogadásra vár"}
        </span>
      </div>
    );
  }

  return (
    <div className="baccarat-table">
      <section className="baccarat-card-area" aria-label="Laposztási terület">
        <div ref={deckRef} className="baccarat-shoe" aria-hidden="true"></div>
        <div className="baccarat-hands">
          {renderHand(
            "PLAYER",
            "Player",
            result?.playerHand,
            result?.playerValue,
          )}

          {renderHand(
            "BANKER",
            "Banker",
            result?.bankerHand,
            result?.bankerValue,
          )}
        </div>

        {children}
      </section>

      <section className="baccarat-betting-area" aria-label="Fogadási terület">
        <div className="baccarat-main-bets">{MAIN_BETS.map(renderBet)}</div>

        <div className="baccarat-side-bets">{SIDE_BETS.map(renderBet)}</div>
      </section>
    </div>
  );
}

export default BaccaratTable;
