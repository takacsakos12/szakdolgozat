const express = require("express");

const protectRoute = require("../middleware/authMiddleware");

const {
  CONFIG_VERSION,
  DECK_COUNT,
  RULES,
  PAYOUTS,
  SIDE_BETS,
  allowedChipValues,
  MIN_BET,
  MAX_BET,
} = require("../config/blackjackConfig");

const {
  startBlackjackSession,
  getActiveBlackjackSession,
  performBlackjackAction,
} = require("../services/blackjack/blackjackSessionService");

const router = express.Router();

router.get("/config", (req, res) => {
  res.json({
    configVersion: CONFIG_VERSION,
    deckCount: DECK_COUNT,
    rules: RULES,
    payouts: PAYOUTS,
    sideBets: SIDE_BETS,
    allowedChipValues,
    minBet: MIN_BET,
    maxBet: MAX_BET,
  });
});

router.post("/start", protectRoute, async (req, res) => {
  const {
    baseBet,
    perfectPairsBet = 0,
    twentyOnePlusThreeBet = 0,
  } = req.body ?? {};

  const result = await startBlackjackSession({
    userId: req.user._id,
    requestId: req.get("Idempotency-Key"),
    baseBet,
    perfectPairsBet,
    twentyOnePlusThreeBet,
  });

  res.json(result);
});

router.get("/active", protectRoute, async (req, res) => {
  const game = await getActiveBlackjackSession({
    userId: req.user._id,
  });

  res.json({ game });
});

router.post("/action", protectRoute, async (req, res) => {
  const { sessionId, expectedVersion, action, insuranceAmount } =
    req.body ?? {};

  const result = await performBlackjackAction({
    userId: req.user._id,
    sessionId,
    expectedVersion,
    action,
    insuranceAmount,
    requestId: req.get("Idempotency-Key"),
  });

  res.json(result);
});

module.exports = router;
