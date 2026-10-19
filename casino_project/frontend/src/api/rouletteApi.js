import { apiRequest } from "./apiClient";

function getRouletteConfig() {
  return apiRequest("/roulette/config");
}

function spinRouletteGame(bets, idempotencyKey) {
  return apiRequest("/roulette/spin", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ bets }),
  });
}

export { getRouletteConfig, spinRouletteGame };
