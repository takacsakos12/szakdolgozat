const mongoose = require("mongoose");

const slotDetailsSchema = new mongoose.Schema(
    {
        bonusTriggered: {
            type: Boolean,
            default: false,
        },
        bonussource: { 
            type: String,
            enum: ["NATURAL", "PURCHASE"],
            default: null,
        },
        expandableSymbols: {
            type: String,
            default: null,
        },
        totalFreeSpins: {
            type: Number,
            default: null,
            min: [0, "A teljes ingyenes pörgetések száma nem lehet negatív."],
        },
        bonusWinamount: {
            type: Number,
            default: null,
            min: [0, "A bónusz nyeremény összege nem lehet negatív."],
        },        
    },
    { _id: false }
);

const gameSessionSchema = new mongoose.Schema(
  { userId: { 
    type: mongoose.Schema.Types.ObjectId, ref: "User",
    required: true,
    index: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["SLOT", "ROULETTE", "BLACKJACK", "BACCAT",],
    },
    gameMode: {
      type: String,
      required: true,
        enum: ["BASE_GAME", "BONUS_GAME", "BONUS_BUY", "FEATURE_SPIN","STANDARD"],
    },
    slotDetails: {
        type: slotDetailsSchema,

        required: function () {return this.gameType === "SLOT";},

        default: undefined,

        validate: { validator: function (value) 
            {
            return ( value === undefined || this.gameType === "SLOT" );
            },

          message:
            "A slotDetails mező kizárólag SLOT játékhoz használható.",
        },
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
      required: true
    },
     winAmount: {
        type: Number,
        required: true,
        min: 0,
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
    }},   
    
    {
        timestamps: true,
    }
);
    
gameSessionSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model("GameSession", gameSessionSchema);

    