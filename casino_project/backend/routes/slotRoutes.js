const express = require("express");

const { settleGameResult } = require("../services/gameSessionService");

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

const {
  spin,
  featureSpin,
  buyBookBonus,
} = require("../services/slot/slotEngine");

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

function sendGameResponse(res, settlement) {
  return res.status(200).json({
    requestId: settlement.requestId,
    gameMode: settlement.gameMode,
    result: settlement.result,
    provablyFair: settlement.provablyFair,
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

  const settlement = await settleGameResult({
    userId: req.user._id,
    gameType: "SLOT",
    gameMode: "BASE_GAME",
    configVersion: CONFIG_VERSION,
    baseBet,
    requestId,
    gameDomain: "SLOT:BASE_GAME",
    requestData: {},

    createGameResult: ({ randomFloat: random }) => {
      const result = spin({
        baseBet,
        random,
      });

      const slotDetails = {
        bonusTriggered: result.bonusTriggered,
        bonusSource: result.bonusTriggered ? "NATURAL" : null,

        baseGameWin: result.baseGameWin,
        bonusWin: result.bonusWin,

        totalFreeSpins: result.bonus?.totalFreeSpins ?? 0,
        retriggerCount: result.bonus?.retriggerCount ?? 0,

        // Itt a játékos által kiválasztott Feature Spin szimbóluma marad.
        expandingSymbol: result.expandingSymbol,
      };

      return {
        result,
        slotDetails,
      };
    },
  });

  return sendGameResponse(res, settlement);
});

router.post("/bonus-buy", protectRoute, async (req, res) => {
  const requestData = validateGameRequest(req, res);

  if (!requestData) {
    return;
  }

  const { baseBet, requestId } = requestData;

  const settlement = await settleGameResult({
    userId: req.user._id,
    gameType: "SLOT",
    gameMode: "BONUS_BUY",
    configVersion: CONFIG_VERSION,
    baseBet,
    requestId,
    gameDomain: "SLOT:BONUS_BUY",
    requestData: {},

    createGameResult: ({ randomFloat: random }) => {
      const result = buyBookBonus({
        baseBet,
        random,
      });

      const slotDetails = {
        bonusTriggered: true,
        bonusSource: "PURCHASED",
        baseGameWin: 0,
        totalFreeSpins: result.bonus.totalFreeSpins,
        retriggerCount: result.bonus.retriggerCount,
        expandingSymbol: result.expandingSymbol,
        bonusWin: result.totalWin,
      };

      return {
        result,
        slotDetails,
      };
    },
  });

  return sendGameResponse(res, settlement);
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

  const settlement = await settleGameResult({
    userId: req.user._id,
    gameType: "SLOT",
    gameMode: "FEATURE_SPIN",
    configVersion: CONFIG_VERSION,
    baseBet,
    requestId,
    gameDomain: "SLOT:FEATURE_SPIN",
    selectedSymbol,
    requestData: { selectedSymbol },

    createGameResult: ({ randomFloat: random }) => {
      const result = featureSpin({
        baseBet,
        selectedSymbol,
        random,
      });

      const slotDetails = {
        bonusTriggered: false,
        bonusSource: null,
        baseGameWin: 0,
        totalFreeSpins: 0,
        retriggerCount: 0,
        expandingSymbol: result.expandingSymbol,
        bonusWin: 0,
      };

      return {
        result,
        slotDetails,
      };
    },
  });

  return sendGameResponse(res, settlement);
});

module.exports = router;
