"use client";

import { useEffect, useRef, useState } from "react";
import { completeGoogleDriveOAuth, disconnectGoogleDrive, getGoogleDriveStatus, startGoogleDriveOAuth } from "@/lib/integrations/google-drive.client";

type Connection = { connected: boolean; accountLabel?: string | null; connectedAt?: string | null };

export default function GoogleDriveStorageCard() {
  const [connection, setConnection] = useState<Connection>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const handledCallback = useRef(false);

  useEffect(() => {
    let active = true;
    getGoogleDriveStatus()
      .then((result) => { if (active) setConnection(result); })
      .catch(() => { if (active) setMessage("No se pudo consultar el estado de Google Drive."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (handledCallback.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("google_drive_code");
    const state = params.get("google_drive_state");
    if (params.has("google_drive_error")) {
      window.history.replaceState({}, "", "/panel/configuracion");
      setMessage("Google canceló o no pudo completar la autorización de Drive.");
      return;
    }
    if (!code || !state) return;

    handledCallback.current = true;
    window.history.replaceState({}, "", "/panel/configuracion");
    setBusy(true);
    setMessage("Finalizando conexión segura…");
    completeGoogleDriveOAuth(code, state)
      .then(async () => {
        setConnection(await getGoogleDriveStatus());
        setMessage("Google Drive quedó conectado. Se preparó una carpeta propia para los documentos del estudio.");
      })
      .catch(() => setMessage("No se pudo finalizar la conexión. Revisá la configuración OAuth de Google e intentá nuevamente."))
      .finally(() => setBusy(false));
  }, []);

  async function connect() {
    setBusy(true);
    setMessage("");
    try {
      const { authorizationUrl } = await startGoogleDriveOAuth();
      window.location.assign(authorizationUrl);
    } catch {
      setBusy(false);
      setMessage("No se pudo iniciar la conexión con Google Drive.");
    }
  }

  async function disconnect() {
    setBusy(true);
    setMessage("");
    try {
      await disconnectGoogleDrive();
      setConnection({ connected: false });
      setMessage("Se quitó la conexión. Los archivos que ya están en Drive permanecen en tu cuenta.");
    } catch {
      setMessage("No se pudo quitar la conexión. Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="data-card" aria-labelledby="google-drive-title">
    <div className="settings-integration-heading">
      <div>
        <span className="agenda-eyebrow">ALMACENAMIENTO E INTEGRACIONES</span>
        <h2 id="google-drive-title">Google Drive</h2>
        <p>Conectá tu cuenta para guardar documentos y escaneos en Google Drive.</p>
      </div>
      <span className={`settings-connection-status ${connection.connected ? "is-connected" : ""}`}>
        {loading ? "Consultando conexión…" : connection.connected ? "Conectado" : "Sin conectar"}
      </span>
    </div>

    <div className="settings-integration-details">
      <div>
        <strong>Permiso acotado</strong>
        <p>La aplicación podrá administrar los archivos del estudio que guardes desde aquí.</p>
      </div>
      <div>
        <strong>Cuenta conectada</strong>
        <p>{connection.connected ? connection.accountLabel || "Cuenta Google autorizada" : "Todavía no hay una cuenta vinculada."}</p>
      </div>
    </div>

    <div className="settings-integration-actions">
      {connection.connected ? <button type="button" className="button-secondary" onClick={disconnect} disabled={busy}>
        {busy ? "Procesando…" : "Quitar conexión"}
      </button> : <button type="button" className="button-primary" onClick={connect} disabled={busy || loading}>
        {busy ? "Conectando…" : "Conectar Google Drive"}
      </button>}
      {message && <p role="status" aria-live="polite">{message}</p>}
    </div>
    <p className="settings-integration-note">Podés quitar la conexión cuando quieras desde esta sección.</p>
  </section>;
}
