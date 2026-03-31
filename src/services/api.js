const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

function getNetworkErrorMessage(error, requestUrl) {
  const detail = error instanceof Error && error.message ? error.message : "Error de red";

  if (import.meta.env.DEV) {
    console.error("Fallo de red al conectar con la API", {
      requestUrl,
      detail,
      error,
    });
  }

  return `No se pudo conectar con el servidor (${detail}). URL: ${requestUrl}`;
}

function buildUrl(path, query = {}) {
  const url = new URL(`${API_URL}${path}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function parseError(response) {
  try {
    const data = await response.json();
    const rawMessage =
      data.message ||
      data.error ||
      data.data?.message ||
      data.data?.error ||
      data.data ||
      null;

    if (typeof rawMessage === "string" && rawMessage.trim()) {
      return rawMessage;
    }

    if (rawMessage && typeof rawMessage === "object") {
      if (typeof rawMessage.message === "string" && rawMessage.message.trim()) {
        return rawMessage.message;
      }

      if (typeof rawMessage.error === "string" && rawMessage.error.trim()) {
        return rawMessage.error;
      }
    }

    return "Ocurrio un error en el servidor.";
  } catch {
    return "Ocurrio un error en el servidor.";
  }
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    token,
    query,
    headers = {},
    onUnauthorized,
  } = options;

  const requestUrl = buildUrl(path, query);
  let response;

  try {
    response = await fetch(requestUrl, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(getNetworkErrorMessage(error, requestUrl));
  }

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function downloadFile(path, options = {}) {
  const { token, query, onUnauthorized } = options;

  const requestUrl = buildUrl(path, query);
  let response;

  try {
    response = await fetch(requestUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (error) {
    throw new Error(getNetworkErrorMessage(error, requestUrl));
  }

  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  const fileName = fileNameMatch?.[1] || "reporte-fichadas.xlsx";
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(objectUrl);
}
