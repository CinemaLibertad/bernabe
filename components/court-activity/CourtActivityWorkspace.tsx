"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getClientAuth } from "../../lib/firebase/client";
import { listCases } from "../../lib/firebase/domain-repositories";
import { saveActivity } from "../../lib/firebase/domain-repositories";
import { requestCatalog, type CatalogOrganization, type CatalogPage } from "../../lib/judicial-catalog/contract";
import type { ActivityInput } from "../../lib/activities/activity.model";
import type { LegalCase } from "../../lib/cases/case.model";
import { listCourtActivity, listCourtHistory, saveCourtActuation, saveCourtConsultation, saveCourtRound, saveCourtVisit } from "../../lib/court-activity/court-activity.repository";
import type { CourtActuation, CourtAudit, CourtConsultation, CourtConsultationUpdate, CourtRound, CourtVisit } from "../../lib/court-activity/court-activity.model";

type Kind = "round" | "visit" | "consultation" | "actuation";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
const isoNow = () => new Date().toISOString();
const operationId = () => crypto.randomUUID();
const when = (value: string) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value)) : "Fecha no informada";

export function CourtActivityWorkspace() {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof listCourtActivity>> | null>(null);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const operationIds = useRef<Record<Kind, string>>({ round: operationId(), visit: operationId(), consultation: operationId(), actuation: operationId() });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<Kind>("round");
  const [activeRound, setActiveRound] = useState("");
  const [activeVisit, setActiveVisit] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState<CatalogOrganization | null>(null);
  const [organizationQuery, setOrganizationQuery] = useState("");
  const [organizationResults, setOrganizationResults] = useState<CatalogOrganization[]>([]);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("todos");
  const [history, setHistory] = useState<CourtAudit[]>([]);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [edit, setEdit] = useState<{ kind: Kind; id: string } | null>(null);
  const [roundDate, setRoundDate] = useState(today());
  const [roundNotes, setRoundNotes] = useState("");
  const [visitRound, setVisitRound] = useState("");
  const [visitName, setVisitName] = useState("");
  const [visitOrganizationId, setVisitOrganizationId] = useState("");
  const [visitJurisdiction, setVisitJurisdiction] = useState("");
  const [visitSource, setVisitSource] = useState("");
  const [visitTime, setVisitTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [visitNotes, setVisitNotes] = useState("");
  const [consultVisit, setConsultVisit] = useState("");
  const [consultCase, setConsultCase] = useState("");
  const [availability, setAvailability] = useState<CourtConsultation["availability"]>("sin_novedades");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [novelty, setNovelty] = useState("");
  const [consultationUpdates, setConsultationUpdates] = useState<CourtConsultationUpdate[]>([]);
  const [consultNotes, setConsultNotes] = useState("");
  const [consultTime, setConsultTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [verification, setVerification] = useState<CourtConsultation["verification"]>("observed");
  const [consultDocuments, setConsultDocuments] = useState("");
  const [actCase, setActCase] = useState("");
  const [actConsultation, setActConsultation] = useState("");
  const [actType, setActType] = useState("providencia");
  const [actTitle, setActTitle] = useState("");
  const [actDescription, setActDescription] = useState("");
  const [actDate, setActDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [actVerification, setActVerification] = useState<CourtActuation["verification"]>("observed");
  const [actDocuments, setActDocuments] = useState("");
  const [createActivity, setCreateActivity] = useState(false);
  const [activityType, setActivityType] = useState<ActivityInput["type"]>("tarea");
  const [activityDate, setActivityDate] = useState("");

  async function refresh() {
    setLoading(true); setError("");
    try { const [data, caseRows] = await Promise.all([listCourtActivity(), listCases()]); setSnapshot(data); setCases(caseRows); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo consultar la actividad de tribunales."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  const rounds = snapshot?.rounds ?? [];
  const visits = snapshot?.visits ?? [];
  const consultations = snapshot?.consultations ?? [];
  const actuations = snapshot?.actuations ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-AR");
    const all = [
      ...rounds.map((record) => ({ kind: "round" as const, id: record.id, title: `Recorrida · ${record.occurredOn}`, detail: record.notes, date: record.occurredOn })),
      ...visits.map((record) => ({ kind: "visit" as const, id: record.id, title: record.organizationNameSnapshot, detail: record.notes, date: record.visitedAt })),
      ...consultations.map((record) => ({ kind: "consultation" as const, id: record.id, title: record.caseCaptionSnapshot, detail: `${record.availability.replaceAll("_", " ")} · ${record.novelty} ${record.observations}`, date: record.occurredAt })),
      ...actuations.map((record) => ({ kind: "actuation" as const, id: record.id, title: record.title, detail: `${record.caseCaptionSnapshot} · ${record.description}`, date: record.occurredAt })),
    ];
    return all.filter((item) => (kindFilter === "todos" || item.kind === kindFilter) && (!term || `${item.title} ${item.detail} ${item.date}`.toLocaleLowerCase("es-AR").includes(term))).sort((a, b) => b.date.localeCompare(a.date));
  }, [rounds, visits, consultations, actuations, search, kindFilter]);

  async function searchOrganizations() {
    if (organizationQuery.trim().length < 2) { setError("Ingresá al menos dos caracteres para buscar en el Catálogo Judicial."); return; }
    try {
      setError("");
      const result = await requestCatalog<CatalogPage>(`/organismos?${new URLSearchParams({ q: organizationQuery.trim(), page: "1", pageSize: "8" })}`);
      setOrganizationResults(result.data);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo buscar el organismo en el catálogo."); }
  }
  function clearEdit() { setEdit(null); setNotice(""); }
  async function submit(event: FormEvent) {
    event.preventDefault(); const user = getClientAuth().currentUser;
    if (!user) { setError("La sesión no está disponible."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      let id = edit?.id;
      const currentOperationId = id ?? operationIds.current[mode];
      if (mode === "round") {
        id = await saveCourtRound({ occurredOn: roundDate, notes: roundNotes.trim(), operationId: currentOperationId }, user, edit?.id);
        setActiveRound(id); setRoundNotes(""); setNotice("Recorrida guardada. Podés agregar las visitas de organismos.");
      } else if (mode === "visit") {
        const roundId = visitRound || activeRound;
        if (!roundId) throw new Error("Elegí la recorrida a la que pertenece esta visita.");
        if (!visitName.trim()) throw new Error("Seleccioná un organismo del catálogo o ingresá su denominación.");
        id = await saveCourtVisit({ roundId, organizationId: visitOrganizationId.trim() || `manual:${visitName.trim().toLocaleLowerCase("es-AR")}`, organizationNameSnapshot: visitName.trim(), jurisdictionSnapshot: visitJurisdiction.trim(), sourceUrl: visitSource.trim(), visitedAt: new Date(visitTime).toISOString(), notes: visitNotes.trim(), operationId: currentOperationId }, user, edit?.id);
        setActiveVisit(id); setVisitNotes(""); setNotice("Visita registrada con la identidad y denominación histórica del organismo.");
      } else if (mode === "consultation") {
        const visit = visits.find((row) => row.id === consultVisit);
        if (!visit) throw new Error("Elegí la visita al organismo donde se consultó el expediente.");
        const documentReferences = consultDocuments.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        if (verification === "document_verified" && documentReferences.length === 0) throw new Error("Para marcar la consulta como verificada documentalmente, agregá la referencia del documento.");
        const updates = consultationUpdates.map((update) => ({ ...update, type: update.type.trim(), reference: update.reference.trim(), description: update.description.trim() }));
        id = await saveCourtConsultation({ roundId: visit.roundId, visitId: visit.id, caseId: consultCase as CourtConsultation["caseId"], caseCaptionSnapshot: "", caseNumberSnapshot: "", organizationId: visit.organizationId, organizationNameSnapshot: visit.organizationNameSnapshot, availability, availabilityNote: availabilityNote.trim(), novelty: updates.map((update) => [update.type, update.reference, update.description].filter(Boolean).join(" · ")).join(" | "), updates, observations: consultNotes.trim(), occurredAt: new Date(consultTime).toISOString(), source: "manual_web", verification, documentReferences, operationId: currentOperationId }, user, edit?.id);
        setNotice(availability === "en_letra" ? "Consulta registrada como observación fechada; no modifica el estado jurídico del expediente." : "Consulta de expediente guardada.");
        setNovelty(""); setConsultationUpdates([]); setConsultNotes(""); setConsultDocuments("");
      } else {
        const caseRecord = cases.find((row) => row.id === actCase);
        if (!caseRecord) throw new Error("Seleccioná el expediente de la actuación.");
        if (createActivity && !activityDate) throw new Error("Indicá la fecha confirmada de la actividad que querés relacionar.");
        const documentReferences = actDocuments.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
        if (actVerification === "document_verified" && documentReferences.length === 0) throw new Error("Para marcar la actuación como verificada documentalmente, agregá la referencia del documento.");
        const consultation = consultations.find((row) => row.id === actConsultation);
        const previousActivityIds = edit ? actuations.find((row) => row.id === edit.id)?.activityIds ?? [] : [];
        const recordId = await saveCourtActuation({ caseId: caseRecord.id, caseCaptionSnapshot: caseRecord.caption, caseNumberSnapshot: caseRecord.number, consultationId: consultation?.id ?? null, visitId: consultation?.visitId ?? null, organizationId: consultation?.organizationId ?? "", organizationNameSnapshot: consultation?.organizationNameSnapshot ?? caseRecord.court, type: actType, title: actTitle.trim(), description: actDescription.trim(), occurredAt: new Date(actDate).toISOString(), source: "manual_web", verification: actVerification, documentReferences, activityIds: previousActivityIds, operationId: currentOperationId }, user, edit?.id);
        id = recordId;
        setEdit({ kind: "actuation", id: recordId });
        if (createActivity && activityDate) {
          const activityId = `act-${recordId}`;
          const activity: ActivityInput = { type: activityType, title: actTitle.trim(), description: `Actividad confirmada a partir de la actuación: ${actDescription.trim()}`, notes: "Creada desde Juicios y actuaciones; fecha ingresada y confirmada por el profesional.", startAt: new Date(activityDate).toISOString(), endAt: null, timeZone: "America/Argentina/Buenos_Aires", allDay: false, isHighlighted: false, priority: "normal", status: "confirmado", caseIds: [caseRecord.id], clientIds: caseRecord.clientIds, jurisdiction: caseRecord.jurisdiction, branch: caseRecord.branch, location: caseRecord.court, organization: consultation?.organizationNameSnapshot ?? caseRecord.court, meetingUrl: "", references: [`courtActuation:${recordId}`], attachments: [], remindersMinutes: [], recurrence: null, dateVerification: "verificada" };
          await saveActivity(activity, user, activityId, "Actividad confirmada y vinculada desde Juicios y actuaciones.");
          await saveCourtActuation({ caseId: caseRecord.id, caseCaptionSnapshot: caseRecord.caption, caseNumberSnapshot: caseRecord.number, consultationId: consultation?.id ?? null, visitId: consultation?.visitId ?? null, organizationId: consultation?.organizationId ?? "", organizationNameSnapshot: consultation?.organizationNameSnapshot ?? caseRecord.court, type: actType, title: actTitle.trim(), description: actDescription.trim(), occurredAt: new Date(actDate).toISOString(), source: "manual_web", verification: actVerification, documentReferences, activityIds: [...new Set([...previousActivityIds, activityId])], operationId: recordId }, user, recordId);
        }
        setNotice(createActivity ? "Actuación guardada y actividad vinculada en la colección compartida de Agenda/Tareas." : "Actuación guardada en la historia procesal.");
        setActTitle(""); setActDescription(""); setActDocuments("");
      }
      clearEdit(); await refresh();
      operationIds.current[mode] = operationId();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar el registro."); }
    finally { setSaving(false); }
  }
  async function showHistory(kind: Kind, id: string, title: string) {
    const collectionName = { round: "courtRounds", visit: "courtVisits", consultation: "courtConsultations", actuation: "courtActuations" } as const;
    setHistoryBusy(true); setHistoryTitle(title);
    try { setHistory(await listCourtHistory(collectionName[kind], id)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo consultar el historial."); }
    finally { setHistoryBusy(false); }
  }
  function loadForEdit(kind: Kind, id: string) {
    if (!snapshot) return;
    setMode(kind); setEdit({ kind, id }); setError(""); setNotice("");
    if (kind === "round") { const row = rounds.find((item) => item.id === id)!; setRoundDate(row.occurredOn); setRoundNotes(row.notes); }
    if (kind === "visit") { const row = visits.find((item) => item.id === id)!; setVisitRound(row.roundId); setVisitName(row.organizationNameSnapshot); setVisitOrganizationId(row.organizationId); setVisitJurisdiction(row.jurisdictionSnapshot); setVisitSource(row.sourceUrl); setVisitTime(row.visitedAt.slice(0, 16)); setVisitNotes(row.notes); }
    if (kind === "consultation") { const row = consultations.find((item) => item.id === id)!; setConsultVisit(row.visitId); setConsultCase(row.caseId); setAvailability(row.availability); setAvailabilityNote(row.availabilityNote); setNovelty(row.novelty); setConsultationUpdates(row.updates ?? []); setConsultNotes(row.observations); setConsultTime(row.occurredAt.slice(0, 16)); setVerification(row.verification); setConsultDocuments(row.documentReferences.join("\n")); }
    if (kind === "actuation") { const row = actuations.find((item) => item.id === id)!; setActCase(row.caseId); setActConsultation(row.consultationId ?? ""); setActType(row.type); setActTitle(row.title); setActDescription(row.description); setActDate(row.occurredAt.slice(0, 16)); setActVerification(row.verification); setActDocuments(row.documentReferences.join("\n")); }
    document.querySelector(".court-activity-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <main className="panel-main court-activity-main"><div className="breadcrumbs">Inicio / <b>Actividad de tribunales</b></div>
    <header className="agenda-page-heading"><div><span className="agenda-eyebrow">GESTIÓN DE CAMPO · REGISTRO E HISTORIAL</span><h1>Actividad de tribunales</h1><p>Recorridas, visitas y consultas fechadas; las actuaciones se incorporan por separado a la historia procesal.</p></div><div className="court-heading-count"><strong>{rounds.length}</strong><span>recorridas consultadas</span></div></header>
    {error && <p className="agenda-error" role="alert">{error}</p>}{notice && <p className="court-notice" role="status">{notice}</p>}
    <section className="court-flow-strip" aria-label="Jerarquía de registros"><span>Recorrida / jornada</span><b>→</b><span>Visita a organismo</span><b>→</b><span>Consulta de expediente</span><i>Actuaciones vinculadas opcionalmente; pueden registrarse en forma independiente.</i></section>
    <div className="court-work-grid"><section className="data-card court-activity-form"><div className="court-section-heading"><div><span className="agenda-eyebrow">CAPTURA Y CORRECCIÓN</span><h2>{edit ? "Corregir registro" : "Registrar actividad"}</h2></div>{edit && <button type="button" className="agenda-button secondary" onClick={clearEdit}>Cancelar edición</button>}</div>
      <nav className="court-mode-tabs" aria-label="Tipo de registro">{([["round", "Recorrida"], ["visit", "Visita"], ["consultation", "Consulta"], ["actuation", "Actuación"]] as [Kind, string][]).map(([key, label]) => <button type="button" key={key} className={mode === key ? "selected" : ""} onClick={() => { if (!edit) setMode(key); }}>{label}</button>)}</nav>
      <form className="court-form" onSubmit={(event) => void submit(event)}>
        {mode === "round" && <><label>Fecha de la recorrida<input required type="date" value={roundDate} onChange={(e) => setRoundDate(e.target.value)} /></label><label className="wide">Resumen de la jornada<textarea rows={3} value={roundNotes} onChange={(e) => setRoundNotes(e.target.value)} placeholder="Síntesis de la actividad del día, sin duplicar el detalle de cada consulta." /></label></>}
        {mode === "visit" && <><label>Recorrida<select required value={visitRound || activeRound} onChange={(e) => setVisitRound(e.target.value)}><option value="">Seleccionar recorrida</option>{rounds.map((row) => <option key={row.id} value={row.id}>{row.occurredOn} · {row.notes || "Sin resumen"}</option>)}</select></label><div className="wide"><label>Buscar organismo en Catálogo Judicial</label><div className="court-catalog-search"><input value={organizationQuery} onChange={(e) => setOrganizationQuery(e.target.value)} placeholder="Nombre, número, fuero o localidad"/><button type="button" className="agenda-button secondary" onClick={() => void searchOrganizations()}>Buscar</button></div>{organizationResults.length > 0 && <div className="court-catalog-results">{organizationResults.map((org) => <button type="button" key={org.id} onClick={() => { setSelectedOrganization(org); setVisitName(org.officialName); setVisitOrganizationId(org.id); setVisitJurisdiction(org.jurisdictionName ?? org.provinceName ?? ""); setOrganizationResults([]); }}><strong>{org.officialName}</strong><small>{[org.jurisdictionName, org.branch, org.locality].filter(Boolean).join(" · ")} · ID {org.id}</small></button>)}</div>}</div><label>Organismo visitado<input required value={visitName} onChange={(e) => { setVisitName(e.target.value); if (selectedOrganization && e.target.value !== selectedOrganization.officialName) setSelectedOrganization(null); }} placeholder="Denominación observada"/><small>Si no está en el catálogo, se conserva el nombre ingresado y se marca como referencia manual.</small></label><label>ID del catálogo<input value={visitOrganizationId} onChange={(e) => setVisitOrganizationId(e.target.value)} placeholder="Se completa al elegir un resultado" /></label><label>Jurisdicción observada<input value={visitJurisdiction} onChange={(e) => setVisitJurisdiction(e.target.value)} /></label><label>Fecha y hora de visita<input required type="datetime-local" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} /></label><label>Fuente institucional<input type="url" value={visitSource} onChange={(e) => setVisitSource(e.target.value)} placeholder="Enlace consultado (opcional)" /></label><label className="wide">Observaciones<textarea rows={3} value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} /></label></>}
        {mode === "consultation" && <>
          <label>Expediente consultado<select required value={consultCase} onChange={(e) => setConsultCase(e.target.value)}><option value="">Seleccionar expediente</option>{cases.map((row) => <option key={row.id} value={row.id}>{row.number || "Sin número"} · {row.caption}</option>)}</select></label>
          <label>Visita a organismo<select required value={consultVisit} onChange={(e) => setConsultVisit(e.target.value)}><option value="">Seleccionar visita</option>{visits.map((row) => <option key={row.id} value={row.id}>{when(row.visitedAt)} · {row.organizationNameSnapshot}</option>)}</select></label>
          <label>Fecha y hora de consulta<input required type="datetime-local" value={consultTime} onChange={(e) => setConsultTime(e.target.value)} /></label>
          <label>Situación física observada<select value={availability} onChange={(e) => setAvailability(e.target.value as CourtConsultation["availability"])}><option value="en_letra">En letra / disponible para consulta</option><option value="no_en_letra">No estaba en letra</option><option value="a_despacho">A despacho</option><option value="a_la_firma">A la firma</option><option value="en_canasta">En canasta / pendiente de agregación</option><option value="en_secretaria">En secretaría</option><option value="en_prestamo">En préstamo</option><option value="archivado">Remitido a archivo (observación)</option><option value="desarchivado">Desarchivado</option><option value="sin_novedades">Consultado, sin novedades observadas</option><option value="no_encontrado">No localizado en la consulta</option><option value="otro">Otra situación</option></select><small>Describe lo observado en esta visita; no modifica la situación jurídica del expediente.</small></label>
          <label>Verificación<select value={verification} onChange={(e) => setVerification(e.target.value as CourtConsultation["verification"])}><option value="observed">Observada por el profesional</option><option value="reported">Informada por tercero</option><option value="document_verified">Verificada con documento</option></select></label>
          <section className="wide court-updates-editor"><div className="court-section-heading"><div><span className="agenda-eyebrow">MOVIMIENTOS ENCONTRADOS</span><h3>Últimas actualizaciones</h3></div><button type="button" className="agenda-button secondary" onClick={() => setConsultationUpdates((rows) => [...rows, { id: operationId(), type: "despacho", reference: "", description: "" }])}>+ Agregar actualización</button></div><p>Cada novedad se vincula a la consulta y se incorpora como actuación del expediente. No se crean plazos ni audiencias automáticamente.</p>{consultationUpdates.length === 0 ? <div className="court-updates-empty">Sin actualizaciones agregadas. También podés guardar una consulta sin novedades.</div> : consultationUpdates.map((update, index) => <div className="court-update-row" key={update.id}><label>Tipo<select value={update.type} onChange={(e) => setConsultationUpdates((rows) => rows.map((row, position) => position === index ? { ...row, type: e.target.value } : row))}>{["cédula", "despacho", "escrito", "providencia", "resolución", "oficio", "audiencia", "notificación", "otro"].map((type) => <option key={type} value={type}>{type[0].toLocaleUpperCase("es-AR") + type.slice(1)}</option>)}</select></label><label>Número / referencia<input value={update.reference} onChange={(e) => setConsultationUpdates((rows) => rows.map((row, position) => position === index ? { ...row, reference: e.target.value } : row))} placeholder="N.º de cédula, despacho u otra referencia" /></label><label className="court-update-description">Detalle<textarea rows={2} value={update.description} onChange={(e) => setConsultationUpdates((rows) => rows.map((row, position) => position === index ? { ...row, description: e.target.value } : row))} /></label><button type="button" className="agenda-button danger-outline" aria-label="Quitar actualización" onClick={() => setConsultationUpdates((rows) => rows.filter((row) => row.id !== update.id))}>Quitar</button></div>)}</section>
          <label className="wide">Observaciones generales<textarea rows={2} value={consultNotes} onChange={(e) => setConsultNotes(e.target.value)} /></label>
          <label className="wide">Aclaración sobre disponibilidad<textarea rows={2} value={availabilityNote} onChange={(e) => setAvailabilityNote(e.target.value)} placeholder="Contexto de la situación observada." /></label>
          <label className="wide">Referencias documentales<textarea rows={2} value={consultDocuments} onChange={(e) => setConsultDocuments(e.target.value)} placeholder="Una referencia o ruta por línea. No se cargan archivos en esta pantalla." /></label>
        </>}
        {mode === "actuation" && <><label>Expediente<select required value={actCase} onChange={(e) => setActCase(e.target.value)}><option value="">Seleccionar expediente</option>{cases.map((row) => <option key={row.id} value={row.id}>{row.number || "Sin número"} · {row.caption}</option>)}</select></label><label>Consulta de origen (opcional)<select value={actConsultation} onChange={(e) => setActConsultation(e.target.value)}><option value="">Sin consulta vinculada</option>{consultations.filter((row) => !actCase || row.caseId === actCase).map((row) => <option key={row.id} value={row.id}>{when(row.occurredAt)} · {row.caseCaptionSnapshot}</option>)}</select></label><label>Tipo de actuación<input required value={actType} onChange={(e) => setActType(e.target.value)} placeholder="Escrito, providencia, resolución…" /></label><label>Fecha observada<input required type="datetime-local" value={actDate} onChange={(e) => setActDate(e.target.value)} /></label><label className="wide">Título<input required value={actTitle} onChange={(e) => setActTitle(e.target.value)} /></label><label className="wide">Descripción y antecedentes<textarea rows={4} value={actDescription} onChange={(e) => setActDescription(e.target.value)} /></label><label>Estado de verificación<select value={actVerification} onChange={(e) => setActVerification(e.target.value as CourtActuation["verification"])}><option value="observed">Observada</option><option value="reported">Informada</option><option value="document_verified">Verificada documentalmente</option></select></label><label className="wide">Referencias documentales<textarea rows={2} value={actDocuments} onChange={(e) => setActDocuments(e.target.value)} placeholder="Una referencia o ruta por línea. No se cargan archivos en esta pantalla." /></label><fieldset className="wide court-activity-link"><legend>Actividad derivada (opcional)</legend><label className="court-checkbox"><input type="checkbox" checked={createActivity} onChange={(e) => setCreateActivity(e.target.checked)} />Crear registro confirmado en Agenda / Tareas</label>{createActivity && <div className="court-activity-link-fields"><label>Tipo de actividad<select value={activityType} onChange={(e) => setActivityType(e.target.value as ActivityInput["type"])}><option value="tarea">Tarea</option><option value="audiencia">Audiencia</option><option value="reunion">Reunión</option><option value="recordatorio">Recordatorio</option><option value="vencimiento">Vencimiento ingresado y confirmado</option></select></label><label>Fecha confirmada<input required type="datetime-local" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} /></label><small>La fecha se registra tal como la confirma el profesional. El sistema no calcula plazos jurídicos.</small></div>}</fieldset></>}
        <div className="wide court-form-actions"><button className="agenda-button primary" disabled={saving}>{saving ? "Guardando…" : edit ? "Guardar corrección" : `Guardar ${mode === "round" ? "recorrida" : mode === "visit" ? "visita" : mode === "consultation" ? "consulta" : "actuación"}`}</button>{mode === "visit" && <small>Una visita sin novedades también se puede registrar.</small>}</div>
      </form>
    </section>
    <aside className="court-side-stack"><section className="data-card"><span className="agenda-eyebrow">JERARQUÍA DEL DÍA</span><h2>Recorrida activa</h2>{activeRound ? <><strong>{rounds.find((row) => row.id === activeRound)?.occurredOn}</strong><p>{visits.filter((row) => row.roundId === activeRound).length} visitas · {consultations.filter((row) => row.roundId === activeRound).length} consultas</p><button className="agenda-button secondary" type="button" onClick={() => { setMode("visit"); setVisitRound(activeRound); }}>+ Agregar visita</button></> : <p>Creá una recorrida para agrupar las visitas de una jornada. Las fechas y los registros se obtienen de Firestore.</p>}</section><section className="data-card"><span className="agenda-eyebrow">ACTUACIONES PROCESALES</span><h2>Registro independiente</h2><p>Una actuación puede vincularse con una consulta o cargarse directamente desde el expediente. Las fechas y el origen quedan registrados.</p><button type="button" className="agenda-button secondary" onClick={() => setMode("actuation")}>+ Registrar actuación</button></section></aside></div>
    <section className="data-card court-history-list"><div className="court-section-heading"><div><span className="agenda-eyebrow">CONSULTA Y TRAZABILIDAD</span><h2>Historial de actividad</h2></div><span>{loading ? "Consultando…" : `${filtered.length} registros`}</span></div><div className="court-filters"><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar expediente, organismo, novedad o fecha" aria-label="Buscar actividad de tribunales"/><select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="Filtrar por registro"><option value="todos">Todos los registros</option><option value="round">Recorridas</option><option value="visit">Visitas</option><option value="consultation">Consultas</option><option value="actuation">Actuaciones</option></select></div>
      {filtered.length === 0 ? <div className="court-empty"><strong>{loading ? "Cargando registros…" : "Todavía no hay actividad registrada"}</strong><span>Al crear recorridas, visitas, consultas o actuaciones, aparecerán acá desde la fuente persistente del estudio.</span></div> : <div className="court-record-list">{filtered.map((row) => { const item = row.kind === "round" ? rounds.find((x) => x.id === row.id) : row.kind === "visit" ? visits.find((x) => x.id === row.id) : row.kind === "consultation" ? consultations.find((x) => x.id === row.id) : actuations.find((x) => x.id === row.id); return <article key={`${row.kind}-${row.id}`}><div className="court-record-icon">{({ round: "◷", visit: "⌂", consultation: "⌕", actuation: "⚖" })[row.kind]}</div><div className="court-record-copy"><span>{({ round: "Recorrida", visit: "Visita a organismo", consultation: "Consulta de expediente", actuation: "Actuación procesal" })[row.kind]} · {when(row.date)}</span><h3>{row.title}</h3><p>{row.detail || "Sin observaciones adicionales."}</p>{row.kind === "consultation" && <small>Disponibilidad observada: {(item as CourtConsultation).availability.replaceAll("_", " ")} · No cambia el estado jurídico del expediente.</small>}{row.kind === "actuation" && <small>Verificación: {({ observed: "observada", reported: "informada", document_verified: "verificada documentalmente" })[(item as CourtActuation).verification]}</small>}</div><div className="court-record-actions"><button type="button" className="agenda-button secondary" onClick={() => loadForEdit(row.kind, row.id)}>Corregir</button><button type="button" className="agenda-button secondary" onClick={() => void showHistory(row.kind, row.id, row.title)}>Historial</button></div></article>; })}</div>}
    </section>
    {historyTitle && <div className="court-history-panel"><div className="court-section-heading"><h2>Historial · {historyTitle}</h2><button type="button" className="agenda-button secondary" onClick={() => { setHistoryTitle(""); setHistory([]); }}>Cerrar</button></div>{historyBusy ? <p>Consultando historial…</p> : history.length ? history.map((row, index) => <p key={`${row.at}-${index}`}><strong>{row.action === "created" ? "Creado" : "Corregido"}</strong> · {when(row.at)} · {row.actor}</p>) : <p>No hay antecedentes de modificación disponibles.</p>}</div>}
  </main>;
}
