const mongoose = require("mongoose");
const { BOOK_BONUS } = require("../config/slotConfig");

const slotDetailsSchema = new mongoose.Schema(
  {
    bonusTriggered: {
      type: Boolean,
      default: false,
    },
    bonusSource: {
      type: String,
      enum: ["NATURAL", "PURCHASED"],
      default: null,
    },
    totalFreeSpins: {
      type: Number,
      default: null,
      min: [0, "A teljes ingyenes pörgetések száma nem lehet negatív."],
    },
    expandingSymbol: {
      type: String,
      enum: BOOK_BONUS.expandableSymbols,
      default: null,
    },
    bonusWin: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const gameHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["SLOT", "ROULETTE", "BLACKJACK", "BACCARAT"],
    },
    gameMode: {
      type: String,
      required: true,
      enum: ["BASE_GAME", "BONUS_BUY", "FEATURE_SPIN", "STANDARD"],
    },
    slotDetails: {
      type: slotDetailsSchema,

      required: function () {
        return this.gameType === "SLOT";
      },

      default: undefined,

      validate: {
        validator: function (value) {
          return value === undefined || this.gameType === "SLOT";
        },

        message: "A slotDetails mező kizárólag SLOT játékhoz használható.",
      },
    },
    configVersion: {
      type: String,
      required: true,
    },
    baseBet: {
      type: Number,
      required: true,
      min: [0, "A tét nem lehet negatív."],
    },
    cost: {
      type: Number,
      required: true,
      min: [0, "A költség nem lehet negatív."],
    },
    netResult: {
      type: Number,
      required: true,
    },
    winAmount: {
      type: Number,
      required: true,
      min: 0,
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
    },
    requestId: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      maxlength: 100,
    },
  },

  {
    timestamps: true,
  },
);

gameHistorySchema.index(
  {
    userId: 1,
    requestId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      requestId: {
        $type: "string",
      },
    },
  },
);

gameHistorySchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model("GameHistory", gameHistorySchema);
