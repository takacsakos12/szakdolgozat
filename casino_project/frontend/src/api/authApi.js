import { apiRequest } from "./apiClient";

function getCurrentUser() {
  return apiRequest("/auth/me");
}

function loginUser(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

function registerUser(userData) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

function logoutUser() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

export { getCurrentUser, loginUser, registerUser, logoutUser };
