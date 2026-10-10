const User = require("../models/User");
const GameHistory = require("../models/GameHistory");


async function settleGameResult({userId, gameType, gameMode, configVersion, baseBet, cost, winAmount,result, slotDetails}) {
    if(!userId) {
        throw new Error("Az userId hiányzik.");
    }
    if(!Number.isFinite(baseBet) || baseBet <= 0) {
        throw new Error("Az alaptét érvénytelen.");
    }
    if(!Number.isFinite(cost) || cost < 0) {
        throw new Error("A költség érvénytelen.");
    }
    if(!Number.isFinite(winAmount) || winAmount < 0) {
        throw new Error("A nyeremény érvénytelen.");
    }
}

const netResult = winAmount - cost; 

const updateUser = await User.findByIdAndUpdate( {
    _id: userId,
    balance: { $gte: cost },
    }, 
    {
    $inc: { balance: netResult },
    }, { new: true, 
       runValidators: true,
       },
);

if (!updateUser) { 
    const error = new Error("Nincs elegendő egyenlege a játékhoz.");
    error.statusCode = 400;
    throw error;
}
const balanceAfter = updateUser.balance;
const balanceBefore = balanceAfter - netResult;
const history = await GameHistory.create({
    userId,
    gameType,
    gameMode,
    configVersion,
    baseBet,
    cost,
    winAmount,
    result,
    slotDetails });
   return {
    balanceBefore,
    balanceAfter,
    netResult,
    historyId: history._id,
   };
module.exports = {
    settleGameResult,
};   

