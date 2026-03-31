function normalizeApiUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export function getApiUrl() {
  const envApiUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);

  if (envApiUrl) {
    return envApiUrl;
  }

  if (import.meta.env.DEV) {
    return "http://localhost:3000";
  }

  throw new Error(
    "Falta configurar VITE_API_URL para producción. Configurá la URL pública del backend y volvé a generar el build.",
  );
}
