const express = require("express");
const mongoose = require("mongoose");

const protectRoute = require("../middleware/authMiddleware");

const {
  getCurrentSeed,
  rotateSeed,
  getRevealedSeed,
  verifyServerSeed,
  verifyGameResult,
} = require("../services/provablyFairService");

const router = express.Router();

router.get("/current", protectRoute, async (req, res) => {
  const seed = await getCurrentSeed(req.user._id);

  return res.status(200).json({
    seed,
  });
});

router.post("/rotate", protectRoute, async (req, res) => {
  const clientSeed =
    typeof req.body.clientSeed === "string"
      ? req.body.clientSeed.trim()
      : undefined;

  const rotation = await rotateSeed({
    userId: req.user._id,
    clientSeed: clientSeed || undefined,
  });

  return res.status(200).json({
    message: "A seedpár cseréje sikeres.",
    previousSeed: rotation.previousSeed,
    currentSeed: rotation.currentSeed,
  });
});

router.get("/revealed/:seedId", protectRoute, async (req, res) => {
  const { seedId } = req.params;

  if (!mongoose.isValidObjectId(seedId)) {
    return res.status(400).json({
      message: "A seed azonosítója érvénytelen.",
    });
  }

  const seed = await getRevealedSeed({
    userId: req.user._id,
    seedId,
  });

  return res.status(200).json({
    seed,
  });
});

router.post("/verify", protectRoute, async (req, res) => {
  const historyId =
    typeof req.body.historyId === "string"
      ? req.body.historyId.trim()
      : "";

  const verification = await verifyGameResult({
    userId: req.user._id,
    historyId,
  });

  return res.status(200).json(verification);
});

router.post("/verify", protectRoute, async (req, res) => {
  try {
    const historyId =
      typeof req.body.historyId === "string" ? req.body.historyId.trim() : "";

    if (!mongoose.isValidObjectId(historyId)) {
      return res.status(400).json({
        message: "A játékelőzmény azonosítója érvénytelen.",
      });
    }

    const verification = await verifyGameResult({
      userId: req.user._id,
      historyId,
    });

    return res.status(200).json(verification);
  } catch (error) {
    return sendErrorResponse(res, error);
  }
});

module.exports = router;
