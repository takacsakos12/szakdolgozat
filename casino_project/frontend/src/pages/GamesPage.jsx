import { Link } from "react-router-dom";
import GameCard from "../games/GameCard";

import "./GamesPage.css";

const games = [
  {
    id: "slot",
    title: "Slot",
    category: "NYERŐGÉP",
    description:
      "Öt tárcsa, tíz nyerővonal és bővülő szimbólumok. Alapjáték, Bonus Buy és Feature Spin.",
    path: "/games/slot",
    image: "images/slots.jpg"
  },
  {
    id: "roulette",
    title: "Európai rulett",
    category: "RULETT",
    description:
      "Helyezd el a zsetonokat a számokon vagy a külső mezőkön. Egyetlen pörgetés értékeli ki a fogadásaidat.",
    path: "/games/roulette",
    image: "images/roulette.jpg"
  },
  {
    id: "blackjack",
    title: "Blackjack",
    category: "KÁRTYAJÁTÉK",
    description:
      "Kérj lapot, állj meg, duplázz vagy oszd szét a párodat. A döntéseidet a játék során hozhatod meg.",
    path: "/games/blackjack",
    image: "images/BlackjackGame.jpg"
  },
  {
    id: "baccarat",
    title: "Baccarat",
    category: "KÁRTYAJÁTÉK",
    description:
      "Fogadj a Player, Banker vagy Tie mezőre. A laposztás és a harmadik lap húzása automatikusan történik.",
    path: "/games/baccarat",
  },
];

function GamesPage() {
  return (
    <main className="catalog-page">
      <div className="catalog-container">
        <header className="catalog-header">
          <div>
            <span className="catalog-eyebrow">
              KASZINÓANALITIKA
            </span>

            <h1>Játékok</h1>

            <p>
              Négy játékszimuláció virtuális CR-egyenleggel.
              Válassz játékot, és kövesd az eredményeidet a
              játéktörténetben.
            </p>
          </div>
        </header>

        <section
          className="catalog-grid"
          aria-label="Választható játékok"
        >
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </section>

        <aside className="catalog-fairness">
          <div>
            <strong>A sorsolás mögött</strong>

            <p>
              Ismerd meg a seedek működését és a korábbi
              körök ellenőrzését.
            </p>
          </div>

          <Link to="/provably-fair">
            Provably Fair
            <span aria-hidden="true"> ↗</span>
          </Link>
        </aside>
      </div>
    </main>
  );
}

export default GamesPage;