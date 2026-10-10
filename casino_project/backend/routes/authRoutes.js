const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const protectRoute = require("../middleware/authMiddleware");

const router = express.Router();

const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Túl sok próbálkozás érkezett. Próbáld újra 15 perc múlva.",
  },
});

function createToken(userId) {
  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function sendAuthenticationResponse(
  res,
  user,
  statusCode,
  message
) {
  const token = createToken(user._id);

  res.cookie("token", token, getCookieOptions());

  return res.status(statusCode).json({
    message,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
    },
  });
}

function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

function isValidPassword(password) {
  const hasLowercaseLetter = /[a-z]/.test(password);
  const hasUppercaseLetter = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  return (
    password.length >= 8 &&
    hasLowercaseLetter &&
    hasUppercaseLetter &&
    hasNumber
  );
}

/*A felhasználó létrejön, de nem jelentkezik be automatikusan.*/
router.post(
  "/register",
  authenticationLimiter,
  async (req, res) => {
    try {
      const username =
        typeof req.body.username === "string"
          ? req.body.username.trim().toLowerCase()
          : "";

      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";

      const password =
        typeof req.body.password === "string"
          ? req.body.password
          : "";

      if (!username || !email || !password) {
        return res.status(400).json({
          message: "Minden mező kitöltése kötelező.",
        });
      }

      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({
          message:
            "A felhasználónévnek 3 és 30 karakter között kell lennie.",
        });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          message: "Érvénytelen e-mail-cím.",
        });
      }

      if (!isValidPassword(password)) {
        return res.status(400).json({
          message:
            "A jelszó legyen legalább 8 karakteres, és tartalmazzon kisbetűt, nagybetűt és számot.",
        });
      }

      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res.status(409).json({
          message:
            "Ezzel az e-mail-címmel vagy felhasználónévvel már létezik fiók.",
        });
      }

      await User.create({
        username,
        email,
        password,
      });

      return res.status(201).json({
        message:
          "A regisztráció sikeres. Most már bejelentkezhetsz.",
      });
    } catch (error) {
      console.error("Regisztrációs hiba:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message:
            "Ezzel az e-mail-címmel vagy felhasználónévvel már létezik fiók.",
        });
      }

      return res.status(500).json({
        message: "A regisztráció során hiba történt.",
      });
    }
  }
);

/*Bejelentkezés felhasználónévvel*/
router.post(
  "/login",
  authenticationLimiter,
  async (req, res) => {
    try {
      const username =
        typeof req.body.username === "string"
          ? req.body.username.trim().toLowerCase()
          : "";

      const password =
        typeof req.body.password === "string"
          ? req.body.password
          : "";    

      if (!username || !password) {
        return res.status(400).json({
          message:
            "A felhasználónév és a jelszó megadása kötelező.",
        });
      }

      const user = await User.findOne({ username }).select(
        "+password"
      );

      if (!user) {
        return res.status(401).json({
          message: "Hibás felhasználónév vagy jelszó.",
        });
      }

      const passwordIsCorrect =
        await user.comparePassword(password);

      if (!passwordIsCorrect) {
        return res.status(401).json({
          message: "Hibás felhasználónév vagy jelszó.",
        });
      }

      return sendAuthenticationResponse(
        res,
        user,
        200,
        "A bejelentkezés sikeres."
      );
    } catch (error) {
      console.error("Bejelentkezési hiba:", error);

      return res.status(500).json({
        message: "A bejelentkezés során hiba történt.",
      });
    }
  }
);

/*Kijelentkezés*/
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite:
      process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.status(200).json({
    message: "A kijelentkezés sikeres.",
  });
});
router.get("/me", protectRoute, (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      balance: req.user.balance,
    },
  });
});

module.exports = router;