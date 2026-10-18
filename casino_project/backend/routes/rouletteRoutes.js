const express = require("express");

const { settleGameResult } = require("../services/gameSessionService");

const protectRoute = require("../middleware/authMiddleware");

const {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
  EUROPEAN_WHEEL_ORDER,
  NUMBER_COLORS,
  BET_TYPES,
  ROULETTE_POSITIONS,
  ALLOWED_CHIP_VALUES,
  MIN_BET_AMOUNT,
  MAX_TOTAL_BET_AMOUNT,
  THEORETICAL_RTP,
  HOUSE_EDGE,
} = require("../config/rouletteConfig");

const {
  playRouletteGame,
  prepareRouletteBets,
} = require("../services/rouletteEngine");

const router = express.Router();

function createRequestBets(preparedBets) {
  const mergedBets = new Map();

  for (const bet of preparedBets) {
    const numbers = [...bet.numbers].sort((first, second) => first - second);

    const key = `${bet.type}:${numbers.join("-")}`;
    const existingBet = mergedBets.get(key);

    if (existingBet) {
      existingBet.amount += bet.amount;
    } else {
      mergedBets.set(key, {
        type: bet.type,
        numbers,
        amount: bet.amount,
      });
    }
  }

  return [...mergedBets.entries()]
    .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
    .map(([, bet]) => bet);
}

router.get("/config", (req, res) => {
  const betTypes = Object.fromEntries(
    Object.entries(BET_TYPES).map(([type, config]) => [
      type,
      {
        payout: config.payout,
        numbers: config.numbers ? config.numbers() : undefined,
      },
    ]),
  );

  return res.status(200).json({
    configVersion: CONFIG_VERSION,
    gameType: GAME_TYPE,
    gameMode: GAME_MODE,
    wheelOrder: EUROPEAN_WHEEL_ORDER,
    numberColors: NUMBER_COLORS,
    betTypes,
    positions: ROULETTE_POSITIONS,
    allowedChipValues: ALLOWED_CHIP_VALUES,
    minBetAmount: MIN_BET_AMOUNT,
    maxTotalBetAmount: MAX_TOTAL_BET_AMOUNT,
    theoreticalRtp: THEORETICAL_RTP,
    houseEdge: HOUSE_EDGE,
  });
});

router.post("/spin", protectRoute, async (req, res) => {
  const requestId = req.get("Idempotency-Key");


  const { preparedBets, totalBetAmount, requestBets } = prepareRouletteBets( req.body?.bets );

  const settlement = await settleGameResult({
    userId: req.user._id,
    gameType: GAME_TYPE,
    gameMode: GAME_MODE,
    configVersion: CONFIG_VERSION,
    baseBet: totalBetAmount,
    requestId,
    gameDomain: GAME_DOMAIN,

    requestData: {
      bets: requestBets,
    },

    createGameResult: ({ randomInt }) => {
      const result = playRouletteGame({
        preparedBets,
        totalBetAmount,
        randomInt,
      });

      return {
        result,
      };
    },
  });

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
});

module.exports = router;
