import { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router-dom";

import {
  getBlackjackConfig,
  getActiveBlackjackSession,
  startBlackjackGame,
  performBlackjackAction,
} from "../api/blackjackApi";
import { getCurrentUser } from "../api/authApi";
import BlackjackTable from "../components/blackjack/BlackjackTable";

import "./BlackjackPage.css";

const ACTION_LABELS = {
  HIT: "Lapkérés",
  STAND: "Megállás",
  DOUBLE_DOWN: "Duplázás",
  SPLIT: "Két kézre osztás",
  INSURANCE: "Biztosítás",
  DECLINE_INSURANCE: "Biztosítás elutasítása",
};

function BlackjackPage({ user, onUserChange }) {
  const [blackjackConfig, setBlackjackConfig] = useState(null);
  const [game, setGame] = useState(null);

  const [baseBet, setBaseBet] = useState(0);
  const [perfectPairsBet, setPerfectPairsBet] = useState(0);
  const [twentyOnePlusThreeBet, setTwentyOnePlusThreeBet] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const isSubmittingRef = useRef(false);

  const userId = user?.id;

  const hasActiveGame = Boolean(game && game.phase !== "FINISHED");

  const availableActions = game?.availableActions ?? [];

  const controlsDisabled = isLoading || isSubmitting || Boolean(pendingAction);

  const betsDisabled = controlsDisabled || hasActiveGame;

  const totalBetAmount = baseBet + perfectPairsBet + twentyOnePlusThreeBet;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    async function loadBlackjack() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [config, response] = await Promise.all([
          getBlackjackConfig(),
          getActiveBlackjackSession(),
        ]);

        if (!active) {
          return;
        }

        setBlackjackConfig(config);
        setBaseBet(config.minBet);
        setGame(response.game);
      } catch (error) {
        if (active) {
          setErrorMessage(error.message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadBlackjack();

    return () => {
      active = false;
    };
  }, [userId]);

  function handleBetChange(name, value) {
    if (betsDisabled || isSubmittingRef.current) {
      return;
    }

    if (name === "baseBet") {
      setBaseBet(value);
    } else if (name === "perfectPairsBet") {
      setPerfectPairsBet(value);
    } else if (name === "twentyOnePlusThreeBet") {
      setTwentyOnePlusThreeBet(value);
    }

    setErrorMessage("");
  }

  async function updateDisplayedBalance(response) {
    if (!response.replayed) {
      onUserChange((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              balance: response.balance,
            }
          : currentUser,
      );

      return;
    }
    try {
      const response = await getCurrentUser();
      onUserChange(response.user);
    } catch {
      setErrorMessage("Hiba történt az egyenleg frissítésekor.");
    }
  }

  async function executeRequest(request) {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setPendingAction(request);
    setErrorMessage("");

    try {
      const response =
        request.type === "START"
          ? await startBlackjackGame(request.data, request.requestId)
          : await performBlackjackAction(request.data, request.requestId);

      setGame(response);
      setPendingAction(null);

      await updateDisplayedBalance(response);
    } catch (error) {
      const rejected = [400, 401, 403, 404, 409, 422, 429].includes(
        error.statusCode,
      );

      if (rejected) {
        setPendingAction(null);
        setErrorMessage(error.message);
      } else {
        setErrorMessage(`${error.message} Próbáld újra ugyanazt a kérést.`);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleStartGame() {
    if (betsDisabled || isSubmittingRef.current || !blackjackConfig) {
      return;
    }

    if (
      !Number.isSafeInteger(baseBet) ||
      baseBet < blackjackConfig.minBet ||
      baseBet > blackjackConfig.maxBet
    ) {
      setErrorMessage(
        `A tétnek ${blackjackConfig.minBet} és ${blackjackConfig.maxBet} között kell lennie.`,
      );
      return;
    }

    if (
      ![perfectPairsBet, twentyOnePlusThreeBet].every(
        (amount) => Number.isSafeInteger(amount) && amount >= 0,
      ) ||
      !Number.isSafeInteger(totalBetAmount)
    ) {
      setErrorMessage("A mellékfogadások nemnegatív egész összegek legyenek.");
      return;
    }

    if (totalBetAmount > user.balance) {
      setErrorMessage("Nincs elegendő egyenleg.");
      return;
    }

    const request = {
      type: "START",
      requestId: window.crypto.randomUUID(),
      data: {
        baseBet,
        perfectPairsBet,
        twentyOnePlusThreeBet,
      },
    };

    executeRequest(request);
  }
  function handleAction(action) {
    if (
      controlsDisabled ||
      !availableActions.includes(action) ||
      !hasActiveGame ||
      isSubmittingRef.current
    ) {
      return;
    }

    const request = {
      type: "ACTION",
      requestId: window.crypto.randomUUID(),
      data: {
        sessionId: game.sessionId,
        expectedVersion: game.version,
        action,
      },
    };
    executeRequest(request);
  }

  function handleRetry() {
    if (isLoading || isSubmittingRef.current || !pendingAction) {
      return;
    }

    executeRequest(pendingAction);
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return (
    <main className="blackjack-page">
      <section className="blackjack-game">
        <header className="blackjack-header">
          <h1>Blackjack</h1>
          <span> Egyenleg: {user.balance} CR </span>
        </header>

        {errorMessage && (
          <div className="blackjack-error-message" role="alert">
            {errorMessage}
          </div>
        )}
        {isLoading ? (
          <p role="status">Blackjack betöltése...</p>
        ) : blackjackConfig ? (
          <>
            <BlackjackTable game={game} />
            <div className="blackjack-bets">
              <label>
                Alap tét:
                <input
                  type="number"
                  min={blackjackConfig.minBet}
                  max={blackjackConfig.maxBet}
                  step="1"
                  value={baseBet}
                  disabled={betsDisabled}
                  onChange={(event) =>
                    handleBetChange("baseBet", Number(event.target.value))
                  }
                />
              </label>
              {blackjackConfig.sideBets.PERFECT_PAIRS.enabled && (
                <label>
                  Perfect Pairs tét:
                  <input
                    type="number"
                    min={blackjackConfig.sideBets.PERFECT_PAIRS.minBet}
                    max={blackjackConfig.sideBets.PERFECT_PAIRS.maxBet}
                    step="1"
                    value={perfectPairsBet}
                    disabled={betsDisabled}
                    onChange={(event) =>
                      handleBetChange(
                        "perfectPairsBet",
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
              )}
              {blackjackConfig.sideBets.TWENTY_ONE_PLUS_THREE.enabled && (
                <label>
                  21+3 tét:
                  <input
                    type="number"
                    min={blackjackConfig.sideBets.TWENTY_ONE_PLUS_THREE.minBet}
                    max={blackjackConfig.sideBets.TWENTY_ONE_PLUS_THREE.maxBet}
                    step="1"
                    value={twentyOnePlusThreeBet}
                    disabled={betsDisabled}
                    onChange={(event) =>
                      handleBetChange(
                        "twentyOnePlusThreeBet",
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
              )}
            </div>
            <div className="blackjack-controls">
              {!hasActiveGame && (
                <button
                  type="button"
                  disabled={controlsDisabled}
                  onClick={handleStartGame}
                >
                  {isSubmitting ? "Játék indítása..." : "Játék indítása"}
                </button>
              )}
              {hasActiveGame &&
                availableActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={controlsDisabled}
                    onClick={() => handleAction(action)}
                  >
                    {ACTION_LABELS[action] ?? action}
                  </button>
                ))}
              {pendingAction && (
                <button
                  type="button"
                  disabled={isLoading || isSubmitting}
                  onClick={handleRetry}
                >
                  {isSubmitting ? "Küldés" : "Újrapróbálás"}
                </button>
              )}
            </div>
            {game?.phase === "INSURANCE" && (
              <p className="blackjack-insurance">
                Biztosítás összege:{" "}
                {game.hands[0].bet * blackjackConfig.rules.maxInsuranceBetRatio}{" "}
                CR
              </p>
            )}
            <div className="blackjack-information">
              <span>
                {hasActiveGame
                  ? `A kör eddigi költsége: ${game.cost} CR`
                  : `Új kör kezdőtétei: ${totalBetAmount} CR`}
              </span>
              {game?.phase === "FINISHED" && (
                <>
                  <span>Teljes jóvaírás: {game.result.totalWin} CR</span>
                  <span>Nettó eredmény: {game.result.netResult} CR</span>
                </>
              )}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default BlackjackPage;
