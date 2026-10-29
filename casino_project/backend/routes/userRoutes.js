const express = require("express");
const router = express.Router();
const User = require("../models/User");
const protectRoute = require("../middleware/authMiddleware");
const GameHistory = require("../models/GameHistory");
const REFILL_AMOUNT = 10000;
const REFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;


function toPublicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    createdAt: user.createdAt,
    lastRefillAt: user.lastRefillAt,
  };
}

function getRefillInfo(user, now = new Date()) {
  const nextRefillAt = user.lastRefillAt ? new Date(new Date(user.lastRefillAt).getTime()+ REFILL_INTERVAL_MS) : null;

  return {
    amount: REFILL_AMOUNT,
    available: !nextRefillAt || nextRefillAt.getTime() <= now.getTime(),
    nextRefillAt,
  };
}

router.get("/me/summary", protectRoute, async (req, res, next) => {
  try {
    const [user, totals] = await Promise.all([
      User.findById(req.user._id).lean(),

      GameHistory.aggregate([
        {
          $match: {
            userId: req.user._id,
          },
        },
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
      ]),
    ]);

    if (!user) {
      return res.status(404).json({
        message: "A felhasználó nem található.",
      });
    }

    return res.status(200).json({
      user: toPublicUser(user),

      stats: totals[0] ?? {
        totalGames: 0,
        totalCost: 0,
        totalWin: 0,
        netResult: 0,
      },

      refill: getRefillInfo(user),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/me/refill", protectRoute, async (req, res, next) => {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - REFILL_INTERVAL_MS);

    // A jogosultság ellenőrzése és a jóváírás egyetlen
    // atomikus adatbázis-műveletben történik.
    const user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        $or: [
          { lastRefillAt: null },
          { lastRefillAt: { $lte: cutoff } },
        ],
      },
      {
        $inc: {
          balance: REFILL_AMOUNT,
        },
        $set: {
          lastRefillAt: now,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!user) {
      const currentUser = await User.findById(req.user._id).lean();

      if (!currentUser) {
        return res.status(404).json({
          message: "A felhasználó nem található.",
        });
      }

      return res.status(409).json({
        message: "Virtuális feltöltést 24 óránként egyszer kérhetsz.",
        refill: getRefillInfo(currentUser),
      });
    }

    return res.status(200).json({
      message: "10 000 CR virtuális egyenleget jóváírtunk.",
      user: toPublicUser(user),
      refill: getRefillInfo(user, now),
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/me", protectRoute, async (req, res, next) => {
  try {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ message: "Érvénytelen kérés" });
    }

    const fields = Object.keys(body);
    const allowedFields = ["username", "email"];

    if (
      fields.length === 0 ||
      fields.some((field) => !allowedFields.includes(field))
    ) {
      return res.status(400).json({
        message: "Csak a felhasználónév és az e-mail-cím módosítható.",
      });
    }

    const changes = {};

    if (Object.hasOwn(body, "username")) {
      if (typeof body.username !== "string") {
        return res.status(400).json({
          message: "Érvénytelen felhasználónév.",
        });
      }

      const username = body.username.trim().toLowerCase();

      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({
          message: "A felhasználónév hossza 3 és 30 karakter között legyen.",
        });
      }

      changes.username = username;
    }

    if (Object.hasOwn(body, "email")) {
      if (typeof body.email !== "string") {
        return res.status(400).json({
          message: "Érvénytelen e-mail-cím.",
        });
      }

      const email = body.email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          message: "Érvénytelen e-mail-cím.",
        });
      }

      changes.email = email;
    }

    const user = await User.findOneAndUpdate(
      {
        _id: req.user._id,
      },
      {
        $set: changes,
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!user) {
      return res.status(404).json({
        message: "A felhasználó nem található.",
      });
    }

    return res.status(200).json({
      message: "A profil módosítása sikeres.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A felhasználónév vagy az e-mail-cím már foglalt.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Érvénytelen felhasználói adatok.",
      });
    }

    return next(error);
  }
});

module.exports = router;
