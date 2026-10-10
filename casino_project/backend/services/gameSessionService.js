
const mongoose = require("mongoose");
const User = require("../models/User");
const GameHistory = require("../models/GameHistory");

async function settleGameResult({userId, gameType, gameMode, configVersion, baseBet, cost, winAmount, result, slotDetails, requestId,
}) {
  if (!userId) {
    throw new Error("Az userId hiányzik.");
  }

  if (!Number.isFinite(baseBet) || baseBet <= 0) {
    throw new Error("Az alaptét érvénytelen.");
  }

  if (!Number.isFinite(cost) || cost <= 0) {
    throw new Error("A költség érvénytelen.");
  }

  if (!Number.isFinite(winAmount) || winAmount < 0) {
    throw new Error("A nyeremény érvénytelen.");
  }

  const netResult = winAmount - cost;

  return mongoose.connection.transaction(async (session) => {
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        balance: { $gte: cost },
      },
      {
        $inc: { balance: netResult },
      },
      {
        new: true,
        runValidators: true,
        session,
      }
    );

    if (!user) {
      const error = new Error("Nincs elegendő egyenleg.");
      error.statusCode = 400;
      throw error;
    }

    const balanceAfter = user.balance;
    const balanceBefore = balanceAfter - netResult;

    const [history] = await GameHistory.create(
      [
        {
          userId,
          gameType,
          gameMode,
          configVersion,
          baseBet,
          cost,
          winAmount,
          netResult,
          result,
          slotDetails,
          balanceBefore,
          balanceAfter,
        },
      ],
      { session }
    );

    return {
      balanceBefore,
      balanceAfter,
      netResult,
      historyId: history._id,
    };
  });
}

module.exports = { settleGameResult };
