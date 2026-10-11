import type { User } from "firebase/auth";
import type { AgendaEntry, AgendaEntryInput } from "./agenda.types";
import {
  archiveActivity,
  changeActivityStatus,
  listActivities,
  listActivityHistory,
  newActivityId,
  saveActivity,
} from "../firebase/domain-repositories";

export const newAgendaEntryId = newActivityId;
export const listAgendaEntries = listActivities;
export const listAgendaHistory = listActivityHistory;

export async function createAgendaEntry(input: AgendaEntryInput, user: User, entryId?: string): Promise<string> {
  return saveActivity(input, user, entryId);
}

export async function updateAgendaEntry(id: string, input: AgendaEntryInput, user: User, reason = ""): Promise<void> {
  await saveActivity(input, user, id, reason);
}

export async function setAgendaEntryStatus(id: string, status: AgendaEntry["status"], user: User, reason = ""): Promise<void> {
  await changeActivityStatus(id, status, user, reason);
}

export async function softDeleteAgendaEntry(id: string, user: User, reason: string): Promise<void> {
  await archiveActivity(id, user, reason);
}
