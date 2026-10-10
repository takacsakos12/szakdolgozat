const mongoose = require("mongoose");
const User = require("../models/User");
const GameHistory = require("../models/GameHistory");

function createRequestError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeRequestId(requestId) {
  if (typeof requestId !== "string") {
    throw createRequestError("A kérés azonosítója hiányzik.");
  }

  const normalizedRequestId = requestId.trim();

  if (normalizedRequestId.length < 8 || normalizedRequestId.length > 100) {
    throw createRequestError(
      "A kérésazonosítója hossza 8 és 100 karakter között kell legyen.",
    );
  }

  return normalizedRequestId;
}

function verifyExistingRequest(existingHistory, { gameMode, baseBet }) {
  if (
    existingHistory.gameMode !== gameMode ||
    Number(existingHistory.baseBet) !== Number(baseBet)
  ) {
    throw createRequestError(
      "A kérés már feldolgozásra került egy másik játékmóddal vagy téttel.",
      400,
    );
  }
}

function toSettlement(history, replayed = false) {
  return {
    requestId: history.requestId,
    gameMode: history.gameMode,
    result: history.result,
    balanceBefore: history.balanceBefore,
    balanceAfter: history.balanceAfter,
    netResult: history.netResult,
    historyId: history._id,
    replayed,
  };
}

async function getSettledGame({ userId, requestId, gameMode, baseBet }) {
  if (!userId) {
    throw createRequestError("Az userId hiányzik.");
  }

  const normalizedRequestId = normalizeRequestId(requestId);

  const existingHistory = await GameHistory.findOne({
    userId,
    requestId: normalizedRequestId,
  }).lean();

  if (!existingHistory) {
    return null;
  }

  verifyExistingRequest(existingHistory, {
    gameMode,
    baseBet,
  });

  return toSettlement(existingHistory, true);
}

async function settleGameResult({
  userId,
  gameType,
  gameMode,
  configVersion,
  baseBet,
  cost,
  winAmount,
  result,
  slotDetails,
  requestId,
}) {
  if (!userId) {
    throw createRequestError("Az userId hiányzik.");
  }

  if (!Number.isFinite(baseBet) || baseBet <= 0) {
    throw createRequestError("Az alaptét érvénytelen.");
  }

  if (!Number.isFinite(cost) || cost <= 0) {
    throw createRequestError("A költség érvénytelen.");
  }

  if (!Number.isFinite(winAmount) || winAmount < 0) {
    throw createRequestError("A nyeremény érvénytelen.");
  }

  const normalizedRequestId = normalizeRequestId(requestId);
  const netResult = winAmount - cost;
  const session = await mongoose.startSession();

  try {
    let settlement;

    await session.withTransaction(async () => {
      const existingHistory = await GameHistory.findOne({
        userId,
        requestId: normalizedRequestId,
      }).session(session);

      if (existingHistory) {
        verifyExistingRequest(existingHistory, { gameMode, baseBet });
        settlement = toSettlement(existingHistory, true);
        return;
      }

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          balance: { $gte: cost },
        },
        {
          $inc: { balance: netResult },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!user) {
        throw createRequestError("Nincs elegendő egyenleg.");
      }

      const balanceAfter = user.balance;
      const balanceBefore = balanceAfter - netResult;

      const [history] = await GameHistory.create(
        [
          {
            requestId: normalizedRequestId,
            userId,
            gameType,
            gameMode,
            configVersion,
            baseBet,
            cost,
            winAmount,
            netResult,
            result,
            slotDetails,
            balanceBefore,
            balanceAfter,
          },
        ],
        { session },
      );

      settlement = toSettlement(history, false);
    });

    return settlement;
  } catch (error) {
    if (error?.code === 11000) {
      const existingHistory = await GameHistory.findOne({
        userId,
        requestId: normalizedRequestId,
      });

      if (existingHistory) {
        verifyExistingRequest(existingHistory, { gameMode, baseBet });
        return toSettlement(existingHistory, true);
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  getSettledGame,
  settleGameResult,
};
