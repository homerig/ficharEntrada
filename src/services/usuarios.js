import { apiRequest } from "./api";

function normalizeUsuario(user) {
  if (!user) {
    return user;
  }

  return {
    ...user,
    id: user.id,
    dni: user.dni,
    nombreApellido: user.nombreApellido ?? user.nombre_apellido ?? "",
    role: user.role ?? user.rol ?? "",
    activo: user.activo ?? user.active ?? false,
    hasPassword: user.hasPassword ?? Boolean(user.password_hash),
    email: user.email ?? "",
  };
}

export function listUsuarios(token, onUnauthorized) {
  return apiRequest("/api/usuarios", {
    token,
    onUnauthorized,
  }).then((response) => {
    const payload = response.data || response;
    const items = Array.isArray(payload) ? payload : payload.items || payload.usuarios || [];
    return items.map(normalizeUsuario);
  });
}

export function createUsuario(payload, token, onUnauthorized) {
  return apiRequest("/api/usuarios", {
    method: "POST",
    body: payload,
    token,
    onUnauthorized,
  }).then((response) => normalizeUsuario(response.data || response));
}

export function updateUsuario(id, payload, token, onUnauthorized) {
  return apiRequest(`/api/usuarios/${id}`, {
    method: "PATCH",
    body: payload,
    token,
    onUnauthorized,
  }).then((response) => normalizeUsuario(response.data || response));
}
