"use client";

import { useEffect, useRef, useState } from "react";
import { completeOneDriveOAuth, disconnectOneDrive, getOneDriveStatus, startOneDriveOAuth } from "@/lib/integrations/onedrive.client";

type Connection = { connected: boolean; accountLabel?: string | null; connectedAt?: string | null };

export default function OneDriveStorageCard() {
  const [connection, setConnection] = useState<Connection>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const handledCallback = useRef(false);

  useEffect(() => {
    let active = true;
    getOneDriveStatus()
      .then((result) => { if (active) setConnection(result); })
      .catch(() => { if (active) setMessage("No se pudo consultar el estado de OneDrive."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (handledCallback.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("onedrive_code");
    const state = params.get("onedrive_state");
    if (params.has("onedrive_error")) {
      window.history.replaceState({}, "", "/panel/configuracion");
      setMessage("Microsoft canceló o no pudo completar la autorización de OneDrive.");
      return;
    }
    if (!code || !state) return;

    handledCallback.current = true;
    window.history.replaceState({}, "", "/panel/configuracion");
    setBusy(true);
    setMessage("Finalizando conexión segura…");
    completeOneDriveOAuth(code, state)
      .then(async () => {
        setConnection(await getOneDriveStatus());
        setMessage("OneDrive quedó conectado. Los archivos se guardarán en la carpeta privada de esta aplicación.");
      })
      .catch(() => setMessage("No se pudo finalizar la conexión. Revisá el permiso de OneDrive e intentá conectarlo nuevamente."))
      .finally(() => setBusy(false));
  }, []);

  async function connect() {
    setBusy(true);
    setMessage("");
    try {
      const { authorizationUrl } = await startOneDriveOAuth();
      window.location.assign(authorizationUrl);
    } catch {
      setBusy(false);
      setMessage("No se pudo iniciar la conexión con Microsoft.");
    }
  }

  async function disconnect() {
    setBusy(true);
    setMessage("");
    try {
      await disconnectOneDrive();
      setConnection({ connected: false });
      setMessage("Se quitó la conexión de este sistema. El consentimiento también puede revocarse desde la cuenta Microsoft.");
    } catch {
      setMessage("No se pudo quitar la conexión. Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="data-card" aria-labelledby="onedrive-title">
    <div className="settings-integration-heading">
      <div>
        <span className="agenda-eyebrow">ALMACENAMIENTO E INTEGRACIONES</span>
        <h2 id="onedrive-title">Microsoft OneDrive</h2>
        <p>Conectá tu cuenta Microsoft para guardar documentos y escaneos en OneDrive.</p>
      </div>
      <span className={`settings-connection-status ${connection.connected ? "is-connected" : ""}`}>
        {loading ? "Consultando conexión…" : connection.connected ? "Conectado" : "Sin conectar"}
      </span>
    </div>

    <div className="settings-integration-details">
      <div>
        <strong>Acceso limitado</strong>
        <p>La aplicación podrá administrar los archivos del estudio que guardes desde aquí.</p>
      </div>
      <div>
        <strong>Cuenta conectada</strong>
        <p>{connection.connected ? connection.accountLabel || "Cuenta Microsoft autorizada" : "Todavía no hay una cuenta vinculada."}</p>
      </div>
    </div>

    <div className="settings-integration-actions">
      {connection.connected ? <button type="button" className="button-secondary" onClick={disconnect} disabled={busy}>
        {busy ? "Procesando…" : "Quitar conexión"}
      </button> : <button type="button" className="button-primary" onClick={connect} disabled={busy || loading}>
        {busy ? "Conectando…" : "Conectar OneDrive"}
      </button>}
      {message && <p role="status" aria-live="polite">{message}</p>}
    </div>
    <p className="settings-integration-note">Podés quitar la conexión cuando quieras desde esta sección.</p>
  </section>;
}
