const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protectRoute(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "A művelethez bejelentkezés szükséges.",
    });
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.NotBeforeError
    ) {
      return res.status(401).json({
        message: "Érvénytelen vagy lejárt bejelentkezés.",
      });
    }

    return next(error);
  }

  if (
    !decodedToken ||
    typeof decodedToken !== "object" ||
    typeof decodedToken.userId !== "string" ||
    !/^[a-f0-9]{24}$/i.test(decodedToken.userId)
  ) {
    return res.status(401).json({
      message: "Érvénytelen bejelentkezési adatok.",
    });
  }

  try {
    const user = await User.findById(decodedToken.userId);

    if (!user) {
      return res.status(401).json({
        message: "A felhasználó nem található.",
      });
    }

    if ((decodedToken.authVersion ?? 0) !== (user.authVersion ?? 0)) {
      return res.status(401).json({
        message: "A bejelentkezés érvényét vesztette. Jelentkezz be újra.",
      });
    }

    req.user = user;
  } catch (error) {
    // Az adatbázishiba nem jelent érvénytelen bejelentkezést.
    return next(error);
  }

  return next();
}

module.exports = protectRoute;
