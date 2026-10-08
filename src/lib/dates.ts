/**
 * All `date` columns are local calendar dates ("YYYY-MM-DD").
 * Never use `new Date("YYYY-MM-DD")`: that parses as UTC midnight and shows the
 * previous day west of Greenwich. Build dates from their parts instead.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-11-01" -> local midnight on Nov 1. Returns null for anything invalid. */
export function parseLocalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  // Reject rollovers like 2026-02-31.
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/** Local Date -> "YYYY-MM-DD" (for <input type="date"> and the database). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 23:59:59.999 local time on the given calendar day. */
export function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Whole calendar days from `from`'s day to `to`'s day (DST-safe). */
export function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

export type Countdown = {
  /** Calendar days until the day (0 = today, negative = past). */
  days: number;
  /** Milliseconds until the end of that day (negative once it is over). */
  msLeft: number;
  past: boolean;
  label: string;
};

/** Countdown to the END of a local calendar day. */
export function countdownTo(value: string | null | undefined, now: Date = new Date()): Countdown | null {
  const day = parseLocalDate(value);
  if (!day) return null;
  const msLeft = endOfLocalDay(day).getTime() - now.getTime();
  const days = calendarDaysBetween(now, day);
  const past = msLeft < 0;

  let label: string;
  if (past) {
    const ago = Math.max(1, -days);
    label = ago === 1 ? "yesterday" : `${ago} days ago`;
  } else if (days === 0) {
    const hours = Math.floor(msLeft / 3_600_000);
    label = hours >= 1 ? `today · ${hours}h left` : "today · <1h left";
  } else if (days === 1) {
    label = "tomorrow";
  } else {
    label = `in ${days} days`;
  }
  return { days, msLeft, past, label };
}

export type DecisionWindow =
  | { phase: "upcoming"; countdown: Countdown }
  | { phase: "open"; countdown: Countdown }
  | { phase: "passed"; countdown: Countdown };

/**
 * Decision date or range. Before the start: counts down to the start.
 * Inside the range: "open", counting down to the end. After: passed.
 */
export function decisionWindow(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date(),
): DecisionWindow | null {
  const first = start || end;
  const last = end || start;
  const toStart = countdownTo(first, now);
  const toEnd = countdownTo(last, now);
  if (!toStart || !toEnd) return null;

  const startDay = parseLocalDate(first)!;
  if (now.getTime() < startDay.getTime()) return { phase: "upcoming", countdown: toStart };
  if (!toEnd.past) return { phase: "open", countdown: toEnd };
  return { phase: "passed", countdown: toEnd };
}

const SHORT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const SHORT_YEAR = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

/** "Nov 1" (adds the year when it isn't the current year). */
export function formatLocalDate(value: string | null | undefined, now: Date = new Date()): string {
  const d = parseLocalDate(value);
  if (!d) return "";
  return (d.getFullYear() === now.getFullYear() ? SHORT : SHORT_YEAR).format(d);
}

/** "Mar 15 – Apr 1" or a single date. */
export function formatLocalRange(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date(),
): string {
  if (start && end && start !== end) return `${formatLocalDate(start, now)} – ${formatLocalDate(end, now)}`;
  return formatLocalDate(start || end, now);
}
