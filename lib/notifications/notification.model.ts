import type { ActivityId, StudioId, UserId } from "../shared/ids";

export type NotificationSource = { type: "activity"; id: ActivityId };
export type NotificationKind = "created" | "rescheduled" | "status_changed";
export type NotificationSeverity = "informativa" | "importante" | "urgente";
export type NotificationCategory = "tarea" | "vencimiento" | "agenda" | "personalizada";

export type StudioNotification = {
  id: string;
  studioId: StudioId;
  source: NotificationSource;
  kind: NotificationKind;
  severity: NotificationSeverity;
  category?: NotificationCategory;
  caseIds?: string[];
  clientIds?: string[];
  eventAt?: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  createdBy: UserId;
  readAt: string | null;
  archivedAt?: string | null;
};
