import { getDeviceFingerprint, getOrCreateDeviceId } from "../utils/device";

const API_URL = import.meta.env.VITE_API_URL;

const getEndpointUrl = () => {
  if (!API_URL) {
    throw new Error("Falta configurar VITE_API_URL.");
  }

  return `${API_URL.replace(/\/$/, "")}/api/fichadas/fichar`;
};

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

  return data;
}
