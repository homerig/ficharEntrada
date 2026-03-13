import { useState } from "react";
import "./styles/App.css";

const API_URL = "/api/fichar";

function App() {
  const [dni, setDni] = useState("");
  const [nombreApellido, setNombreApellido] = useState("");
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Tu dispositivo no soporta geolocalización"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        () => {
          reject(new Error("No se pudo obtener tu ubicación"));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const fichar = async () => {
    if (!dni.trim()) {
      setMessage("Ingresá tu DNI");
      return;
    }

    if (needsRegistration && !nombreApellido.trim()) {
      setMessage("Ingresá tu nombre y apellido");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const position = await getCurrentPosition();

      const payload = {
        dni: dni.trim(),
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      if (needsRegistration) {
        payload.nombreApellido = nombreApellido.trim();
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.needsRegistration) {
        setNeedsRegistration(true);
        setMessage(`DNI no registrado. Ingresá tu nombre y apellido. Servicio detectado: ${data.servicio}`);
        setLoading(false);
        return;
      }

      if (!data.ok) {
        setMessage(data.message || "No se pudo fichar");
        setLoading(false);
        return;
      }

      setMessage(`${data.message} - Servicio: ${data.servicio}`);
      setNeedsRegistration(false);
      setDni("");
      setNombreApellido("");
    } catch (err) {
      setMessage(err.message || "Error conectando con el servidor");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Fichar Asistencia</h1>

        <input
          type="text"
          placeholder="Ingresá tu DNI"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
        />

        {needsRegistration && (
          <input
            type="text"
            placeholder="Nombre y Apellido"
            value={nombreApellido}
            onChange={(e) => setNombreApellido(e.target.value)}
          />
        )}

        <button onClick={fichar} disabled={loading}>
          {loading ? "Procesando..." : "Fichar"}
        </button>

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}

export default App;