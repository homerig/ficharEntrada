import { apiRequest } from "./api";

export function loginRequest(payload) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: payload,
  }).then((response) => response.data || response);
}

export function getCurrentUser(token, onUnauthorized) {
  return apiRequest("/api/auth/me", {
    token,
    onUnauthorized,
  }).then((response) => response.data || response);
}

export function requestPasswordReset(payload) {
  return apiRequest("/api/auth/password-reset/request", {
    method: "POST",
    body: payload,
  }).then((response) => response.data || response);
}

export function confirmPasswordReset(payload) {
  return apiRequest("/api/auth/password-reset/confirm", {
    method: "POST",
    body: payload,
  }).then((response) => response.data || response);
}
