import type { AgendaEntryInput } from "./agenda.types";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function validateAgendaEntry(input: AgendaEntryInput): string | null {
  if (!input.title.trim()) return "Ingresá un título para la actividad.";
  if (!input.startAt || Number.isNaN(new Date(input.startAt).getTime())) return "Ingresá una fecha y hora de inicio válida.";
  if (input.endAt && new Date(input.endAt) < new Date(input.startAt)) return "La finalización no puede ser anterior al inicio.";
  if (!input.timeZone.trim()) return "No se pudo determinar la zona horaria del dispositivo.";
  if (input.recurrence && (!Number.isInteger(input.recurrence.interval) || input.recurrence.interval < 1)) return "El intervalo de repetición debe ser mayor que cero.";
  return null;
}

export function validateAgendaFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Adjuntá PDF, JPG, PNG o WebP.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "Cada archivo debe pesar 20 MB o menos.";
  return null;
}

export function normalizeReferences(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}
