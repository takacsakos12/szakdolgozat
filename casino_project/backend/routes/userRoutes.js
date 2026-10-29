const express = require("express");
const router = express.Router();
const User = require("../models/User");
const protectRoute = require("../middleware/authMiddleware");

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
