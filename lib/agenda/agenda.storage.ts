import { deleteObject, getBlob, ref, uploadBytes } from "firebase/storage";
import { fileStorage } from "../firebase/services";
import { STUDIO_ID, type AgendaAttachment } from "./agenda.types";

export async function uploadAgendaFile(entryId: string, file: File): Promise<AgendaAttachment> {
  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const path = `studios/${STUDIO_ID}/agenda/${entryId}/${crypto.randomUUID()}-${safeName}`;
  const fileRef = ref(fileStorage, path);
  await uploadBytes(fileRef, file, { contentType: file.type });
  return { name: file.name, path, contentType: file.type, size: file.size };
}

export async function removeAgendaFile(path: string): Promise<void> {
  await deleteObject(ref(fileStorage, path));
}

export async function downloadAgendaFile(path: string, name: string): Promise<void> {
  const blob = await getBlob(ref(fileStorage, path));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
