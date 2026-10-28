import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

import { getGameHistory } from "../api/gameHistoryApi";
import "./GameHistoryPage.css";

const GAME_TYPE_LABELS = {
  SLOT: "Nyerőgép",
  ROULETTE: "Rulett",
  BLACKJACK: "Blackjack",
  BACCARAT: "Baccarat",
};

const GAME_MODE_LABELS = {
  BASE_GAME: "Normál pörgetés",
  BONUS_BUY: "Bonus Buy",
  FEATURE_SPIN: "Feature Spin",
  STANDARD: "Normál játék",
};

function formatCredits(value, showSign = false) {
  const number = Number(value);

  const formatted = number.toLocaleString("hu-HU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  if (showSign && number > 0) {
    return `+${formatted} CR`;
  }

  return `${formatted} CR`;
}

function formatDate(value) {
  if (!value) {
    return "–";
  }

  return new Date(value).toLocaleString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GameHistoryPage({ user }) {
  const [games, setGames] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);
  const lastSuccessfulPage = useRef(1);
  const userId = user?.id;

  useEffect(() => {
    let componentIsActive = true;

    async function loadGameHistory() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const response = await getGameHistory(page);

        if (!componentIsActive) {
          return;
        }

        setGames(response.games);
        setPagination(response.pagination);
        lastSuccessfulPage.current = response.pagination.page;
      } catch (error) {
        if (componentIsActive) {
          setErrorMessage(
            error.message || "Nem sikerült betölteni a játéktörténetet.",
          );

          setPage(lastSuccessfulPage.current);
        }
      } finally {
        if (componentIsActive) {
          setLoading(false);
        }
      }
    }

    loadGameHistory();

    return () => {
      componentIsActive = false;
    };
  }, [page, userId, retryAttempt]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  function handlePreviousPage() {
    if (page > 1 && !loading) {
      setPage((currentPage) => currentPage - 1);
    }
  }

  function handleNextPage() {
    if (pagination && page < pagination.totalPages && !loading) {
      setPage((currentPage) => currentPage + 1);
    }
  }

  return (
    <main className="history-page">
      <section className="history-container">
        <header className="history-header">
          <div>
            <span className="eyebrow">Saját eredmények</span>
            <h1>Játéktörténet</h1>
            <p>A fiókodhoz tartozó korábbi játékkörök és egyenlegváltozások.</p>
          </div>

          {pagination && (
            <div className="history-count">
              <span>Játékkörök</span>
              <strong>{pagination.total}</strong>
            </div>
          )}
        </header>

        {errorMessage && (
          <div className="history-message history-error" role="alert">
            <p>{errorMessage}</p>

            <button
              type="button"
              disabled={loading}
              onClick={() => setRetryAttempt((current) => current + 1)}
            >
              Újrapróbálás
            </button>
          </div>
        )}

        {loading ? (
          <div className="history-message">Játéktörténet betöltése...</div>
        ) : errorMessage && games.length === 0 ? null : games.length === 0 ? (
          <div className="history-empty">
            <h2>Még nincs játéktörténeted</h2>
            <p>
              Az első játék után itt jelennek meg a tétek, nyeremények és
              egyenlegváltozások.
            </p>
          </div>
        ) : (
          <>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Kör azonosítója</th>
                    <th>Időpont</th>
                    <th>Játék</th>
                    <th>Játékmód</th>
                    <th>Tét</th>
                    <th>Költség</th>
                    <th>Nyeremény</th>
                    <th>Nettó eredmény</th>
                    <th>Egyenleg</th>
                  </tr>
                </thead>

                <tbody>
                  {games.map((game) => {
                    const netResult = Number(game.netResult) || 0;

                    const netResultClass =
                      netResult > 0
                        ? "history-result-positive"
                        : netResult < 0
                          ? "history-result-negative"
                          : "history-result-neutral";

                    return (
                      <tr key={game._id}>
                        <td className="history-id">
                          <code>{game._id}</code>
                        </td>
                        <td>{formatDate(game.createdAt)}</td>

                        <td>
                          {GAME_TYPE_LABELS[game.gameType] || game.gameType}
                        </td>

                        <td>
                          {GAME_MODE_LABELS[game.gameMode] || game.gameMode}
                        </td>

                        <td>{formatCredits(game.baseBet)}</td>

                        <td>{formatCredits(game.cost)}</td>

                        <td>{formatCredits(game.winAmount)}</td>

                        <td className={netResultClass}>
                          {formatCredits(netResult, true)}
                        </td>

                        <td>{formatCredits(game.balanceAfter)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <nav
              className="history-pagination"
              aria-label="Játéktörténet lapozása"
            >
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={handlePreviousPage}
              >
                Előző
              </button>

              <span>
                {pagination?.page} / {pagination?.totalPages}. oldal
              </span>

              <button
                type="button"
                disabled={
                  loading || !pagination || page >= pagination.totalPages
                }
                onClick={handleNextPage}
              >
                Következő
              </button>
            </nav>
          </>
        )}
      </section>
    </main>
  );
}

export default GameHistoryPage;
