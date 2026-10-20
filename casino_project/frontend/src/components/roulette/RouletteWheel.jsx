import { useEffect, useRef, useState } from "react";

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function RouletteWheel({ wheelOrder, numberColors, result, onSpinEnd }) {
  const [rotation, setRotation] = useState({
    wheel: 0,
    ball: 0,
  });

  const [isAnimating, setIsAnimating] = useState(false);

  const rotationRef = useRef({ wheel: 0, ball: 0 });
  const animationActiveRef = useRef(false);

  const sectorAngle = 360 / wheelOrder.length;

  const background = `conic-gradient(
    from ${-sectorAngle / 2}deg,
    ${wheelOrder
      .map((number, index) => {
        const color =
          numberColors[number] === "RED"
            ? "#b82f3e"
            : numberColors[number] === "GREEN"
              ? "#218454"
              : "#20232b";

        return `${color} ${index * sectorAngle}deg ${
          (index + 1) * sectorAngle
        }deg`;
      })
      .join(", ")}
  )`;

  useEffect(() => {
    if (!result) {
      return;
    }

    const index = wheelOrder.indexOf(result.winningNumber);
    const current = rotationRef.current;

    const wheel = current.wheel + 180;

    const targetAngle = normalizeAngle(wheel + index * sectorAngle);

    const remainingAngle = normalizeAngle(current.ball - targetAngle);

    const ball = current.ball - 360 * 5 - remainingAngle;
    const nextRotation = { wheel, ball };

    rotationRef.current = nextRotation;
    animationActiveRef.current = true;

    setIsAnimating(true);
    setRotation(nextRotation);
  }, [result, wheelOrder, sectorAngle]);

  function handleBallStop(event) {
    if (
      event.target !== event.currentTarget ||
      event.propertyName !== "transform" ||
      !animationActiveRef.current
    ) {
      return;
    }

    animationActiveRef.current = false;
    setIsAnimating(false);
    onSpinEnd();
  }

  return (
    <div className="roulette-wheel-container">
      <div
        className={`roulette-wheel ${
          isAnimating ? "roulette-wheel-animating" : ""
        }`}
        aria-hidden="true"
      >
        <div className="roulette-wheel-rotor">
          <div
            className="roulette-wheel-disc"
            style={{
              background,
              transform: `rotate(${rotation.wheel}deg)`,
            }}
          >
            {wheelOrder.map((number, index) => (
              <div
                className="roulette-wheel-number"
                key={number}
                style={{
                  transform: `rotate(${index * sectorAngle}deg)`,
                }}
              >
                <span>{number}</span>
              </div>
            ))}

            <div className="roulette-wheel-center">ROULETTE</div>
          </div>

          <div
            className="roulette-ball-orbit"
            style={{
              transform: `rotate(${rotation.ball}deg)`,
            }}
            onTransitionEnd={handleBallStop}
          >
            <span className="roulette-ball" />
          </div>
        </div>
      </div>

      <p className="roulette-wheel-result" aria-live="polite">
        {isAnimating
          ? "A golyó mozgásban..."
          : result
            ? `Nyertes szám: ${result.winningNumber}`
            : "Helyezd el a téteket"}
      </p>
    </div>
  );
}

export default RouletteWheel;
