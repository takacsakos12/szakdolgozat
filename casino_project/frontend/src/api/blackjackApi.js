import { apiRequest } from "./apiClient";

function getBlackjackConfig() {
  return apiRequest("/blackjack/config");
}

function getActiveBlackjackSession() {
  return apiRequest("/blackjack/active");
}

function startBlackjackGame(bets, idempotencyKey) {
  return apiRequest("/blackjack/start", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(bets),
  });
}

function performBlackjackAction(
  { sessionId, expectedVersion, action, insuranceAmount },
  idempotencyKey,
) {
  return apiRequest("/blackjack/action", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      sessionId,
      expectedVersion,
      action,
      insuranceAmount,
    }),
  });
}

export {
  getBlackjackConfig,
  getActiveBlackjackSession,
  startBlackjackGame,
  performBlackjackAction,
};
