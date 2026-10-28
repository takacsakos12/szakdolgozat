import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import BaccaratTable from "../components/baccarat/BaccaratTable";
import { getBaccaratConfig, playBaccarat } from "../api/baccaratApi";
import { getCurrentUser } from "../api/authApi";
import "./BaccaratPage.css";

const CHIP_COLORS = {
  1: "#dce1e8",
  2: "#778395",
  5: "#b9404d",
  10: "#3578bc",
  25: "#32875d",
  50: "#8957b2",
  100: "#292d38",
};

const BET_LABELS = {
  PLAYER: "Player",
  TIE: "Tie",
  BANKER: "Banker",
  PLAYER_PAIR: "Player Pair",
  BANKER_PAIR: "Banker Pair",
  EITHER_PAIR: "Either Pair",
  PERFECT_PAIR: "Perfect Pair",
};

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function BaccaratPage({ user, onUserChange }) {
  const [bets, setBets] = useState([]);
  const [selectedChip, setSelectedChip] = useState(null);
  const [baccaratConfig, setBaccaratConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingRequest, setPendingRequest] = useState(null);
  const [previousBets, setPreviousBets] = useState([]);
  const isSubmittingRef = useRef(false);
  const [displayedBalance, setDisplayedBalance] = useState(user?.balance ?? 0);
  const [displayedWin, setDisplayedWin] = useState(0);
  const [dealingResult, setDealingResult] = useState(null);
  const controlsDisabled =
    isLoading || !baccaratConfig || isPlaying || Boolean(pendingRequest);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let componentIsActive = true;

    async function loadBaccaratConfig() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const config = await getBaccaratConfig();

        if (!componentIsActive) {
          return;
        }

        setBaccaratConfig(config);
        setSelectedChip(config.chips[0]);
      } catch (error) {
        if (componentIsActive) {
          setErrorMessage(error.message);
        }
      } finally {
        if (componentIsActive) {
          setIsLoading(false);
        }
      }
    }

    loadBaccaratConfig();

    return () => {
      componentIsActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!isPlaying) {
      setDisplayedBalance(user?.balance ?? 0);
    }
  }, [user?.balance, isPlaying]);

  function handleChipChange(chipValue) {
    if (controlsDisabled || isSubmittingRef.current) {
      return;
    }

    if (!baccaratConfig.chips.includes(chipValue)) {
      return;
    }

    setSelectedChip(chipValue);
  }

  function handlePlaceBet(bet) {
    if (controlsDisabled || isSubmittingRef.current || selectedChip === null) {
      return;
    }

    const currentTotal = bets.reduce(
      (total, currentBet) => total + currentBet.amount,
      0,
    );

    const nextTotal = currentTotal + selectedChip;

    if (nextTotal > baccaratConfig.maxBet) {
      setErrorMessage(`A maximális össztét ${baccaratConfig.maxBet} CR.`);
      return;
    }

    if (nextTotal > user.balance) {
      setErrorMessage("Nincs elegendő egyenleg.");
      return;
    }

    setBets((prevBets) => [
      ...prevBets,
      {
        type: bet.type,
        amount: selectedChip,
      },
    ]);

    setErrorMessage("");
  }

  async function animateDeal(finalResult) {
    let playerHand = [];
    let bankerHand = [];

    setDealingResult({ playerHand, bankerHand, bets: [] });

    const dealOrder = [
      { side: "PLAYER", card: finalResult.playerHand[0] },
      { side: "BANKER", card: finalResult.bankerHand[0] },
      { side: "PLAYER", card: finalResult.playerHand[1] },
      { side: "BANKER", card: finalResult.bankerHand[1] },
    ];

    if (finalResult.playerHand[2]) {
      dealOrder.push({ side: "PLAYER", card: finalResult.playerHand[2] });
    }
    if (finalResult.bankerHand[2]) {
      dealOrder.push({ side: "BANKER", card: finalResult.bankerHand[2] });
    }

    for (const deal of dealOrder) {
      if (deal.side === "PLAYER") {
        playerHand = [...playerHand, deal.card];
      } else {
        bankerHand = [...bankerHand, deal.card];
      }

      setDealingResult({
        playerHand,
        bankerHand,
        bets: [],
      });

      await wait(500);
    }
  }

  function handleUndoBet() {
    if (controlsDisabled || isSubmittingRef.current) {
      return;
    }

    setBets((prevBets) => prevBets.slice(0, -1));
    setErrorMessage("");
  }

  function handleClearBets() {
    if (controlsDisabled || isSubmittingRef.current) {
      return;
    }

    setErrorMessage("");
  }

  function handleReBet() {
    if (
      controlsDisabled ||
      isSubmittingRef.current ||
      previousBets.length === 0
    ) {
      return;
    }

    const previousTotal = previousBets.reduce(
      (total, bet) => total + bet.amount,
      0,
    );

    if (previousTotal > baccaratConfig.maxBet) {
      setErrorMessage(`A maximális össztét ${baccaratConfig.maxBet} CR.`);
      return;
    }

    if (previousTotal > user.balance) {
      setErrorMessage(
        "Nincs elegendő egyenleg az előző fogadások visszaállításához.",
      );
      return;
    }

    setBets(previousBets.map((bet) => ({ ...bet })));
    setErrorMessage("");
  }
  async function updateDisplayedBalance(response) {
    if (!response.replayed) {
      setDisplayedBalance(response.balanceAfter);

      onUserChange((currentUser) =>
        currentUser
          ? {
              ...currentUser,
              balance: response.balanceAfter,
            }
          : currentUser,
      );

      return;
    }

    try {
      const currentUserResponse = await getCurrentUser();
      const currentUser = currentUserResponse.user;

      setDisplayedBalance(currentUser.balance);
      onUserChange(currentUser);
    } catch {
      setErrorMessage(
        "A kör eredménye megérkezett, de az egyenleget nem sikerült frissíteni.",
      );
    }
  }

  async function executeGame(request) {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    setIsPlaying(true);
    setDealingResult(null);
    setPendingRequest(request);
    setErrorMessage("");

    try {
      let response;

      try {
        response = await playBaccarat(request.bets, request.requestId);
      } catch (error) {
        const uncertainOutcome =
          error.code === "NETWORK_ERROR" ||
          error.statusCode === 408 ||
          error.statusCode >= 500;

        if (uncertainOutcome) {
          // Az eredeti kérés megmarad az újrapróbáláshoz.
          setErrorMessage(`${error.message} Próbáld újra ugyanazt a kérést.`);
        } else {
          setPendingRequest(null);
          setErrorMessage(error.message);
        }

        return;
      }

      setPendingRequest(null);

      setPreviousBets(request.bets.map((bet) => ({ ...bet })));

      try {
        await animateDeal(response.result);
      } catch {
        setErrorMessage(
          "A kör elszámolása megtörtént, de az osztási animáció megszakadt.",
        );
      } finally {
        setResult(response.result);
        setDisplayedWin(response.result.totalWin);
        setBets([]);

        await updateDisplayedBalance(response);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsPlaying(false);
    }
  }

  function handlePlay() {
    if (isLoading || !baccaratConfig || isPlaying || isSubmittingRef.current) {
      return;
    }

    // Újrapróbáláskor ugyanaz az azonosító és fogadás marad.
    if (pendingRequest) {
      executeGame(pendingRequest);
      return;
    }

    if (bets.length === 0) {
      setErrorMessage("Először helyezz el egy fogadást.");
      return;
    }

    const total = bets.reduce((sum, bet) => sum + bet.amount, 0);

    if (total > baccaratConfig.maxBet) {
      setErrorMessage(`A maximális össztét ${baccaratConfig.maxBet} CR.`);
      return;
    }

    if (total > user.balance) {
      setErrorMessage("Nincs elegendő egyenleg.");
      return;
    }

    executeGame({
      requestId: window.crypto.randomUUID(),
      bets: bets.map((bet) => ({ ...bet })),
    });
  }

  const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

  const showLastResult = !isPlaying && Boolean(result) && bets.length === 0;

  const visibleResult = isPlaying
    ? dealingResult
    : showLastResult
      ? result
      : null;

  const displayedBets = showLastResult ? result.bets : bets;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="baccarat-page">
      <section className="baccarat-game">
        <header className="baccarat-header">
          <h1>Baccarat</h1>
          <span>Egyenleg: {displayedBalance} CR</span>
        </header>

        {errorMessage && (
          <div className="baccarat-error" role="alert">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <p role="status">Baccarat betöltése...</p>
        ) : baccaratConfig ? (
          <>
            <BaccaratTable
              config={baccaratConfig}
              result={visibleResult}
              bets={displayedBets}
              disabled={controlsDisabled}
              isDealing={isPlaying}
              onPlaceBet={handlePlaceBet}
            />

            <div className="baccarat-deal-area">
              <button
                className="baccarat-deal-button"
                type="button"
                disabled={
                  isLoading ||
                  isPlaying ||
                  (!pendingRequest && bets.length === 0)
                }
                onClick={handlePlay}
              >
                {isPlaying
                  ? "Osztás..."
                  : pendingRequest
                    ? "Újrapróbálás"
                    : "Osztás"}
              </button>
            </div>

            <div className="baccarat-toolbar">
              <button
                className="baccarat-table-action"
                type="button"
                disabled={controlsDisabled || previousBets.length === 0}
                onClick={handleReBet}
                aria-label="Előző fogadások visszaállítása"
                title="Előző tétek"
              >
                <span aria-hidden="true">↻</span>
              </button>

              <div className="baccarat-chip-selector">
                {baccaratConfig.chips.map((chipValue) => (
                  <button
                    key={chipValue}
                    className="baccarat-chip"
                    type="button"
                    style={{
                      "--chip-color": CHIP_COLORS[chipValue] ?? "#3578bc",
                      "--chip-text": chipValue === 1 ? "#252a34" : "#ffffff",
                      "--chip-stripe": chipValue === 1 ? "#657084" : "#f3f0e7",
                    }}
                    disabled={controlsDisabled}
                    aria-pressed={selectedChip === chipValue}
                    aria-label={`${chipValue} CR zseton`}
                    onClick={() => handleChipChange(chipValue)}
                  >
                    <span>{chipValue}</span>
                  </button>
                ))}
              </div>

              <button
                className="baccarat-table-action"
                type="button"
                disabled={controlsDisabled || bets.length === 0}
                onClick={handleUndoBet}
                aria-label="Utolsó zseton visszavonása"
                title="Visszavonás"
              >
                <span aria-hidden="true">↶</span>
              </button>
            </div>

            <div className="baccarat-controls">
              <button
                className="baccarat-clear-button"
                type="button"
                disabled={controlsDisabled || bets.length === 0}
                onClick={handleClearBets}
              >
                Tétek törlése
              </button>
            </div>

            <div className="baccarat-information">
              <span>
                Össztét: {showLastResult ? result.cost : totalBetAmount} CR
              </span>

              {showLastResult && (
                <>
                  <span>
                    Teljes jóváírás:{" "}
                    {displayedWin.toLocaleString("hu-HU", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    CR
                  </span>

                  <span
                    className={
                      result.netResult > 0
                        ? "baccarat-profit"
                        : result.netResult < 0
                          ? "baccarat-loss"
                          : ""
                    }
                  >
                    Nettó eredmény:{" "}
                    {result.netResult.toLocaleString("hu-HU", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    CR
                  </span>
                </>
              )}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default BaccaratPage;
