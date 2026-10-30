import { apiRequest } from "./apiClient";

function getTheoreticalRtp() {
  return apiRequest("/statistics/theoretical-rtp");
}

export { getTheoreticalRtp };
