import { apiRequest } from "./apiClient";

function getCurrentProvablyFairSeed() {
  return apiRequest("/provably-fair/current");
}

function rotateProvablyFairSeed(clientSeed) {
  return apiRequest("/provably-fair/rotate", {
    method: "POST",
    body: JSON.stringify({ clientSeed: clientSeed.trim() || undefined }),
  });
}

function verifyProvablyFairGame(historyId) {
  return apiRequest("/provably-fair/verify", {
    method: "POST",
    body: JSON.stringify({ historyId: historyId.trim() }),
  });
}

export {
  getCurrentProvablyFairSeed,
  rotateProvablyFairSeed,
  verifyProvablyFairGame,
};
