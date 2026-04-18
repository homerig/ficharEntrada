import { apiRequest } from "./api";

function normalizeTurno(turno, index = 0) {
  if (!turno) {
    return null;
  }

  return {
    id: turno.id ?? null,
    horaInicio: turno.horaInicio ?? turno.hora_inicio ?? null,
    horaFin: turno.horaFin ?? turno.hora_fin ?? null,
    orden: turno.orden ?? index,
  };
}

function normalizeServicio(service) {
  if (!service) {
    return service;
  }

  const rawTurnos = Array.isArray(service.turnos)
    ? service.turnos
    : service.horaEntradaLimite || service.hora_entrada_limite || service.horaEntrada
      ? [
          {
            horaInicio:
              service.horaEntradaLimite ?? service.hora_entrada_limite ?? service.horaEntrada,
          },
        ]
      : [];

  return {
    ...service,
    id: service.id,
    nombre: service.nombre,
    lat: service.lat ?? service.latitude ?? null,
    lon: service.lon ?? service.lng ?? service.longitude ?? null,
    radioMetros: service.radioMetros ?? service.radio_metros ?? null,
    horaEntradaLimite:
      service.horaEntradaLimite ?? service.hora_entrada_limite ?? service.horaEntrada ?? null,
    toleranciaTurnoMinutos:
      service.toleranciaTurnoMinutos ?? service.tolerancia_turno_minutos ?? null,
    turnos: rawTurnos.map((turno, index) => normalizeTurno(turno, index)).filter(Boolean),
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

export function activateServicio(id, token, onUnauthorized) {
  return apiRequest(`/api/servicios/${id}/activate`, {
    method: "PATCH",
    token,
    onUnauthorized,
  }).then((response) => normalizeServicio(response.data || response));
}

export function deactivateServicio(id, token, onUnauthorized) {
  return apiRequest(`/api/servicios/${id}/deactivate`, {
    method: "PATCH",
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
