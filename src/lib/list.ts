/** The List view's logic: date lines (shared with the card), sorting, grouping and the summary numbers. */

import { countdownTo, decisionWindow, formatLocalDate, formatLocalRange } from "./dates";
import { CLASSIFICATIONS, ROUND_NAME, ROUNDS, STATUS_LABEL, type School, type Status } from "./types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A date with its countdown line. `strong` = due within two weeks. */
export type DateInfo = { value: string; sub?: string; strong: boolean };

/** `near` = the List view's short dates (no year within six months). */
export function deadlineInfo(s: School, now: Date, near = false): DateInfo | null {
  if (!s.deadline) return null;
  const decided = s.status !== "pending";
  let sub: string | undefined;
  let strong = false;
  if (!decided && !s.submitted) {
    const c = countdownTo(s.deadline, now);
    if (c) {
      sub = cap(c.label);
      strong = !c.past && c.days <= 14;
    }
  } else if (!decided && s.submitted) sub = "Submitted";
  return { value: formatLocalDate(s.deadline, now, near), sub, strong };
}

/** `range` = a window with two different days ("Decision window" rather than "Decision"). */
export function decisionInfo(s: School, now: Date, near = false): (DateInfo & { range: boolean }) | null {
  if (!s.decision_start && !s.decision_end) return null;
  const range = !!(s.decision_start && s.decision_end && s.decision_start !== s.decision_end);
  let sub: string | undefined;
  if (s.status === "pending") {
    const w = decisionWindow(s.decision_start, s.decision_end, now);
    if (w?.phase === "upcoming") sub = cap(w.countdown.label);
    else if (w?.phase === "open") sub = range ? `Open now · ends ${w.countdown.label}` : "Expected today";
    else if (w?.phase === "passed") sub = "Should be out";
  }
  return { value: formatLocalRange(s.decision_start, s.decision_end, now, near), sub, strong: false, range };
}

// ----- sorting -----

/** Status order for sorting and grouping: good news first. */
export const STATUS_ORDER: Status[] = ["accepted", "waitlisted", "deferred", "pending", "rejected", "withdrawn"];

export const SORT_KEYS = ["order", "name", "status", "round", "type", "deadline", "decision", "acceptance", "sat", "supplements"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
/** "asc" = smallest / earliest / A first. */
export type SortDir = "asc" | "desc";
export type Sort = { key: SortKey; dir: SortDir };

/** Each sort's name and the direction it starts in (the most useful one first). */
export const SORTS: Record<SortKey, { label: string; first: SortDir }> = {
  order: { label: "Your order", first: "asc" },
  name: { label: "Name", first: "asc" },
  status: { label: "Status", first: "asc" },
  round: { label: "Round", first: "asc" },
  type: { label: "Type", first: "asc" },
  deadline: { label: "Deadline", first: "asc" },
  decision: { label: "Decision", first: "asc" },
  acceptance: { label: "Acceptance", first: "asc" },
  sat: { label: "SAT", first: "desc" },
  supplements: { label: "Supplements", first: "desc" },
};

export const DEFAULT_SORT: Sort = { key: "order", dir: "asc" };

/** Supplements still to write, or null when the total isn't known. */
export function supplementsLeft(s: School): number | null {
  if (!s.supplements_total) return null;
  return s.supplements_total - Math.min(s.supplements_done ?? 0, s.supplements_total);
}

function satMiddle(s: School): number | null {
  if (s.sat_25 != null && s.sat_75 != null) return (s.sat_25 + s.sat_75) / 2;
  return s.sat_25 ?? s.sat_75 ?? null;
}

const indexOrNull = <T,>(list: readonly T[], v: T | null) => {
  const i = v == null ? -1 : list.indexOf(v);
  return i < 0 ? null : i;
};

/** The value a school is sorted by (null = no value; those always go last). Dates compare as "YYYY-MM-DD" text. */
export function sortValue(s: School, key: SortKey): number | string | null {
  switch (key) {
    case "order":
      return s.position;
    case "name":
      return s.name.trim().toLocaleLowerCase();
    case "status":
      return STATUS_ORDER.indexOf(s.status);
    case "round":
      return indexOrNull(ROUNDS, s.round);
    case "type":
      return indexOrNull(CLASSIFICATIONS, s.classification);
    case "deadline":
      return s.deadline || null;
    case "decision":
      return s.decision_start || s.decision_end || null;
    case "acceptance":
      return s.acceptance_rate;
    case "sat":
      return satMiddle(s);
    case "supplements":
      return supplementsLeft(s);
  }
}

export function sortSchools(schools: readonly School[], sort: Sort): School[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return schools
    .map((s) => ({ s, v: sortValue(s, sort.key) }))
    .sort((a, b) => {
      if (a.v == null || b.v == null) {
        if (a.v != null) return -1;
        if (b.v != null) return 1;
      } else if (a.v !== b.v) {
        const c = typeof a.v === "string" && typeof b.v === "string" ? a.v.localeCompare(b.v) : (a.v as number) - (b.v as number);
        if (c) return c * sign;
      }
      return a.s.position - b.s.position;
    })
    .map((x) => x.s);
}

/** Clicking a column: sort by it in its starting direction, or flip it if it's already the sort. */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: SORTS[key].first };
}

// ----- grouping -----

export const GROUP_BYS = ["none", "status", "round", "type"] as const;
export type GroupBy = (typeof GROUP_BYS)[number];
export const GROUP_LABEL: Record<GroupBy, string> = { none: "None", status: "Status", round: "Round", type: "Type" };

export type Group = { key: string; label: string; sub?: string; status?: Status; schools: School[] };

/** Splits an already-sorted list into sections (empty sections are left out; order inside each is kept). */
export function groupSchools(sorted: readonly School[], by: GroupBy): Group[] {
  if (by === "none") return [{ key: "all", label: "All schools", schools: [...sorted] }];
  const keys: (string | null)[] = by === "status" ? STATUS_ORDER : by === "round" ? [...ROUNDS, null] : [...CLASSIFICATIONS, null];
  const pick = (s: School) => (by === "status" ? s.status : by === "round" ? s.round : s.classification);
  return keys
    .map((k): Group => {
      const schools = sorted.filter((s) => pick(s) === k);
      if (by === "status") return { key: k!, label: STATUS_LABEL[k as Status], status: k as Status, schools };
      if (k == null) return { key: "none", label: by === "round" ? "No round" : "No type", schools };
      return { key: k, label: k, sub: by === "round" ? ROUND_NAME[k as keyof typeof ROUND_NAME] : undefined, schools };
    })
    .filter((g) => g.schools.length > 0);
}

// ----- summary -----

export type Summary = {
  total: number;
  counts: Record<Status, number>;
  /** Applications that went in (submitted, or already decided). */
  submitted: number;
  /** The soonest deadline still ahead for an undecided school that isn't submitted. */
  nextDeadline: { school: School; info: DateInfo } | null;
  /** The soonest decision still to come (or open now) for an undecided school. */
  nextDecision: { school: School; info: DateInfo } | null;
  supplements: { done: number; total: number };
  /** Where your SAT falls against each school's middle 50% (null when your SAT isn't set). */
  sat: { above: number; within: number; below: number } | null;
};

export function summarize(schools: readonly School[], mySat: number | null, now: Date): Summary {
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<Status, number>;
  let submitted = 0;
  const supplements = { done: 0, total: 0 };
  const sat = mySat == null ? null : { above: 0, within: 0, below: 0 };
  let deadline: School | null = null;
  let decision: School | null = null;
  let decisionKey = "";

  for (const s of schools) {
    counts[s.status]++;
    if (s.submitted || s.status !== "pending") submitted++;
    if (s.supplements_total) {
      supplements.total += s.supplements_total;
      supplements.done += Math.min(s.supplements_done ?? 0, s.supplements_total);
    }
    if (sat && mySat != null && s.sat_25 != null && s.sat_75 != null) {
      if (mySat > s.sat_75) sat.above++;
      else if (mySat < s.sat_25) sat.below++;
      else sat.within++;
    }
    if (s.status !== "pending") continue;
    if (!s.submitted && s.deadline) {
      const c = countdownTo(s.deadline, now);
      if (c && !c.past && (!deadline || s.deadline < deadline.deadline!)) deadline = s;
    }
    const w = decisionWindow(s.decision_start, s.decision_end, now);
    const key = s.decision_start || s.decision_end || "";
    if (w && w.phase !== "passed" && (!decision || key < decisionKey)) {
      decision = s;
      decisionKey = key;
    }
  }

  return {
    total: schools.length,
    counts,
    submitted,
    nextDeadline: deadline ? { school: deadline, info: deadlineInfo(deadline, now)! } : null,
    nextDecision: decision ? { school: decision, info: decisionInfo(decision, now)! } : null,
    supplements,
    sat,
  };
}
