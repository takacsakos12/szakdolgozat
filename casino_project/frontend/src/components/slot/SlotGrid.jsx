const SYMBOL_LABELS = {
  TEN: "10",
  JACK: "J",
  QUEEN: "Q",
  KING: "K",
  ACE: "A",
  SCARAB: "SCARAB",
  FALCON: "FALCON",
  ANUBIS: "ANUBIS",
  PHARAOH: "PHARAOH",
  BOOK: "BOOK",
};

function createEmptyGrid(rowCount, reelCount) {
  return Array.from({ length: rowCount }, () => Array(reelCount).fill(null));
}

function SlotGrid({ grid, rowCount = 3, reelCount = 5, isSpinning = false }) {
  const hasValidGrid =
    Array.isArray(grid) &&
    grid.length === rowCount &&
    grid.every((row) => Array.isArray(row) && row.length === reelCount);

  const displayedGrid = hasValidGrid
    ? grid
    : createEmptyGrid(rowCount, reelCount);

  return (
    <div
      className={`slot-grid ${isSpinning ? "slot-grid-spinning" : ""}`}
      style={{
        gridTemplateColumns: `repeat(${reelCount}, minmax(0, 1fr))`,
      }}
      role="grid"
      aria-label="Nyerőgép tárcsái"
      aria-busy={isSpinning}
    >
      {displayedGrid.map((row, rowIndex) =>
        row.map((symbol, reelIndex) => (
          <div
            className={`slot-symbol ${
              symbol ? `slot-symbol-${symbol.toLowerCase()}` : ""
            }`}
            data-symbol={symbol || undefined}
            key={`${rowIndex}-${reelIndex}`}
            role="gridcell"
            aria-label={
              symbol
                ? `Szimbólum: ${SYMBOL_LABELS[symbol] || symbol}`
                : "Üres pozíció"
            }
          >
            <span>{symbol ? SYMBOL_LABELS[symbol] || symbol : "—"}</span>
          </div>
        )),
      )}
    </div>
  );
}

export default SlotGrid;
