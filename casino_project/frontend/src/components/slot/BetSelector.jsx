function BetSelector({
  allowedBets = [],
  selectedBet,
  onBetChange,
  disabled = false,
}) {
  if (!Array.isArray(allowedBets) || allowedBets.length === 0) {
    return (
      <div className="bet-selector bet-selector-empty">
        <span>Tétválasztás nem érhető el.</span>
      </div>
    );
  }

  return (
    <fieldset className="bet-selector" disabled={disabled}>
      <legend>Tét kiválasztása</legend>

      <div className="bet-options">
        {allowedBets.map((bet) => {
          const isSelected = bet === selectedBet;

          return (
            <button
              className={`bet-option ${
                isSelected ? "bet-option-selected" : ""
              }`}
              key={bet}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onBetChange(bet)}
            >
              {bet} CR
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default BetSelector;
