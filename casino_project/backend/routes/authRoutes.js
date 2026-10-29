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
    message: "Túl sok próbálkozás érkezett. Próbáld újra 15 perc múlva.",
  },
});

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      authVersion: user.authVersion ?? 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  };
}

function sendAuthenticationResponse(res, user, message) {
  const token = createToken(user);

  res.cookie("token", token, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return (
    password.length >= 8 &&
    Buffer.byteLength(password, "utf8") <= 72 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

function handleAuthError(error, res, next) {
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

  if (error.name === "VersionError") {
    return res.status(409).json({
      message: "A felhasználói adatok megváltoztak. Próbáld újra.",
    });
  }

  return next(error);
}

router.post("/register", authenticationLimiter, async (req, res, next) => {
  try {
    const body = req.body ?? {};

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        message: "A felhasználónév hossza 3 és 30 karakter között legyen.",
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
          "A jelszó legyen legalább 8 karakteres, legfeljebb 72 bájt hosszú, és tartalmazzon kisbetűt, nagybetűt és számot.",
      });
    }

    const existingUser = await User.exists({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "A felhasználónév vagy az e-mail-cím már foglalt.",
      });
    }

    await User.create({
      username,
      email,
      password,
    });

    return res.status(201).json({
      message: "A regisztráció sikeres. Most már bejelentkezhetsz.",
    });
  } catch (error) {
    return handleAuthError(error, res, next);
  }
});

router.post("/login", authenticationLimiter, async (req, res, next) => {
  try {
    const body = req.body ?? {};

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return res.status(400).json({
        message: "A felhasználónév és a jelszó megadása kötelező.",
      });
    }

    const user = await User.findOne({ username }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: "Hibás felhasználónév vagy jelszó.",
      });
    }

    return sendAuthenticationResponse(res, user, "A bejelentkezés sikeres.");
  } catch (error) {
    return handleAuthError(error, res, next);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", getCookieOptions());

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

router.post(
  "/change-password",
  protectRoute,
  authenticationLimiter,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body ?? {};

      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        !currentPassword
      ) {
        return res.status(400).json({
          message: "A jelenlegi és az új jelszó megadása kötelező.",
        });
      }

      if (!isValidPassword(newPassword)) {
        return res.status(400).json({
          message:
            "Az új jelszó legyen legalább 8 karakteres, legfeljebb 72 bájt hosszú, és tartalmazzon kisbetűt, nagybetűt és számot.",
        });
      }

      const user = await User.findById(req.user._id).select("+password");

      if (!user || (user.authVersion ?? 0) !== (req.user.authVersion ?? 0)) {
        return res.status(401).json({
          message: "Jelentkezz be újra.",
        });
      }

      if (!(await user.comparePassword(currentPassword))) {
        return res.status(400).json({
          message: "A jelenlegi jelszó hibás.",
        });
      }

      if (await user.comparePassword(newPassword)) {
        return res.status(400).json({
          message: "Az új jelszó nem egyezhet meg a jelenlegivel.",
        });
      }

      user.password = newPassword;
      user.authVersion = (user.authVersion ?? 0) + 1;

      await user.save();

      return sendAuthenticationResponse(
        res,
        user,
        "A jelszó módosítása sikeres.",
      );
    } catch (error) {
      return handleAuthError(error, res, next);
    }
  },
);

module.exports = router;
