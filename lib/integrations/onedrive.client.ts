import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(getApp(), "southamerica-east1");

export async function startOneDriveOAuth() {
  const call = httpsCallable<void, { authorizationUrl: string }>(functions, "startOneDriveOAuth");
  return (await call()).data;
}

export async function completeOneDriveOAuth(code: string, state: string) {
  const call = httpsCallable<{ code: string; state: string }, { connected: boolean; accountLabel: string | null }>(functions, "completeOneDriveOAuth");
  return (await call({ code, state })).data;
}

export async function getOneDriveStatus() {
  const call = httpsCallable<void, { connected: boolean; accountLabel?: string | null; connectedAt?: string | null }>(functions, "getOneDriveStatus");
  return (await call()).data;
}

export async function disconnectOneDrive() {
  const call = httpsCallable<void, { connected: false }>(functions, "disconnectOneDrive");
  return (await call()).data;
}

export async function uploadOneDriveFile(file: File) {
  const call = httpsCallable<{ name: string; size: number }, { uploadUrl: string }>(functions, "createOneDriveUploadSession");
  const { uploadUrl } = (await call({ name: file.name, size: file.size })).data;
  const response = await fetch(uploadUrl, { method: "PUT", body: file });
  if (!response.ok) throw new Error("No se pudo guardar el archivo en OneDrive.");
  return await response.json() as { id: string; name: string; webUrl?: string };
}
