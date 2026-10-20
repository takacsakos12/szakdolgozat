import { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";

import { getRouletteConfig, spinRouletteGame } from "../api/rouletteApi";
import { getCurrentUser } from "../api/authApi";
import RouletteTable from "../components/roulette/RouletteTable";
import RouletteWheel from "../components/roulette/RouletteWheel";

import "./RoulettePage.css";

function RoulettePage({ user, onUserChange }) {
  const [bets, setBets] = useState([]);
  const [selectedChip, setSelectedChip] = useState(null);
  const [rouletteConfig, setRouletteConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [previousBets, setPreviousBets] = useState([]);
  const isSubmittingRef = useRef(false);
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const controlsDisabled =
    isLoading || isSpinning || isWheelSpinning || Boolean(pendingRequest);

  const userId = user?.id;

  function handleChipChange(chipValue) {
    if (controlsDisabled || isSubmittingRef.current) {
      return;
    }

    if (!rouletteConfig.allowedChipValues.includes(chipValue)) {
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

    if (nextTotal > rouletteConfig.maxTotalBetAmount) {
      setErrorMessage(
        `A maximális össztét ${rouletteConfig.maxTotalBetAmount} CR.`,
      );
      return;
    }

    setBets((prevBets) => [
      ...prevBets,
      {
        type: bet.type,
        numbers: [...(bet.numbers ?? [])],
        amount: selectedChip,
      },
    ]);

    setErrorMessage("");
  }

  function handleUndoBet() {
    if (controlsDisabled || isSubmittingRef.current) {
      return;
    }

    setBets((prevBets) => prevBets.slice(0, -1));
    setErrorMessage("");
  }

  async function updateDisplayedBalance(response) {
    if (!response.replayed) {
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
      onUserChange(currentUserResponse.user);
    } catch {
      setErrorMessage(
        "A kör eredménye megérkezett, de az egyenleget nem sikerült frissíteni.",
      );
    }
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

    if (previousTotal > rouletteConfig.maxTotalBetAmount) {
      setErrorMessage(
        `A maximális össztét ${rouletteConfig.maxTotalBetAmount} CR.`,
      );
      return;
    }

    if (previousTotal > user.balance) {
      setErrorMessage(
        "Nincs elegendő egyenleg az előző fogadások visszaállításához.",
      );
      return;
    }

    setBets(
      previousBets.map((bet) => ({
        ...bet,
        numbers: [...bet.numbers],
      })),
    );
    setErrorMessage("");
  }

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let componentIsActive = true;

    async function loadRouletteConfig() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const config = await getRouletteConfig();

        if (!componentIsActive) {
          return;
        }

        setRouletteConfig(config);
        setSelectedChip(config.allowedChipValues[0]);
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

    loadRouletteConfig();

    return () => {
      componentIsActive = false;
    };
  }, [userId]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function executeSpin(request) {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSpinning(true);
    setPendingRequest(request);
    setErrorMessage("");

    try {
      const response = await spinRouletteGame(request.bets, request.requestId);
      setIsWheelSpinning(true);
      setResult({
        ...response.result,
        historyId: response.historyId,
      });
      setPreviousBets(request.bets);
      setBets([]);
      setPendingRequest(null);

      await updateDisplayedBalance(response);
    } catch (error) {
      const status = error.statusCode;
      const requestWasRejected = [400, 401, 403, 404, 409, 422].includes(
        status,
      );

      if (requestWasRejected) {
        setPendingRequest(null);
        setErrorMessage(error.message);
      } else {
        setErrorMessage(`${error.message} Próbáld újra ugyanazt a kérést.`);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSpinning(false);
    }
  }

  function handleSpin() {
    if (isLoading || isSpinning || isWheelSpinning || isSubmittingRef.current) {
      return;
    }

    if (pendingRequest) {
      executeSpin(pendingRequest);
      return;
    }

    if (bets.length === 0) {
      setErrorMessage("Először helyezz el egy fogadást.");
      return;
    }

    const cost = bets.reduce((total, bet) => total + bet.amount, 0);

    if (cost > user.balance) {
      setErrorMessage("Nincs elegendő egyenleg.");
      return;
    }

    const request = {
      requestId: window.crypto.randomUUID(),

      bets: bets.map((bet) => ({
        ...bet,
        numbers: [...bet.numbers],
      })),
    };

    executeSpin(request);
  }

  const totalBet = bets.reduce((total, bet) => total + bet.amount, 0);

  return (
    <main className="roulette-page">
      <section className="roulette-game">
        <header className="roulette-header">
          <div>
            <h1>Európai rulett</h1>
            <p>37 szám · Egyetlen nulla</p>
          </div>

          {rouletteConfig && (
            <span>
              RTP:{" "}
              {(rouletteConfig.theoreticalRtp * 100).toLocaleString("hu-HU", {
                maximumFractionDigits: 2,
              })}
              %
            </span>
          )}
        </header>

        {errorMessage && (
          <div className="roulette-error" role="alert">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <p role="status">Rulett betöltése...</p>
        ) : rouletteConfig ? (
          <>
            <div className="roulette-wheel-area">
              <RouletteWheel
                result={result}
                wheelOrder={rouletteConfig.wheelOrder}
                numberColors={rouletteConfig.numberColors}
                onSpinEnd={() => setIsWheelSpinning(false)}
              />
            </div>

            <div className="roulette-table-area">
              <RouletteTable
                config={rouletteConfig}
                bets={bets}
                disabled={controlsDisabled}
                onPlaceBet={handlePlaceBet}
                onReBet={handleReBet}
                canReBet={previousBets.length > 0}
                onUndoBet={handleUndoBet}
              />
            </div>

            <div className="roulette-controls-area">
              <div className="roulette-chip-selector">
                {rouletteConfig.allowedChipValues.map((chipValue) => (
                  <button
                    key={chipValue}
                    type="button"
                    disabled={controlsDisabled}
                    aria-pressed={selectedChip === chipValue}
                    onClick={() => handleChipChange(chipValue)}
                  >
                    {chipValue} CR
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={
                  isLoading ||
                  isSpinning ||
                  isWheelSpinning ||
                  (!pendingRequest && bets.length === 0)
                }
                onClick={handleSpin}
              >
                {isSpinning
                  ? "Pörgetés..."
                  : pendingRequest
                    ? "Újrapróbálás"
                    : "SPIN"}
              </button>
            </div>

            <div className="roulette-information">
              <span>Egyenleg: {user.balance} CR</span>
              <span>Kiválasztott zseton: {selectedChip} CR</span>
              <span>Össztét: {totalBet} CR</span>
              <span>Utolsó nyeremény: {result?.totalWin ?? 0} CR</span>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default RoulettePage;
