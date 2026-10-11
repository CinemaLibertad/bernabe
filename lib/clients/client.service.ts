import type { ClientInput } from "./client.model";

export function validateClient(input: ClientInput): string | null {
  if (!input.displayName.trim()) return "Ingresá el nombre de la persona u organización.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "El correo electrónico no tiene un formato válido.";
  return null;
}

export function assertClientMayBeArchived(activeCaseCount: number): void {
  if (activeCaseCount > 0) throw new Error("No se puede archivar el cliente mientras tenga expedientes activos.");
}
