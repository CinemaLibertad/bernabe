import type { CaseId, StudioId, UserId } from "../shared/ids";

export type VerificationStatus = "observed" | "reported" | "document_verified";
export const COURT_AVAILABILITY_STATES = ["en_letra", "no_en_letra", "a_despacho", "a_la_firma", "en_canasta", "en_secretaria", "en_prestamo", "archivado", "desarchivado", "sin_novedades", "no_encontrado", "otro"] as const;
export type CourtObservationAvailability = (typeof COURT_AVAILABILITY_STATES)[number];
export type CourtConsultationUpdate = { id: string; type: string; reference: string; description: string };
export type CourtRound = {
  id: string; studioId: StudioId; occurredOn: string; notes: string; operationId: string;
  createdAt: string; updatedAt: string; createdBy: UserId; updatedBy: UserId;
};
export type CourtVisit = {
  id: string; studioId: StudioId; roundId: string; organizationId: string;
  organizationNameSnapshot: string; jurisdictionSnapshot: string; sourceUrl: string;
  visitedAt: string; notes: string; operationId: string;
  createdAt: string; updatedAt: string; createdBy: UserId; updatedBy: UserId;
};
export type CourtConsultation = {
  id: string; studioId: StudioId; roundId: string; visitId: string; caseId: CaseId;
  caseCaptionSnapshot: string; caseNumberSnapshot: string; organizationId: string;
  organizationNameSnapshot: string; availability: CourtObservationAvailability;
  availabilityNote: string; novelty: string; updates: CourtConsultationUpdate[]; observations: string; occurredAt: string;
  source: "manual_web" | "mobile" | "official_source"; verification: VerificationStatus;
  documentReferences: string[]; operationId: string;
  createdAt: string; updatedAt: string; createdBy: UserId; updatedBy: UserId;
};
export type CourtActuation = {
  id: string; studioId: StudioId; caseId: CaseId; caseCaptionSnapshot: string;
  caseNumberSnapshot: string; consultationId: string | null; visitId: string | null;
  organizationId: string; organizationNameSnapshot: string; type: string; title: string;
  description: string; occurredAt: string; source: "manual_web" | "mobile" | "official_source";
  verification: VerificationStatus; documentReferences: string[]; activityIds: string[];
  consultationUpdateId?: string | null;
  operationId: string; createdAt: string; updatedAt: string; createdBy: UserId; updatedBy: UserId;
};
export type CourtAudit = { action: "created" | "updated"; actor: UserId; at: string; changedFields?: string[]; previousValues?: Record<string, unknown>; nextValues?: Record<string, unknown>; reason?: string };
