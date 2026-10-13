import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { getSlotConfig, spinSlot } from "../api/slotApi";
import BetSelector from "../components/slot/BetSelector";
import SlotGrid from "../components/slot/SlotGrid";
import "./SlotPage.css";

function createRequestId() {
  return window.crypto.randomUUID();
}

function SlotPage({ user }) {
  const [slotConfig, setSlotConfig] = useState(null);
  const [selectedBet, setSelectedBet] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [balance, setBalance] = useState(user?.balance ?? 0);

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const [isSpinning, setIsSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingRequest, setPendingRequest] = useState(null);

  useEffect(() => {
    setBalance(user?.balance ?? 0);
  }, [user?.balance]);

  useEffect(() => {
    let componentIsActive = true;

    async function loadSlotConfig() {
      try {
        setIsLoadingConfig(true);
        setErrorMessage("");

        const config = await getSlotConfig();

        if (!componentIsActive) {
          return;
        }

        setSlotConfig(config);

        if (
          Array.isArray(config.allowedBets) &&
          config.allowedBets.length > 0
        ) {
          setSelectedBet(config.allowedBets[0]);
        }
      } catch (error) {
        if (componentIsActive) {
          setErrorMessage(error.message);
        }
      } finally {
        if (componentIsActive) {
          setIsLoadingConfig(false);
        }
      }
    }

    loadSlotConfig();

    return () => {
      componentIsActive = false;
    };
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  function handleBetChange(newBet) {
    if (pendingRequest || isSpinning) {
      return;
    }

    setSelectedBet(newBet);
    setErrorMessage("");
  }

  async function executeSpin(request) {
    try {
      setIsSpinning(true);
      setErrorMessage("");

      const response = await spinSlot(request);

      setGameResult(response.result);
      setBalance(response.balanceAfter);
      setPendingRequest(null);
    } catch (error) {
      setErrorMessage(error.message);
      setPendingRequest(request);
    } finally {
      setIsSpinning(false);
    }
  }

  function handleSpin() {
    if (selectedBet === null || isSpinning) {
      return;
    }

    const request = pendingRequest || {
      baseBet: selectedBet,
      requestId: createRequestId(),
    };

    executeSpin(request);
  }

  const allowedBets = slotConfig?.allowedBets || [];
  const rowCount = slotConfig?.rows || 3;
  const reelCount = slotConfig?.reels || 5;

  const lastWin = gameResult?.totalWin ?? 0;

  return (
    <main className="slot-page">
      <section className="game-embed">
        <header className="game-embed-header">
          <div>
            <h1 className="game-embed-title">Book of Pharaoh</h1>

            <p className="game-embed-subtitle">
              {reelCount} tárcsa · {rowCount} sor · 10 nyerővonal
            </p>
          </div>
        </header>

        <div className="game-stage">
          {isLoadingConfig ? (
            <p>Játék betöltése...</p>
          ) : (
            <SlotGrid
              grid={gameResult?.grid}
              rowCount={rowCount}
              reelCount={reelCount}
              isSpinning={isSpinning}
            />
          )}
        </div>

        <div className="slot-toolbar">
          <div className="slot-information">
            <div className="slot-stat">
              <span className="slot-stat-label">Egyenleg</span>

              <span className="slot-stat-value">{balance} CR</span>
            </div>

            <div className="slot-stat">
              <span className="slot-stat-label">Utolsó nyeremény</span>

              <span className="slot-stat-value">{lastWin} CR</span>
            </div>
          </div>

          <BetSelector
            allowedBets={allowedBets}
            selectedBet={selectedBet}
            onBetChange={handleBetChange}
            disabled={isSpinning || isLoadingConfig || Boolean(pendingRequest)}
          />

          <button
            className="slot-spin-button"
            type="button"
            disabled={isSpinning || isLoadingConfig || selectedBet === null}
            onClick={handleSpin}
          >
            {isSpinning
              ? "PÖRGETÉS..."
              : pendingRequest
                ? "ÚJRAPRÓBÁLÁS"
                : "SPIN"}
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className="slot-status slot-error" role="alert">
          {errorMessage}
        </div>
      )}
    </main>
  );
}

export default SlotPage;
