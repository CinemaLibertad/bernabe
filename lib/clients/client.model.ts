import type { ClientId, StudioId, UserId } from "../shared/ids";
export type ClientStatus = "activo" | "inactivo" | "archivado";
export type ClientKind = "persona" | "organizacion";

export type Client = {
  id: ClientId;
  studioId: StudioId;
  kind: ClientKind;
  displayName: string;
  legalName: string;
  identifier: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: UserId;
  updatedBy: UserId;
  archivedAt: string | null;
};

export type ClientInput = Omit<Client, "id" | "studioId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy" | "archivedAt">;
