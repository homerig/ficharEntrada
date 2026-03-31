const TOKEN_KEY = "fichar_token";
const DAILY_PUNCHES_KEY = "fichar_daily_punches";

function normalizeStoredPunch(punch) {
  if (!punch) {
    return null;
  }

  return {
    action: punch.action || punch.accion || "ENTRADA",
    at: punch.at || punch.timestamp || punch.entrada || punch.salida || null,
    serviceName: punch.serviceName || punch.servicioNombre || punch.servicio?.nombre || "",
  };
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function storeToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
}

function readPunchMap() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(DAILY_PUNCHES_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePunchMap(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DAILY_PUNCHES_KEY, JSON.stringify(value));
}

function getTodayKey(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return `${userId}-${today}`;
}

export function getStoredDailyPunches(userId) {
  if (!userId) {
    return [];
  }

  const map = readPunchMap();
  const current = map[getTodayKey(userId)] || [];
  return current.map(normalizeStoredPunch).filter(Boolean);
}

export function appendStoredDailyPunch(userId, punch) {
  if (!userId) {
    return [];
  }

  const map = readPunchMap();
  const key = getTodayKey(userId);
  const current = Array.isArray(map[key]) ? map[key].map(normalizeStoredPunch).filter(Boolean) : [];
  const next = [...current, normalizeStoredPunch(punch)].filter(Boolean);

  map[key] = next;
  writePunchMap(map);
  return next;
}
