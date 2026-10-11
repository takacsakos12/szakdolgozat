const express = require("express");
const mongoose = require("mongoose");

const protectRoute = require("../middleware/authMiddleware");

const {
  getCurrentSeed,
  rotateSeed,
  getRevealedSeed,
  verifyServerSeed,
} = require("../services/provablyFairService");

const router = express.Router();

function sendErrorResponse(res, error) {
  console.error("Provably Fair API hiba:", error);

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    message:
      statusCode === 500
        ? "A Provably Fair művelet során szerverhiba történt."
        : error.message,
  });
}

router.get("/current", protectRoute, async (req, res) => {
  try {
    const seed = await getCurrentSeed(req.user._id);

    return res.status(200).json({
      seed,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
});

router.post("/rotate", protectRoute, async (req, res) => {
  try {
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
  } catch (error) {
    return sendErrorResponse(res, error);
  }
});

router.get("/revealed/:seedId", protectRoute, async (req, res) => {
  try {
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
  } catch (error) {
    return sendErrorResponse(res, error);
  }
});

router.post("/verify", protectRoute, (req, res) => {
  const serverSeed =
    typeof req.body.serverSeed === "string"
      ? req.body.serverSeed.trim().toLowerCase()
      : "";

  const serverSeedHash =
    typeof req.body.serverSeedHash === "string"
      ? req.body.serverSeedHash.trim().toLowerCase()
      : "";

  if (!serverSeed || !serverSeedHash) {
    return res.status(400).json({
      message: "A szerverseed és annak hashértéke kötelező.",
    });
  }

  const valid = verifyServerSeed({
    serverSeed,
    serverSeedHash,
  });

  return res.status(200).json({
    valid,
    message: valid
      ? "A szerverseed megfelel a korábban közzétett hashértéknek."
      : "A szerverseed nem felel meg a megadott hashértéknek.",
  });
});

module.exports = router;
