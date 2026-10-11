import type { CaseId, StudioId, UserId } from "../shared/ids";

export type JurisprudenceSearchType = "jurisprudencia" | "fallo" | "sumario" | "legislacion" | "ley" | "decreto" | "doctrina" | "dictamen" | "todo";

export type LegalSource = "SAIJ" | "CSJN" | "JUBA";

export type JurisprudenceResult = {
  providerId: string | null;
  source: LegalSource | null;
  type: string | null;
  title: string | null;
  caption: string | null;
  court: string | null;
  decisionDate: string | null;
  jurisdiction: string | null;
  text: string | null;
  officialUrl: string | null;
};

export type JurisprudenceSearchResponse = {
  query: string;
  type: JurisprudenceSearchType;
  total: number | null;
  count: number;
  offset: number;
  provider: "juridica-multisource";
  results: JurisprudenceResult[];
};

export type LegalCitationSnapshot = {
  id: string;
  studioId: StudioId;
  provider: "juridica-multisource";
  source: LegalSource | null;
  workId: string;
  providerDocumentId: string;
  sourceTitle: string | null;
  caption: string | null;
  court: string | null;
  decisionDate: string | null;
  jurisdiction: string | null;
  officialUrl: string | null;
  excerpt: string;
  sourcePage: number | null;
  documentHash: string | null;
  verificationStatus: "pending" | "verified" | "source_unavailable";
  createdAt: string;
  createdBy: UserId;
};

export type LegalDraft = {
  id: string;
  studioId: StudioId;
  title: string;
  content: Record<string, unknown>;
  caseId: CaseId | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  createdBy: UserId;
  updatedBy: UserId;
};

export type LegalDraftInput = Pick<LegalDraft, "title" | "content" | "caseId">;

export type LegalDraftVersion = {
  id: string;
  draftId: string;
  revision: number;
  title: string;
  content: Record<string, unknown>;
  caseId: CaseId | null;
  registeredAt: string;
  registeredBy: UserId;
};

export type LegalAnnotation = {
  id: string;
  studioId: StudioId;
  provider: "juridica-multisource";
  source: LegalSource | null;
  providerDocumentId: string;
  excerpt: string;
  note: string;
  createdAt: string;
  createdBy: UserId;
};
