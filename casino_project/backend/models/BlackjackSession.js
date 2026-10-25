const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
    },
    requestFingerprint: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "HIT",
        "STAND",
        "DOUBLE_DOWN",
        "SPLIT",
        "INSURANCE",
        "DECLINE_INSURANCE",
      ],
    },
    insuranceAmount: {
      type: Number,
      default: null,
    },
  },
  { _id: false },
);

const provablyFairSchema = new mongoose.Schema(
  {
    seedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProvablyFairSeed",
      required: true,
    },
    serverSeedHash: {
      type: String,
      required: true,
    },
    clientSeed: {
      type: String,
      required: true,
    },
    nonce: {
      type: Number,
      required: true,
    },
    gameDomain: {
      type: String,
      required: true,
    },
    algorithmVersion: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const blackjackSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "FINISHED"],
      default: "ACTIVE",
      required: true,
    },

    configVersion: {
      type: String,
      required: true,
    },

    requestId: {
      type: String,
      required: true,
    },

    requestFingerprint: {
      type: String,
      required: true,
    },

    fingerprintVersion: {
      type: Number,
      required: true,
    },

    initialBets: {
      baseBet: {
        type: Number,
        required: true,
      },
      perfectPairsBet: {
        type: Number,
        default: 0,
      },
      twentyOnePlusThreeBet: {
        type: Number,
        default: 0,
      },
    },
    
    balanceBefore: {
      type: Number,
      required: true,
    },

    round: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      select: false,
    },

    provablyFair: {
      type: provablyFairSchema,
      required: true,
    },

    actions: {
      type: [actionSchema],
      default: [],
    },

    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameHistory",
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

blackjackSessionSchema.index({ userId: 1, requestId: 1 }, { unique: true });

blackjackSessionSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "ACTIVE",
    },
  },
);

module.exports = mongoose.model("BlackjackSession", blackjackSessionSchema);
