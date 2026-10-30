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

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function validateBlackjackBets(bets, config, allowIncomplete = false) {
  const fields = [
    {
      amount: bets.baseBet,
      label: "Alaptét",
      min: config.minBet,
      max: config.maxBet,
      enabled: true,
      optional: false,
    },
    {
      amount: bets.perfectPairsBet,
      label: "Perfect Pairs",
      ...config.sideBets.PERFECT_PAIRS,
      optional: true,
    },
    {
      amount: bets.twentyOnePlusThreeBet,
      label: "21+3",
      ...config.sideBets.TWENTY_ONE_PLUS_THREE,
      optional: true,
    },
  ];

  for (const field of fields) {
    const { amount, label, optional, enabled } = field;

    const min = optional ? field.minBet : field.min;
    const max = optional ? field.maxBet : field.max;

    if (!Number.isSafeInteger(amount) || amount < 0) {
      return `${label}: nemnegatív egész összeg szükséges.`;
    }

    // A kihagyott mellékfogadás szabályos.
    if (optional && amount === 0) {
      continue;
    }

    if (!enabled) {
      return `${label}: ez a mellékfogadás nem elérhető.`;
    }

    if (amount > max) {
      return `${label}: a maximum ${max} CR.`;
    }

    // Zsetonelhelyezés közben még épülhet a minimumtét.
    if (!allowIncomplete && amount < min) {
      return `${label}: a minimum ${min} CR.`;
    }
  }

  const total =
    bets.baseBet + bets.perfectPairsBet + bets.twentyOnePlusThreeBet;

  if (!Number.isSafeInteger(total)) {
    return "A teljes tét összege érvénytelen.";
  }

  return null;
}

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
  const [playbackGame, setPlaybackGame] = useState(null);

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

  function handleClearBets() {
    if (betsDisabled || isSubmittingRef.current) {
      return;
    }

    setBaseBet(0);
    setPerfectPairsBet(0);
    setTwentyOnePlusThreeBet(0);
    setBetHistory([]);
    setGame(null);
    setErrorMessage("");
  }

  async function animateBlackjackResponse(response, request) {
    const starting = request.type === "START";
    const splitting = !starting && request.data.action === "SPLIT";

    const view = {
      ...response,
      phase: "DEALING",
      result: null,
      availableActions: [],

      hands: response.hands.map((hand, index) => ({
        ...hand,
        cards: starting
          ? []
          : splitting
            ? [{ ...hand.cards[0], animateDeal: false }]
            : (game.hands[index]?.cards ?? []).map((card) => ({
                ...card,
                animateDeal: false,
              })),
      })),

      dealerHand: starting
        ? []
        : game.dealerHand.map((card) => ({
            ...card,
            animateDeal: false,
          })),
    };

    function showFrame() {
      setPlaybackGame({
        ...view,
        hands: view.hands.map((hand) => ({
          ...hand,
          cards: [...hand.cards],
        })),
        dealerHand: [...view.dealerHand],
      });
    }

    async function dealPlayerCard(handIndex, card) {
      view.hands[handIndex].cards.push({
        ...card,
        animateDeal: true,
      });

      showFrame();
      await wait(480);
    }

    async function dealDealerCard(card) {
      view.dealerHand.push({
        ...card,
        animateDeal: true,
      });

      showFrame();
      await wait(480);
    }

    showFrame();

    if (starting) {
      await dealPlayerCard(0, response.hands[0].cards[0]);
      await dealDealerCard(response.dealerHand[0]);

      await dealPlayerCard(0, response.hands[0].cards[1]);
      await dealDealerCard({ hidden: true });
    } else {
      // Hit, Double vagy Split során kapott új játékoslapok.
      for (let handIndex = 0; handIndex < response.hands.length; handIndex++) {
        const finalCards = response.hands[handIndex].cards;
        const existingCount = view.hands[handIndex].cards.length;

        for (
          let cardIndex = existingCount;
          cardIndex < finalCards.length;
          cardIndex++
        ) {
          await dealPlayerCard(handIndex, finalCards[cardIndex]);
        }
      }
    }
    if (
      view.dealerHand[1]?.hidden &&
      response.dealerHand[1] &&
      !response.dealerHand[1].hidden
    ) {
      view.dealerHand[1] = {
        ...response.dealerHand[1],
        animateDeal: false,
      };

      showFrame();
      await wait(350);
    }
    for (
      let index = view.dealerHand.length;
      index < response.dealerHand.length;
      index++
    ) {
      await dealDealerCard(response.dealerHand[index]);
    }
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
      BASE_BET: {
        field: "baseBet",
        amount: baseBet,
        setAmount: setBaseBet,
      },
      PERFECT_PAIRS: {
        field: "perfectPairsBet",
        amount: perfectPairsBet,
        setAmount: setPerfectPairsBet,
      },
      TWENTY_ONE_PLUS_THREE: {
        field: "twentyOnePlusThreeBet",
        amount: twentyOnePlusThreeBet,
        setAmount: setTwentyOnePlusThreeBet,
      },
    };

    const selected = betFields[bet.type];

    if (!selected) {
      return;
    }

    const nextBets = {
      baseBet,
      perfectPairsBet,
      twentyOnePlusThreeBet,

      [selected.field]: selected.amount + selectedChip,
    };

    const validationError = validateBlackjackBets(
      nextBets,
      blackjackConfig,
      true,
    );

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const nextTotal =
      nextBets.baseBet +
      nextBets.perfectPairsBet +
      nextBets.twentyOnePlusThreeBet;

    if (nextTotal > user.balance) {
      setErrorMessage("Nincs elegendő egyenleg.");
      return;
    }

    selected.setAmount((amount) => amount + selectedChip);

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

    const validationError = validateBlackjackBets(
      previousBets,
      blackjackConfig,
    );

    if (validationError) {
      setErrorMessage(validationError);
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

  async function refreshBlackjackSession(message) {
    // Sikertelen lekérésnél az újrapróbálás csak állapotot kér le.
    setPendingAction({ type: "SYNC" });

    try {
      const [response, currentUserResponse] = await Promise.all([
        getActiveBlackjackSession(),
        getCurrentUser(),
      ]);

      setGame(response.game ?? null);
      setPlaybackGame(null);

      setBaseBet(0);
      setPerfectPairsBet(0);
      setTwentyOnePlusThreeBet(0);
      setBetHistory([]);

      onUserChange(currentUserResponse.user);

      setPendingAction(null);
      setErrorMessage(message);
    } catch (error) {
      if (error.statusCode === 401) {
        onUserChange(null);
        setPendingAction(null);
        return;
      }

      setErrorMessage(
        "Az aktuális kört nem sikerült visszatölteni. Az Újrapróbálás gombbal ismét lekérheted.",
      );
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
      if (request.type === "SYNC") {
        await refreshBlackjackSession(
          "Az aktuális játékállapotot betöltöttük.",
        );

        return;
      }
      let response;

      try {
        response =
          request.type === "START"
            ? await startBlackjackGame(request.data, request.requestId)
            : await performBlackjackAction(request.data, request.requestId);
      } catch (error) {
        const uncertainOutcome =
          error.outcomeUnknown === true ||
          error.code === "NETWORK_ERROR" ||
          error.statusCode === 408 ||
          error.statusCode >= 500;

        if (uncertainOutcome) {
          setErrorMessage(`${error.message} Próbáld újra ugyanazt a kérést.`);
        } else if (error.statusCode === 409) {
          await refreshBlackjackSession(
            `${error.message} Az aktuális játékállapotot betöltöttük.`,
          );
        } else {
          setPendingAction(null);
          setErrorMessage(error.message);
        }

        return;
      }

      setPendingAction(null);

      if (request.type === "START") {
        setPreviousBets({
          ...request.data,
          history: request.betHistory.map((bet) => ({
            ...bet,
          })),
        });
      }

      try {
        await animateBlackjackResponse(response, request);
      } catch {
        setErrorMessage(
          "A művelet megtörtént, de a laposztási animáció megszakadt.",
        );
      } finally {
        setGame(response);
        setPlaybackGame(null);

        if (response.phase === "FINISHED") {
          setBaseBet(0);
          setPerfectPairsBet(0);
          setTwentyOnePlusThreeBet(0);
          setBetHistory([]);
        }

        await updateDisplayedBalance(response);
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

    const validationError = validateBlackjackBets(
      {
        baseBet,
        perfectPairsBet,
        twentyOnePlusThreeBet,
      },
      blackjackConfig,
    );

    if (validationError) {
      setErrorMessage(validationError);
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
            <BlackjackTable
              game={playbackGame ?? (showRound ? game : null)}
              isAnimating={Boolean(playbackGame)}
            />
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
                      ? "Feldolgozás..."
                      : pendingAction?.type === "SYNC"
                        ? "Állapot frissítése"
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
            <div className="blackjack-clear-area">
              <button
                type="button"
                className="game-clear-button"
                disabled={
                  betsDisabled || (totalBetAmount === 0 && !showLastResult)
                }
                onClick={handleClearBets}
              >
                Tétek törlése
              </button>
            </div>

            <div className="blackjack-information">
              <span>Össztét: {showRound ? game.cost : totalBetAmount} CR</span>

              <span>
                Teljes jóváírás: {showLastResult ? game.result.totalWin : 0} CR
              </span>

              <span>
                Nettó eredmény: {showLastResult ? game.result.netResult : 0} CR
              </span>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default BlackjackPage;
