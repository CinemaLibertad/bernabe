import type { ActivityInput } from "./activity.model";

export function validateActivity(input: ActivityInput): string | null {
  if (!input.title.trim()) return "Ingresá un título para la actividad.";
  if (!Number.isFinite(Date.parse(input.startAt))) return "Ingresá una fecha de inicio válida.";
  if (input.endAt && (!Number.isFinite(Date.parse(input.endAt)) || Date.parse(input.endAt) < Date.parse(input.startAt))) return "La finalización no puede ser anterior al inicio.";
  if (!input.timeZone.trim()) return "No se pudo determinar la zona horaria.";
  if (new Set(input.caseIds).size !== input.caseIds.length || new Set(input.clientIds).size !== input.clientIds.length) return "Hay relaciones duplicadas en la actividad.";
  if (input.type === "vencimiento" && input.dateVerification === "no_aplica") return "Un vencimiento debe quedar pendiente o marcado como verificado por el profesional.";
  if (input.recurrence && (!Number.isInteger(input.recurrence.interval) || input.recurrence.interval < 1)) return "El intervalo de repetición debe ser mayor que cero.";
  return null;
}
