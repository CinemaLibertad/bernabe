import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(getApp(), "southamerica-east1");

export async function startGoogleDriveOAuth() {
  const call = httpsCallable<void, { authorizationUrl: string }>(functions, "startGoogleDriveOAuth");
  return (await call()).data;
}

export async function completeGoogleDriveOAuth(code: string, state: string) {
  const call = httpsCallable<{ code: string; state: string }, { connected: boolean; accountLabel: string | null }>(functions, "completeGoogleDriveOAuth");
  return (await call({ code, state })).data;
}

export async function getGoogleDriveStatus() {
  const call = httpsCallable<void, { connected: boolean; accountLabel?: string | null; connectedAt?: string | null }>(functions, "getGoogleDriveStatus");
  return (await call()).data;
}

export async function disconnectGoogleDrive() {
  const call = httpsCallable<void, { connected: false }>(functions, "disconnectGoogleDrive");
  return (await call()).data;
}

export async function createGoogleDriveUploadSession(file: File) {
  const call = httpsCallable<{ name: string; mimeType: string; size: number }, { uploadUrl: string }>(functions, "createGoogleDriveUploadSession");
  const { uploadUrl } = (await call({ name: file.name, mimeType: file.type || "application/octet-stream", size: file.size })).data;
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!response.ok) throw new Error("No se pudo guardar el archivo en Google Drive.");
  return await response.json() as { id: string; name: string; mimeType: string; size: string; webViewLink?: string };
}
