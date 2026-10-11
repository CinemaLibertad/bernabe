import { collection, doc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, Timestamp, updateDoc, where, type Transaction } from "firebase/firestore";
import type { User } from "firebase/auth";
import { firestore } from "../firebase/services";
import { STUDIO_ID } from "../activities/activity.model";
import type { Activity } from "../activities/activity.model";
import type { StudioNotification } from "./notification.model";
import type { NotificationKind } from "./notification.model";
import { describeActivityNotification } from "./notification.service";

const notifications = collection(firestore, "studios", STUDIO_ID, "notifications");
const asIso = (value: unknown): string => value instanceof Timestamp ? value.toDate().toISOString() : "";

export function createActivityNotification(transaction: Transaction, activity: Activity, kind: NotificationKind, actor: string): void {
  const ref = doc(notifications);
  const presentation = describeActivityNotification(activity, kind);
  transaction.set(ref, {
    studioId: STUDIO_ID,
    source: { type: "activity", id: activity.id },
    kind,
    ...presentation,
    caseIds: activity.caseIds,
    clientIds: activity.clientIds,
    eventAt: Timestamp.fromDate(new Date(activity.startAt)),
    createdAt: serverTimestamp(),
    createdBy: actor,
    readAt: null,
  });
}

export async function listNotifications(maxItems = 100): Promise<StudioNotification[]> {
  const result = await getDocs(query(notifications, orderBy("createdAt", "desc"), limit(maxItems)));
  return result.docs.map((item) => {
    const data = item.data();
    return { ...data, id: item.id, createdAt: asIso(data.createdAt), readAt: data.readAt instanceof Timestamp ? asIso(data.readAt) : null, eventAt: data.eventAt instanceof Timestamp ? asIso(data.eventAt) : undefined, archivedAt: data.archivedAt instanceof Timestamp ? asIso(data.archivedAt) : null } as StudioNotification;
  });
}

export async function archiveNotification(id: string, user: User): Promise<void> {
  const ref = doc(notifications, id);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().studioId !== STUDIO_ID) throw new Error("La notificación ya no existe.");
    if (snapshot.data().archivedAt == null) transaction.update(ref, {
      archivedAt: serverTimestamp(), archivedBy: user.email ?? user.uid,
      readAt: snapshot.data().readAt ?? serverTimestamp(), readBy: user.email ?? user.uid,
    });
  });
}

export async function markNotificationRead(id: string, user: User): Promise<void> {
  const ref = doc(notifications, id);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists() || snapshot.data().studioId !== STUDIO_ID) throw new Error("La notificación ya no existe.");
    if (snapshot.data().readAt == null) transaction.update(ref, { readAt: serverTimestamp(), readBy: user.email ?? user.uid });
  });
}

export async function markAllNotificationsRead(user: User): Promise<void> {
  const unread = await getDocs(query(notifications, where("readAt", "==", null), limit(100)));
  await Promise.all(unread.docs.map((item) => updateDoc(item.ref, { readAt: serverTimestamp(), readBy: user.email ?? user.uid })));
}
