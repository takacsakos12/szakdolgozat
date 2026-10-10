const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const gameSessionSchema = new mongoose.Schema(
  { userId: { 
    type: mongoose.Schema.Types.ObjectId, ref: "User",
    required: true,
    index: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["slot", "roulette", "blackjack", "baccarat",],
    },
    gameMode: {
      type: String,
      required: true,
        enum: ["BASE_GAME", "BONUS_GAME", "FEATURE_SPIN","STANDARD"],
    },
    configVersion: {
      type: String,
      required: true,
    },
    totalBet: {
      type: Number,
      required: true,
      min: [0, "A tét nem lehet negatív."],
    },
    cost: {
      type: Number,
      required: true,
      min: [0, "A költség nem lehet negatív."],
    },
    netresult: {
      type: Number,
      required: true,
        min: [0, "A nettó eredmény nem lehet negatív."],
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
        min: [0, "Az egyenleg nem lehet negatív."],
    },
    balanceAfter: {
      type: Number,
      required: true,
        min: [0, "Az egyenleg nem lehet negatív."],
}});
    
gameSessionSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model("GameSession", gameSessionSchema);

    