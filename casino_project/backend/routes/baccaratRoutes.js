const express = require("express");
const { protectRoute } = require("../middleware/authMiddleware");

const {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
  DECK_COUNT,
  MIN_BET,
  MAX_BET,
  BET_TYPES,
  SIDE_BETS,
  RULES,
  CHIPS,
} = require("../config/baccaratConfig");

const {
  prepareBaccaratBets,
  playBaccaratGame,
} = require("../services/baccarat/baccaratEngine");

const router = express.Router();

router.get("/config", (req, res) => {
  return res.status(200).json({
    configVersion: CONFIG_VERSION,
    gameType: GAME_TYPE,
    gameMode: GAME_MODE,
    gameDomain: GAME_DOMAIN,
    deckCount: DECK_COUNT,
    minBet: MIN_BET,
    maxBet: MAX_BET,
    betTypes: BET_TYPES,
    sideBets: SIDE_BETS,
    rules: RULES,
    chips: CHIPS,
  });
});

router.post("/play", protectRoute, async (req, res) => {
  const requestId = req.get("Idempotency-Key");
  const { preparedBets, requestBets, totalBetAmount } = prepareBaccaratBets(
    req.body?.bets ?? [],
  );
  const settlementResult = await settleGameResult({
    userId: req.user._id,
    gameType: GAME_TYPE,
    gameMode: GAME_MODE,
    configVersion: CONFIG_VERSION,
    gamedomain: GAME_DOMAIN,
    baseBet: totalBetAmount,
    requestId,
    requestData: { bets: requestBets },
    createGameResult: ({ randomInt }) => {
      const result = playBaccaratGame({
        preparedBets,
        totalBetAmount,
        randomInt,
      });
      return { result };
    },
  });
  return res.status(200).json({
    requestId: settlementResult.requestId,
    gameMode: settlementResult.gameMode,
    result: settlementResult.result,
    provablyFair: settlementResult.provablyFair,
    balanceBefore: settlementResult.balanceBefore,
    balanceAfter: settlementResult.balanceAfter,
    netResult: settlementResult.netResult,
    historyId: settlementResult.historyId,
    replayed: settlementResult.replayed,
  });
});

module.exports = router;
