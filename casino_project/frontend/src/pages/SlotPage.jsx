import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { getCurrentUser } from "../api/authApi";
import { buyBonus, featureSpin, getSlotConfig, spinSlot } from "../api/slotApi";

import FeatureSpinSelector from "../components/slot/FeatureSpinSelector";
import SlotControls from "../components/slot/SlotControls";
import SlotFeatures from "../components/slot/SlotFeatures";
import SlotGrid from "../components/slot/SlotGrid";

import "./SlotPage.css";

function createRequestId() {
  return window.crypto.randomUUID();
}

const BONUS_SPIN_DURATION = 2000;

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function SlotPage({ user, onUserChange }) {
  const [slotConfig, setSlotConfig] = useState(null);
  const [selectedBet, setSelectedBet] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [featureEnabled, setFeatureEnabled] = useState(false);

  const [gameResult, setGameResult] = useState(null);
  const [displayedGrid, setDisplayedGrid] = useState(null);
  const [gameMode, setGameMode] = useState("BASE_GAME");
  const [balance, setBalance] = useState(user?.balance ?? 0);

  const [isFeatureSelectorOpen, setIsFeatureSelectorOpen] = useState(false);

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isGridSpinning, setIsGridSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingRequest, setPendingRequest] = useState(null);
  const [bonusPlayback, setBonusPlayback] = useState(null);

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

        const selectableSymbols = config.featureSpin?.selectableSymbols || [];

        if (selectableSymbols.length > 0) {
          setSelectedSymbol(selectableSymbols[0]);
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

  function updateDisplayedBalance(response) {
    if (!response.replayed) {
      setBalance(response.balanceAfter);

      return;
    }

    getCurrentUser()
      .then((currentUserResponse) => {
        const currentUser = currentUserResponse.user;

        setBalance(currentUser.balance);

        onUserChange(currentUser);
      })
      .catch(() => {
        setErrorMessage("Az aktuális egyenleget nem sikerült frissíteni.");
      });
  }

  async function playBonusSpins(result) {
    const bonus = result?.bonus;
    const freeSpins = bonus?.freeSpinResults || [];

    if (freeSpins.length === 0) {
      return;
    }

    let accumulatedWin = 0;

    for (let index = 0; index < freeSpins.length; index += 1) {
      const freeSpin = freeSpins[index];

      accumulatedWin += Number(freeSpin.totalWin);

      setDisplayedGrid(freeSpin.grid);

      setBonusPlayback({
        currentSpin: index + 1,
        totalSpins: freeSpins.length,
        spinWin: freeSpin.totalWin,
        accumulatedWin,
        expandingSymbol: bonus.expandingSymbol,
        finished: false,
      });

      await wait(BONUS_SPIN_DURATION);
    }

    setBonusPlayback({
      currentSpin: freeSpins.length,
      totalSpins: freeSpins.length,
      spinWin: freeSpins[freeSpins.length - 1]?.totalWin,
      accumulatedWin: bonus.totalWin,
      expandingSymbol: bonus.expandingSymbol,
      finished: true,
    });
  }

  async function executeGame(mode, request) {
    try {
      setIsSpinning(true);
      setIsGridSpinning(true);
      setErrorMessage("");
      setBonusPlayback(null);
      setGameResult(null);
      setGameMode(mode);

      let response;

      if (mode === "BONUS_BUY") {
        response = await buyBonus(request);
      } else if (mode === "FEATURE_SPIN") {
        response = await featureSpin(request);
      } else {
        response = await spinSlot(request);
      }

      setIsGridSpinning(false);

      const freeSpins = response.result.bonus?.freeSpinResults || [];

      if (response.result.grid) {
        setDisplayedGrid(response.result.grid);
      }

      if (freeSpins.length > 0) {
        if (response.result.grid) {
          await wait(BONUS_SPIN_DURATION);
        }

        await playBonusSpins(response.result);
      }

      setGameResult(response.result);
      updateDisplayedBalance(response);
      setPendingRequest(null);
    } catch (error) {
      setErrorMessage(error.message);

      if (!error.statusCode) {
        setPendingRequest({
          mode,
          request,
        });
      } else {
        setPendingRequest(null);
      }
    } finally {
      setIsGridSpinning(false);
      setIsSpinning(false);
    }
  }

  function handleSpin() {
    if (selectedBet === null || isSpinning || isLoadingConfig) {
      return;
    }

    if (pendingRequest) {
      executeGame(pendingRequest.mode, pendingRequest.request);

      return;
    }

    if (featureEnabled) {
      executeGame("FEATURE_SPIN", {
        baseBet: selectedBet,
        selectedSymbol,
        requestId: createRequestId(),
      });

      return;
    }

    executeGame("BASE_GAME", {
      baseBet: selectedBet,
      requestId: createRequestId(),
    });
  }

  function handleBonusBuy() {
    if (selectedBet === null || isSpinning || pendingRequest) {
      return;
    }

    const bonusCost = selectedBet * bonusCostMultiplier;

    const confirmed = window.confirm(
      `Biztosan megvásárolod a bónuszt ${bonusCost} CR összegért?`,
    );

    if (!confirmed) {
      return;
    }

    executeGame("BONUS_BUY", {
      baseBet: selectedBet,
      requestId: createRequestId(),
    });
  }

  function handleFeatureToggle() {
    if (isSpinning || pendingRequest) {
      return;
    }

    if (featureEnabled) {
      setFeatureEnabled(false);
      setIsFeatureSelectorOpen(false);
      return;
    }

    setIsFeatureSelectorOpen(true);
  }

  function handleFeatureConfirm() {
    setFeatureEnabled(true);
    setIsFeatureSelectorOpen(false);
    setErrorMessage("");
  }

  const allowedBets = slotConfig?.allowedBets || [];
  const rowCount = slotConfig?.rows || 3;
  const reelCount = slotConfig?.reels || 5;

  const bonusCostMultiplier = slotConfig?.bonus?.purchaseCostMultiplier;

  const featureCostMultiplier = slotConfig?.featureSpin?.costMultiplier;

  const selectableSymbols = slotConfig?.featureSpin?.selectableSymbols || [];

  const lastWin = gameResult?.totalWin ?? 0;

  const controlsDisabled =
    isSpinning || isLoadingConfig || Boolean(pendingRequest);

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

          <span className="game-mode-indicator">
            {gameMode === "FEATURE_SPIN"
              ? "Feature Spin"
              : gameMode === "BONUS_BUY"
                ? "Bónuszjáték"
                : "Alapjáték"}
          </span>
        </header>

        <div className="slot-game-layout">
          <div className="game-stage">
            <div className="game-stage-content">
              {isLoadingConfig ? (
                <p>Játék betöltése...</p>
              ) : (
                <SlotGrid
                  grid={displayedGrid}
                  rowCount={rowCount}
                  reelCount={reelCount}
                  isSpinning={isGridSpinning}
                  expandingSymbol={
                    bonusPlayback?.expandingSymbol ??
                    (gameMode === "FEATURE_SPIN"
                      ? (gameResult?.expandingSymbol ?? null)
                      : null)
                  }
                />
              )}

              {bonusPlayback && (
                <div className="bonus-playback">
                  <strong className="bonus-playback-title">
                    {bonusPlayback.finished
                      ? "Bónuszjáték vége"
                      : `Ingyenes pörgetés ${bonusPlayback.currentSpin} / ${bonusPlayback.totalSpins}`}
                  </strong>

                  <span>Bővülő szimbólum: {bonusPlayback.expandingSymbol}</span>

                  {!bonusPlayback.finished && (
                    <span>Pörgetés nyereménye: {bonusPlayback.spinWin} CR</span>
                  )}

                  <span>
                    Bónusznyeremény: {bonusPlayback.accumulatedWin} CR
                  </span>
                </div>
              )}
            </div>
          </div>

          <SlotFeatures
            selectedBet={selectedBet}
            bonusCostMultiplier={bonusCostMultiplier}
            featureCostMultiplier={featureCostMultiplier}
            featureEnabled={featureEnabled}
            selectedSymbol={selectedSymbol}
            disabled={controlsDisabled}
            onBonusBuy={handleBonusBuy}
            onFeatureToggle={handleFeatureToggle}
          />
        </div>

        <SlotControls
          allowedBets={allowedBets}
          selectedBet={selectedBet}
          balance={balance}
          lastWin={lastWin}
          isPlaying={isSpinning}
          isLoading={isLoadingConfig}
          hasPendingRequest={Boolean(pendingRequest)}
          onBetChange={handleBetChange}
          onSpin={handleSpin}
        />
      </section>

      {errorMessage && (
        <div className="slot-status slot-error" role="alert">
          {errorMessage}
        </div>
      )}

      <FeatureSpinSelector
        isOpen={isFeatureSelectorOpen}
        symbols={selectableSymbols}
        selectedSymbol={selectedSymbol}
        featureSpinCost={
          selectedBet === null ? 0 : selectedBet * featureCostMultiplier
        }
        disabled={isSpinning}
        onSymbolChange={setSelectedSymbol}
        onConfirm={handleFeatureConfirm}
        onClose={() => setIsFeatureSelectorOpen(false)}
      />
    </main>
  );
}

export default SlotPage;
