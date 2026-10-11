import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { firestore } from "../firebase/services";
import { STUDIO_ID } from "../activities/activity.model";
import type { LegalCase } from "../cases/case.model";
import type { CourtActuation, CourtAudit, CourtConsultation, CourtRound, CourtVisit } from "./court-activity.model";

const studio = String(STUDIO_ID);
const root = collection(firestore, "studios", studio, "courtRounds");
const visits = collection(firestore, "studios", studio, "courtVisits");
const consultations = collection(firestore, "studios", studio, "courtConsultations");
const actuations = collection(firestore, "studios", studio, "courtActuations");
const cases = collection(firestore, "studios", studio, "cases");
const actor = (user: User) => user.email ?? user.uid;
const iso = (value: unknown) => value instanceof Timestamp ? value.toDate().toISOString() : typeof value === "string" ? value : "";
const hydrate = <T,>(id: string, data: Record<string, unknown>) => ({ ...data, id, createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) } as T);

export type CourtActivitySnapshot = { rounds: CourtRound[]; visits: CourtVisit[]; consultations: CourtConsultation[]; actuations: CourtActuation[] };
export async function listCourtActivity(): Promise<CourtActivitySnapshot> {
  const [roundRows, visitRows, consultationRows, actuationRows] = await Promise.all([
    getDocs(query(root, orderBy("occurredOn", "desc"), limit(200))),
    getDocs(query(visits, orderBy("visitedAt", "desc"), limit(500))),
    getDocs(query(consultations, orderBy("occurredAt", "desc"), limit(1000))),
    getDocs(query(actuations, orderBy("occurredAt", "desc"), limit(1000))),
  ]);
  return {
    rounds: roundRows.docs.map((row) => hydrate<CourtRound>(row.id, row.data())),
    visits: visitRows.docs.map((row) => hydrate<CourtVisit>(row.id, row.data())),
    consultations: consultationRows.docs.map((row) => hydrate<CourtConsultation>(row.id, row.data())),
    actuations: actuationRows.docs.map((row) => hydrate<CourtActuation>(row.id, row.data())),
  };
}
export async function listCourtHistory(collectionName: "courtRounds" | "courtVisits" | "courtConsultations" | "courtActuations", id: string): Promise<CourtAudit[]> {
  const rows = await getDocs(query(collection(doc(collection(firestore, "studios", studio, collectionName), id), "history"), orderBy("at", "desc"), limit(50)));
  return rows.docs.map((row) => ({ ...row.data(), at: iso(row.data().at) } as CourtAudit));
}

async function saveRecord<T extends { id: string; operationId: string; createdAt?: string; createdBy?: string; updatedAt?: string; updatedBy?: string }>(
  collectionRef: ReturnType<typeof collection>, input: Omit<T, "id" | "studioId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
  user: User, editId?: string,
): Promise<string> {
  const operationId = input.operationId;
  if (!operationId || operationId.includes("/")) throw new Error("Falta un identificador de operación válido.");
  const ref = doc(collectionRef, editId ?? operationId);
  await runTransaction(firestore, async (tx) => {
    const snapshot = await tx.get(ref);
    const old = snapshot.exists() ? snapshot.data() : null;
    if (old && old.studioId !== studio) throw new Error("El registro no pertenece a este estudio.");
    // A retried create with the same operation ID is a no-op: it cannot fan out duplicate records.
    if (old && !editId && old.operationId === operationId) return;
    const data = { ...input, studioId: studio, createdAt: old?.createdAt ?? serverTimestamp(), createdBy: old?.createdBy ?? actor(user), updatedAt: serverTimestamp(), updatedBy: actor(user) };
    tx.set(ref, data);
    const historyRef = doc(collection(ref, "history"));
    const changedFields = old ? Object.keys(input).filter((key) => JSON.stringify(old[key]) !== JSON.stringify((input as Record<string, unknown>)[key])) : [];
    const previousValues = old ? Object.fromEntries(changedFields.map((key) => [key, old[key]])) : undefined;
    const nextValues = old ? Object.fromEntries(changedFields.map((key) => [key, (input as Record<string, unknown>)[key]])) : undefined;
    tx.set(historyRef, { action: old ? "updated" : "created", actor: actor(user), at: serverTimestamp(), ...(old ? { changedFields, previousValues, nextValues } : {}) });
  });
  return ref.id;
}
async function requireCase(caseId: string): Promise<LegalCase> {
  const ref = doc(cases, caseId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists() || snapshot.data().studioId !== studio || snapshot.data().archivedAt) throw new Error("El expediente no existe, está archivado o no pertenece al estudio.");
  return { ...snapshot.data(), id: snapshot.id } as LegalCase;
}
export async function saveCourtRound(input: Omit<CourtRound, "id" | "studioId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, user: User, editId?: string) {
  return saveRecord<CourtRound>(root, input, user, editId);
}
export async function saveCourtVisit(input: Omit<CourtVisit, "id" | "studioId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, user: User, editId?: string) {
  const round = await getDoc(doc(root, input.roundId));
  if (!round.exists() || round.data().studioId !== studio) throw new Error("La recorrida asociada no existe.");
  if (!input.organizationId || !input.organizationNameSnapshot) throw new Error("Seleccioná o identificá el organismo visitado.");
  return saveRecord<CourtVisit>(visits, input, user, editId);
}
export async function saveCourtConsultation(input: Omit<CourtConsultation, "id" | "studioId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, user: User, editId?: string) {
  if (!input.operationId || input.operationId.includes("/")) throw new Error("Falta un identificador de operación válido.");
  if (!Number.isFinite(Date.parse(input.occurredAt))) throw new Error("La fecha de consulta no es válida.");
  if (input.verification === "document_verified" && input.documentReferences.length === 0) throw new Error("La verificación documental requiere una referencia documental.");
  if (new Set(input.updates.map((item) => item.id)).size !== input.updates.length || input.updates.some((item) => !item.id || item.id.includes("/"))) throw new Error("Cada novedad debe tener un identificador único.");
  const ref = doc(consultations, editId ?? input.operationId);
  const caseRef = doc(cases, input.caseId);
  const visitRef = doc(visits, input.visitId);
  await runTransaction(firestore, async (tx) => {
    const updateRefs = input.updates.map((item) => ({ update: item, ref: doc(actuations, `${ref.id}-${item.id}`) }));
    const [oldSnapshot, caseSnapshot, visitSnapshot, ...updateSnapshots] = await Promise.all([tx.get(ref), tx.get(caseRef), tx.get(visitRef), ...updateRefs.map(({ ref: updateRef }) => tx.get(updateRef))]);
    const old = oldSnapshot.exists() ? oldSnapshot.data() : null;
    if (old && old.studioId !== studio) throw new Error("La consulta no pertenece a este estudio.");
    if (old && !editId && old.operationId === input.operationId) return;
    if (!caseSnapshot.exists() || caseSnapshot.data().studioId !== studio || caseSnapshot.data().archivedAt) throw new Error("El expediente no existe, está archivado o no pertenece al estudio.");
    if (!visitSnapshot.exists() || visitSnapshot.data().studioId !== studio || visitSnapshot.data().roundId !== input.roundId) throw new Error("La visita no pertenece a esta recorrida.");
    const caseData = caseSnapshot.data();
    const visit = visitSnapshot.data();
    const consultationData = { ...input, caseCaptionSnapshot: caseData.caption, caseNumberSnapshot: caseData.number, organizationId: visit.organizationId, organizationNameSnapshot: visit.organizationNameSnapshot, studioId: studio, createdAt: old?.createdAt ?? serverTimestamp(), createdBy: old?.createdBy ?? actor(user), updatedAt: serverTimestamp(), updatedBy: actor(user) };
    tx.set(ref, consultationData);
    const changedFields = old ? Object.keys(input).filter((key) => JSON.stringify(old[key]) !== JSON.stringify((input as Record<string, unknown>)[key])) : [];
    const previousValues = old ? Object.fromEntries(changedFields.map((key) => [key, old[key]])) : undefined;
    const nextValues = old ? Object.fromEntries(changedFields.map((key) => [key, (input as Record<string, unknown>)[key]])) : undefined;
    tx.set(doc(collection(ref, "history")), { action: old ? "updated" : "created", actor: actor(user), at: serverTimestamp(), ...(old ? { changedFields, previousValues, nextValues } : {}) });
    updateRefs.forEach(({ update, ref: actuationRef }, index) => {
      const existing = updateSnapshots[index];
      const existingData = existing.exists() ? existing.data() : null;
      const actuation = {
        studioId: studio, caseId: input.caseId, caseCaptionSnapshot: caseData.caption, caseNumberSnapshot: caseData.number,
        consultationId: ref.id, visitId: input.visitId, organizationId: visit.organizationId,
        organizationNameSnapshot: visit.organizationNameSnapshot, type: update.type,
        title: [update.type, update.reference].filter(Boolean).join(" · "), description: update.description,
        occurredAt: input.occurredAt, source: input.source, verification: input.verification,
        documentReferences: input.documentReferences, activityIds: [], consultationUpdateId: update.id,
        operationId: actuationRef.id, createdAt: existingData?.createdAt ?? serverTimestamp(),
        createdBy: existingData?.createdBy ?? actor(user), updatedAt: serverTimestamp(), updatedBy: actor(user),
      };
      if (existingData && existingData.consultationUpdateId !== update.id) return;
      const changedFields = existingData ? ["type", "title", "description", "occurredAt", "verification", "documentReferences"].filter((key) => JSON.stringify(existingData[key]) !== JSON.stringify((actuation as Record<string, unknown>)[key])) : [];
      tx.set(actuationRef, actuation);
      tx.set(doc(collection(actuationRef, "history")), {
        action: existingData ? "updated" : "created", actor: actor(user), at: serverTimestamp(),
        ...(existingData ? {
          changedFields,
          previousValues: Object.fromEntries(changedFields.map((key) => [key, existingData[key]])),
          nextValues: Object.fromEntries(changedFields.map((key) => [key, (actuation as Record<string, unknown>)[key]])),
        } : {}),
      });
    });

    const previousObservation = caseData.latestCourtObservation ?? null;
    const isLatest = !previousObservation || Date.parse(input.occurredAt) >= Date.parse(previousObservation.observedAt);
    if (isLatest) {
      const latestCourtObservation = {
        consultationId: ref.id, availability: input.availability, observedAt: input.occurredAt,
        source: input.source, verification: input.verification, organizationId: visit.organizationId,
        organizationNameSnapshot: visit.organizationNameSnapshot, observations: [input.novelty, input.updates.map((update) => [update.type, update.reference, update.description].filter(Boolean).join(" · ")).join(" | "), input.observations, input.availabilityNote].filter(Boolean).join(" · "),
        observedBy: actor(user),
      };
      tx.update(caseRef, { latestCourtObservation, updatedAt: serverTimestamp(), updatedBy: actor(user) });
      tx.set(doc(collection(caseRef, "courtObservationHistory")), {
        consultationId: ref.id, actor: actor(user), at: serverTimestamp(), previousObservation,
        nextObservation: latestCourtObservation,
      });
    }
  });
  return ref.id;
}
export async function saveCourtActuation(input: Omit<CourtActuation, "id" | "studioId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">, user: User, editId?: string) {
  if (!input.title.trim() || !Number.isFinite(Date.parse(input.occurredAt))) throw new Error("La actuación requiere un título y una fecha válidos.");
  if (input.verification === "document_verified" && input.documentReferences.length === 0) throw new Error("La verificación documental requiere una referencia documental.");
  const caseRecord = await requireCase(input.caseId);
  if (input.consultationId) {
    const consultation = await getDoc(doc(consultations, input.consultationId));
    if (!consultation.exists() || consultation.data().studioId !== studio || consultation.data().caseId !== input.caseId) throw new Error("La consulta vinculada no corresponde al expediente seleccionado.");
  }
  return saveRecord<CourtActuation>(actuations, { ...input, caseCaptionSnapshot: caseRecord.caption, caseNumberSnapshot: caseRecord.number }, user, editId);
}
