import type { AgendaEntry } from "./agenda.types";

export type CalendarView = "month" | "week" | "day" | "list";

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function localDateTimeValue(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${dateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function localDateTimeIso(date: string, time: string, allDay: boolean): string {
  return new Date(`${date}T${allDay ? "00:00" : time || "09:00"}`).toISOString();
}

export function calendarRange(anchor: Date, view: CalendarView): { from: Date; to: Date } {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (view === "day") return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1) };
  if (view === "week") {
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7) };
  }
  if (view === "list") return { from: new Date(anchor.getFullYear(), anchor.getMonth(), 1), to: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1) };
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  first.setDate(1 - ((first.getDay() + 6) % 7));
  return { from: first, to: new Date(first.getFullYear(), first.getMonth(), first.getDate() + 42) };
}

export function calendarDays(anchor: Date): Date[] {
  const { from } = calendarRange(anchor, "month");
  return Array.from({ length: 42 }, (_, index) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + index));
}

export function entriesForDay(entries: AgendaEntry[], day: Date): AgendaEntry[] {
  const key = dateKey(day);
  return entries.filter((entry) => dateKey(new Date(entry.startAt)) <= key && (!entry.endAt || dateKey(new Date(entry.endAt)) >= key)).sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  return new Intl.DateTimeFormat("es-AR", options).format(date);
}

export function shiftAnchor(anchor: Date, view: CalendarView, direction: number): Date {
  const next = new Date(anchor);
  if (view === "day") next.setDate(next.getDate() + direction);
  else if (view === "week") next.setDate(next.getDate() + 7 * direction);
  else next.setMonth(next.getMonth() + direction);
  return next;
}
