const express = require("express");
const {
  getSettledGame,
  SettleGameResult,
} = require("../services/gameSessionService");

const protectRoute = require("../middleware/authMiddleware");
const {
  CONFIG_VERSION,
  ROW_COUNT,
  REEL_COUNT,
  SYMBOLS,
  MAX_WIN_MULTIPLIER,
  BONUS_BUY_COST_MULTIPLIER,
  FEATURE_SPIN_COST_MULTIPLIER,
  PAYTABLE,
  SCATTER_PAYTABLE,
  BOOK_BONUS,
  PAYLINES,
} = require("../config/slotConfig");

const { spin, featureSpin, buyBookBonus } = require("../services/slotEngine");
const router = express.Router();
const ALLOWED_BETS = [1, 2, 5, 10, 20, 50, 100];

function getBaseBet(value) {
  const baseBet = Number(value);

  if (!Number.isFinite(baseBet) || !ALLOWED_BETS.includes(baseBet)) {
    return null;
  }
  return baseBet;
}

function getRequestId(req) {
  const requestId = req.get("Idempotency-Key");

  if (typeof requestId !== "string") {
    return null;
  }

  const normalizedRequestId = requestId.trim();

  if (normalizedRequestId.length < 8 || normalizedRequestId.length > 100) {
    return null;
  }

  return normalizedRequestId;
}

function sendErrorResponse(res, error) {
  console.error("Slot API hiba:", error);

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message:
      statusCode === 500
        ? "A játékkör végrehajtása közben szerverhiba történt."
        : error.message,
  });
}

function sendGameResponse(res, settlement) {
  return res.status(200).json({
    requestId: settlement.requestId,
    gameMode: settlement.gameMode,
    result: settlement.result,
    balanceBefore: settlement.balanceBefore,
    balanceAfter: settlement.balanceAfter,
    netResult: settlement.netResult,
    historyId: settlement.historyId,
    replayed: settlement.replayed,
  });
}

function validateGameRequest(req, res) {
  const baseBet = getBaseBet(req.body.baseBet);

  if (baseBet === null) {
    res.status(400).json({
      message: "Érvénytelen tét.",
      allowedBets: ALLOWED_BETS,
    });

    return null;
  }

  const requestId = getRequestId(req);

  if (requestId === null) {
    res.status(400).json({
      message: "Adj meg egy 8-100 karakteres Idempotency-Key fejlécet.",
    });

    return null;
  }

  return {
    baseBet,
    requestId,
  };
}

async function findPreviousResult(
  req,
  requestData,
  gameMode,
  selectedSymbol = null,
) {
  return getSettledGame({
    userId: req.user._id,
    requestId: requestData.requestId,
    gameMode,
    baseBet: requestData.baseBet,
    selectedSymbol,
  });
}

router.get("/config", (req, res) => {
  return res.status(200).json({
    configVersion: CONFIG_VERSION,
    rows: ROW_COUNT,
    reels: REEL_COUNT,
    symbols: SYMBOLS,
    paylines: PAYLINES,
    paytable: PAYTABLE,
    scatterPaytable: SCATTER_PAYTABLE,
    allowedBets: ALLOWED_BETS,

    bonus: {
      initialFreeSpins: BOOK_BONUS.initialFreeSpins,

      triggerScatterCount: BOOK_BONUS.triggerScatterCount,

      expandableSymbols: BOOK_BONUS.expandableSymbols,

      purchaseCostMultiplier: BONUS_BUY_COST_MULTIPLIER,
    },

    featureSpin: {
      costMultiplier: FEATURE_SPIN_COST_MULTIPLIER,

      selectableSymbols: BOOK_BONUS.expandableSymbols,
    },

    maxWinMultiplier: MAX_WIN_MULTIPLIER,
  });
});

router.post("/spin", protectRoute, async (req, res) => {
  const requestData = validateGameRequest(req, res);

  if (!requestData) {
    return;
  }

  const { baseBet, requestId } = requestData;

  try {
    const previousResult = await findPreviousResult(
      req,
      requestData,
      "BASE_GAME",
    );

    if (previousResult) {
      return sendGameResponse(res, previousResult);
    }

    const result = spin({
      baseBet,
    });

    const slotDetails = {
      bonusTriggered: result.bonusTriggered,

      bonusSource: result.bonusTriggered ? "NATURAL" : null,

      baseGameWin: result.baseGameWin,

      totalFreeSpins: result.bonus?.totalFreeSpins || 0,

      retriggerCount: result.bonus?.retriggerCount || 0,

      expandingSymbol: result.bonus?.expandingSymbol || null,

      bonusWin: result.bonusWin,
    };

    const settlement = await settleGameResult({
      userId: req.user._id,
      gameType: "SLOT",
      gameMode: "BASE_GAME",
      configVersion: CONFIG_VERSION,
      baseBet,
      cost: result.cost,
      winAmount: result.totalWin,
      result,
      slotDetails,
      requestId,
    });

    return sendGameResponse(res, settlement);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
});

router.post("/bonus-buy", protectRoute, async (req, res) => {
  const requestData = validateGameRequest(req, res);

  if (!requestData) {
    return;
  }

  const { baseBet, requestId } = requestData;

  try {
    const previousResult = await findPreviousResult(
      req,
      requestData,
      "BONUS_BUY",
    );

    if (previousResult) {
      return sendGameResponse(res, previousResult);
    }

    const result = buyBookBonus({ baseBet });

    const slotDetails = {
      bonusTriggered: true,
      bonusSource: "PURCHASED",
      baseGameWin: 0,
      totalFreeSpins: result.bonus.totalFreeSpins,

      retriggerCount: result.bonus.retriggerCount,

      expandingSymbol: result.expandingSymbol,

      bonusWin: result.totalWin,
    };

    const settlement = await settleGameResult({
      userId: req.user._id,
      gameType: "SLOT",
      gameMode: "BONUS_BUY",
      configVersion: CONFIG_VERSION,
      baseBet,
      cost: result.cost,
      winAmount: result.totalWin,
      result,
      slotDetails,
      requestId,
    });

    return sendGameResponse(res, settlement);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
});

router.post("/feature-spin", protectRoute, async (req, res) => {
  const requestData = validateGameRequest(req, res);

  if (!requestData) {
    return;
  }

  const selectedSymbol =
    typeof req.body.selectedSymbol === "string"
      ? req.body.selectedSymbol.trim().toUpperCase()
      : "";

  if (!BOOK_BONUS.expandableSymbols.includes(selectedSymbol)) {
    return res.status(400).json({
      message: "Érvénytelen kiválasztott szimbólum.",
      selectableSymbols: BOOK_BONUS.expandableSymbols,
    });
  }

  const { baseBet, requestId } = requestData;

  try {
    const previousResult = await findPreviousResult(
      req,
      requestData,
      "FEATURE_SPIN",
      selectedSymbol,
    );

    if (previousResult) {
      if (previousResult.result.expandingSymbol !== selectedSymbol) {
        const error = new Error(
          "Ezt a kérésazonosítót már másik Feature Spinhez használták.",
        );

        error.statusCode = 409;
        throw error;
      }

      return sendGameResponse(res, previousResult);
    }

    const result = featureSpin({ baseBet, selectedSymbol });

    const slotDetails = {
      bonusTriggered: false,
      bonusSource: null,
      baseGameWin: 0,
      totalFreeSpins: 0,
      retriggerCount: 0,
      expandingSymbol: result.expandingSymbol,
      bonusWin: 0,
    };

    const settlement = await settleGameResult({
      userId: req.user._id,
      gameType: "SLOT",
      gameMode: "FEATURE_SPIN",
      configVersion: CONFIG_VERSION,
      baseBet,
      cost: result.cost,
      winAmount: result.totalWin,
      result,
      slotDetails,
      requestId,
      selectedSymbol,
    });

    return sendGameResponse(res, settlement);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
});

module.exports = router;
