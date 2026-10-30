import { useEffect, useState, useRef } from "react";
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
  const [, setGameMode] = useState("BASE_GAME");
  const [balance, setBalance] = useState(user?.balance ?? 0);

  const [isFeatureSelectorOpen, setIsFeatureSelectorOpen] = useState(false);

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isGridSpinning, setIsGridSpinning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [pendingRequest, setPendingRequest] = useState(null);
  const [bonusPlayback, setBonusPlayback] = useState(null);
  const [displayedExpandingSymbol, setDisplayedExpandingSymbol] =
    useState(null);

  const slotGridRef = useRef(null);
  const isSubmittingRef = useRef(false);

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

  function handleBetChange(newBet) {
    if (pendingRequest || isSpinning || isSubmittingRef.current) {
      return;
    }

    setSelectedBet(newBet);
    setGameResult(null);
    setErrorMessage("");
  }

  async function updateDisplayedBalance(response) {
    if (!response.replayed) {
      setBalance(response.balanceAfter);

      onUserChange?.((currentUser) =>
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

      setBalance(currentUser.balance);
      onUserChange?.(currentUser);
    } catch {
      setErrorMessage("Az aktuális egyenleget nem sikerült frissíteni.");
    }
  }

  async function animateSpinResult(result, expandingSymbol = null) {
    const originalGrid = result.originalGrid ?? result.grid;

    setDisplayedExpandingSymbol(expandingSymbol);

    await slotGridRef.current.stopSpin(originalGrid);

    setDisplayedGrid(originalGrid);
    setIsGridSpinning(false);

    if (result.expandedReels?.length > 0) {
      await wait(650);

      setDisplayedGrid(result.grid);

      await wait(500);
    }
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

      setBonusPlayback({
        currentSpin: index + 1,
        totalSpins: freeSpins.length,
        spinWin: 0,
        accumulatedWin,
        expandingSymbol: bonus.expandingSymbol,
        finished: false,
      });

      setDisplayedExpandingSymbol(null);
      setIsGridSpinning(true);

      slotGridRef.current.startSpin();

      await wait(500);

      await animateSpinResult(freeSpin, bonus.expandingSymbol);

      accumulatedWin += freeSpin.totalWin;

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
      spinWin: freeSpins[freeSpins.length - 1].totalWin,
      accumulatedWin: bonus.totalWin,
      expandingSymbol: bonus.expandingSymbol,
      finished: true,
    });
  }

  async function executeGame(mode, request) {
    if (isSubmittingRef.current || !slotGridRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    setIsSpinning(true);
    setIsGridSpinning(true);
    setErrorMessage("");
    setBonusPlayback(null);
    setGameResult(null);
    setDisplayedExpandingSymbol(null);
    setGameMode(mode);

    try {
      slotGridRef.current.startSpin();

      let response;

      try {
        if (mode === "BONUS_BUY") {
          response = await buyBonus(request);
        } else if (mode === "FEATURE_SPIN") {
          response = await featureSpin(request);
        } else {
          response = await spinSlot(request);
        }
      } catch (error) {
        const uncertainOutcome =
          error.outcomeUnknown === true ||
          error.code === "NETWORK_ERROR" ||
          error.statusCode === 408 ||
          error.statusCode >= 500;

        if (uncertainOutcome) {
          setPendingRequest({ mode, request });

          setErrorMessage(`${error.message} Próbáld újra ugyanazt a kérést.`);
        } else {
          setPendingRequest(null);
          setErrorMessage(error.message);
        }

        const fallbackGrid =
          displayedGrid ??
          Array.from({ length: rowCount }, () => Array(reelCount).fill(null));

        await slotGridRef.current.stopSpin(fallbackGrid);

        return;
      }

      setPendingRequest(null);

      try {
        if (response.result.grid) {
          await animateSpinResult(
            response.result,
            response.result.expandingSymbol,
          );
        }

        const freeSpins = response.result.bonus?.freeSpinResults ?? [];

        if (freeSpins.length > 0) {
          if (response.result.grid) {
            await wait(700);
          }

          await playBonusSpins(response.result);
        }
      } catch {
        setErrorMessage(
          "A kör elszámolása megtörtént, de az animáció megszakadt.",
        );
      } finally {
        setGameResult(response.result);
        await updateDisplayedBalance(response);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsGridSpinning(false);
      setIsSpinning(false);
    }
  }

  function handleSpin() {
    if (
      selectedBet === null ||
      isSpinning ||
      isLoadingConfig ||
      isSubmittingRef.current
    ) {
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
    if (
      selectedBet === null ||
      isSpinning ||
      isLoadingConfig ||
      pendingRequest ||
      isSubmittingRef.current
    ) {
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
    if (isSpinning || pendingRequest || isSubmittingRef.current) {
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
    if (isSpinning || isSubmittingRef.current) {
      return;
    }

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

  const controlsDisabled =
    isSpinning || isLoadingConfig || !slotConfig || Boolean(pendingRequest);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="slot-page">
      <section className="game-embed">
        <header className="game-embed-header">
          <h1 className="game-embed-title">Book of Pharaoh</h1>

          <span>
            Egyenleg:{" "}
            {balance.toLocaleString("hu-HU", {
              maximumFractionDigits: 2,
            })}{" "}
            CR
          </span>
        </header>

        <div className="slot-game-layout">
          <div className="game-stage">
            <div className="game-stage-content">
              {isLoadingConfig ? (
                <p>Játék betöltése...</p>
              ) : slotConfig ? (
                <SlotGrid
                  ref={slotGridRef}
                  grid={displayedGrid}
                  rowCount={rowCount}
                  reelCount={reelCount}
                  isSpinning={isGridSpinning}
                  expandingSymbol={displayedExpandingSymbol}
                />
              ) : null}

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
          isPlaying={isSpinning}
          isLoading={isLoadingConfig || !slotConfig}
          hasPendingRequest={Boolean(pendingRequest)}
          onBetChange={handleBetChange}
          onSpin={handleSpin}
        />
        <div className="slot-information">
          <span>
            Össztét:{" "}
            {gameResult?.cost ??
              (selectedBet ?? 0) *
                (featureEnabled ? (featureCostMultiplier ?? 1) : 1)}{" "}
            CR
          </span>

          <span>Teljes jóváírás: {gameResult?.totalWin ?? 0} CR</span>

          <span>Nettó eredmény: {gameResult?.netResult ?? 0} CR</span>
        </div>
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
