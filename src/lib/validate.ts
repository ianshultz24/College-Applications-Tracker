/** Light, friendly validation. Returns a message per invalid field (empty = valid). */

export type NumberFields = {
  acceptance_rate: string;
  sat_25: string;
  sat_75: string;
  supplements_done: string;
  supplements_total: string;
};

export type FieldErrors = Partial<Record<keyof NumberFields | "name" | "decision_end", string>>;

/** "" -> null, "12.5" -> 12.5, "abc" -> NaN. */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim().replace(/%$/, "").replace(/,/g, "");
  if (trimmed === "") return null;
  return Number(trimmed);
}

export function validateSat(value: string): string | undefined {
  const n = parseNumber(value);
  if (n === null) return undefined;
  if (!Number.isInteger(n) || n < 400 || n > 1600) return "SAT is 400–1600";
  return undefined;
}

export function validateAcceptance(value: string): string | undefined {
  const n = parseNumber(value);
  if (n === null) return undefined;
  if (Number.isNaN(n) || n < 0 || n > 100) return "Use 0–100";
  return undefined;
}

function validateCount(value: string): string | undefined {
  const n = parseNumber(value);
  if (n === null) return undefined;
  if (!Number.isInteger(n) || n < 0 || n > 99) return "Whole number";
  return undefined;
}

export function validateSchool(input: {
  name: string;
  decision_start: string;
  decision_end: string;
} & NumberFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name.trim()) errors.name = "Name is required";

  const a = validateAcceptance(input.acceptance_rate);
  if (a) errors.acceptance_rate = a;

  const s25 = validateSat(input.sat_25);
  const s75 = validateSat(input.sat_75);
  if (s25) errors.sat_25 = s25;
  if (s75) errors.sat_75 = s75;
  if (!s25 && !s75) {
    const lo = parseNumber(input.sat_25);
    const hi = parseNumber(input.sat_75);
    if (lo !== null && hi !== null && lo > hi) errors.sat_75 = "Should be ≥ 25th";
  }

  const done = validateCount(input.supplements_done);
  const total = validateCount(input.supplements_total);
  if (done) errors.supplements_done = done;
  if (total) errors.supplements_total = total;
  if (!done && !total) {
    const d = parseNumber(input.supplements_done);
    const t = parseNumber(input.supplements_total);
    if (d !== null && t !== null && d > t) errors.supplements_done = "More than total";
  }

  if (input.decision_start && input.decision_end && input.decision_end < input.decision_start) {
    errors.decision_end = "Ends before it starts";
  }
  return errors;
}

/** Adds https:// when a portal URL is typed without a scheme. Rejects non-http(s). */
export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
