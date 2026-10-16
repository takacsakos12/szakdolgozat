const express = require("express");

const settlegameResult = require("../services/gameSessionService");

const protectRoute = require("../middleware/authMiddleware");

const {
  CONFIG_VERSION,
  GAME_TYPE,
  GAME_MODE,
  GAME_DOMAIN,
  NUMBER_COLORS,
  BET_TYPES,
  ALLOWED_CHIP_VALUES,
  MIN_BET_AMOUNT,
  MAX_TOTAL_BET_AMOUNT,
  THEORETICAL_RTP,
} = require("../config/RouletteConfig");

const {
  playRouletteGame,
  prepareRouletteBets,
} = require("../services/rouletteEngine");

const router = express.Router();
