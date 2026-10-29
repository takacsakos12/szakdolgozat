import { apiRequest } from "./apiClient";

function getProfileSummary() {
  return apiRequest("/users/me/summary");
}

function updateProfile(changes) {
  return apiRequest("/users/me", {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

function changePassword({ currentPassword, newPassword }) {
  return apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });
}

function refillBalance() {
  return apiRequest("/users/me/refill", {
    method: "POST",
  });
}

export { getProfileSummary, updateProfile, changePassword, refillBalance };
