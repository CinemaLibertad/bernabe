"use client";

import type { AgendaAudit, AgendaEntry } from "../../lib/agenda/agenda.types";
import { downloadAgendaFile } from "../../lib/agenda/agenda.storage";
import { formatDate } from "../../lib/agenda/calendar-date";

type Props = {
  entry: AgendaEntry;
  history: AgendaAudit[];
  historyLoading: boolean;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onConvertToTask: () => void;
};

const labels: Record<AgendaEntry["type"], string> = {
  audiencia: "Audiencia", vencimiento: "Vencimiento", reunion: "Reunión", tarea: "Tarea",
  recordatorio: "Recordatorio", nota: "Nota", otro: "Otro",
};

const actionLabels: Record<AgendaAudit["action"], string> = {
  created: "Entrada creada", updated: "Entrada modificada", rescheduled: "Fecha reprogramada",
  cancelled: "Entrada cancelada", deleted: "Entrada archivada", duplicated: "Entrada duplicada",
};

export function AgendaEntryDetail({ entry, history, historyLoading, busy, onClose, onEdit, onDuplicate, onCancel, onDelete, onConvertToTask }: Props) {
  const start = new Date(entry.startAt);
  const end = entry.endAt ? new Date(entry.endAt) : null;
  return <div className="agenda-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="agenda-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="agenda-detail-title">
      <header className="agenda-dialog-header"><div>
        {entry.isHighlighted && <span className="agenda-highlight-label">Destacada</span>}
        <span className={`agenda-priority priority-${entry.priority}`}>{entry.priority}</span>
        <span className={`agenda-status status-${entry.status}`}>{entry.status}</span>
        <h2 id="agenda-detail-title">{entry.title}</h2>
        <p>{labels[entry.type]} · {entry.allDay ? "Día completo" : new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeStyle: "short" }).format(start)}{end && !entry.allDay ? ` — ${new Intl.DateTimeFormat("es-AR", { timeStyle: "short" }).format(end)}` : ""}</p>
      </div><button type="button" className="agenda-icon-button" onClick={onClose} aria-label="Cerrar">×</button></header>
      <div className="agenda-detail-scroll">
        <dl className="agenda-detail-grid">
          <dt>Zona horaria</dt><dd>{entry.timeZone}</dd>
          {entry.caseIds.length > 0 && <><dt>Expedientes asociados</dt><dd>{entry.caseIds.join(", ")}</dd></>}
          {entry.clientIds.length > 0 && <><dt>Clientes asociados</dt><dd>{entry.clientIds.join(", ")}</dd></>}
          {entry.location && <><dt>Ubicación</dt><dd>{entry.location}</dd></>}
          {entry.organization && <><dt>Organismo u organizador</dt><dd>{entry.organization}</dd></>}
          {entry.meetingUrl && <><dt>Reunión</dt><dd><a href={entry.meetingUrl} target="_blank" rel="noreferrer">Abrir enlace</a></dd></>}
          {entry.description && <><dt>Descripción</dt><dd className="preserve-lines">{entry.description}</dd></>}
          {entry.notes && <><dt>Observaciones</dt><dd className="preserve-lines">{entry.notes}</dd></>}
          {entry.references.length > 0 && <><dt>Referencias</dt><dd>{entry.references.map((reference) => <div key={reference}>{reference}</div>)}</dd></>}
          {entry.remindersMinutes.length > 0 && <><dt>Recordatorios configurados</dt><dd>{entry.remindersMinutes.map((minutes) => `${minutes} min antes`).join(", ")}</dd></>}
          {entry.recurrence && <><dt>Repetición configurada</dt><dd>{entry.recurrence.frequency}, cada {entry.recurrence.interval}{entry.recurrence.until ? ` hasta ${formatDate(new Date(`${entry.recurrence.until}T12:00:00`), { day: "numeric", month: "long", year: "numeric" })}` : ""}</dd></>}
          {entry.attachments.length > 0 && <><dt>Documentos</dt><dd className="agenda-detail-attachments">{entry.attachments.map((attachment) => <button type="button" key={attachment.path} onClick={() => void downloadAgendaFile(attachment.path, attachment.name)}>{attachment.name} ↓</button>)}</dd></>}
        </dl>
        <p className="agenda-audit-note">Creada {entry.createdAt ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt)) : "—"} · Última modificación {entry.updatedAt ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.updatedAt)) : "—"} · Responsable: {entry.updatedBy || entry.createdBy}</p>
        <section className="agenda-history"><h3>Historial de cambios</h3>
          {historyLoading ? <p>Cargando historial…</p> : history.length === 0 ? <p>No hay cambios registrados.</p> : history.map((item, index) => <article key={`${item.at}-${index}`}><strong>{actionLabels[item.action]}</strong><time>{item.at ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.at)) : ""}</time><small>{item.actor}{item.previousStartAt && item.nextStartAt && item.previousStartAt !== item.nextStartAt ? ` · ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.previousStartAt))} → ${new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.nextStartAt))}` : ""}</small>{item.reason && <p>{item.reason}</p>}</article>)}
        </section>
      </div>
      <footer className="agenda-form-actions"><button className="agenda-button danger-outline" type="button" onClick={onDelete} disabled={busy}>Eliminar con historial</button><span className="agenda-action-spacer" />{entry.type === "nota" && <button className="agenda-button secondary" type="button" onClick={onConvertToTask} disabled={busy}>Convertir en tarea</button>}<button className="agenda-button secondary" type="button" onClick={onCancel} disabled={busy || entry.status === "cancelado"}>Cancelar actividad</button><button className="agenda-button secondary" type="button" onClick={onDuplicate} disabled={busy}>Duplicar</button><button className="agenda-button primary" type="button" onClick={onEdit} disabled={busy}>Editar / reprogramar</button></footer>
    </section>
  </div>;
}
