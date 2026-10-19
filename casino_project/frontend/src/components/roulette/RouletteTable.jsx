import { useState } from "react";

const BET_LABELS = {
  STRAIGHT: "Egyes szám",
  SPLIT: "Split",
  STREET: "Street",
  TRIO: "Trio",
  CORNER: "Sarok",
  SIX_LINE: "Six Line",
  FIRST_FOUR: "Első négy",
};

const COLUMN_BETS = [
  { type: "FIRST_COLUMN", label: "2:1" },
  { type: "SECOND_COLUMN", label: "2:1" },
  { type: "THIRD_COLUMN", label: "2:1" },
];

const DOZEN_BETS = [
  { type: "FIRST_DOZEN", label: "1-12" },
  { type: "SECOND_DOZEN", label: "13-24" },
  { type: "THIRD_DOZEN", label: "25-36" },
];

const OUTSIDE_BET_LABELS = [
  { type: "LOW", label: "1–18" },
  { type: "EVEN", label: "Páros" },
  { type: "RED", label: "Piros" },
  { type: "BLACK", label: "Fekete" },
  { type: "ODD", label: "Páratlan" },
  { type: "HIGH", label: "19–36" },
];

function getBetKey(type, numbers = []) {
  return `${type}:${[...numbers].sort((a, b) => a - b).join("-")}`;
}

function getPosition(type, numbers) {
  let x;
  let y;

  if (numbers.includes(0)) {
    x = 0;

    if (type === "FIRST_FOUR") {
      y = 3;
    } else if (type === "TRIO") {
      y = numbers.includes(1) ? 2 : 1;
    } else {
      const number = numbers.find((value) => value !== 0);
      y = 2.5 - ((number - 1) % 3);
    }
  } else {
    x =
      numbers.reduce(
        (sum, number) => sum + Math.floor((number - 1) / 3) + 0.5,
        0,
      ) / numbers.length;

    y =
      numbers.reduce((sum, number) => sum + 2.5 - ((number - 1) % 3), 0) /
      numbers.length;

    if (type === "STREET" || type === "SIX_LINE") {
      y = 3;
    }
  }

  return {
    left: `${(x / 12) * 100}%`,
    top: `${(y / 3) * 100}%`,
    zIndex: numbers.length,
  };
}

function RouletteTable({ config, bets, disabled = false, onPlaceBet }) {
  const [hoveredBet, setHoveredBet] = useState(null);

  const highlightedNumbers = new Set(hoveredBet?.numbers ?? []);
  const amounts = new Map();

  for (const bet of bets) {
    const key = getBetKey(bet.type, bet.numbers);
    amounts.set(key, (amounts.get(key) ?? 0) + bet.amount);
  }

  function renderBet(type, numbers, label, className, style) {
    const coveredNumbers = numbers.length
      ? numbers
      : config.betTypes[type].numbers;

    const key = getBetKey(type, numbers);
    const amount = amounts.get(key);
    const betLabel = label || BET_LABELS[type] || type;

    return (
      <button
        key={key}
        type="button"
        className={`roulette-bet ${className}`}
        style={style}
        disabled={disabled}
        aria-label={`${betLabel}: ${coveredNumbers.join(", ")}`}
        onMouseEnter={() =>
          setHoveredBet({
            label: betLabel,
            numbers: coveredNumbers,
          })
        }
        onMouseLeave={() => setHoveredBet(null)}
        onFocus={() =>
          setHoveredBet({
            label: betLabel,
            numbers: coveredNumbers,
          })
        }
        onBlur={() => setHoveredBet(null)}
        onClick={() => onPlaceBet({ type, numbers })}
      >
        {label}

        {amount > 0 && <span className="roulette-chip">{amount}</span>}
      </button>
    );
  }
  return (
    <div className="roulette-table">
      <div className="roulette-table-scroll">
        <div className="roulette-table-content">
          <div className="roulette-board">
            {renderBet(
              "STRAIGHT",
              [0],
              "0",
              `roulette-zero ${
                highlightedNumbers.has(0) ? "is-highlighted" : ""
              }`,
            )}

            <div className="roulette-number-grid">
              {Array.from({ length: 36 }, (_, index) => {
                const number = index + 1;
                const color = config.numberColors[number].toLowerCase();

                return renderBet(
                  "STRAIGHT",
                  [number],
                  number,
                  `roulette-number roulette-${color} ${
                    highlightedNumbers.has(number) ? "is-highlighted" : ""
                  }`,
                  {
                    gridColumn: Math.floor(index / 3) + 1,
                    gridRow: 3 - (index % 3),
                  },
                );
              })}

              {Object.entries(config.positions)
                .filter(([type]) => type !== "STRAIGHT")
                .flatMap(([type, positions]) =>
                  positions.map((numbers) =>
                    renderBet(
                      type,
                      numbers,
                      "",
                      "roulette-bet-zone",
                      getPosition(type, numbers),
                    ),
                  ),
                )}
            </div>

            <div className="roulette-column-bets">
              {COLUMN_BETS.map(({ type, label }) =>
                renderBet(type, [], label, "roulette-outside"),
              )}
            </div>
          </div>

          <div className="roulette-outside-area">
            <div className="roulette-dozens">
              {DOZEN_BETS.map(({ type, label }) =>
                renderBet(type, [], label, "roulette-outside"),
              )}
            </div>

            <div className="roulette-outside-grid">
              {OUTSIDE_BET_LABELS.map(({ type, label }) =>
                renderBet(
                  type,
                  [],
                  label,
                  `roulette-outside roulette-${type.toLowerCase()}`,
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="roulette-table-hint">
        {hoveredBet
          ? `${hoveredBet.label}: ${hoveredBet.numbers.join(", ")}`
          : "Válassz zsetont, majd kattints egy mezőre, vonalra vagy sarokra."}
      </p>
    </div>
  );
}
export default RouletteTable;
