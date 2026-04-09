import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ROLES, canDownloadExcel, isAdmin } from "./constants/roles";
import {
  confirmPasswordReset,
  getCurrentUser,
  loginRequest,
  requestPasswordReset,
} from "./services/auth";
import { submitFichada } from "./services/fichadas";
import { downloadExcel } from "./services/reportes";
import {
  activateServicio,
  createServicio,
  deactivateServicio,
  deleteServicio,
  listServicios,
  updateServicio,
} from "./services/servicios";
import { createUsuario, listUsuarios, updateUsuario } from "./services/usuarios";
import { getCurrentPosition } from "./utils/geolocation";
import {
  appendStoredDailyPunch,
  clearStoredToken,
  getStoredDailyPunches,
  getStoredToken,
  storeToken,
} from "./utils/session";
import "./styles/App.css";

const initialLoginForm = {
  dni: "",
  password: "",
};

const initialResetRequestForm = {
  email: "",
};

const initialResetConfirmForm = {
  email: "",
  code: "",
  newPassword: "",
};

const initialSignupForm = {
  dni: "",
  email: "",
  nombreApellido: "",
  password: "",
};

const initialExcelFilters = {
  date: "",
  month: "",
  employeeId: "",
  serviceId: "",
  lateOnly: false,
};

const currentMonthValue = new Date().toISOString().slice(0, 7);

const initialServiceForm = {
  nombre: "",
  lat: "",
  lon: "",
  radioMetros: "200",
  horaEntradaLimite: "08:00",
  activo: true,
};

const initialUserForm = {
  dni: "",
  nombreApellido: "",
  password: "",
  role: ROLES.EMPLOYEE,
  activo: true,
};

function buildDashboardTabs(role) {
  const tabs = [];

  if (canDownloadExcel(role)) {
    tabs.push({ id: "excel", label: "Descargar Excel" });
  }

  if (isAdmin(role)) {
    tabs.push({ id: "servicios", label: "Servicios" });
    tabs.push({ id: "usuarios", label: "Usuarios" });
  }

  return tabs;
}

function hasDashboardAccess(role) {
  return buildDashboardTabs(role).length > 0;
}

function normalizeBoolean(value) {
  return Boolean(value);
}

function mapServicePayload(form) {
  return {
    nombre: form.nombre.trim(),
    lat: Number(form.lat),
    lon: Number(form.lon),
    radioMetros: Number(form.radioMetros),
    horaEntradaLimite: form.horaEntradaLimite,
    activo: normalizeBoolean(form.activo),
  };
}

function validateServiceForm(form) {
  const nombre = form.nombre.trim();
  const lat = Number(form.lat);
  const lon = Number(form.lon);
  const radioMetros = Number(form.radioMetros);
  const horaEntradaLimite = String(form.horaEntradaLimite || "").trim();

  if (!nombre) {
    return "El nombre del servicio es obligatorio.";
  }

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return "La latitud es invalida.";
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return "La longitud es invalida.";
  }

  if (!Number.isFinite(radioMetros) || radioMetros <= 0) {
    return "El radio en metros debe ser mayor a 0.";
  }

  if (!/^\d{2}:\d{2}$/.test(horaEntradaLimite)) {
    return "La hora limite debe tener formato HH:MM.";
  }

  return "";
}

function formatClock(value) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPunchMoment(punch) {
  return punch?.fichada?.salida || punch?.fichada?.entrada || punch?.fichada?.fecha || new Date().toISOString();
}

function getActionLabel(action) {
  switch (action) {
    case "SALIDA":
      return "Salida";
    case "TRASLADO":
      return "Traslado";
    default:
      return "Entrada";
  }
}

function shiftMonth(monthValue, amount) {
  const [year, month] = String(monthValue || currentMonthValue)
    .split("-")
    .map(Number);
  const date = new Date(year, (month || 1) - 1 + amount, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}`;
}

function formatMonthLabel(monthValue) {
  const [year, month] = String(monthValue || currentMonthValue)
    .split("-")
    .map(Number);
  const date = new Date(year, (month || 1) - 1, 1);

  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function App() {
  const [token, setToken] = useState(() => getStoredToken());
  const [authLoading, setAuthLoading] = useState(Boolean(getStoredToken()));
  const [user, setUser] = useState(null);
  const [dailyPunches, setDailyPunches] = useState([]);

  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [dashboardTab, setDashboardTab] = useState("excel");
  const [authView, setAuthView] = useState("login");
  const [resetRequestForm, setResetRequestForm] = useState(initialResetRequestForm);
  const [resetConfirmForm, setResetConfirmForm] = useState(initialResetConfirmForm);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupMessage, setSignupMessage] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [punchLoading, setPunchLoading] = useState(false);
  const [punchMessage, setPunchMessage] = useState("");

  const [excelFilters, setExcelFilters] = useState(initialExcelFilters);
  const [excelMode, setExcelMode] = useState("day");
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelMessage, setExcelMessage] = useState("");

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesMessage, setServicesMessage] = useState("");
  const [includeInactiveServices, setIncludeInactiveServices] = useState(true);
  const [serviceForm, setServiceForm] = useState(initialServiceForm);
  const [serviceEditingId, setServiceEditingId] = useState(null);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceTogglingId, setServiceTogglingId] = useState(null);
  const [serviceDeletingId, setServiceDeletingId] = useState(null);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState("");
  const [userForm, setUserForm] = useState(initialUserForm);
  const [userEditingId, setUserEditingId] = useState(null);
  const [userSaving, setUserSaving] = useState(false);

  const dashboardTabs = useMemo(() => buildDashboardTabs(user?.role), [user?.role]);

  const performLogout = useCallback((message = "La sesion finalizo. Volve a ingresar.") => {
    clearStoredToken();
    setToken("");
    setUser(null);
    setDailyPunches([]);
    setAuthLoading(false);
    setLoginForm(initialLoginForm);
    setLoginMessage(message);
    setDashboardVisible(false);
    setShowAccessModal(false);
    setPunchMessage("");
    setAuthView("login");
  }, []);

  const handleUnauthorized = useCallback(() => {
    performLogout();
  }, [performLogout]);

  const loadServices = useCallback(async (includeInactive = false) => {
    if (!token) {
      return;
    }

    setServicesLoading(true);

    try {
      const data = await listServicios(token, includeInactive, handleUnauthorized);
      setServices(Array.isArray(data) ? data : data.items || []);
      setServicesMessage("");
    } catch (error) {
      setServicesMessage(error.message || "No se pudieron cargar los servicios.");
    } finally {
      setServicesLoading(false);
    }
  }, [handleUnauthorized, token]);

  const loadUsers = useCallback(async () => {
    if (!token) {
      return;
    }

    setUsersLoading(true);

    try {
      const data = await listUsuarios(token, handleUnauthorized);
      setUsers(Array.isArray(data) ? data : data.items || []);
      setUsersMessage("");
    } catch (error) {
      setUsersMessage(error.message || "No se pudieron cargar los usuarios.");
    } finally {
      setUsersLoading(false);
    }
  }, [handleUnauthorized, token]);

  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSession() {
      setAuthLoading(true);

      try {
        const data = await getCurrentUser(token, handleUnauthorized);

        if (!cancelled) {
          const currentUser = data.user || data;
          setUser(currentUser);
          setDailyPunches(getStoredDailyPunches(currentUser.id));
        }
      } catch (error) {
        if (!cancelled) {
          clearStoredToken();
          setToken("");
          setUser(null);
          setLoginMessage(error.message || "No se pudo recuperar la sesion.");
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [handleUnauthorized, token]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setDailyPunches(getStoredDailyPunches(user.id));
  }, [user]);

  useEffect(() => {
    if (!dashboardTabs.some((tab) => tab.id === dashboardTab)) {
      setDashboardTab(dashboardTabs[0]?.id || "excel");
    }
  }, [dashboardTab, dashboardTabs]);

  useEffect(() => {
    if (!user || !dashboardVisible) {
      return;
    }

    if (canDownloadExcel(user.role)) {
      loadServices(false);
    }

    if (isAdmin(user.role) && users.length === 0) {
      loadUsers();
    }
  }, [dashboardVisible, loadServices, loadUsers, user, users.length]);

  useEffect(() => {
    if (user && isAdmin(user.role) && dashboardVisible && dashboardTab === "servicios") {
      loadServices(includeInactiveServices);
    }
  }, [dashboardTab, dashboardVisible, includeInactiveServices, loadServices, user]);

  useEffect(() => {
    if (user && isAdmin(user.role) && dashboardVisible && dashboardTab === "usuarios" && users.length === 0) {
      loadUsers();
    }
  }, [dashboardTab, dashboardVisible, loadUsers, user, users.length]);

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleExcelChange = (event) => {
    const { name, value, type, checked } = event.target;

    setExcelFilters((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleExcelModeChange = (mode) => {
    setExcelMode(mode);
    setExcelFilters((current) => ({
      ...current,
      date: mode === "day" ? current.date : "",
      month: mode === "month" ? current.month || currentMonthValue : "",
    }));
  };

  const handleResetRequestChange = (event) => {
    const { name, value } = event.target;
    setResetRequestForm((current) => ({ ...current, [name]: value }));
  };

  const handleResetConfirmChange = (event) => {
    const { name, value } = event.target;
    setResetConfirmForm((current) => ({ ...current, [name]: value }));
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((current) => ({ ...current, [name]: value }));
  };

  const handleServiceChange = (event) => {
    const { name, value, type, checked } = event.target;

    setServiceForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUserChange = (event) => {
    const { name, value, type, checked } = event.target;

    setUserForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetServiceForm = () => {
    setServiceEditingId(null);
    setServiceForm(initialServiceForm);
  };

  const startEditService = (service) => {
    setServiceEditingId(service.id);
    setServiceForm({
      nombre: service.nombre || "",
      lat: String(service.lat ?? ""),
      lon: String(service.lon ?? ""),
      radioMetros: String(service.radioMetros ?? 200),
      horaEntradaLimite: service.horaEntradaLimite || "08:00",
      activo: Boolean(service.activo),
    });
  };

  const resetUserForm = () => {
    setUserEditingId(null);
    setUserForm(initialUserForm);
  };

  const startEditUser = (currentUser) => {
    setUserEditingId(currentUser.id);
    setUserForm({
      dni: currentUser.dni || "",
      nombreApellido: currentUser.nombreApellido || "",
      password: "",
      role: currentUser.role || ROLES.EMPLOYEE,
      activo: Boolean(currentUser.activo),
    });
  };

  const executeLogin = async (openDashboardAfterLogin = false) => {
    setLoginLoading(true);
    setLoginMessage("");

    try {
      const data = await loginRequest(loginForm);
      const currentUser = data.user || null;
      storeToken(data.token);
      setToken(data.token);
      setUser(currentUser);
      setDailyPunches(currentUser?.id ? getStoredDailyPunches(currentUser.id) : []);
      setLoginForm(initialLoginForm);

      if (openDashboardAfterLogin) {
        if (hasDashboardAccess(currentUser?.role)) {
          setDashboardVisible(true);
          setShowAccessModal(false);
        } else {
          setShowAccessModal(false);
          setLoginMessage("La sesion se inicio, pero este usuario no tiene acceso al tablero.");
        }
      } else {
        setShowAccessModal(false);
      }
    } catch (error) {
      setLoginMessage(error.message || "No se pudo iniciar sesion.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePrimaryLogin = async (event) => {
    event.preventDefault();
    await executeLogin(false);
  };

  const handleDashboardLogin = async (event) => {
    event.preventDefault();
    await executeLogin(true);
  };

  const openForgotPassword = () => {
    setAuthView("forgot-request");
    setResetMessage("");
    setResetRequestForm(initialResetRequestForm);
    setResetConfirmForm(initialResetConfirmForm);
    setSignupMessage("");
  };

  const backToLogin = () => {
    setAuthView("login");
    setResetMessage("");
    setSignupMessage("");
  };

  const openSignup = () => {
    setAuthView("signup");
    setSignupMessage("");
    setResetMessage("");
  };

  const handlePasswordResetRequest = async (event) => {
    event.preventDefault();

    const email = resetRequestForm.email.trim();

    if (!isValidEmail(email)) {
      setResetMessage("Ingresá un correo electrónico válido.");
      return;
    }

    setResetLoading(true);
    setResetMessage("");

    try {
      const data = await requestPasswordReset({ email });

      setResetMessage(
        data.message || "Si existe una cuenta asociada a ese correo electrónico, se envió un código de recuperación.",
      );
      setResetConfirmForm({
        email,
        code: "",
        newPassword: "",
      });
      setAuthView("forgot-confirm");
    } catch (error) {
      setResetMessage(error.message || "No se pudo solicitar la recuperación.");
    } finally {
      setResetLoading(false);
    }
  };

  const handlePasswordResetConfirm = async (event) => {
    event.preventDefault();

    const email = resetConfirmForm.email.trim();
    const code = resetConfirmForm.code.trim();
    const newPassword = resetConfirmForm.newPassword;

    if (!isValidEmail(email)) {
      setResetMessage("Ingresá un correo electrónico válido.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setResetMessage("El código debe tener exactamente 6 dígitos.");
      return;
    }

    if (newPassword.length < 6) {
      setResetMessage("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setResetLoading(true);
    setResetMessage("");

    try {
      const data = await confirmPasswordReset({
        email,
        code,
        newPassword,
      });

      setAuthView("login");
      setLoginMessage(data.message || "La contraseña fue actualizada correctamente.");
      setLoginForm((current) => ({
        ...current,
        dni: "",
        password: "",
      }));
      setResetRequestForm(initialResetRequestForm);
      setResetConfirmForm(initialResetConfirmForm);
    } catch (error) {
      setResetMessage(error.message || "No se pudo actualizar la contraseña.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();

    const dni = signupForm.dni.trim();
    const email = signupForm.email.trim();
    const nombreApellido = signupForm.nombreApellido.trim();
    const password = signupForm.password;

    if (!/^\d{7,10}$/.test(dni)) {
      setSignupMessage("El DNI debe tener entre 7 y 10 digitos.");
      return;
    }

    if (!isValidEmail(email)) {
      setSignupMessage("Ingresa un email valido.");
      return;
    }

    if (!nombreApellido) {
      setSignupMessage("El nombre y apellido es obligatorio.");
      return;
    }

    if (password.length < 6) {
      setSignupMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSignupLoading(true);
    setSignupMessage("");

    try {
      await createUsuario(
        {
          dni,
          email,
          nombreApellido,
          password,
        },
        "",
        undefined,
      );

      setAuthView("login");
      setLoginForm({
        dni,
        password: "",
      });
      setSignupForm(initialSignupForm);
      setLoginMessage("La cuenta fue creada correctamente. Ya podes iniciar sesion.");
    } catch (error) {
      const message = error.message || "No se pudo crear la cuenta.";

      if (/401|403|autoriz|permiso|token/i.test(message)) {
        setSignupMessage(
          "El backend no permite registro publico todavia. Hay que habilitar un endpoint de alta sin login.",
        );
        return;
      }

      setSignupMessage(message);
    } finally {
      setSignupLoading(false);
    }
  };

  const handleFichada = async () => {
    if (!user) {
      setPunchMessage("Primero inicia sesion con tu DNI y password.");
      return;
    }

    setPunchLoading(true);
    setPunchMessage("");

    try {
      const position = await getCurrentPosition();
      const data = await submitFichada({
        dni: user.dni,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      const actionMoment = getPunchMoment(data);
      const actionLabel = getActionLabel(data.action);
      const storedPunches = appendStoredDailyPunch(user.id, {
        action: data.action,
        at: actionMoment,
        serviceName: data.servicio?.nombre || "",
      });

      setDailyPunches(storedPunches);
      setPunchMessage(`${actionLabel} registrada a las ${formatClock(actionMoment)}.`);
    } catch (error) {
      const message = error.message || "No se pudo registrar la fichada.";

      if (/registro previo|required|no existe/i.test(message)) {
        setPunchMessage("Tu usuario no esta registrado para fichar. Primero tenes que crear la cuenta.");
        return;
      }

      setPunchMessage(message);
    } finally {
      setPunchLoading(false);
    }
  };

  const handleExcelDownload = async (event) => {
    event.preventDefault();

    setExcelLoading(true);
    setExcelMessage("");

    try {
      await downloadExcel(
        {
          date: excelMode === "day" ? excelFilters.date || undefined : undefined,
          month:
            excelMode === "month" ? excelFilters.month || currentMonthValue : undefined,
          employeeId: excelFilters.employeeId || undefined,
          serviceId: excelFilters.serviceId || undefined,
          lateOnly: excelFilters.lateOnly ? "true" : undefined,
        },
        token,
        handleUnauthorized,
      );

      setExcelMessage("El archivo Excel se descargo correctamente.");
    } catch (error) {
      setExcelMessage(error.message || "No se pudo descargar el Excel.");
    } finally {
      setExcelLoading(false);
    }
  };

  const handleServiceSubmit = async (event) => {
    event.preventDefault();
    const validationMessage = validateServiceForm(serviceForm);

    if (validationMessage) {
      setServicesMessage(validationMessage);
      return;
    }

    setServiceSaving(true);
    setServicesMessage("");

    try {
      const payload = mapServicePayload(serviceForm);

      if (serviceEditingId) {
        await updateServicio(serviceEditingId, payload, token, handleUnauthorized);
        setServicesMessage("Servicio actualizado correctamente.");
      } else {
        await createServicio(payload, token, handleUnauthorized);
        setServicesMessage("Servicio creado correctamente.");
      }

      resetServiceForm();
      await loadServices(includeInactiveServices);
    } catch (error) {
      setServicesMessage(error.message || "No se pudo guardar el servicio.");
    } finally {
      setServiceSaving(false);
    }
  };

  const handleServiceDelete = async (service) => {
    if (!window.confirm(`Vas a eliminar el servicio "${service.nombre}". Esta accion no se puede deshacer.`)) {
      return;
    }

    setServiceDeletingId(service.id);
    setServicesMessage("");

    try {
      await deleteServicio(service.id, token, handleUnauthorized);

      if (serviceEditingId === service.id) {
        resetServiceForm();
      }

      setServicesMessage("Servicio eliminado correctamente.");
      await loadServices(includeInactiveServices);
    } catch (error) {
      setServicesMessage(error.message || "No se pudo eliminar el servicio.");
    } finally {
      setServiceDeletingId(null);
    }
  };

  const handleServiceToggleActive = async (service) => {
    const nextActive = !service.activo;
    const actionLabel = nextActive ? "activar" : "desactivar";

    if (!window.confirm(`Vas a ${actionLabel} el servicio "${service.nombre}".`)) {
      return;
    }

    setServiceTogglingId(service.id);
    setServicesMessage("");

    try {
      await (nextActive
        ? activateServicio(service.id, token, handleUnauthorized)
        : deactivateServicio(service.id, token, handleUnauthorized));

      if (serviceEditingId === service.id) {
        setServiceForm((current) => ({
          ...current,
          activo: nextActive,
        }));
      }

      setServicesMessage(
        nextActive ? "Servicio activado correctamente." : "Servicio desactivado correctamente.",
      );
      await loadServices(includeInactiveServices);
    } catch (error) {
      setServicesMessage(error.message || `No se pudo ${actionLabel} el servicio.`);
    } finally {
      setServiceTogglingId(null);
    }
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    setUserSaving(true);
    setUsersMessage("");

    try {
      if (!userEditingId && !userForm.password.trim()) {
        throw new Error("La password es obligatoria para crear un usuario.");
      }

      const payload = {
        ...(userEditingId ? {} : { dni: userForm.dni.trim() }),
        nombreApellido: userForm.nombreApellido.trim(),
        role: userForm.role,
        activo: Boolean(userForm.activo),
        ...(userForm.password.trim() ? { password: userForm.password } : {}),
      };

      if (userEditingId) {
        await updateUsuario(userEditingId, payload, token, handleUnauthorized);
        setUsersMessage("Usuario actualizado correctamente.");
      } else {
        await createUsuario(payload, token, handleUnauthorized);
        setUsersMessage("Usuario creado correctamente.");
      }

      resetUserForm();
      await loadUsers();
    } catch (error) {
      setUsersMessage(error.message || "No se pudo guardar el usuario.");
    } finally {
      setUserSaving(false);
    }
  };

  const employeeOptions = users.filter((current) => current.activo);

  return (
    <main className="app-shell">
      <button
        type="button"
        className="corner-button"
        onClick={() => {
          if (user && hasDashboardAccess(user.role)) {
            setDashboardVisible((current) => !current);
            return;
          }

          setShowAccessModal(true);
        }}
      >
        {user && hasDashboardAccess(user.role)
          ? dashboardVisible
            ? "Cerrar tablero"
            : "Abrir tablero"
          : "Acceso tablero"}
      </button>

      <section className="hero-card hero-card--main">
        <div className="card__header">
          <p className="eyebrow">{authLoading ? "Conectando" : "Registro de asistencia"}</p>
          <h1>{user ? "Mi jornada de hoy" : "Fichar entrada"}</h1>
          <p className="card__description">
            {user
              ? `${user.nombreApellido} · ${user.role}. Tu sesión queda guardada en este navegador.`
              : "Iniciá sesión con tu DNI y contraseña para poder fichar. Si no tenés cuenta, primero registrate. El acceso al tablero queda en la esquina superior."}
          </p>
        </div>

        {authLoading ? (
          <p className="message">Recuperando sesión guardada...</p>
        ) : !user ? (
          <>
            {authView === "login" && (
              <form className="form" onSubmit={handlePrimaryLogin}>
                <label className="field">
                  <span>DNI</span>
                  <input
                    type="text"
                    name="dni"
                    placeholder="12345678"
                    value={loginForm.dni}
                    onChange={handleLoginChange}
                    disabled={loginLoading}
                  />
                </label>

                <label className="field">
                  <span>Contraseña</span>
                  <div className="password-field">
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      name="password"
                      placeholder="Tu contraseña"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      disabled={loginLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowLoginPassword((current) => !current)}
                      aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <div className="actions actions--stacked">
                  <button type="submit" className="button button--primary-large" disabled={loginLoading}>
                    {loginLoading ? "Iniciando sesión..." : "Iniciar sesión para fichar"}
                  </button>
                  <div className="actions actions--subtle">
                    <button
                      type="button"
                      className="button button--ghost button--secondary"
                      onClick={openForgotPassword}
                    >
                      Olvidé mi contraseña
                    </button>
                    <button
                      type="button"
                      className="button button--ghost button--secondary"
                      onClick={openSignup}
                    >
                      Crear cuenta
                    </button>
                  </div>
                </div>
              </form>
            )}

            {authView === "signup" && (
              <form className="form" onSubmit={handleSignup}>
                <label className="field">
                  <span>DNI</span>
                  <input
                    type="text"
                    name="dni"
                    placeholder="12345678"
                    value={signupForm.dni}
                    onChange={handleSignupChange}
                    disabled={signupLoading}
                  />
                </label>

                <label className="field">
                  <span>Correo electrónico</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="usuario@mail.com"
                    value={signupForm.email}
                    onChange={handleSignupChange}
                    disabled={signupLoading}
                  />
                </label>

                <label className="field">
                  <span>Nombre y apellido</span>
                  <input
                    type="text"
                    name="nombreApellido"
                    placeholder="Juan Perez"
                    value={signupForm.nombreApellido}
                    onChange={handleSignupChange}
                    disabled={signupLoading}
                  />
                </label>

                <label className="field">
                  <span>Contraseña</span>
                  <div className="password-field">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      name="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupForm.password}
                      onChange={handleSignupChange}
                      disabled={signupLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowSignupPassword((current) => !current)}
                      aria-label={showSignupPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <div className="actions">
                  <button type="submit" disabled={signupLoading}>
                    {signupLoading ? "Creando..." : "Crear cuenta"}
                  </button>
                  <button type="button" className="button button--ghost" onClick={backToLogin}>
                    Volver al login
                  </button>
                </div>
              </form>
            )}

            {authView === "forgot-request" && (
              <form className="form" onSubmit={handlePasswordResetRequest}>
                <p className="card__description">
                  Ingresá tu correo electrónico y, si existe una cuenta asociada, te enviaremos un código de recuperación.
                </p>

                <label className="field">
                  <span>Correo electrónico</span>
                  <input
                    type="email"
                    name="email"
                    placeholder="usuario@mail.com"
                    value={resetRequestForm.email}
                    onChange={handleResetRequestChange}
                    disabled={resetLoading}
                  />
                </label>

                <div className="actions">
                  <button type="submit" disabled={resetLoading}>
                    {resetLoading ? "Enviando..." : "Solicitar código"}
                  </button>
                  <button type="button" className="button button--ghost" onClick={backToLogin}>
                    Volver al login
                  </button>
                </div>
              </form>
            )}

            {authView === "forgot-confirm" && (
              <form className="form" onSubmit={handlePasswordResetConfirm}>
                <p className="card__description">
                  Revisá tu correo, copiá el código de 6 dígitos e ingresá una nueva contraseña.
                </p>

                <label className="field">
                  <span>Correo electrónico</span>
                  <input
                    type="email"
                    name="email"
                    value={resetConfirmForm.email}
                    onChange={handleResetConfirmChange}
                    disabled={resetLoading}
                  />
                </label>

                <label className="field">
                  <span>Código</span>
                  <input
                    type="text"
                    name="code"
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="123456"
                    value={resetConfirmForm.code}
                    onChange={handleResetConfirmChange}
                    disabled={resetLoading}
                  />
                </label>

                <label className="field">
                  <span>Nueva contraseña</span>
                  <div className="password-field">
                    <input
                      type={showResetPassword ? "text" : "password"}
                      name="newPassword"
                      placeholder="Mínimo 6 caracteres"
                      value={resetConfirmForm.newPassword}
                      onChange={handleResetConfirmChange}
                      disabled={resetLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowResetPassword((current) => !current)}
                      aria-label={showResetPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <div className="actions">
                  <button type="submit" disabled={resetLoading}>
                    {resetLoading ? "Actualizando..." : "Confirmar nueva contraseña"}
                  </button>
                  <button type="button" className="button button--ghost" onClick={backToLogin}>
                    Volver al login
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="stack">
            <div className="summary-grid">
              <article className="summary-card">
                <span className="summary-card__label">Primera marca</span>
                <strong>{formatClock(dailyPunches[0]?.at)}</strong>
              </article>

              <article className="summary-card">
                <span className="summary-card__label">Última marca</span>
                <strong>{formatClock(dailyPunches[dailyPunches.length - 1]?.at)}</strong>
              </article>

              <article className="summary-card">
                <span className="summary-card__label">Registros de hoy</span>
                <strong>{dailyPunches.length}</strong>
              </article>
            </div>

            <div className="actions actions--centered">
              <button
                type="button"
                className="button button--primary-large button--fichar"
                onClick={handleFichada}
                disabled={punchLoading}
              >
                {punchLoading ? "Procesando..." : "Fichar ahora"}
              </button>
            </div>

            <div className="timeline-card">
              <div className="timeline-card__header">
                <h2>Fichadas del dia</h2>
                <button type="button" className="button button--ghost" onClick={() => performLogout()}>
                  Cerrar sesión
                </button>
              </div>

              {dailyPunches.length === 0 ? (
                <p className="card__description">
                  Aún no hay fichadas registradas hoy en este dispositivo para esta sesión.
                </p>
              ) : (
                <div className="timeline">
                  {dailyPunches.map((punch, index) => (
                    <article key={`${punch.action}-${punch.at}-${index}`} className="timeline__item">
                      <span className="timeline__badge">
                        {getActionLabel(punch.action)}
                      </span>
                      <strong>{formatClock(punch.at)}</strong>
                      <span>{punch.serviceName || "Servicio no informado"}</span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(loginMessage || punchMessage || resetMessage || signupMessage) && (
          <p className="message">{punchMessage || resetMessage || signupMessage || loginMessage}</p>
        )}
      </section>

      {showAccessModal && (
        <div className="modal-backdrop" onClick={() => setShowAccessModal(false)} role="presentation">
          <section className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="card__header">
              <p className="eyebrow">Tablero</p>
              <h2>Iniciar sesión</h2>
              <p className="card__description">
                Usa un usuario con permisos para abrir reportes, servicios o usuarios.
              </p>
            </div>

            <form className="form" onSubmit={handleDashboardLogin}>
              <label className="field">
                <span>DNI</span>
                <input
                  type="text"
                  name="dni"
                  value={loginForm.dni}
                  onChange={handleLoginChange}
                  disabled={loginLoading}
                />
              </label>

              <label className="field">
                <span>Contraseña</span>
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  disabled={loginLoading}
                />
              </label>

              <div className="actions">
                <button type="submit" disabled={loginLoading}>
                  {loginLoading ? "Iniciando sesión..." : "Abrir tablero"}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setShowAccessModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {dashboardVisible && user && hasDashboardAccess(user.role) && (
        <section className="dashboard-shell">
          <section className="topbar">
            <div>
              <p className="eyebrow">Tablero</p>
              <h2>Herramientas de gestion</h2>
              <p className="card__description">
                {user.nombreApellido} · {user.role}
              </p>
            </div>
          </section>

          <nav className="tabs" aria-label="Secciones del tablero">
            {dashboardTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab ${dashboardTab === tab.id ? "tab--active" : ""}`}
                onClick={() => setDashboardTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {dashboardTab === "excel" && canDownloadExcel(user.role) && (
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Reportes</p>
                  <h2>Descarga de Excel</h2>
                </div>
              </div>

              <form className="stack" onSubmit={handleExcelDownload}>
                <div className="segmented-control" role="tablist" aria-label="Modo de reporte">
                  <button
                    type="button"
                    className={`segment ${excelMode === "day" ? "segment--active" : ""}`}
                    onClick={() => handleExcelModeChange("day")}
                  >
                    Por día
                  </button>
                  <button
                    type="button"
                    className={`segment ${excelMode === "month" ? "segment--active" : ""}`}
                    onClick={() => handleExcelModeChange("month")}
                  >
                    Por mes
                  </button>
                </div>

                <div className="form-grid">
                  {excelMode === "day" ? (
                    <label className="field">
                      <span>Día</span>
                      <input
                        type="date"
                        name="date"
                        value={excelFilters.date}
                        onChange={handleExcelChange}
                      />
                    </label>
                  ) : (
                    <div className="field">
                      <span>Mes</span>
                      <div className="month-carousel">
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() =>
                            setExcelFilters((current) => ({
                              ...current,
                              month: shiftMonth(current.month || currentMonthValue, -1),
                            }))
                          }
                        >
                          Anterior
                        </button>
                        <div className="month-carousel__value">
                          <strong>{formatMonthLabel(excelFilters.month || currentMonthValue)}</strong>
                          <span>{excelFilters.month || currentMonthValue}</span>
                        </div>
                        <button
                          type="button"
                          className="button button--ghost button--small"
                          onClick={() =>
                            setExcelFilters((current) => ({
                              ...current,
                              month: shiftMonth(current.month || currentMonthValue, 1),
                            }))
                          }
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}

                  {isAdmin(user.role) && employeeOptions.length > 0 ? (
                    <label className="field">
                      <span>Empleado</span>
                      <select
                        name="employeeId"
                        value={excelFilters.employeeId}
                        onChange={handleExcelChange}
                      >
                        <option value="">Todos</option>
                        {employeeOptions.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.nombreApellido} ({employee.dni})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="field">
                      <span>Empleado (ID interno, no DNI)</span>
                      <input
                        type="number"
                        name="employeeId"
                        placeholder="Opcional"
                        value={excelFilters.employeeId}
                        onChange={handleExcelChange}
                      />
                    </label>
                  )}

                  <label className="field">
                    <span>Servicio</span>
                    <select name="serviceId" value={excelFilters.serviceId} onChange={handleExcelChange}>
                      <option value="">Todos</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="lateOnly"
                    checked={excelFilters.lateOnly}
                    onChange={handleExcelChange}
                  />
                    <span>Solo llegadas tarde</span>
                </label>

                <div className="actions">
                  <button type="submit" disabled={excelLoading}>
                    {excelLoading ? "Descargando..." : "Descargar Excel"}
                  </button>
                </div>
              </form>

              {excelMessage && <p className="message">{excelMessage}</p>}
            </section>
          )}

          {dashboardTab === "servicios" && isAdmin(user.role) && (
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Servicios</p>
                  <h2>Gestión de servicios</h2>
                </div>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={includeInactiveServices}
                    onChange={(event) => setIncludeInactiveServices(event.target.checked)}
                  />
                  <span>Incluir inactivos</span>
                </label>
              </div>

              <form className="stack" noValidate onSubmit={handleServiceSubmit}>
                <div className="form-grid form-grid--triple">
                  <label className="field">
                    <span>Nombre</span>
                    <input name="nombre" value={serviceForm.nombre} onChange={handleServiceChange} />
                  </label>

                  <label className="field">
                    <span>Lat</span>
                    <input name="lat" value={serviceForm.lat} onChange={handleServiceChange} />
                  </label>

                  <label className="field">
                    <span>Lon</span>
                    <input name="lon" value={serviceForm.lon} onChange={handleServiceChange} />
                  </label>

                  <label className="field">
                    <span>Radio metros</span>
                    <input
                      name="radioMetros"
                      type="number"
                      value={serviceForm.radioMetros}
                      onChange={handleServiceChange}
                    />
                  </label>

                  <label className="field">
                  <span>Hora límite de entrada</span>
                    <input
                      name="horaEntradaLimite"
                      type="time"
                      value={serviceForm.horaEntradaLimite}
                      onChange={handleServiceChange}
                    />
                  </label>

                  <label className="checkbox checkbox--field">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={serviceForm.activo}
                      onChange={handleServiceChange}
                    />
                    <span>Activo</span>
                  </label>
                </div>

                <div className="actions">
                  <button type="submit" disabled={serviceSaving}>
                    {serviceSaving
                      ? "Guardando..."
                      : serviceEditingId
                      ? "Actualizar servicio"
                        : "Crear servicio"}
                  </button>

                  {serviceEditingId && (
                    <button type="button" className="button button--ghost" onClick={resetServiceForm}>
                      Cancelar edición
                    </button>
                  )}
                </div>
              </form>

              {servicesMessage && <p className="message">{servicesMessage}</p>}

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Coordenadas</th>
                      <th>Radio</th>
                      <th>Hora limite</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesLoading ? (
                      <tr>
                        <td colSpan="6">Cargando servicios...</td>
                      </tr>
                    ) : services.length === 0 ? (
                      <tr>
                        <td colSpan="6">No hay servicios cargados.</td>
                      </tr>
                    ) : (
                      services.map((service) => (
                        <tr key={service.id}>
                          <td>{service.nombre}</td>
                          <td>
                            {service.lat}, {service.lon}
                          </td>
                          <td>{service.radioMetros ?? "-"}</td>
                          <td>{service.horaEntradaLimite || "-"}</td>
                          <td>{service.activo ? "Activo" : "Inactivo"}</td>
                          <td className="table__actions">
                            <button
                              type="button"
                              className="button button--small"
                              onClick={() => startEditService(service)}
                              disabled={
                                serviceDeletingId === service.id || serviceTogglingId === service.id
                              }
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="button button--ghost button--small"
                              onClick={() => handleServiceToggleActive(service)}
                              disabled={
                                serviceDeletingId === service.id || serviceTogglingId === service.id
                              }
                            >
                              {serviceTogglingId === service.id
                                ? service.activo
                                  ? "Desactivando..."
                                  : "Activando..."
                                : service.activo
                                  ? "Desactivar"
                                  : "Activar"}
                            </button>
                            <button
                              type="button"
                              className="button button--danger button--small"
                              onClick={() => handleServiceDelete(service)}
                              disabled={
                                serviceDeletingId === service.id || serviceTogglingId === service.id
                              }
                            >
                              {serviceDeletingId === service.id ? "Eliminando..." : "Eliminar"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {dashboardTab === "usuarios" && isAdmin(user.role) && (
            <section className="panel">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Usuarios</p>
                  <h2>Gestión de usuarios</h2>
                </div>
              </div>

              <form className="stack" onSubmit={handleUserSubmit}>
                <div className="form-grid form-grid--triple">
                  <label className="field">
                    <span>DNI</span>
                    <input
                      name="dni"
                      value={userForm.dni}
                      onChange={handleUserChange}
                      disabled={Boolean(userEditingId)}
                    />
                  </label>

                  <label className="field">
                    <span>Nombre y apellido</span>
                    <input name="nombreApellido" value={userForm.nombreApellido} onChange={handleUserChange} />
                  </label>

                  <label className="field">
                    <span>Contraseña</span>
                    <input
                      type="password"
                      name="password"
                      value={userForm.password}
                      onChange={handleUserChange}
                      placeholder={userEditingId ? "Dejar vacío para no cambiarla" : "Mínimo 6 caracteres"}
                    />
                  </label>

                  <label className="field">
                    <span>Rol</span>
                    <select name="role" value={userForm.role} onChange={handleUserChange}>
                      {Object.values(ROLES).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="checkbox checkbox--field">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={userForm.activo}
                      onChange={handleUserChange}
                    />
                    <span>Activo</span>
                  </label>
                </div>

                <div className="actions">
                  <button type="submit" disabled={userSaving}>
                    {userSaving ? "Guardando..." : userEditingId ? "Actualizar usuario" : "Crear usuario"}
                  </button>

                  {userEditingId && (
                    <button type="button" className="button button--ghost" onClick={resetUserForm}>
                      Cancelar edición
                    </button>
                  )}
                </div>
              </form>

              {usersMessage && <p className="message">{usersMessage}</p>}

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>DNI</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Contraseña</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td colSpan="6">Cargando usuarios...</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="6">No hay usuarios cargados.</td>
                      </tr>
                    ) : (
                      users.map((current) => (
                        <tr key={current.id}>
                          <td>{current.dni}</td>
                          <td>{current.nombreApellido}</td>
                          <td>{current.role}</td>
                          <td>{current.activo ? "Activo" : "Inactivo"}</td>
                          <td>{current.hasPassword ? "Configurada" : "Sin contraseña"}</td>
                          <td className="table__actions">
                            <button
                              type="button"
                              className="button button--small"
                              onClick={() => startEditUser(current)}
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
