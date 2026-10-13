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

export {
  getSlotConfig,
  spinSlot,
};