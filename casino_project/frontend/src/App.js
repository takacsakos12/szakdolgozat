import { useEffect, useState } from "react";
import {
  Link,
  Route,
  Routes,
} from "react-router-dom";

import "./App.css";
import AuthPage from "./AuthPage";

const API_URL = "http://localhost:5000/api";

const games = [
  {
    id: "slot",
    label: "SLOT",
    title: "Nyerőgép",
  },
  {
    id: "roulette",
    label: "0–36",
    title: "Európai rulett",
  },
  {
    id: "blackjack",
    label: "21",
    title: "Blackjack",
  },
  {
    id: "baccarat",
    label: "P / B",
    title: "Baccarat",
  },
];

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <Link className="brand" to="/">
        <span className="brand-mark">KA</span>

        <span className="brand-text">
          <strong>Kaszinóanalitika</strong>
          <small>Játékok matematikai vizsgálata</small>
        </span>
      </Link>

      <nav className="navigation" aria-label="Fő navigáció">
        <Link to="/">Főoldal</Link>
        <Link to="/#games">Játékok</Link>
        <Link to="/#statistics">Statisztikák</Link>
        <Link to="/#provably-fair">Provably fair</Link>
      </nav>

      <div className="auth-actions">
        {user ? (
          <>
            <span className="logged-in-user">
              <span>Bejelentkezve</span>
              <strong>{user.username}</strong>
            </span>

            <button
              className="button button-ghost"
              type="button"
              onClick={onLogout}
            >
              Kijelentkezés
            </button>
          </>
        ) : (
          <>
            <Link
              className="button button-ghost"
              to="/login"
            >
              Bejelentkezés
            </Link>

            <Link
              className="button button-primary"
              to="/register"
            >
              Regisztráció
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function GameCard({ game }) {
  return (
    <article className="game-card">
      <div className="game-code" aria-hidden="true">
        {game.label}
      </div>

      <div className="game-information">
        <span className="game-status">Fejlesztés alatt</span>
        <h3>{game.title}</h3>

        <button className="game-button" type="button">
          <span>Megnyitás</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
}

function HomePage() {
  return (
    <main>
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="eyebrow">
            BSc-szakdolgozati projekt
          </span>

          <h1>
            Kaszinójátékok
            <span> matematikai elemzése</span>
          </h1>

          <p className="hero-description">
            A projekt közérthetően mutatja be a kaszinójátékok
            valódi esélyeit, kockázatait és matematikai
            működését. Célja a szerencsejáték átláthatóbbá
            tétele és a játékosok hiteles tájékoztatása.
          </p>

          <div className="hero-actions">
            <a
              className="button button-primary button-large"
              href="#games"
            >
              Játékok megtekintése
            </a>

            <a
              className="button button-secondary button-large"
              href="#statistics"
            >
              Elemzések megtekintése
            </a>
          </div>

          <div className="author-information">
            <span>Készítette</span>
            <strong>Takács Ákos</strong>
            <small>
              Programtervező informatikus BSc · Miskolci Egyetem
            </small>
          </div>
        </div>

        <div className="project-panel">
          <div className="project-panel-heading">
            <span className="eyebrow">A projekt célja</span>
            <h2>Átláthatóbb szerencsejáték</h2>
          </div>

          <p className="project-introduction">
            A projekt célja, hogy közérthetően bemutassa a
            kaszinójátékok valódi esélyeit és matematikai
            működését, ezzel segítve a játékosok tájékozottabb
            döntéseit.
          </p>

          <div className="project-goals">
            <div>
              <span className="goal-number">01</span>

              <div>
                <strong>Tájékoztatás</strong>
                <p>
                  A nyerési esélyek és kockázatok érthető
                  bemutatása.
                </p>
              </div>
            </div>

            <div>
              <span className="goal-number">02</span>

              <div>
                <strong>Átláthatóság</strong>
                <p>
                  A játékok működésének és eredményeinek
                  ellenőrizhetősége.
                </p>
              </div>
            </div>

            <div>
              <span className="goal-number">03</span>

              <div>
                <strong>Tudatosabb játék</strong>
                <p>
                  A tévhitek helyett valószínűségekre és
                  adatokra épülő szemlélet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="games-section" id="games">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Vizsgált modellek</span>
            <h2>Kaszinójátékok</h2>
          </div>
        </div>

        <div className="games-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section className="information-grid">
        <article
          className="information-card"
          id="statistics"
        >
          <div className="information-heading">
            <span className="card-index">01</span>

            <div>
              <span className="eyebrow">
                Statisztikai elemzés
              </span>
              <h2>Elmélet és szimuláció</h2>
            </div>
          </div>

          <p>
            A játékok elméleti értékeinek és szimulációs
            eredményeinek összehasonlítása.
          </p>

          <button className="text-button" type="button">
            <span>Statisztikák megtekintése</span>
            <span aria-hidden="true">→</span>
          </button>
        </article>

        <article
          className="information-card"
          id="provably-fair"
        >
          <div className="information-heading">
            <span className="card-index">02</span>

            <div>
              <span className="eyebrow">
                Ellenőrizhető működés
              </span>
              <h2>Provably fair rendszer</h2>
            </div>
          </div>

          <p>
            Itt megismerhető és ellenőrizhető a játékok
            eredményének előállítása.
          </p>

          <button className="text-button" type="button">
            <span>Működés megismerése</span>
            <span aria-hidden="true">→</span>
          </button>
        </article>
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <Link className="brand" to="/">
        <span className="brand-mark">KA</span>

        <span className="brand-text">
          <strong>Kaszinóanalitika</strong>
          <small>Játékok matematikai vizsgálata</small>
        </span>
      </Link>

      <p>
        Webalapú kaszinójátékok fejlesztése statisztikai
        elemzéssel.
      </p>

      <span>Szakdolgozati projekt</span>
    </footer>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] =
    useState(true);

  useEffect(() => {
    async function checkCurrentUser() {
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setIsCheckingSession(false);
      }
    }

    checkCurrentUser();
  }, []);

  async function handleLogout() {
    try {
      const response = await fetch(
        `${API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("A kijelentkezés sikertelen.");
      }

      setUser(null);
    } catch (error) {
      console.error(error.message);
    }
  }

  if (isCheckingSession) {
    return (
      <div className="session-loading">
        Munkamenet ellenőrzése...
      </div>
    );
  }

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/login"
          element={
            <AuthPage
              mode="login"
              user={user}
              onAuthenticated={setUser}
            />
          }
        />

        <Route
          path="/register"
          element={
            <AuthPage
              mode="register"
              user={user}
              onAuthenticated={setUser}
            />
          }
        />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;