export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu dispositivo no soporta geolocalización."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      () => {
        reject(new Error("No se pudo obtener tu ubicación. Verificá que tengas los permisos habilitados."));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}
