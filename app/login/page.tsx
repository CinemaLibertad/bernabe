"use client";

import Image from "next/image";
import { signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { createGoogleProvider, getClientAuth } from "../../lib/firebase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const login = async () => {
    setError("");
    try { await signInWithPopup(getClientAuth(), createGoogleProvider()); window.location.assign("/panel"); }
    catch { setError("No se pudo completar el acceso. Verificá la cuenta autorizada."); }
  };

  return <main className="login-page"><div className="login-card"><Image src="/images/brand/logo.png" alt="Bernabé Nieto" width={92} height={92} priority /><p className="eyebrow dark">ACCESO RESTRINGIDO</p><h1>Centro de operaciones</h1><p>Ingresá con la cuenta institucional autorizada para acceder al panel privado del estudio.</p><button className="google-button" onClick={login}><span>G</span> Continuar con Google</button>{error && <p className="login-error">{error}</p>}<a href="/">Volver al sitio público</a></div></main>;
}
