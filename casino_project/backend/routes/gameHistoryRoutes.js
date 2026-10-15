const express = require("express");
const GameHistory = require("../models/GameHistory");
const protectRoute = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protectRoute, async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 50
  ) {
    return res.status(400).json({
      message: "Érvénytelen lapozási paraméterek.",
    });
  }

  const filter = {
    userId: req.user._id,
  };

  const [totalCount, gameHistories] = await Promise.all([
    GameHistory.countDocuments(filter),

    GameHistory.find(filter)
      .select(
        "gameType gameMode createdAt baseBet cost " +
          "winAmount netResult balanceAfter",
      )
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return res.status(200).json({
    games: gameHistories,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
});

module.exports = router;
