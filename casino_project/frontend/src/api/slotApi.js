import { apiRequest } from "./apiClient";

function getSlotConfig() {
  return apiRequest("/slot/config");
}

function spinSlot({ baseBet, requestId }) {
  return apiRequest("/slot/spin", {
    method: "POST",

    headers: {
      "Idempotency-Key": requestId,
    },

    body: JSON.stringify({
      baseBet,
    }),
  });
}

function buyBonus({ baseBet, requestId }) {
  return apiRequest("/slot/bonus-buy", {
    method: "POST",

    headers: {
      "Idempotency-Key": requestId,
    },

    body: JSON.stringify({
      baseBet,
    }),
  });
}

function featureSpin({ baseBet, selectedSymbol, requestId }) {
  return apiRequest("/slot/feature-spin", {
    method: "POST",

    headers: {
      "Idempotency-Key": requestId,
    },

    body: JSON.stringify({
      baseBet,
      selectedSymbol,
    }),
  });
}

export { getSlotConfig, spinSlot, buyBonus, featureSpin };
