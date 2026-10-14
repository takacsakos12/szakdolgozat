import { apiRequest } from "./apiClient";

function getCurrentUser() {
  return apiRequest("/auth/me");
}

export {
  getCurrentUser,
};