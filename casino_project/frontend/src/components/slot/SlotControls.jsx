const creditFormatter = new Intl.NumberFormat("hu-HU", {
  maximumFractionDigits: 2,
});

function SlotControls({
  allowedBets = [],
  selectedBet,
  balance = 0,
  lastWin = 0,
  isPlaying = false,
  isLoading = false,
  hasPendingRequest = false,
  onBetChange,
  onSpin,
}) {
  const selectedBetIndex = allowedBets.findIndex(
    (bet) => Number(bet) === Number(selectedBet),
  );

  const canDecreaseBet =
    selectedBetIndex > 0 && !isPlaying && !isLoading && !hasPendingRequest;

  const canIncreaseBet =
    selectedBetIndex >= 0 &&
    selectedBetIndex < allowedBets.length - 1 &&
    !isPlaying &&
    !isLoading &&
    !hasPendingRequest;

  const spinIsDisabled =
    isPlaying || isLoading || selectedBet === null || selectedBet === undefined;

  function handleDecreaseBet() {
    if (!canDecreaseBet) {
      return;
    }

    onBetChange(allowedBets[selectedBetIndex - 1]);
  }

  function handleIncreaseBet() {
    if (!canIncreaseBet) {
      return;
    }

    onBetChange(allowedBets[selectedBetIndex + 1]);
  }

  return (
    <div className="slot-controls">
      <div className="slot-control-information">
        <div className="slot-control-value">
          <span>Egyenleg</span>

          <strong>{creditFormatter.format(balance)} CR</strong>
        </div>

        <div className="slot-control-value">
          <span>Tét</span>

          <strong>{creditFormatter.format(selectedBet || 0)} CR</strong>
        </div>

        <div className="slot-control-value">
          <span>Utolsó nyeremény</span>

          <strong>{creditFormatter.format(lastWin)} CR</strong>
        </div>
      </div>

      <div className="slot-spin-controls">
        <button
          className="slot-bet-button"
          type="button"
          aria-label="Tét csökkentése"
          disabled={!canDecreaseBet}
          onClick={handleDecreaseBet}
        >
          −
        </button>

        <button
          className="slot-main-spin-button"
          type="button"
          disabled={spinIsDisabled}
          onClick={onSpin}
        >
          {isPlaying ? "..." : hasPendingRequest ? "ÚJRA" : "SPIN"}
        </button>

        <button
          className="slot-bet-button"
          type="button"
          aria-label="Tét növelése"
          disabled={!canIncreaseBet}
          onClick={handleIncreaseBet}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default SlotControls;
