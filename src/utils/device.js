const DEVICE_ID_KEY = "device_id";

function generateDeviceId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateDeviceId() {
  if (typeof window === "undefined") {
    return "server-device-id";
  }

  const existingDeviceId = window.localStorage.getItem(DEVICE_ID_KEY);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const newDeviceId = generateDeviceId();
  window.localStorage.setItem(DEVICE_ID_KEY, newDeviceId);

  return newDeviceId;
}

export function getDeviceFingerprint() {
  if (typeof window === "undefined") {
    return {
      userAgent: "",
      language: "",
      platform: "",
      timezone: "",
      screenWidth: 0,
      screenHeight: 0,
      pixelRatio: 1,
    };
  }

  return {
    userAgent: window.navigator.userAgent,
    language: window.navigator.language,
    platform: window.navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
  };
}
