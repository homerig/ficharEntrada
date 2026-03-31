import { getDeviceFingerprint, getOrCreateDeviceId } from "../utils/device";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const getEndpointUrl = () => {
  if (!API_URL) {
    throw new Error("Falta configurar VITE_API_URL.");
  }

  return `${API_URL.replace(/\/$/, "")}/api/fichadas/fichar`;
};

function normalizeFichadaResponse(response) {
  const data = response?.data || response || {};
  const servicio = data.servicio || data.service || {};
  const fichada = data.fichada || data.punch || {};

  return {
    ...data,
    action: data.action || data.accion || "",
    servicio: {
      ...servicio,
      id: servicio.id,
      nombre:
        servicio.nombre ||
        servicio.name ||
        data.servicioNombre ||
        data.serviceName ||
        "",
      distanceMeters:
        servicio.distanceMeters ?? servicio.distance_meters ?? data.distanceMeters ?? null,
    },
    fichada: {
      ...fichada,
      id: fichada.id,
      fecha: fichada.fecha || fichada.date || data.fecha || null,
      entrada:
        fichada.entrada ||
        fichada.createdAt ||
        fichada.created_at ||
        data.entrada ||
        data.timestamp ||
        data.createdAt ||
        null,
      salida:
        fichada.salida ||
        data.salida ||
        null,
    },
  };
}

export async function submitFichada({ dni, lat, lng, nombreApellido }) {
  const payload = {
    dni,
    lat,
    lng,
    deviceId: getOrCreateDeviceId(),
    fingerprint: getDeviceFingerprint(),
  };

  if (nombreApellido) {
    payload.nombreApellido = nombreApellido;
  }

  let response;

  try {
    response = await fetch(getEndpointUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.");
  }

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("La respuesta del servidor no es válida.");
  }

  if (!response.ok) {
    throw new Error(data.message || "No se pudo procesar la fichada.");
  }

  return normalizeFichadaResponse(data);
}
