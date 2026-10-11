import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { firestore } from "../firebase/services";
import { STUDIO_ID, type AgendaAudit, type AgendaEntry, type AgendaEntryInput } from "./agenda.types";

const entries = collection(firestore, "studios", STUDIO_ID, "agenda");
const iso = (value: unknown): string => value instanceof Timestamp ? value.toDate().toISOString() : "";

export function newAgendaEntryId(): string {
  return doc(entries).id;
}

function fromDocument(id: string, value: Record<string, unknown>): AgendaEntry {
  return {
    ...(value as unknown as AgendaEntry), id,
    startAt: iso(value.startAt), endAt: value.endAt instanceof Timestamp ? iso(value.endAt) : null,
    createdAt: iso(value.createdAt), updatedAt: iso(value.updatedAt), deletedAt: value.deletedAt instanceof Timestamp ? iso(value.deletedAt) : null,
  };
}

function toFirestore(input: AgendaEntryInput) {
  return {
    ...input,
    startAt: Timestamp.fromDate(new Date(input.startAt)),
    endAt: input.endAt ? Timestamp.fromDate(new Date(input.endAt)) : null,
  };
}

function auditRecord(audit: Omit<AgendaAudit, "at">, actor: string) {
  return { ...audit, actor, at: serverTimestamp() };
}

export async function listAgendaEntries(from: Date, to: Date, includeDeleted = false): Promise<AgendaEntry[]> {
  const rangeQuery = query(entries, where("startAt", ">=", Timestamp.fromDate(from)), where("startAt", "<", Timestamp.fromDate(to)), orderBy("startAt"));
  const snapshot = await getDocs(rangeQuery);
  return snapshot.docs.map((item) => fromDocument(item.id, item.data() as Record<string, unknown>)).filter((item) => includeDeleted || !item.deletedAt);
}

export async function listAgendaHistory(id: string): Promise<AgendaAudit[]> {
  const history = query(collection(doc(entries, id), "history"), orderBy("at", "desc"));
  const snapshot = await getDocs(history);
  return snapshot.docs.map((item) => {
    const value = item.data() as Omit<AgendaAudit, "at"> & { at?: unknown };
    return { ...value, at: iso(value.at) } as AgendaAudit;
  });
}

export async function createAgendaEntry(input: AgendaEntryInput, user: User, entryId?: string): Promise<string> {
  const reference = entryId ? doc(entries, entryId) : doc(entries);
  await runTransaction(firestore, async (transaction) => {
    transaction.set(reference, {
      ...toFirestore(input), studioId: STUDIO_ID, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      createdBy: user.email ?? user.uid, updatedBy: user.email ?? user.uid, deletedAt: null,
    });
    transaction.set(doc(collection(reference, "history")), auditRecord({ action: "created", nextStartAt: input.startAt }, user.email ?? user.uid));
  });
  return reference.id;
}

export async function updateAgendaEntry(id: string, input: AgendaEntryInput, user: User, reason = ""): Promise<void> {
  const reference = doc(entries, id);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("La entrada ya no existe.");
    const previous = fromDocument(snapshot.id, snapshot.data() as Record<string, unknown>);
    const rescheduled = previous.startAt !== input.startAt;
    const changedFields = (Object.keys(input) as Array<keyof AgendaEntryInput>).filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(input[key]));
    transaction.update(reference, { ...toFirestore(input), updatedAt: serverTimestamp(), updatedBy: user.email ?? user.uid });
    const history = doc(collection(reference, "history"));
    transaction.set(history, auditRecord({
      action: rescheduled ? "rescheduled" : "updated", previousStartAt: previous.startAt, nextStartAt: input.startAt, changedFields, reason,
    }, user.email ?? user.uid));
  });
}

export async function setAgendaEntryStatus(id: string, status: AgendaEntry["status"], user: User, reason = ""): Promise<void> {
  const reference = doc(entries, id);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("La entrada ya no existe.");
    transaction.update(reference, { status, updatedAt: serverTimestamp(), updatedBy: user.email ?? user.uid, ...(status === "cancelado" ? { deletedAt: null } : {}) });
    transaction.set(doc(collection(reference, "history")), auditRecord({ action: status === "cancelado" ? "cancelled" : "updated", reason }, user.email ?? user.uid));
  });
}

export async function softDeleteAgendaEntry(id: string, user: User, reason: string): Promise<void> {
  const reference = doc(entries, id);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("La entrada ya no existe.");
    transaction.update(reference, { deletedAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: user.email ?? user.uid });
    transaction.set(doc(collection(reference, "history")), auditRecord({ action: "deleted", reason }, user.email ?? user.uid));
  });
}
