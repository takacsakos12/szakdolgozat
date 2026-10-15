import { apiRequest } from "./apiClient";

function getGameHistory(page = 1, limit = 20) {
  return apiRequest(`/game-history?page=${page}&limit=${limit}`);
}

export { getGameHistory };
