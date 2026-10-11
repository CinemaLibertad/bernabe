import type { Activity } from "../activities/activity.model";

export type TaskViewFilter = "todas" | "pendientes" | "vencidas" | "completadas";

export function isOverdue(activity: Activity, now = new Date()): boolean {
  if (activity.status === "realizado" || activity.status === "cancelado") return false;
  if (activity.allDay) {
    const dueDay = new Intl.DateTimeFormat("en-CA", { timeZone: activity.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(activity.startAt));
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: activity.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    return dueDay < today;
  }
  const end = activity.endAt ? new Date(activity.endAt) : new Date(activity.startAt);
  return end.getTime() < now.getTime();
}

export function filterTaskRecords(items: Activity[], filter: TaskViewFilter, search: string, now = new Date()): Activity[] {
  const needle = search.trim().toLocaleLowerCase("es-AR");
  return items.filter((item) => {
    if (filter === "pendientes" && ["realizado", "cancelado"].includes(item.status)) return false;
    if (filter === "vencidas" && !isOverdue(item, now)) return false;
    if (filter === "completadas" && item.status !== "realizado") return false;
    if (!needle) return true;
    return [item.title, item.description, item.notes, item.jurisdiction, item.branch, ...item.references].join(" ").toLocaleLowerCase("es-AR").includes(needle);
  });
}
