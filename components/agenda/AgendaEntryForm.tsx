"use client";

import { useState, type FormEvent } from "react";
import { ENTRY_STATUSES, ENTRY_TYPES, PRIORITIES, type AgendaAttachment, type AgendaEntry, type AgendaEntryInput } from "../../lib/agenda/agenda.types";
import { localDateTimeIso, localDateTimeValue } from "../../lib/agenda/calendar-date";
import { normalizeReferences, validateAgendaEntry, validateAgendaFile } from "../../lib/agenda/agenda.service";
import type { LegalCase } from "../../lib/cases/case.model";
import type { Client } from "../../lib/clients/client.model";

type Props = {
  entry: AgendaEntry | null;
  initialType: AgendaEntryInput["type"];
  cases: LegalCase[];
  clients: Client[];
  initialDate: Date;
  busy: boolean;
  onClose: () => void;
  onSave: (input: AgendaEntryInput, files: File[], reason: string) => Promise<void>;
  onDelete?: (entry: AgendaEntry) => Promise<void>;
};

const titleByType: Record<AgendaEntryInput["type"], string> = {
  audiencia: "Audiencia", vencimiento: "Vencimiento", reunion: "Reunión", tarea: "Tarea",
  recordatorio: "Recordatorio", nota: "Nota", otro: "Otro",
};

export function AgendaEntryForm({ entry, initialType, cases, clients, initialDate, busy, onClose, onSave, onDelete }: Props) {
  const initialStart = localDateTimeValue(entry?.startAt ?? initialDate);
  const initialEnd = entry?.endAt ? localDateTimeValue(entry.endAt) : "";
  const [type, setType] = useState<AgendaEntryInput["type"]>(entry?.type ?? initialType);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [startDate, setStartDate] = useState(initialStart.slice(0, 10));
  const [startTime, setStartTime] = useState(initialStart.slice(11, 16));
  const [endDate, setEndDate] = useState(initialEnd.slice(0, 10));
  const [endTime, setEndTime] = useState(initialEnd.slice(11, 16));
  const [allDay, setAllDay] = useState(entry?.allDay ?? false);
  const [isHighlighted, setIsHighlighted] = useState(entry?.isHighlighted ?? false);
  const [priority, setPriority] = useState<AgendaEntryInput["priority"]>(entry?.priority ?? "normal");
  const [status, setStatus] = useState<AgendaEntryInput["status"]>(entry?.status ?? "pendiente");
  const [caseIds, setCaseIds] = useState<string[]>(entry?.caseIds ?? []);
  const [clientIds, setClientIds] = useState<string[]>(entry?.clientIds ?? []);
  const [jurisdiction, setJurisdiction] = useState(entry?.jurisdiction ?? "");
  const [branch, setBranch] = useState(entry?.branch ?? "");
  const [location, setLocation] = useState(entry?.location ?? "");
  const [organization, setOrganization] = useState(entry?.organization ?? "");
  const [dateVerification, setDateVerification] = useState<AgendaEntryInput["dateVerification"]>(entry?.dateVerification ?? (entry?.type === "vencimiento" ? "pendiente" : "no_aplica"));
  const [meetingUrl, setMeetingUrl] = useState(entry?.meetingUrl ?? "");
  const [references, setReferences] = useState((entry?.references ?? []).join("\n"));
  const [attachments, setAttachments] = useState<AgendaAttachment[]>(entry?.attachments ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [reminders, setReminders] = useState((entry?.remindersMinutes ?? []).join(", "));
  const [repeat, setRepeat] = useState(entry?.recurrence?.frequency ?? "");
  const [repeatInterval, setRepeatInterval] = useState(entry?.recurrence?.interval ?? 1);
  const [repeatUntil, setRepeatUntil] = useState(entry?.recurrence?.until ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function selectFiles(selected: FileList | null) {
    const incoming = Array.from(selected ?? []);
    const invalid = incoming.map(validateAgendaFile).find(Boolean);
    if (invalid) { setError(invalid); return; }
    setError("");
    setFiles((previous) => [...previous, ...incoming]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const startAt = localDateTimeIso(startDate, startTime, allDay);
    const endAt = endDate ? localDateTimeIso(endDate, endTime, allDay) : null;
    const recurrence = repeat ? { frequency: repeat as "diaria" | "semanal" | "mensual", interval: Number(repeatInterval), until: repeatUntil } : null;
    const input: AgendaEntryInput = {
      type, title, description, notes, startAt, endAt,
      timeZone: entry?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      allDay, isHighlighted, priority, status,
      caseIds: caseIds as AgendaEntryInput["caseIds"], clientIds: clientIds as AgendaEntryInput["clientIds"],
      jurisdiction: jurisdiction.trim(), branch: branch.trim(), location: location.trim(), organization: organization.trim(),
      meetingUrl: meetingUrl.trim(), references: normalizeReferences(references), attachments,
      remindersMinutes: reminders.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value >= 0),
      recurrence, dateVerification: type === "vencimiento" ? (dateVerification === "no_aplica" ? "pendiente" : dateVerification) : "no_aplica",
    };
    const validationError = validateAgendaEntry(input);
    if (validationError) { setError(validationError); return; }
    if (endAt && new Date(endAt) < new Date(startAt)) { setError("La finalización no puede ser anterior al inicio."); return; }
    try { await onSave(input, files, reason); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la entrada."); }
  }

  return <div className="agenda-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="agenda-form-dialog" role="dialog" aria-modal="true" aria-labelledby="agenda-form-title">
      <header className="agenda-dialog-header"><div><span className="agenda-eyebrow">AGENDA DEL ESTUDIO</span><h2 id="agenda-form-title">{entry ? "Consultar / editar entrada" : "Registrar nueva entrada"}</h2><p>Los cambios y reprogramaciones quedan asentados en el historial.</p></div><button type="button" className="agenda-icon-button" onClick={onClose} aria-label="Cerrar">×</button></header>
      <form onSubmit={(event) => void submit(event)}>
        <div className="agenda-form-scroll">
          <div className="agenda-form-section"><div className="agenda-field-grid">
            <label>Tipo de actividad<select value={type} onChange={(event) => { const nextType = event.target.value as AgendaEntryInput["type"]; setType(nextType); if (nextType === "vencimiento" && dateVerification === "no_aplica") setDateVerification("pendiente"); }}>{ENTRY_TYPES.map((item) => <option key={item} value={item}>{titleByType[item]}</option>)}</select></label>
            <label className="agenda-field-wide">Título<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
            <label>Fecha de inicio<input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            {!allDay && <label>Hora de inicio<input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>}
            <label>Fecha de finalización <small>Opcional</small><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            {endDate && !allDay && <label>Hora de finalización<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>}
            <label className="agenda-check"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /> Día completo</label>
            <label>Prioridad<select value={priority} onChange={(event) => setPriority(event.target.value as AgendaEntryInput["priority"])}>{PRIORITIES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
            <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value as AgendaEntryInput["status"])}>{ENTRY_STATUSES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
            <label className="agenda-check"><input type="checkbox" checked={isHighlighted} onChange={(event) => setIsHighlighted(event.target.checked)} /> Destacar entrada</label>
          </div></div>
          <div className="agenda-form-section"><label>Descripción<textarea rows={3} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>Observaciones<textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div>
          <details className="agenda-advanced"><summary>Vinculaciones y opciones avanzadas</summary>
            <div className="agenda-form-section"><p className="agenda-form-note">Las asociaciones usan los registros existentes del estudio. También se puede guardar una actividad independiente.</p>
              <div className="agenda-field-grid">
                <label>Expedientes asociados (opcional)<select multiple value={caseIds} onChange={(event) => setCaseIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{cases.map((item) => <option key={item.id} value={item.id}>{item.caption}{item.number ? ` · ${item.number}` : ""}</option>)}</select></label>
                <label>Clientes asociados (opcional)<select multiple value={clientIds} onChange={(event) => setClientIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{clients.map((item) => <option key={item.id} value={item.id}>{item.displayName}{item.identifier ? ` · ${item.identifier}` : ""}</option>)}</select></label>
                <label>Jurisdicción<input value={jurisdiction} onChange={(event) => setJurisdiction(event.target.value)} /></label>
                <label>Fuero / ámbito<input value={branch} onChange={(event) => setBranch(event.target.value)} /></label>
                <label>Ubicación<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>
                <label>Organismo u organizador<input value={organization} onChange={(event) => setOrganization(event.target.value)} /></label>
                {type === "vencimiento" && <label>Verificación de fecha<select value={dateVerification} onChange={(event) => setDateVerification(event.target.value as AgendaEntryInput["dateVerification"])}><option value="pendiente">Pendiente de verificación</option><option value="verificada">Verificada por el profesional</option></select><small>El sistema no calcula ni valida plazos jurídicos.</small></label>}
                <label className="agenda-field-wide">Enlace de reunión<input type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} /></label>
                <label className="agenda-field-wide">Referencias (una por línea)<textarea rows={3} value={references} onChange={(event) => setReferences(event.target.value)} /></label>
                <label className="agenda-field-wide">Documentos adjuntos<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple onChange={(event) => selectFiles(event.target.files)} /><small>PDF o imágenes, máximo 20 MB por archivo; acceso sujeto a las reglas de Storage.</small></label>
                {attachments.length > 0 && <div className="agenda-field-wide agenda-attachment-list"><strong>Documentos vinculados</strong>{attachments.map((attachment) => <p key={attachment.path}>{attachment.name}</p>)}</div>}
                {files.length > 0 && <div className="agenda-field-wide agenda-attachment-list"><strong>Por cargar</strong>{files.map((file, index) => <p key={`${file.name}-${index}`}>{file.name}<button type="button" onClick={() => setFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))}>Quitar</button></p>)}</div>}
                <label>Recordatorios (minutos antes)<input inputMode="numeric" placeholder="Minutos, separados por coma" value={reminders} onChange={(event) => setReminders(event.target.value)} /><small>Se guarda la preferencia; todavía no se envían avisos automáticos.</small></label>
                <label>Repetición<select value={repeat} onChange={(event) => setRepeat(event.target.value as typeof repeat)}><option value="">No se repite</option><option value="diaria">Diaria</option><option value="semanal">Semanal</option><option value="mensual">Mensual</option></select></label>
                {repeat && <><label>Intervalo<input type="number" min="1" max="365" value={repeatInterval} onChange={(event) => setRepeatInterval(Number(event.target.value))} /></label><label>Repetir hasta<input type="date" value={repeatUntil} onChange={(event) => setRepeatUntil(event.target.value)} /></label><p className="agenda-form-note agenda-field-wide">Se guarda la regla; no se generan fechas ni ocurrencias automáticamente.</p></>}
              </div>
            </div>
            <div className="agenda-form-section"><label>Motivo de modificación / antecedente<textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Dejá constancia al cambiar o reprogramar" /></label></div>
          </details>
          {error && <p className="agenda-error" role="alert">{error}</p>}
        </div>
        <footer className="agenda-form-actions">{entry && onDelete && <button type="button" className="agenda-button danger-outline" disabled={busy} onClick={() => void onDelete(entry)}>Eliminar (conservar historial)</button>}<span className="agenda-action-spacer" /><button type="button" className="agenda-button secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="submit" className="agenda-button primary" disabled={busy}>{busy ? "Guardando…" : entry ? "Guardar cambios" : "Guardar entrada"}</button></footer>
      </form>
    </section>
  </div>;
}
