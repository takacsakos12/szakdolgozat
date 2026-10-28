import { useLayoutEffect, useRef } from "react";

import PlayingCard from "./blackjack/PlayingCard";

function DealtCard({ card, deckRef, animate = true }) {
  const cardRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);

  useLayoutEffect(() => {
    if (!animate) {
      return;
    }
    const element = cardRef.current;
    const deck = deckRef.current;

    if (
      !element ||
      !deck ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const origin = deck.getBoundingClientRect();
    const target = element.getBoundingClientRect();

    const offsetX =
      origin.left + origin.width / 2 - (target.left + target.width / 2);

    const offsetY =
      origin.top + origin.height / 2 - (target.top + target.height / 2);

    const movement = element.animate(
      [
        {
          transform:
            `translate(${offsetX}px, ${offsetY}px) ` +
            "rotate(-12deg) scale(0.9)",
        },
        {
          transform: "translate(0, 0) rotate(0) scale(1)",
        },
      ],
      {
        duration: 420,
        easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
      },
    );

    const frontFlip = frontRef.current.animate(
      [{ transform: "rotateY(180deg)" }, { transform: "rotateY(0deg)" }],
      {
        delay: 160,
        duration: 260,
        easing: "ease-out",
        fill: "backwards",
      },
    );

    const backFlip = backRef.current.animate(
      [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }],
      {
        delay: 160,
        duration: 260,
        easing: "ease-out",
        fill: "backwards",
      },
    );

    return () => {
      movement.cancel();
      frontFlip.cancel();
      backFlip.cancel();
    };
  }, [deckRef]);

  return (
    <div className="dealt-card" ref={cardRef}>
      <div className="dealt-card-front" ref={frontRef}>
        <PlayingCard card={card} />
      </div>

      <div className="dealt-card-back" ref={backRef} aria-hidden="true">
        <PlayingCard card={{ hidden: true }} />
      </div>
    </div>
  );
}

export default DealtCard;
