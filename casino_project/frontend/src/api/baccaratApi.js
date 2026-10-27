import { apiRequest } from "./apiClient";

function getBaccaratConfig() {
  return apiRequest("/baccarat/config");
}

function playBaccarat(bets, idempotencyKey) {
  return apiRequest("/baccarat/play", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ bets }),
  });
}

export { getBaccaratConfig, playBaccarat };
