import { apiRequest } from "./api";

function normalizeServicio(service) {
  if (!service) {
    return service;
  }

  return {
    ...service,
    id: service.id,
    nombre: service.nombre,
    lat: service.lat ?? service.latitude ?? null,
    lon: service.lon ?? service.lng ?? service.longitude ?? null,
    radioMetros: service.radioMetros ?? service.radio_metros ?? null,
    horaEntradaLimite:
      service.horaEntradaLimite ?? service.hora_entrada_limite ?? service.horaEntrada ?? null,
    activo: service.activo ?? service.active ?? false,
  };
}

export function listServicios(token, includeInactive, onUnauthorized) {
  return apiRequest("/api/servicios", {
    token,
    query: { includeInactive },
    onUnauthorized,
  }).then((response) => {
    const payload = response.data || response;
    const items = Array.isArray(payload) ? payload : payload.items || payload.servicios || [];
    return items.map(normalizeServicio);
  });
}

export function createServicio(payload, token, onUnauthorized) {
  return apiRequest("/api/servicios", {
    method: "POST",
    body: payload,
    token,
    onUnauthorized,
  }).then((response) => normalizeServicio(response.data || response));
}

export function updateServicio(id, payload, token, onUnauthorized) {
  return apiRequest(`/api/servicios/${id}`, {
    method: "PATCH",
    body: payload,
    token,
    onUnauthorized,
  }).then((response) => normalizeServicio(response.data || response));
}

export function deleteServicio(id, token, onUnauthorized) {
  return apiRequest(`/api/servicios/${id}`, {
    method: "DELETE",
    token,
    onUnauthorized,
  });
}
