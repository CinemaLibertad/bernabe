import type { CaseId, ClientId, StudioId, UserId } from "../shared/ids";
export type CaseStatus = "activo" | "suspendido" | "finalizado" | "archivado";

export type LegalCase = {
  id: CaseId;
  studioId: StudioId;
  number: string;
  caption: string;
  clientIds: ClientId[];
  jurisdiction: string;
  branch: string;
  court: string;
  caseType: string;
  status: CaseStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: UserId;
  updatedBy: UserId;
  archivedAt: string | null;
};

export type LegalCaseInput = Omit<LegalCase, "id" | "studioId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "archivedAt">;
