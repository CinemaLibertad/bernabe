"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { getClientAuth } from "../../lib/firebase/client";
import { createAgendaEntry, listAgendaEntries, listAgendaHistory, newAgendaEntryId, setAgendaEntryStatus, softDeleteAgendaEntry, updateAgendaEntry } from "../../lib/agenda/agenda.repository";
import { downloadAgendaFile, removeAgendaFile, uploadAgendaFile } from "../../lib/agenda/agenda.storage";
import { validateAgendaEntry } from "../../lib/agenda/agenda.service";
import type { AgendaAudit, AgendaEntry, AgendaEntryInput, EntryStatus, EntryType } from "../../lib/agenda/agenda.types";
import { calendarRange, dateKey, formatDate, shiftAnchor, type CalendarView } from "../../lib/agenda/calendar-date";
import { AgendaEntryDetail } from "./AgendaEntryDetail";
import { AgendaEntryForm } from "./AgendaEntryForm";
import { CalendarView as CalendarSurface } from "./CalendarView";
import { QuickNoteForm } from "./QuickNoteForm";

type Props = { initialDate: string };
type FilterType = EntryType | "";
type FilterStatus = EntryStatus | "";
const viewLabels: Record<CalendarView, string> = { month: "Mes", week: "Semana", day: "Día", list: "Lista" };
const activityLabels: Record<EntryType, string> = { audiencia: "Audiencia", vencimiento: "Vencimiento", reunion: "Reunión", tarea: "Tarea", recordatorio: "Recordatorio", nota: "Nota", otro: "Otro" };

export function AgendaWorkspace({ initialDate }: Props) {
  const [anchor, setAnchor] = useState(() => new Date(initialDate));
  const [view, setView] = useState<CalendarView>("month");
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [formEntry, setFormEntry] = useState<AgendaEntry | null>(null);
  const [formIsNew, setFormIsNew] = useState(true);
  const [initialEntryDate, setInitialEntryDate] = useState(() => new Date(initialDate));
  const [selected, setSelected] = useState<AgendaEntry | null>(null);
  const [history, setHistory] = useState<AgendaAudit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const range = useMemo(() => calendarRange(anchor, view), [anchor, view]);
  const fromKey = range.from.toISOString();
  const toKey = range.to.toISOString();

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    const user = getClientAuth().currentUser;
    if (!user) {
      setError("La sesión no está disponible. Volvé a ingresar para consultar la agenda.");
      setLoading(false);
      return () => { ignore = true; };
    }
    void listAgendaEntries(new Date(fromKey), new Date(toKey), includeArchived).then((items) => {
      if (!ignore) setEntries(items);
    }).catch((failure: unknown) => {
      if (!ignore) setError(failure instanceof Error ? failure.message : "No se pudo consultar Firestore.");
    }).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [fromKey, toKey, reloadKey, includeArchived]);

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("es-AR");
    const from = filterFrom ? new Date(`${filterFrom}T00:00:00`) : null;
    const to = filterTo ? new Date(`${filterTo}T23:59:59.999`) : null;
    return entries.filter((entry) => {
      const time = new Date(entry.startAt).getTime();
      if (filterType && entry.type !== filterType) return false;
      if (filterStatus && entry.status !== filterStatus) return false;
      if (from && time < from.getTime()) return false;
      if (to && time > to.getTime()) return false;
      if (!needle) return true;
      const corpus = [entry.title, entry.description, entry.notes, entry.caseId, entry.clientId, entry.jurisdiction, entry.branch, entry.judicialBody, entry.location, ...entry.references].join(" ").toLocaleLowerCase("es-AR");
      return corpus.includes(needle);
    });
  }, [entries, search, filterType, filterStatus, filterFrom, filterTo]);

  const now = new Date();
  const today = dateKey(now);
  const activeEntries = filteredEntries.filter((entry) => !["realizado", "cancelado"].includes(entry.status));
  const upcoming = activeEntries.filter((entry) => dateKey(new Date(entry.startAt)) >= today).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 6);
  const deadlines = activeEntries.filter((entry) => entry.type === "vencimiento").sort((a, b) => a.startAt.localeCompare(b.startAt));
  const passedDates = deadlines.filter((entry) => entry.allDay ? dateKey(new Date(entry.startAt)) < today : new Date(entry.startAt).getTime() < now.getTime());
  const highlighted = activeEntries.filter((entry) => entry.isHighlighted || entry.priority === "urgente").sort((a, b) => a.startAt.localeCompare(b.startAt));

  function reload() { setReloadKey((key) => key + 1); }
  function openNew(date = new Date()) {
    setInitialEntryDate(date);
    setFormEntry(null);
    setFormIsNew(true);
    setSelected(null);
    setFormOpen(true);
  }
  function openDetails(entry: AgendaEntry) {
    setSelected(entry);
    setHistory([]);
    setHistoryLoading(true);
    void listAgendaHistory(entry.id).then(setHistory).catch((failure: unknown) => {
      setHistory([{ action: "updated", actor: "", at: "", reason: failure instanceof Error ? `No se pudo cargar el historial: ${failure.message}` : "No se pudo cargar el historial." }]);
    }).finally(() => setHistoryLoading(false));
  }
  function openEdit(entry: AgendaEntry) {
    setFormEntry(entry);
    setFormIsNew(false);
    setInitialEntryDate(new Date(entry.startAt));
    setSelected(null);
    setFormOpen(true);
  }

  async function saveEntry(input: AgendaEntryInput, files: File[], reason: string) {
    const user = getClientAuth().currentUser;
    if (!user) throw new Error("La sesión venció; volvé a ingresar antes de guardar.");
    const validationError = validateAgendaEntry(input);
    if (validationError) throw new Error(validationError);
    setBusy(true);
    const uploaded: Awaited<ReturnType<typeof uploadAgendaFile>>[] = [];
    try {
      if (formIsNew) {
        const id = newAgendaEntryId();
        for (const file of files) uploaded.push(await uploadAgendaFile(id, file));
        await createAgendaEntry({ ...input, attachments: [...input.attachments, ...uploaded] }, user, id);
      } else if (formEntry) {
        for (const file of files) uploaded.push(await uploadAgendaFile(formEntry.id, file));
        await updateAgendaEntry(formEntry.id, { ...input, attachments: [...input.attachments, ...uploaded] }, user, reason);
      }
      setFormOpen(false);
      setSelected(null);
      reload();
    } catch (failure) {
      await Promise.allSettled(uploaded.map((file) => removeAgendaFile(file.path)));
      throw failure;
    } finally { setBusy(false); }
  }

  async function saveQuickNote(title: string, text: string) {
    const user = getClientAuth().currentUser;
    if (!user) throw new Error("La sesión venció; volvé a ingresar antes de guardar.");
    const current = new Date();
    const input: AgendaEntryInput = {
      type: "nota", title, description: text, notes: "", startAt: current.toISOString(), endAt: null,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, allDay: false, isHighlighted: false,
      priority: "normal", status: "pendiente", caseId: "", clientId: "", jurisdiction: "", branch: "", location: "", judicialBody: "", meetingUrl: "",
      references: [], attachments: [], remindersMinutes: [], recurrence: null,
    };
    const validationError = validateAgendaEntry(input);
    if (validationError) throw new Error(validationError);
    setBusy(true);
    try {
      await createAgendaEntry(input, user);
      setQuickNoteOpen(false);
      setAnchor(current);
      setView("month");
      reload();
    } finally { setBusy(false); }
  }

  async function deleteEntry(entry: AgendaEntry) {
    const reason = window.prompt("Motivo para archivar esta entrada. Se conservará en el historial:");
    if (reason === null) return;
    if (!reason.trim()) { window.alert("Ingresá un motivo para continuar."); return; }
    const user = getClientAuth().currentUser;
    if (!user) { setError("La sesión venció; volvé a ingresar."); return; }
    setBusy(true);
    try {
      await softDeleteAgendaEntry(entry.id, user, reason.trim());
      setSelected(null);
      setFormOpen(false);
      reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo archivar la entrada."); }
    finally { setBusy(false); }
  }

  async function cancelEntry(entry: AgendaEntry) {
    const reason = window.prompt("Motivo de cancelación:");
    if (reason === null) return;
    const user = getClientAuth().currentUser;
    if (!user) { setError("La sesión venció; volvé a ingresar."); return; }
    setBusy(true);
    try {
      await setAgendaEntryStatus(entry.id, "cancelado", user, reason.trim());
      setSelected(null);
      reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo cancelar la entrada."); }
    finally { setBusy(false); }
  }

  async function convertNoteToTask(entry: AgendaEntry) {
    const user = getClientAuth().currentUser;
    if (!user) return;
    setBusy(true);
    try {
      const { id: _id, studioId: _studioId, createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, updatedBy: _updatedBy, deletedAt: _deletedAt, ...input } = entry;
      await updateAgendaEntry(entry.id, { ...input, type: "tarea" }, user, "Nota convertida manualmente en tarea.");
      setSelected(null);
      reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo convertir la nota."); }
    finally { setBusy(false); }
  }

  function duplicateEntry(entry: AgendaEntry) {
    const copy = { ...entry, id: "", title: `Copia de ${entry.title}`, status: "pendiente" as EntryStatus, createdAt: "", updatedAt: "", createdBy: "", updatedBy: "", deletedAt: null };
    setFormEntry(copy);
    setFormIsNew(true);
    setInitialEntryDate(new Date(copy.startAt));
    setSelected(null);
    setFormOpen(true);
  }

  function exportCsv() {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = [["Inicio", "Título", "Tipo", "Estado", "Prioridad", "Expediente", "Cliente", "Jurisdicción", "Fuero", "Organismo", "Ubicación"], ...filteredEntries.map((entry) => [entry.startAt, entry.title, activityLabels[entry.type], entry.status, entry.priority, entry.caseId, entry.clientId, entry.jurisdiction, entry.branch, entry.judicialBody, entry.location])];
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map((value) => escape(String(value))).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agenda-${dateKey(anchor)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const heading = view === "day" ? formatDate(anchor) : view === "week" ? (() => {
    const { from, to } = calendarRange(anchor, "week");
    const last = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1);
    return `${formatDate(from, { day: "numeric", month: "short" })} – ${formatDate(last, { day: "numeric", month: "long", year: "numeric" })}`;
  })() : formatDate(anchor, { month: "long", year: "numeric" });

  return <main className="panel-main agenda-main">
    <div className="breadcrumbs">Inicio / <b>Agenda y calendario</b></div>
    <header className="agenda-page-heading"><div><span className="agenda-eyebrow">ORGANIZACIÓN DEL ESTUDIO</span><h1>Agenda y calendario</h1><p>Audiencias, compromisos, reuniones, notas y fechas cargadas por el estudio.</p></div><div className="agenda-heading-actions"><button type="button" className="agenda-button secondary" onClick={() => setQuickNoteOpen(true)}>＋ Nueva nota rápida</button><button type="button" className="agenda-button primary" onClick={() => openNew()}>＋ Nueva entrada</button></div></header>
    <div className="agenda-toolbar"><div className="agenda-date-navigation"><button type="button" aria-label="Período anterior" onClick={() => setAnchor((date) => shiftAnchor(date, view, -1))}>‹</button><button type="button" className="agenda-today" onClick={() => setAnchor(new Date())}>Hoy</button><button type="button" aria-label="Período siguiente" onClick={() => setAnchor((date) => shiftAnchor(date, view, 1))}>›</button><h2>{heading}</h2></div><div className="agenda-toolbar-actions"><div className="agenda-view-switch" aria-label="Vista del calendario">{(["month", "week", "day", "list"] as CalendarView[]).map((item) => <button key={item} type="button" className={view === item ? "selected" : ""} onClick={() => setView(item)}>{viewLabels[item]}</button>)}</div><button type="button" className="agenda-button secondary" onClick={() => window.print()}>Imprimir / Guardar PDF</button><button type="button" className="agenda-button secondary" onClick={exportCsv} disabled={filteredEntries.length === 0}>Exportar CSV</button></div></div>
    <div className="agenda-layout"><section className="agenda-calendar-panel"><div className="agenda-panel-title"><h2>{view === "list" ? "Registros del período" : "Calendario"}</h2>{!loading && <span>{filteredEntries.length} {filteredEntries.length === 1 ? "registro" : "registros"}</span>}</div>
      {error && <div className="agenda-error agenda-page-error" role="alert">{error}<button type="button" onClick={reload}>Reintentar</button></div>}
      {loading ? <div className="agenda-loading">Consultando agenda…</div> : view === "list" ? <div className="agenda-list-hint">La vista de lista está disponible en el listado consultable inferior.</div> : <CalendarSurface entries={filteredEntries} anchor={anchor} view={view} onCreate={openNew} onOpen={openDetails} />}
    </section><aside className="agenda-side-panel">
      <section className="agenda-side-card"><div className="agenda-side-heading"><h2>Próximas actividades</h2><span>{upcoming.length}</span></div>{upcoming.length ? upcoming.map((entry) => <button type="button" className="agenda-side-item" key={entry.id} onClick={() => openDetails(entry)}><time>{new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", hour: entry.allDay ? undefined : "2-digit", minute: entry.allDay ? undefined : "2-digit" }).format(new Date(entry.startAt))}</time><strong>{entry.title}</strong><small>{activityLabels[entry.type]}</small></button>) : <p className="agenda-empty-copy">No hay actividades próximas cargadas en este período.</p>}</section>
      <section className="agenda-side-card"><div className="agenda-side-heading"><h2>Fechas de vencimientos</h2><span>{deadlines.length}</span></div>{deadlines.length ? deadlines.slice(0, 6).map((entry) => <button type="button" className={`agenda-side-item${passedDates.includes(entry) ? " is-past-date" : ""}`} key={entry.id} onClick={() => openDetails(entry)}><time>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", ...(entry.allDay ? {} : { timeStyle: "short" }) }).format(new Date(entry.startAt))}{passedDates.includes(entry) && " · fecha transcurrida"}</time><strong>{entry.title}</strong><small>{entry.judicialBody || entry.caseId || "Sin referencia asociada"}</small></button>) : <p className="agenda-empty-copy">No hay vencimientos registrados en este período.</p>}</section>
      <section className="agenda-side-card"><div className="agenda-side-heading"><h2>Destacadas y urgentes</h2><span>{highlighted.length}</span></div>{highlighted.length ? highlighted.slice(0, 6).map((entry) => <button type="button" className="agenda-side-item" key={entry.id} onClick={() => openDetails(entry)}><time>{entry.priority} · {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(entry.startAt))}</time><strong>{entry.title}</strong><small>{activityLabels[entry.type]}</small></button>) : <p className="agenda-empty-copy">Todavía no hay entradas destacadas.</p>}</section>
      <section className="agenda-side-card"><div className="agenda-side-heading"><h2>Alertas de fechas</h2></div>{passedDates.length ? passedDates.map((entry) => <button type="button" className="agenda-side-item is-past-date" key={entry.id} onClick={() => openDetails(entry)}><strong>{entry.title}</strong><small>La fecha registrada ya transcurrió; verificá el estado y los antecedentes.</small></button>) : <p className="agenda-empty-copy">No hay fechas registradas ya transcurridas en este período.</p>}</section>
    </aside></div>
    <section className="agenda-records-panel" id="agenda-records"><header><div><span className="agenda-eyebrow">CONSULTA E HISTORIAL</span><h2>Listado de actividades registradas</h2></div></header><div className="agenda-filters"><label className="agenda-search-field">Buscar<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, texto, expediente, cliente, referencia…" /></label><label>Tipo<select value={filterType} onChange={(event) => setFilterType(event.target.value as FilterType)}><option value="">Todos</option>{Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Estado<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as FilterStatus)}><option value="">Todos</option>{["pendiente", "confirmado", "realizado", "postergado", "cancelado"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Desde<input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} /></label><label>Hasta<input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} /></label><label className="agenda-filter-check"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Incluir archivadas</label></div><CalendarSurface entries={filteredEntries} anchor={anchor} view="list" onCreate={openNew} onOpen={openDetails} /></section>
    {formOpen && <AgendaEntryForm key={formEntry?.id || (formIsNew ? "new" : "edit")} entry={formEntry} initialDate={initialEntryDate} busy={busy} onClose={() => setFormOpen(false)} onSave={saveEntry} onDelete={formIsNew ? undefined : deleteEntry} />}
    {quickNoteOpen && <QuickNoteForm busy={busy} onClose={() => setQuickNoteOpen(false)} onSave={saveQuickNote} />}
    {selected && <AgendaEntryDetail entry={selected} history={history} historyLoading={historyLoading} busy={busy} onClose={() => setSelected(null)} onEdit={() => openEdit(selected)} onDuplicate={() => duplicateEntry(selected)} onCancel={() => void cancelEntry(selected)} onDelete={() => void deleteEntry(selected)} onConvertToTask={() => void convertNoteToTask(selected)} />}
  </main>;
}
