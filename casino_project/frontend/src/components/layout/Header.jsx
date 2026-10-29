import { Link } from "react-router-dom";

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
        <Link to="/games">Játékok</Link>
        <Link to="/#statistics">Statisztikák</Link>
        <Link to="/provably-fair">Provably fair</Link>
        {user && <Link to="/games/history">Játéktörténet</Link>}
      </nav>

      <div className="auth-actions">
        {user ? (
          <>
            <Link className="logged-in-user" to="/profile">
              <span>Profilom</span>
              <strong>{user.username}</strong>
            </Link>

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
            <Link className="button button-ghost" to="/login">
              Bejelentkezés
            </Link>

            <Link className="button button-primary" to="/register">
              Regisztráció
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
