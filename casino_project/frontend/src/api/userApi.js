import { apiRequest } from "./apiClient";

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

export { updateProfile, changePassword };
    