const mongoose = require("mongoose");
const GameHistory = require("../models/GameHistory");

const GAME_TYPES = ["SLOT", "ROULETTE", "BLACKJACK", "BACCARAT"];
const PERIODS = ["ALL", "30", "7"];

function createStatisticsError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function calculateRtp(totalWin, totalCost) {
  return totalCost > 0 ? (totalWin / totalCost) * 100 : null;
}

function addRtp(row) {
  return {
    ...row,
    actualRtp: calculateRtp(row.totalWin, row.totalCost),
  };
}

async function getUserStatistics({ userId, gameType = "ALL", period = "ALL" }) {
  if (
    typeof gameType !== "string" ||
    (gameType !== "ALL" && !GAME_TYPES.includes(gameType))
  ) {
    throw createStatisticsError("Érvénytelen játékszűrő.");
  }

  if (typeof period !== "string" || !PERIODS.includes(period)) {
    throw createStatisticsError("Érvénytelen időszak.");
  }

  const now = new Date();

  const from =
    period === "ALL"
      ? null
      : new Date(now.getTime() - Number(period) * 24 * 60 * 60 * 1000);

  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    createdAt: {
      $lte: now,
    },
  };

  if (from) {
    match.createdAt.$gte = from;
  }

  if (gameType !== "ALL") {
    match.gameType = gameType;
  }

  const [data] = await GameHistory.aggregate([
    {
      $match: match,
    },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalGames: { $sum: 1 },
              totalCost: { $sum: "$cost" },
              totalWin: { $sum: "$winAmount" },
              netResult: { $sum: "$netResult" },
            },
          },
          {
            $project: {
              _id: 0,
              totalGames: 1,
              totalCost: 1,
              totalWin: 1,
              netResult: 1,
            },
          },
        ],

        byGame: [
          {
            $group: {
              _id: "$gameType",
              totalGames: { $sum: 1 },
              totalCost: { $sum: "$cost" },
              totalWin: { $sum: "$winAmount" },
              netResult: { $sum: "$netResult" },
            },
          },
          {
            $project: {
              _id: 0,
              gameType: "$_id",
              totalGames: 1,
              totalCost: 1,
              totalWin: 1,
              netResult: 1,
            },
          },
          {
            $sort: {
              gameType: 1,
            },
          },
        ],
        byConfiguration: [
          {
            $group: {
              _id: {
                gameType: "$gameType",
                gameMode: "$gameMode",
                configVersion: "$configVersion",
              },
              totalGames: { $sum: 1 },
              totalCost: { $sum: "$cost" },
              totalWin: { $sum: "$winAmount" },
              netResult: { $sum: "$netResult" },
            },
          },
          {
            $project: {
              _id: 0,
              gameType: "$_id.gameType",
              gameMode: "$_id.gameMode",
              configVersion: "$_id.configVersion",
              totalGames: 1,
              totalCost: 1,
              totalWin: 1,
              netResult: 1,
            },
          },
          {
            $sort: {
              gameType: 1,
              gameMode: 1,
              configVersion: 1,
            },
          },
        ],

        dailyResults: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "Europe/Budapest",
                },
              },
              totalGames: { $sum: 1 },
              totalCost: { $sum: "$cost" },
              totalWin: { $sum: "$winAmount" },
              netResult: { $sum: "$netResult" },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ],
      },
    },
  ]);

  const summary = data.summary[0] ?? {
    totalGames: 0,
    totalCost: 0,
    totalWin: 0,
    netResult: 0,
  };

  let cumulativeNetResult = 0;
  let cumulativeCost = 0;
  let cumulativeWin = 0;

  const timeline = data.dailyResults.map((day) => {
    cumulativeNetResult += day.netResult;
    cumulativeCost += day.totalCost;
    cumulativeWin += day.totalWin;

    return {
      date: day._id,
      totalGames: day.totalGames,
      netResult: day.netResult,
      cumulativeNetResult,
      cumulativeCost,
      cumulativeWin,
      cumulativeRtp: calculateRtp(cumulativeWin, cumulativeCost),
    };
  });

  return {
    filters: {
      gameType,
      period,
      from,
      to: now,
    },

    summary: addRtp(summary),

    byGame: data.byGame.map(addRtp),

    byConfiguration: data.byConfiguration.map(addRtp),

    timeline,
  };
}

module.exports = {
  getUserStatistics,
};
