"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getClientAuth } from "../../lib/firebase/client";
import { changeActivityStatus, listActivityHistory, listCases, listClients, listTasksAndDeadlines } from "../../lib/firebase/domain-repositories";
import { filterTaskRecords, isOverdue, type TaskViewFilter } from "../../lib/tasks/task.service";
import type { Activity, ActivityAudit } from "../../lib/activities/activity.model";
import type { LegalCase } from "../../lib/cases/case.model";
import type { Client } from "../../lib/clients/client.model";

const filters: Array<{ value: TaskViewFilter; label: string }> = [
  { value: "todas", label: "Todas" }, { value: "pendientes", label: "Pendientes" },
  { value: "vencidas", label: "Fechas transcurridas" }, { value: "completadas", label: "Realizadas" },
];
const typeLabel: Record<Activity["type"], string> = {
  audiencia: "Audiencia", vencimiento: "Vencimiento", reunion: "Reunión", tarea: "Tarea",
  recordatorio: "Recordatorio", nota: "Nota", otro: "Actividad",
};
const dateLabel = (item: Activity) => new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium", ...(item.allDay ? {} : { timeStyle: "short" as const }), timeZone: item.timeZone || "America/Argentina/Buenos_Aires",
}).format(new Date(item.startAt));
const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

export function TasksWorkspace() {
  const router = useRouter();
  const [records, setRecords] = useState<Activity[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<TaskViewFilter>("todas");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "tarea" | "vencimiento">("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [caseFilter, setCaseFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Activity | null>(null);
  const [history, setHistory] = useState<ActivityAudit[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRows, caseRows, clientRows] = await Promise.all([listTasksAndDeadlines(), listCases(), listClients()]);
      setRecords(taskRows); setCases(caseRows); setClients(clientRows); setError("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudieron consultar tareas y vencimientos."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const now = new Date();
  const today = dayKey(now);
  const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  const pending = records.filter((item) => !["realizado", "cancelado"].includes(item.status));
  const overdue = pending.filter((item) => isOverdue(item, now));
  const dueToday = pending.filter((item) => item.type === "vencimiento" && dayKey(new Date(item.startAt)) === today);
  const upcoming = pending.filter((item) => new Date(item.startAt) >= now && new Date(item.startAt) <= weekEnd);
  const visible = useMemo(() => {
    const base = filterTaskRecords(records, filter, search, now);
    return base.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false;
      if (priorityFilter && item.priority !== priorityFilter) return false;
      if (caseFilter && !item.caseIds.includes(caseFilter as Activity["caseIds"][number])) return false;
      if (clientFilter && !item.clientIds.includes(clientFilter as Activity["clientIds"][number])) return false;
      const key = dayKey(new Date(item.startAt));
      if (periodFilter === "hoy" && key !== today) return false;
      if (periodFilter === "semana" && (key < today || key > dayKey(weekEnd))) return false;
      if (periodFilter === "mes" && key.slice(0, 7) !== today.slice(0, 7)) return false;
      return true;
    });
  }, [records, filter, search, typeFilter, priorityFilter, caseFilter, clientFilter, periodFilter, today, weekEnd, now]);

  async function openDetail(item: Activity) {
    setSelected(item); setHistory([]); setHistoryLoading(true);
    try { setHistory(await listActivityHistory(item.id)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo consultar el historial de la actividad."); }
    finally { setHistoryLoading(false); }
  }

  async function markDone(item: Activity) {
    const user = getClientAuth().currentUser;
    if (!user) { setError("La sesión no está disponible."); return; }
    setBusyId(item.id);
    try { await changeActivityStatus(item.id, "realizado", user, "Marcada como realizada desde Tareas y vencimientos."); await refresh(); setSelected((current) => current?.id === item.id ? { ...current, status: "realizado" } : current); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo actualizar el estado."); }
    finally { setBusyId(""); }
  }

  const associated = (item: Activity) => {
    const labels = [
      ...item.caseIds.map((id) => cases.find((record) => record.id === id)?.caption).filter((value): value is string => Boolean(value)),
      ...item.clientIds.map((id) => clients.find((record) => record.id === id)?.displayName).filter((value): value is string => Boolean(value)),
    ];
    return labels.length ? labels.join(" · ") : "Sin asociación";
  };

  return <main className="panel-main tasks-main">
    <div className="breadcrumbs">Inicio / Gestión general / <b>Tareas y vencimientos</b></div>
    <header className="domain-heading"><div><span className="agenda-eyebrow">ORGANIZACIÓN DEL TRABAJO DEL ESTUDIO</span><h1>Tareas y vencimientos</h1><p>Seguimiento de tareas y fechas ingresadas por el profesional. El sistema no calcula plazos jurídicos.</p></div><div className="domain-actions"><button className="agenda-button secondary" onClick={() => router.push("/panel/agenda?newType=vencimiento")}>＋ Nuevo vencimiento</button><button className="agenda-button primary" onClick={() => router.push("/panel/agenda?newType=tarea")}>＋ Nueva tarea</button></div></header>
    <section className="task-summary" aria-label="Resumen calculado desde los registros actuales"><article><span>Tareas y vencimientos pendientes</span><strong>{loading ? "—" : pending.length}</strong><small>Registros operativos activos</small></article><article className={dueToday.length ? "task-summary-alert" : ""}><span>Vencimientos con fecha de hoy</span><strong>{loading ? "—" : dueToday.length}</strong><small>Fecha cargada; sin cálculo legal automático</small></article><article><span>Próximos siete días</span><strong>{loading ? "—" : upcoming.length}</strong><small>Tareas y fechas registradas</small></article><article className={overdue.length ? "task-summary-alert" : ""}><span>Fechas transcurridas</span><strong>{loading ? "—" : overdue.length}</strong><small>Requieren revisión del profesional</small></article></section>
    {error && <p className="agenda-error" role="alert">{error}<button onClick={() => void refresh()}>Reintentar</button></p>}
    <section className="task-toolbar" aria-label="Filtros de tareas y vencimientos"><label>Buscar<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, texto o referencia" /></label><label>Período<select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}><option value="todos">Todo el período</option><option value="hoy">Hoy</option><option value="semana">Próximos 7 días</option><option value="mes">Este mes</option></select></label><label>Tipo<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}><option value="">Tareas y vencimientos</option><option value="tarea">Tareas</option><option value="vencimiento">Vencimientos</option></select></label><label>Prioridad<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">Todas</option><option value="urgente">Urgente</option><option value="importante">Importante</option><option value="normal">Normal</option></select></label><label>Expediente<select value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)}><option value="">Todos</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.caption}</option>)}</select></label><label>Cliente<select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)}><option value="">Todos</option>{clients.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label></section>
    <div className="task-filter-tabs" aria-label="Estado de los registros">{filters.map((item) => <button key={item.value} className={filter === item.value ? "selected" : ""} onClick={() => setFilter(item.value)}>{item.label}{item.value === "vencidas" ? ` · ${overdue.length}` : ""}</button>)}</div>
    <div className="task-list-layout"><section className="data-card task-records"><header className="task-records-heading"><div><span className="agenda-eyebrow">FUENTE ÚNICA: ACTIVIDADES DEL ESTUDIO</span><h2>Registros operativos</h2></div><span>{loading ? "Consultando…" : `${visible.length} registros`}</span></header>
      {loading ? <p className="agenda-loading">Consultando registros…</p> : visible.length === 0 ? <div className="agenda-empty-state"><strong>{records.length ? "No hay coincidencias" : "Todavía no hay tareas ni vencimientos"}</strong><span>Los registros creados desde este módulo o desde Agenda aparecerán aquí.</span></div> : <div className="domain-table-wrap"><table className="domain-table"><thead><tr><th>Fecha / hora</th><th>Compromiso</th><th>Expediente / cliente</th><th>Prioridad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id} className={isOverdue(item) ? "task-overdue-row" : ""}><td>{dateLabel(item)}{isOverdue(item) && <span className="task-overdue-label">Fecha transcurrida</span>}</td><td><button type="button" className="task-priority-link" onClick={() => void openDetail(item)}><strong>{item.title}</strong></button><small>{typeLabel[item.type]}{item.description ? ` · ${item.description}` : ""}</small>{item.type === "vencimiento" && item.dateVerification !== "verificada" && <span className="task-validation-badge">{item.dateVerification === "pendiente" ? "Fecha pendiente de validar" : "Fecha registrada por el profesional"}</span>}</td><td>{associated(item)}</td><td><span className={`task-priority priority-${item.priority}`}>{item.priority}</span></td><td><span className={`agenda-status status-${item.status}`}>{item.status}</span></td><td className="task-row-actions"><button className="agenda-button secondary" onClick={() => router.push(`/panel/agenda?activityId=${encodeURIComponent(item.id)}`)}>Abrir / reprogramar</button>{!['realizado', 'cancelado'].includes(item.status) && <button className="agenda-button primary" disabled={busyId === item.id} onClick={() => void markDone(item)}>{busyId === item.id ? "Guardando…" : "Marcar cumplida"}</button>}</td></tr>)}</tbody></table></div>}
    </section><aside className="task-side-panel"><section className="task-side-card"><h2>Prioridad inmediata</h2>{overdue.length ? overdue.slice(0, 5).map((item) => <button key={item.id} className="task-priority-item urgent" onClick={() => void openDetail(item)}><strong>{item.title}</strong><small>{typeLabel[item.type]} · {dateLabel(item)}</small></button>) : <p>No hay tareas ni fechas registradas con fecha transcurrida.</p>}</section><section className="task-side-card"><h2>Próximos compromisos</h2>{upcoming.length ? upcoming.slice(0, 5).map((item) => <button key={item.id} className="task-priority-item" onClick={() => void openDetail(item)}><strong>{item.title}</strong><small>{typeLabel[item.type]} · {dateLabel(item)}</small></button>) : <p>No hay registros próximos dentro de los siguientes siete días.</p>}</section></aside></div>
    {selected && <div className="agenda-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="agenda-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="task-detail-title"><header className="agenda-dialog-header"><div><span className="agenda-eyebrow">{typeLabel[selected.type].toLocaleUpperCase("es-AR")} · {selected.status.toLocaleUpperCase("es-AR")}</span><h2 id="task-detail-title">{selected.title}</h2><p>{dateLabel(selected)} · Prioridad {selected.priority}</p></div><button type="button" className="agenda-icon-button" onClick={() => setSelected(null)} aria-label="Cerrar">×</button></header><div className="agenda-detail-scroll"><dl className="agenda-detail-grid"><dt>Expediente / cliente</dt><dd>{associated(selected)}</dd><dt>Descripción</dt><dd className="preserve-lines">{selected.description || "Sin descripción"}</dd><dt>Observaciones</dt><dd className="preserve-lines">{selected.notes || "Sin observaciones"}</dd>{selected.type === "vencimiento" && <><dt>Verificación de fecha</dt><dd>{selected.dateVerification === "verificada" ? "Verificada por el profesional" : selected.dateVerification === "pendiente" ? "Pendiente de validación profesional" : "Fecha ingresada; no calculada por el sistema"}</dd></>}</dl><section className="agenda-history"><h3>Historial de cambios</h3>{historyLoading ? <p>Consultando antecedentes…</p> : history.length ? history.map((entry, index) => <article key={`${entry.at}-${index}`}><strong>{entry.action === "rescheduled" ? "Fecha reprogramada" : entry.action === "created" ? "Registro creado" : entry.action === "cancelled" ? "Registro cancelado" : "Registro actualizado"}</strong><time>{entry.at ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.at)) : "Fecha no disponible"}</time><small>{entry.actor}{entry.reason ? ` · ${entry.reason}` : ""}</small>{entry.previousStartAt && <p>Anterior: {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.previousStartAt))}</p>}</article>) : <p>No hay antecedentes disponibles.</p>}</section></div><footer className="agenda-form-actions"><button type="button" className="agenda-button secondary" onClick={() => router.push(`/panel/agenda?activityId=${encodeURIComponent(selected.id)}`)}>Abrir registro y editar</button><span className="agenda-action-spacer" />{!["realizado", "cancelado"].includes(selected.status) && <button type="button" className="agenda-button primary" disabled={busyId === selected.id} onClick={() => void markDone(selected)}>{busyId === selected.id ? "Guardando…" : "Marcar cumplida"}</button>}</footer></section></div>}
  </main>;
}
