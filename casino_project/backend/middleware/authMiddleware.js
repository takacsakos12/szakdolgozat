const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function protectRoute(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: "A művelethez bejelentkezés szükséges.",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decodedToken.userId);

    if (!user) {
      return res.status(401).json({
        message: "A felhasználó nem található.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Érvénytelen vagy lejárt bejelentkezés.",
    });
  }
}
module.exports = protectRoute;
