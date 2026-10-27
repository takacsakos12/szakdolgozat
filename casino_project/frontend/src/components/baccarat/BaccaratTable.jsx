import PlayingCard from "../blackjack/PlayingCard";

const CHIP_COLORS = {
  1: "#dce1e8",
  2: "#778395",
  5: "#b9404d",
  10: "#3578bc",
  25: "#32875d",
  50: "#8957b2",
  100: "#292d38",
};

const MAIN_BETS = {
  PLAYER: "player",
  BANKER: "banker",
  TIE: "tie",
};

const SIDE_BETS = {
  PLAYER_PAIR: "player_pair",
  BANKER_PAIR: "banker_pair",
  EITHER_PAIR: "either_pair",
  PERFECT_PAIR: "perfect_pair",
};

function getBetChips(amount, chipValues) {
  const denominations = [...chipValues].sort((first, second) => second - first);
  const chips = [];

  for (const value of denominations) {
    const count = Math.floor(amount / value);
    for (let i = 0; i < count; i++) {
      chips.push({ value });
    }
    amount -= count * value;

    return chips;
  }
}
function BaccaratTable({ config, result, bets, disabled = false, onPlaceBet }) {
  const amounts = new Map();

  for (const bet of bets) {
    amounts.set(bet.type, (amounts.get(bet.type) ?? 0) + bet.amount);
  }
  function renderChips(amount) {
    if (amount === 0) {
      return <span className="baccarat-empty-bet">+</span>;
    }

    const chips = getBetChips(amount, config.allowedChipValues);

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
      <div className={`baccarat-hand ${won ? "baccarat-hand-won" : ""}`}>
        <div className="baccarat-hand-heading">
          <h2>{label}</h2>

          <span className="baccarat-hand-value">{value ?? "—"}</span>
        </div>

        <div className="baccarat-cards">
          {cards?.length ? (
            cards.map((card) => <PlayingCard key={card.id} card={card} />)
          ) : (
            <span className="baccarat-card-placeholder">Lapok helye</span>
          )}
        </div>

        <span className="baccarat-hand-status">
          {result
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

      <div className="baccarat-main-bets">{MAIN_BETS.map(renderBet)}</div>

      <div className="baccarat-side-bets">{SIDE_BETS.map(renderBet)}</div>
    </div>
  );
}

export default BaccaratTable;
