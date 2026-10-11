import type { ClientId } from "../shared/ids";
import type { LegalCaseInput } from "./case.model";

export function validateCase(input: LegalCaseInput): string | null {
  if (!input.caption.trim()) return "Ingresá la carátula o una descripción identificable.";
  if (new Set(input.clientIds).size !== input.clientIds.length) return "Hay clientes duplicados en la relación.";
  if (input.clientIds.some((id) => !id.trim())) return "La relación de cliente contiene un identificador vacío.";
  return null;
}

export function caseClientIds(ids: string[]): ClientId[] {
  return [...new Set(ids)] as ClientId[];
}
