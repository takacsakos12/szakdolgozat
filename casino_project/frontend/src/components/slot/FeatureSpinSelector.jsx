import { useEffect } from "react";

const SYMBOL_LABELS = {
  TEN: "10",
  JACK: "J",
  QUEEN: "Q",
  KING: "K",
  ACE: "A",
  SCARAB: "Scarab",
  FALCON: "Falcon",
  ANUBIS: "Anubis",
  PHARAOH: "Pharaoh",
};

const creditFormatter = new Intl.NumberFormat("hu-HU", {
  maximumFractionDigits: 2,
});

function FeatureSpinSelector({
  isOpen,
  symbols = [],
  selectedSymbol,
  featureSpinCost = 0,
  disabled = false,
  onSymbolChange,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !disabled) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, disabled, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget && !disabled) {
      onClose();
    }
  }

  return (
    <div
      className="feature-selector-backdrop"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <section
        className="feature-selector"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-selector-title"
      >
        <header className="feature-selector-header">
          <div>
            <span className="feature-selector-eyebrow">Feature Spin</span>

            <h2 id="feature-selector-title">Válassz bővülő szimbólumot</h2>
          </div>

          <button
            className="feature-selector-close"
            type="button"
            aria-label="Ablak bezárása"
            disabled={disabled}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <p className="feature-selector-description">
          A kiválasztott szimbólum a megfelelő tárcsákon teljes magasságúra
          bővülhet.
        </p>

        <div
          className="feature-symbol-grid"
          role="group"
          aria-label="Választható szimbólumok"
        >
          {symbols.map((symbol) => {
            const isSelected = symbol === selectedSymbol;

            return (
              <button
                className={`feature-symbol-option ${
                  isSelected ? "feature-symbol-option-selected" : ""
                }`}
                data-symbol={symbol}
                key={symbol}
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => onSymbolChange(symbol)}
              >
                <span className="feature-symbol-name">
                  {SYMBOL_LABELS[symbol] || symbol}
                </span>
              </button>
            );
          })}
        </div>

        <footer className="feature-selector-footer">
          <div className="feature-selector-cost">
            <span>Költség</span>

            <strong>{creditFormatter.format(featureSpinCost)} CR</strong>
          </div>

          <div className="feature-selector-actions">
            <button
              className="feature-selector-cancel"
              type="button"
              disabled={disabled}
              onClick={onClose}
            >
              Mégse
            </button>

            <button
              className="feature-selector-confirm"
              type="button"
              disabled={disabled || !selectedSymbol}
              onClick={onConfirm}
            >
              {disabled ? "Betöltés..." : "Feature bekapcsolása"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default FeatureSpinSelector;
