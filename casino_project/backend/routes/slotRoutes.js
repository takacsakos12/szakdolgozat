const express = require("express");

const {
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
} = require("../services/slotEngine");
const router = express.Router();
const ALLOWED_BETS = [1, 2, 5, 10, 20, 50, 100];

function getTotalBet(value) {
    const totalBet = Number(value);

    if (!Number.isFinite(totalBet) ||
        !ALLOWED_BETS.includes(totalBet)
    ) {
        return null;
    }
    return totalBet;
}

function sendErrorResponse(res, error) {
    console.error("Slot API hiba:", error);

    return res.status(400).json({
        message:
            error.message ||
            "A játékkör nem hajtható végre.",
    });
}

router.get("/config", (req, res) => {
    return res.status(200).json({
        rows: ROW_COUNT,
        reels: REEL_COUNT,
        symbols: SYMBOLS,
        paylines: PAYLINES,
        paytables: PAYTABLE,
        scatterPaytable: SCATTER_PAYTABLE,
        allowedBets: ALLOWED_BETS,

        bonus: {
            initialFreeSpins:
                BOOK_BONUS.initialFreeSpins,

            triggerscatterCount:
                BOOK_BONUS.triggerScatterCount,

            expendableSymbols:
                BOOK_BONUS.expandableSymbols,

            purchaseCostMultiplier:
                BONUS_BUY_COST_MULTIPLIER,
        },

        featureSpin: {
            costMultiplier:
                FEATURE_SPIN_COST_MULTIPLIER,

            selectableSymbols:
                BOOK_BONUS.expandableSymbols,
        },

        maxWinMultiplier:
            MAX_WIN_MULTIPLIER,
    });
});

router.post("/spin", (req, res) => {
    const totalBet =getTotalBet(req.body.totalBet);
    if (totalBet === null) {
        return res.status(400).json({
            message: "Érvénytelen tét.",
            allowedBets: ALLOWED_BETS,
        });
    }

    try {
        const result = spin({totalBet});

        return res.status(200).json({
            gameMode: "BASE_GAME",
            result: result,
        });
    } catch (error) {
        return sendErrorResponse(res, error);
    }
});

router.post("/feature-spin", (req, res) => {
    const totalBet = getTotalBet(req.body.totalBet);

    const selectedSymbol = typeof req.body.selectedSymbol === "string" ? req.body.selectedSymbol.trim().toUpperCase(): "";

    if (totalBet === null) {
        return res.status(400).json({message: "Érvénytelen tét.",allowedBets: ALLOWED_BETS,});
    }

    if (!BOOK_BONUS.expandableSymbols.includes(selectedSymbol)
    ) {
        return res.status(400).json({
            message:
                "Érvénytelen kiválasztott szimbólum.",

            selectableSymbols:
                BOOK_BONUS.expandableSymbols,
        });
    }

    try {
        const result = featureSpin({totalBet,selectedSymbol});

        return res.status(200).json({ gameMode: "FEATURE_SPIN",result: result,});
    } catch (error) {return sendErrorResponse( res,error);
    }
});

module.exports = router;