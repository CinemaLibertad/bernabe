"use client";

import type { AgendaEntry } from "../../lib/agenda/agenda.types";
import { calendarDays, calendarRange, dateKey, entriesForDay, formatDate, type CalendarView } from "../../lib/agenda/calendar-date";

type Props = { entries: AgendaEntry[]; anchor: Date; view: CalendarView; onCreate: (date: Date) => void; onOpen: (entry: AgendaEntry) => void };
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const typeLabels: Record<AgendaEntry["type"], string> = { audiencia: "Audiencia", vencimiento: "Vencimiento", reunion: "Reunión", tarea: "Tarea", recordatorio: "Recordatorio", nota: "Nota", otro: "Otro" };

function EventButton({ entry, onOpen }: { entry: AgendaEntry; onOpen: (entry: AgendaEntry) => void }) {
  const time = entry.allDay ? "Día completo" : new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(entry.startAt));
  return <button type="button" className={`agenda-event event-${entry.type} priority-${entry.priority} status-${entry.status}${entry.isHighlighted ? " is-highlighted" : ""}`} onClick={() => onOpen(entry)} title={`${time} · ${entry.title}`}><span>{time}</span><strong>{entry.title}</strong><small>{typeLabels[entry.type]}{entry.caseId ? ` · ${entry.caseId}` : ""}</small></button>;
}

export function CalendarView({ entries, anchor, view, onCreate, onOpen }: Props) {
  if (view === "list") {
    return <div className="agenda-table-wrap"><table className="agenda-table"><thead><tr><th>Fecha y hora</th><th>Actividad</th><th>Tipo</th><th>Expediente / cliente</th><th>Estado</th><th>Prioridad</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} onClick={() => onOpen(entry)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpen(entry); }}><td>{entry.allDay ? formatDate(new Date(entry.startAt), { day: "2-digit", month: "2-digit", year: "numeric" }) : new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.startAt))}</td><td><strong>{entry.title}</strong>{entry.description && <small>{entry.description}</small>}</td><td>{typeLabels[entry.type]}</td><td>{entry.caseId || entry.clientId || "—"}</td><td><span className={`agenda-status status-${entry.status}`}>{entry.status}</span></td><td><span className={`agenda-priority priority-${entry.priority}`}>{entry.priority}</span></td></tr>)}</tbody></table>{entries.length === 0 && <div className="agenda-empty-state"><strong>No hay entradas para este período</strong><span>Al registrar una actividad aparecerá en esta lista.</span></div>}</div>;
  }

  const { from } = calendarRange(anchor, view);
  const days = view === "month" ? calendarDays(anchor) : Array.from({ length: view === "day" ? 1 : 7 }, (_, index) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + index));
  const isMonth = view === "month";
  return <div className={`agenda-calendar agenda-${view}`}>
    <div className="agenda-weekdays">{(view === "day" ? [weekdays[(anchor.getDay() + 6) % 7]] : weekdays).map((label, index) => <div key={`${label}-${index}`}>{label}</div>)}</div>
    {view === "day" && <div className="agenda-day-heading"><strong>{formatDate(anchor)}</strong><button type="button" onClick={() => onCreate(new Date(anchor))}>＋ Agregar actividad</button></div>}
    <div className="agenda-calendar-grid">{days.map((day) => {
      const dayEntries = entriesForDay(entries, day);
      const isOutside = isMonth && day.getMonth() !== anchor.getMonth();
      return <section className={`agenda-day-cell${isOutside ? " is-outside" : ""}${dateKey(day) === dateKey(new Date()) ? " is-today" : ""}`} key={dateKey(day)}>
        {view !== "day" && <button type="button" className="agenda-day-number" onClick={() => onCreate(new Date(day))} aria-label={`Nueva entrada para ${formatDate(day)}`}>{isMonth ? day.getDate() : formatDate(day, { day: "numeric", month: "short" })}</button>}
        <div className="agenda-day-events">{dayEntries.map((entry) => <EventButton key={entry.id} entry={entry} onOpen={onOpen} />)}{!isMonth && <button type="button" className="agenda-add-slot" onClick={() => onCreate(new Date(day))}>＋ Agregar</button>}</div>
      </section>;
    })}</div>
  </div>;
}
