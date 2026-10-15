function SlotFeatures({
  selectedBet,
  bonusCostMultiplier,
  featureCostMultiplier,
  featureEnabled,
  selectedSymbol,
  disabled,
  onBonusBuy,
  onFeatureToggle,
}) {
  const bonusCost =
    selectedBet === null ? 0 : selectedBet * bonusCostMultiplier;

  const featureCost =
    selectedBet === null ? 0 : selectedBet * featureCostMultiplier;

  return (
    <aside className="slot-side-panel">
      <button
        className="slot-side-action slot-bonus-action"
        type="button"
        disabled={disabled || selectedBet === null}
        onClick={onBonusBuy}
      >
        <span className="slot-side-action-title">Bónuszvásárlás</span>

        <strong className="slot-side-action-price">{bonusCost} CR</strong>

        <span className="slot-side-action-detail">
          {bonusCostMultiplier}× tét
        </span>
      </button>

      <button
        className={`slot-side-action slot-feature-action ${
          featureEnabled ? "slot-feature-active" : ""
        }`}
        type="button"
        disabled={disabled || selectedBet === null}
        aria-pressed={featureEnabled}
        onClick={onFeatureToggle}
      >
        <span className="slot-side-action-title">Feature Spin</span>

        <strong className="slot-side-action-price">{featureCost} CR</strong>

        <span className="slot-side-action-detail">
          {featureCostMultiplier}× tét
        </span>

        <span className="slot-feature-switch">
          <span className="slot-feature-switch-track">
            <span className="slot-feature-switch-thumb" />
          </span>

          <span className="slot-feature-switch-state">
            {featureEnabled ? "BE" : "KI"}
          </span>
        </span>

        {featureEnabled && selectedSymbol && (
          <span className="slot-feature-symbol">
            Kiválasztott szimbólum: {selectedSymbol}
          </span>
        )}
      </button>
    </aside>
  );
}

export default SlotFeatures;
