import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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

const SYMBOLS = Object.keys(SYMBOL_LABELS);

const LOOP_LENGTH = 40;
const SYMBOL_DURATION = 65;

function renderSymbol(symbol, key, expandingSymbol) {
  const classes = [
    "slot-symbol",
    symbol ? `slot-symbol-${symbol.toLowerCase()}` : "",
    symbol && symbol === expandingSymbol ? "slot-symbol-expanding" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div key={key} className="slot-reel-cell">
      <div className={classes} data-symbol={symbol || undefined}>
        <span>{SYMBOL_LABELS[symbol] ?? "—"}</span>
      </div>
    </div>
  );
}

const SlotReel = forwardRef(function SlotReel(
  { symbols, reelIndex, expandingSymbol },
  ref,
) {
  const windowRef = useRef(null);
  const stripRef = useRef(null);
  const animationRef = useRef(null);
  const timeoutRef = useRef(null);
  const finishRef = useRef(null);
  const spinningRef = useRef(false);

  const [landing, setLanding] = useState(null);

  const loop = Array.from(
    { length: LOOP_LENGTH },
    (_, index) => SYMBOLS[(index + reelIndex * 3) % SYMBOLS.length],
  );

  const movingSymbols = [...loop, ...loop];

  useImperativeHandle(ref, () => ({
    startSpin() {
      animationRef.current?.cancel();
      window.clearTimeout(timeoutRef.current);

      spinningRef.current = true;
      setLanding(null);

      const cellHeight =
        stripRef.current.firstElementChild.getBoundingClientRect().height;

      animationRef.current = stripRef.current.animate(
        [
          { transform: "translateY(0)" },
          {
            transform: `translateY(-${LOOP_LENGTH * cellHeight}px)`,
          },
        ],
        {
          duration: LOOP_LENGTH * SYMBOL_DURATION,
          iterations: Infinity,
          easing: "linear",
        },
      );
    },

    stopSpin(finalSymbols) {
      return new Promise((resolve) => {
        finishRef.current = resolve;

        setLanding({
          symbols: finalSymbols,
        });
      });
    },
  }));

  useLayoutEffect(() => {
    if (!spinningRef.current) {
      setLanding(null);
    }
  }, [symbols.join("|")]);

  useLayoutEffect(() => {
    if (!landing) {
      return;
    }

    const strip = stripRef.current;
    const cellHeight =
      stripRef.current.firstElementChild.getBoundingClientRect().height;

    // A lassítás az éppen látható pozícióból indul.
    const transform = window.getComputedStyle(strip).transform;
    const currentY =
      transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;

    animationRef.current?.cancel();

    const finalY = -movingSymbols.length * cellHeight;
    const duration = 1800 + reelIndex * 180;

    const animation = strip.animate(
      [
        { transform: `translateY(${currentY}px)` },
        { transform: `translateY(${finalY}px)` },
      ],
      {
        duration,
        easing: "cubic-bezier(0.15, 0.65, 0.3, 1)",
        fill: "forwards",
      },
    );

    animationRef.current = animation;

    function finish() {
      if (!spinningRef.current) {
        return;
      }

      spinningRef.current = false;
      window.clearTimeout(timeoutRef.current);

      strip.style.transform = `translateY(${finalY}px)`;
      animation.cancel();

      const resolve = finishRef.current;
      finishRef.current = null;
      resolve?.();
    }

    animation.onfinish = finish;

    // Tartalék lezárás arra az esetre, ha az esemény elmaradna.
    timeoutRef.current = window.setTimeout(finish, duration + 250);
  }, [landing, reelIndex, movingSymbols.length]);

  useLayoutEffect(() => {
    return () => {
      animationRef.current?.cancel();
      window.clearTimeout(timeoutRef.current);
      finishRef.current?.();
    };
  }, []);

  return (
    <div className="slot-reel-window" ref={windowRef}>
      <div className="slot-reel-strip" ref={stripRef}>
        {movingSymbols.map((symbol, index) =>
          renderSymbol(symbol, `moving-${index}`, null),
        )}

        {(landing?.symbols ?? symbols).map((symbol, index) =>
          renderSymbol(symbol, `final-${index}`, expandingSymbol),
        )}
      </div>
    </div>
  );
});

const SlotGrid = forwardRef(function SlotGrid(
  {
    grid,
    rowCount = 3,
    reelCount = 5,
    isSpinning = false,
    expandingSymbol = null,
  },
  ref,
) {
  const reelRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    startSpin() {
      reelRefs.current.forEach((reel) => reel?.startSpin());
    },

    stopSpin(finalGrid) {
      return Promise.all(
        reelRefs.current.map((reel, reelIndex) =>
          reel.stopSpin(
            Array.from(
              { length: rowCount },
              (_, rowIndex) => finalGrid[rowIndex][reelIndex],
            ),
          ),
        ),
      );
    },
  }));

  return (
    <div
      className="slot-animated-grid"
      style={{
        gridTemplateColumns: `repeat(${reelCount}, minmax(0, 1fr))`,
      }}
      aria-label="Nyerőgép tárcsái"
      aria-busy={isSpinning}
    >
      {Array.from({ length: reelCount }, (_, reelIndex) => (
        <SlotReel
          key={reelIndex}
          ref={(reel) => {
            reelRefs.current[reelIndex] = reel;
          }}
          reelIndex={reelIndex}
          expandingSymbol={expandingSymbol}
          symbols={Array.from(
            { length: rowCount },
            (_, rowIndex) => grid?.[rowIndex]?.[reelIndex] ?? null,
          )}
        />
      ))}
    </div>
  );
});

export default SlotGrid;
