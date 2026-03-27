import { useState } from "react";
import { submitFichada } from "./services/fichadas";
import { getCurrentPosition } from "./utils/geolocation";
import "./styles/App.css";

const initialForm = {
  dni: "",
  nombreApellido: "",
};

function App() {
  const [form, setForm] = useState(initialForm);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setNeedsRegistration(false);
  };

  const fichar = async () => {
    const trimmedDni = form.dni.trim();
    const trimmedNombreApellido = form.nombreApellido.trim();

    if (!trimmedDni) {
      setMessage("Ingresá tu DNI.");
      return;
    }

    if (needsRegistration && !trimmedNombreApellido) {
      setMessage("Ingresá tu nombre y apellido.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const position = await getCurrentPosition();

      const data = await submitFichada({
        dni: trimmedDni,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        nombreApellido: needsRegistration ? trimmedNombreApellido : undefined,
      });

      if (data.needsRegistration) {
        setNeedsRegistration(true);
        setMessage(
          data.message ||
            `DNI no registrado. Ingresá tu nombre y apellido.${data.servicio ? ` Servicio detectado: ${data.servicio}` : ""}`,
        );
        return;
      }

      if (!data.ok) {
        setMessage(data.message || "No se pudo fichar.");
        return;
      }

      setMessage(
        data.servicio
          ? `${data.message} - Servicio: ${data.servicio}`
          : data.message || "Fichada registrada correctamente.",
      );
      resetForm();
    } catch (error) {
      setMessage(error.message || "Ocurrió un problema al registrar la fichada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="card">
        <div className="card__header">
          <p className="eyebrow">Registro de asistencia</p>
          <h1>Fichar entrada</h1>
          <p className="card__description">
            Ingresá tu DNI y permití el acceso a la ubicación para registrar la fichada.
          </p>
        </div>

        <div className="form">
          <label className="field">
            <span>DNI</span>
            <input
              type="text"
              name="dni"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ingresá tu DNI"
              value={form.dni}
              onChange={handleChange}
              disabled={loading}
            />
          </label>

          {needsRegistration && (
            <label className="field">
              <span>Nombre y apellido</span>
              <input
                type="text"
                name="nombreApellido"
                autoComplete="name"
                placeholder="Nombre y apellido"
                value={form.nombreApellido}
                onChange={handleChange}
                disabled={loading}
              />
            </label>
          )}

          <button type="button" onClick={fichar} disabled={loading}>
            {loading ? "Procesando..." : "Fichar"}
          </button>
        </div>

        {message && <p className="message">{message}</p>}
      </section>
    </main>
  );
}

export default App;
