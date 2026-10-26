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

const CHIP_COLORS = {
  1: "#dce1e8",
  2: "#778395",
  5: "#b9404d",
  10: "#3578bc",
  25: "#32875d",
  50: "#8957b2",
  100: "#292d38",
};

function BlackjackPage({ user, onUserChange }) {
  const [blackjackConfig, setBlackjackConfig] = useState(null);
  const [game, setGame] = useState(null);

  const [baseBet, setBaseBet] = useState(0);
  const [perfectPairsBet, setPerfectPairsBet] = useState(0);
  const [twentyOnePlusThreeBet, setTwentyOnePlusThreeBet] = useState(0);

  const [selectedChip, setSelectedChip] = useState(null);
  const [betHistory, setBetHistory] = useState([]);
  const [previousBets, setPreviousBets] = useState(null);

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

  const showLastResult = game?.phase === "FINISHED" && totalBetAmount === 0;

  const showRound = hasActiveGame || showLastResult;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;

    async function loadBlackjack() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [config, response, currentUserResponse] = await Promise.all([
          getBlackjackConfig(),
          getActiveBlackjackSession(),
          getCurrentUser(),
        ]);

        if (!active) {
          return;
        }

        setBlackjackConfig(config);
        setBaseBet(0);
        setPerfectPairsBet(0);
        setTwentyOnePlusThreeBet(0);
        setSelectedChip(config.allowedChipValues[0]);
        setBetHistory([]);
        setPreviousBets(null);
        setGame(response.game);
        onUserChange(currentUserResponse.user);
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
  }, [userId, onUserChange]);

  function getBetChips(type) {
    const currentAmounts = {
      BASE_BET: baseBet,
      PERFECT_PAIRS: perfectPairsBet,
      TWENTY_ONE_PLUS_THREE: twentyOnePlusThreeBet,
    };

    let amount = currentAmounts[type];

    if (showRound) {
      amount =
        type === "BASE_BET"
          ? game.hands.reduce((sum, hand) => sum + hand.bet, 0)
          : (game.sideBets.bets.find((bet) => bet.type === type)?.amount ?? 0);
    }

    const chipValues = [...blackjackConfig.allowedChipValues].sort(
      (first, second) => second - first,
    );

    const chips = [];

    for (const chipValue of chipValues) {
      const count = Math.floor(amount / chipValue);

      for (let index = 0; index < count; index++) {
        chips.push(chipValue);
      }

      amount -= count * chipValue;
    }

    return chips;
  }

  function renderBetChips(type) {
    const chips = getBetChips(type);
    const visibleChips = chips.slice(0, 6);

    if (chips.length === 0) {
      return <span className="blackjack-empty-bet">+</span>;
    }

    return (
      <span
        className="blackjack-bet-chips"
        aria-label={`${chips.length} zseton, összesen ${chips.reduce(
          (sum, value) => sum + value,
          0,
        )} CR`}
      >
        {visibleChips.map((value, index) => (
          <span
            key={index}
            className="blackjack-bet-chip"
            style={{
              "--chip-color": CHIP_COLORS[value] ?? "#3578bc",
              "--chip-text": value === 1 ? "#252a34" : "#ffffff",
              "--chip-stripe": value === 1 ? "#657084" : "#f3f0e7",
              "--chip-index": index,
            }}
            aria-hidden="true"
          >
            <span>{value}</span>
          </span>
        ))}

        {chips.length > 6 && (
          <span className="blackjack-chip-count">×{chips.length}</span>
        )}
      </span>
    );
  }

  function handleChipChange(chipValue) {
    if (betsDisabled || isSubmittingRef.current) {
      return;
    }

    if (!blackjackConfig.allowedChipValues.includes(chipValue)) {
      return;
    }

    setSelectedChip(chipValue);
  }

  function handlePlaceBet(bet) {
    if (betsDisabled || isSubmittingRef.current || selectedChip === null) {
      return;
    }

    const betFields = {
      BASE_BET: [baseBet, setBaseBet],
      PERFECT_PAIRS: [perfectPairsBet, setPerfectPairsBet],
      TWENTY_ONE_PLUS_THREE: [twentyOnePlusThreeBet, setTwentyOnePlusThreeBet],
    };

    const [amount, setAmount] = betFields[bet.type];

    if (
      bet.type === "BASE_BET" &&
      amount + selectedChip > blackjackConfig.maxBet
    ) {
      setErrorMessage(`A maximális alaptét ${blackjackConfig.maxBet} CR.`);
      return;
    }

    if (totalBetAmount + selectedChip > user.balance) {
      setErrorMessage("Nincs elegendő egyenleg.");
      return;
    }

    setAmount((currentAmount) => currentAmount + selectedChip);

    setBetHistory((history) => [
      ...history,
      {
        type: bet.type,
        amount: selectedChip,
      },
    ]);

    setErrorMessage("");
  }

  function handleUndoBet() {
    if (betsDisabled || isSubmittingRef.current || betHistory.length === 0) {
      return;
    }

    const lastBet = betHistory[betHistory.length - 1];

    const setters = {
      BASE_BET: setBaseBet,
      PERFECT_PAIRS: setPerfectPairsBet,
      TWENTY_ONE_PLUS_THREE: setTwentyOnePlusThreeBet,
    };

    setters[lastBet.type]((amount) => amount - lastBet.amount);

    setBetHistory((history) => history.slice(0, -1));
    setErrorMessage("");
  }

  function handleReBet() {
    if (betsDisabled || isSubmittingRef.current || !previousBets) {
      return;
    }

    if (
      previousBets.baseBet < blackjackConfig.minBet ||
      previousBets.baseBet > blackjackConfig.maxBet
    ) {
      setErrorMessage(
        "Az előző alaptét nem fér bele az aktuális téthatárokba.",
      );
      return;
    }

    const previousTotal =
      previousBets.baseBet +
      previousBets.perfectPairsBet +
      previousBets.twentyOnePlusThreeBet;

    if (previousTotal > user.balance) {
      setErrorMessage(
        "Nincs elegendő egyenleg az előző tétek visszaállításához.",
      );
      return;
    }

    setBaseBet(previousBets.baseBet);
    setPerfectPairsBet(previousBets.perfectPairsBet);
    setTwentyOnePlusThreeBet(previousBets.twentyOnePlusThreeBet);

    setBetHistory(previousBets.history.map((bet) => ({ ...bet })));

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

      if (request.type === "START") {
        setPreviousBets({
          ...request.data,
          history: request.betHistory.map((bet) => ({ ...bet })),
        });
      }

      if (response.phase === "FINISHED") {
        setBaseBet(0);
        setPerfectPairsBet(0);
        setTwentyOnePlusThreeBet(0);
        setBetHistory([]);
      }

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
      betHistory: betHistory.map((bet) => ({ ...bet })),
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
            <BlackjackTable game={showRound ? game : null} />
            <div className="blackjack-console">
              <div className="blackjack-side-bet">
                {blackjackConfig.sideBets.PERFECT_PAIRS.enabled && (
                  <>
                    <span>Perfect Pairs</span>

                    <button
                      type="button"
                      className="blackjack-bet-spot"
                      disabled={betsDisabled}
                      onClick={() => handlePlaceBet({ type: "PERFECT_PAIRS" })}
                      aria-label="Zseton hozzáadása a Perfect Pairs fogadáshoz"
                    >
                      {renderBetChips("PERFECT_PAIRS")}
                    </button>

                    <small>{perfectPairsBet} CR</small>
                  </>
                )}
              </div>

              <div className="blackjack-main-controls">
                <div className="blackjack-start-row">
                  <button
                    type="button"
                    className="blackjack-small-action"
                    disabled={betsDisabled || !previousBets}
                    onClick={handleReBet}
                    aria-label="Előző tétek visszaállítása"
                    title="Előző tétek"
                  >
                    ↻
                  </button>

                  <button
                    type="button"
                    className="blackjack-deal-button"
                    disabled={
                      isLoading ||
                      isSubmitting ||
                      (!pendingAction &&
                        (hasActiveGame || baseBet < blackjackConfig.minBet))
                    }
                    onClick={pendingAction ? handleRetry : handleStartGame}
                  >
                    {isSubmitting
                      ? "Küldés..."
                      : pendingAction
                        ? "Újrapróbálás"
                        : hasActiveGame
                          ? "Folyamatban"
                          : "Osztás"}
                  </button>

                  <button
                    type="button"
                    className="blackjack-small-action"
                    disabled={betsDisabled || betHistory.length === 0}
                    onClick={handleUndoBet}
                    aria-label="Utolsó zseton visszavonása"
                    title="Visszavonás"
                  >
                    ↶
                  </button>
                </div>

                <div className="blackjack-action-row">
                  {["DOUBLE_DOWN", "HIT", "STAND", "SPLIT"].map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={
                        controlsDisabled || !availableActions.includes(action)
                      }
                      onClick={() => handleAction(action)}
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  ))}
                </div>

                {game?.phase === "INSURANCE" && (
                  <div className="blackjack-insurance-controls">
                    <span>
                      Biztosítás:{" "}
                      {game.hands[0].bet *
                        blackjackConfig.rules.maxInsuranceBetRatio}{" "}
                      CR
                    </span>

                    {["INSURANCE", "DECLINE_INSURANCE"].map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled={
                          controlsDisabled || !availableActions.includes(action)
                        }
                        onClick={() => handleAction(action)}
                      >
                        {ACTION_LABELS[action]}
                      </button>
                    ))}
                  </div>
                )}

                <div className="blackjack-chip-row">
                  <div className="blackjack-chip-selector">
                    {blackjackConfig.allowedChipValues.map((chipValue) => (
                      <button
                        key={chipValue}
                        type="button"
                        className="blackjack-chip"
                        style={{
                          "--chip-color": CHIP_COLORS[chipValue] ?? "#3578bc",
                          "--chip-text":
                            chipValue === 1 ? "#252a34" : "#ffffff",
                          "--chip-stripe":
                            chipValue === 1 ? "#657084" : "#f3f0e7",
                        }}
                        disabled={betsDisabled}
                        aria-label={`${chipValue} CR zseton`}
                        aria-pressed={selectedChip === chipValue}
                        onClick={() => handleChipChange(chipValue)}
                      >
                        <span>{chipValue}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="blackjack-base-bet"
                    disabled={betsDisabled}
                    onClick={() => handlePlaceBet({ type: "BASE_BET" })}
                    aria-label="Zseton hozzáadása az alaptéthez"
                  >
                    <span className="blackjack-base-bet-label">
                      <span>Alaptét</span>
                      <strong>{baseBet} CR</strong>
                    </span>

                    {renderBetChips("BASE_BET")}
                  </button>
                </div>
              </div>

              <div className="blackjack-side-bet">
                {blackjackConfig.sideBets.TWENTY_ONE_PLUS_THREE.enabled && (
                  <>
                    <span>21+3</span>

                    <button
                      type="button"
                      className="blackjack-bet-spot"
                      disabled={betsDisabled}
                      onClick={() =>
                        handlePlaceBet({ type: "TWENTY_ONE_PLUS_THREE" })
                      }
                      aria-label="Zseton hozzáadása a 21+3 fogadáshoz"
                    >
                      {renderBetChips("TWENTY_ONE_PLUS_THREE")}
                    </button>

                    <small>{twentyOnePlusThreeBet} CR</small>
                  </>
                )}
              </div>
            </div>
            <div className="blackjack-information">
              <span>Össztét: {showRound ? game.cost : totalBetAmount} CR</span>

              {showLastResult && (
                <>
                  <span>Teljes jóváírás: {game.result.totalWin} CR</span>

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
