import { Link } from "react-router-dom";

function CardArtwork({ rank, suit, red = false }) {
  return (
    <span
      className={`catalog-playing-card ${
        red ? "catalog-playing-card-red" : ""
      }`}
    >
      <span className="catalog-card-rank">{rank}</span>
      <span className="catalog-card-suit">{suit}</span>
      <span className="catalog-card-rank-bottom">{rank}</span>
    </span>
  );
}

function GameArtwork({ type }) {
  if (type === "slot") {
    return (
      <div className="catalog-slot-machine">
        <span className="catalog-slot-caption">BOOK OF PHARAOH</span>

        <div className="catalog-slot-reels">
          <span className="catalog-slot-reel">A</span>

          <span className="catalog-slot-reel">
            <span className="catalog-book">
              <span />
            </span>
          </span>

          <span className="catalog-slot-reel">K</span>
        </div>

        <span className="catalog-slot-line" />
      </div>
    );
  }

  if (type === "roulette") {
    return (
      <div className="catalog-wheel">
        <span className="catalog-wheel-zero">0</span>

        <span className="catalog-wheel-center">ROULETTE</span>

        <span className="catalog-wheel-ball" />
      </div>
    );
  }

  return (
    <div className={`catalog-card-fan catalog-card-fan-${type}`}>
      <CardArtwork rank={type === "blackjack" ? "A" : "6"} suit="♠" />

      <CardArtwork rank={type === "blackjack" ? "K" : "3"} suit="♥" red />

      <span className="catalog-table-mark">
        {type === "blackjack" ? "21" : "P / B"}
      </span>
    </div>
  );
}

function GameCard({ game }) {
  return (
    <article className={`catalog-card catalog-card-${game.id}`}>
      <Link
        className="catalog-card-link"
        to={game.path}
        aria-labelledby={`catalog-title-${game.id}`}
      >
        <div className="catalog-art" aria-hidden="true">
          {game.image ? (
            <img
              className="catalog-photo"
              src={game.image}
              alt=""
              loading="lazy"
            />
          ) : (
            <>
              <span className="catalog-art-orbit" />
              <GameArtwork type={game.id} />
            </>
          )}
        </div>

        <div className="catalog-card-body">
          <span className="catalog-category">{game.category}</span>

          <h2 id={`catalog-title-${game.id}`}>{game.title}</h2>

          <p>{game.description}</p>

          <div className="catalog-details">
            {game.details?.map((detail) => (
              <span key={detail}>{detail}</span>
            ))}
          </div>

          <span className="catalog-open">
            Játék megnyitása
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}

export default GameCard;
