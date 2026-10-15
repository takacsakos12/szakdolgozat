import { Link } from "react-router-dom";

function GameCard({ game }) {
  return (
    <article className="game-card">
      <div className="game-code" aria-hidden="true">
        {game.label}
      </div>

      <div className="game-information">
        <h3>{game.title}</h3>

        <Link className="game-button" to={game.path}>
          <span>Megnyitás</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
export default GameCard;
