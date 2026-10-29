import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import {
  getProfileSummary,
  updateProfile,
  changePassword,
  refillBalance,
} from "../api/userApi";

import "./ProfilePage.css";

const numberFormatter = new Intl.NumberFormat("hu-HU", {
  maximumFractionDigits: 2,
});

function formatMoney(amount) {
  return `${numberFormatter.format(amount ?? 0)} CR`;
}

function formatDate(value, withTime = false) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(
    "hu-HU",
    withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  );
}

function ProfilePage({ user, onUserChange, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  const submittingRef = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getProfileSummary();

        if (cancelled) {
          return;
        }

        setSummary(response);
        setUsername(response.user.username);
        setEmail(response.user.email);
        onUserChange(response.user);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(error.message);

        if (error.statusCode === 401) {
          onUserChange(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId, onUserChange]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const controlsDisabled = isLoading || Boolean(pendingAction);

  const refillAvailable =
    Boolean(summary) &&
    (!summary.refill.nextRefillAt ||
      new Date(summary.refill.nextRefillAt).getTime() <= now);

  function syncUser(updatedUser) {
    // A módosító válaszok nem mind tartalmazzák a createdAt mezőt.
    const mergedUser = {
      ...user,
      ...updatedUser,
    };

    onUserChange(mergedUser);

    setSummary((current) =>
      current
        ? {
            ...current,
            user: {
              ...current.user,
              ...updatedUser,
            },
          }
        : current,
    );
  }

  async function runAction(action, callback) {
    if (isLoading || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setPendingAction(action);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await callback();
    } catch (error) {
      setErrorMessage(error.message);

      if (error.statusCode === 401) {
        onUserChange(null);
      }

      if (action === "refill" && error.data?.refill) {
        setSummary((current) =>
          current ? { ...current, refill: error.data.refill } : current,
        );
      }
    } finally {
      submittingRef.current = false;
      setPendingAction(null);
    }
  }

  function handleProfileSubmit(event) {
    event.preventDefault();

    const changes = {};
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedUsername !== user.username) {
      changes.username = normalizedUsername;
    }

    if (normalizedEmail !== user.email) {
      changes.email = normalizedEmail;
    }

    if (Object.keys(changes).length === 0) {
      setErrorMessage("");
      setSuccessMessage("Nem változtattál a profiladatokon.");
      return;
    }

    runAction("profile", async () => {
      const response = await updateProfile(changes);

      syncUser(response.user);
      setUsername(response.user.username);
      setEmail(response.user.email);
      setSuccessMessage(response.message);
    });
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setSuccessMessage("");
      setErrorMessage("A két új jelszó nem egyezik.");
      return;
    }

    runAction("password", async () => {
      const response = await changePassword({
        currentPassword,
        newPassword,
      });

      syncUser(response.user);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage(response.message);
    });
  }

  function handleRefill() {
    if (!refillAvailable) {
      return;
    }

    runAction("refill", async () => {
      const response = await refillBalance();

      syncUser(response.user);

      setSummary((current) => ({
        ...current,
        refill: response.refill,
      }));

      setNow(Date.now());
      setSuccessMessage(response.message);
    });
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="profile-page">
      <header className="profile-heading">
        <div>
          <p className="profile-eyebrow">FIÓKBEÁLLÍTÁSOK</p>
          <h1>Felhasználói profil</h1>
          <p>Profiladatok, biztonság és virtuális egyenleg.</p>
        </div>

        <Link className="button button-ghost" to="/games/history">
          Játéktörténet
        </Link>
      </header>

      <div aria-live="polite">
        {errorMessage && (
          <p className="profile-message profile-message-error" role="alert">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="profile-message profile-message-success">
            {successMessage}
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="profile-loading">Profil betöltése...</p>
      ) : (
        <>
          <section className="profile-stats" aria-label="Játékadatok">
            <div className="profile-stat">
              <span>Aktuális egyenleg</span>
              <strong>{formatMoney(user.balance)}</strong>
            </div>

            <div className="profile-stat">
              <span>Összes feltett tét</span>
              <strong>
                {summary ? formatMoney(summary.stats.totalCost) : "—"}
              </strong>
            </div>

            <div className="profile-stat">
              <span>Összes jóváírás</span>
              <strong>
                {summary ? formatMoney(summary.stats.totalWin) : "—"}
              </strong>
            </div>

            <div className="profile-stat">
              <span>Összesített nettó eredmény</span>
              <strong
                className={
                  summary?.stats.netResult < 0
                    ? "profile-negative"
                    : summary?.stats.netResult > 0
                      ? "profile-positive"
                      : ""
                }
              >
                {summary ? formatMoney(summary.stats.netResult) : "—"}
              </strong>
            </div>
          </section>

          <p className="profile-stats-note">
            Az összesítés a lezárt köröket tartalmazza. A virtuális feltöltések
            nem számítanak nyereménynek.
          </p>

          <div className="profile-grid">
            <section className="profile-panel">
              <h2>Profiladatok</h2>

              <p className="profile-panel-description">
                Regisztráció: {formatDate(summary?.user.createdAt)}
              </p>

              <form onSubmit={handleProfileSubmit}>
                <fieldset disabled={controlsDisabled}>
                  <label htmlFor="profile-username">Felhasználónév</label>
                  <input
                    id="profile-username"
                    name="username"
                    autoComplete="username"
                    value={username}
                    minLength={3}
                    maxLength={30}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />

                  <label htmlFor="profile-email">E-mail-cím</label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />

                  <button className="button button-primary" type="submit">
                    {pendingAction === "profile"
                      ? "Mentés..."
                      : "Adatok mentése"}
                  </button>
                </fieldset>
              </form>
            </section>

            <section className="profile-panel">
              <h2>Jelszó módosítása</h2>

              <p className="profile-panel-description">
                Legalább 8 karakter, kisbetű, nagybetű és szám. A módosítás után
                a többi eszközön újra be kell jelentkezned.
              </p>

              <form onSubmit={handlePasswordSubmit}>
                <fieldset disabled={controlsDisabled}>
                  <label htmlFor="profile-current-password">
                    Jelenlegi jelszó
                  </label>
                  <input
                    id="profile-current-password"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />

                  <label htmlFor="profile-new-password">Új jelszó</label>
                  <input
                    id="profile-new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    minLength={8}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />

                  <label htmlFor="profile-confirm-password">
                    Új jelszó ismét
                  </label>
                  <input
                    id="profile-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    minLength={8}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />

                  <button className="button button-primary" type="submit">
                    {pendingAction === "password"
                      ? "Módosítás..."
                      : "Jelszó módosítása"}
                  </button>
                </fieldset>
              </form>
            </section>
          </div>

          <section className="profile-panel profile-refill">
            <div>
              <h2>Virtuális egyenleg feltöltése</h2>

              <p>
                24 óránként egyszer 10 000 CR játékpénzt kérhetsz. A feltöltés
                valódi pénzmozgással nem jár.
              </p>

              {summary && !refillAvailable && (
                <p className="profile-next-refill">
                  Következő feltöltés:{" "}
                  {formatDate(summary.refill.nextRefillAt, true)}
                </p>
              )}
            </div>

            <button
              className="button button-primary"
              type="button"
              disabled={controlsDisabled || !refillAvailable}
              onClick={handleRefill}
            >
              {pendingAction === "refill" ? "Feltöltés..." : "Feltöltés"}
            </button>
          </section>

          <div className="profile-bottom">
            <span>
              Lezárt körök:{" "}
              {summary ? numberFormatter.format(summary.stats.totalGames) : "—"}
            </span>

            <button
              className="button button-ghost"
              type="button"
              disabled={controlsDisabled}
              onClick={onLogout}
            >
              Kijelentkezés
            </button>
          </div>
        </>
      )}
    </main>
  );
}

export default ProfilePage;
