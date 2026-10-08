import { normalizeUrl, parseNumber, validateSchool, type FieldErrors } from "./validate";
import type { Classification, CustomField, Round, School, SchoolFields, Status } from "./types";

/** Logo state inside the form. `new` is uploading (or uploaded) and not yet saved to the row. */
export type DraftLogo =
  | { kind: "none" }
  | { kind: "existing"; path: string }
  | { kind: "new"; preview: string; path: Promise<string> };

/** Everything the form edits, as strings (what the inputs hold). */
export type Draft = {
  id: string;
  status: Status;
  submitted: boolean;
  name: string;
  short_name: string;
  location: string;
  round: Round | null;
  classification: Classification | null;
  deadline: string;
  decision_start: string;
  decision_end: string;
  showEnd: boolean;
  acceptance_rate: string;
  sat_25: string;
  sat_75: string;
  supplements_done: string;
  supplements_total: string;
  portal_url: string;
  notes: string;
  custom_fields: CustomField[];
  logo: DraftLogo;
};

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

export function blankDraft(id: string): Draft {
  return {
    id,
    status: "pending",
    submitted: false,
    name: "",
    short_name: "",
    location: "",
    round: null,
    classification: null,
    deadline: "",
    decision_start: "",
    decision_end: "",
    showEnd: false,
    acceptance_rate: "",
    sat_25: "",
    sat_75: "",
    supplements_done: "",
    supplements_total: "",
    portal_url: "",
    notes: "",
    custom_fields: [],
    logo: { kind: "none" },
  };
}

export function toDraft(s: School): Draft {
  const start = s.decision_start ?? s.decision_end;
  const end = s.decision_start && s.decision_end && s.decision_end !== s.decision_start ? s.decision_end : null;
  return {
    id: s.id,
    status: s.status,
    submitted: s.submitted,
    name: s.name,
    short_name: str(s.short_name),
    location: str(s.location),
    round: s.round,
    classification: s.classification,
    deadline: str(s.deadline),
    decision_start: str(start),
    decision_end: str(end),
    showEnd: !!end,
    acceptance_rate: str(s.acceptance_rate),
    sat_25: str(s.sat_25),
    sat_75: str(s.sat_75),
    supplements_done: str(s.supplements_done),
    supplements_total: str(s.supplements_total),
    portal_url: str(s.portal_url),
    notes: str(s.notes),
    custom_fields: s.custom_fields.map((f) => ({ ...f })),
    logo: s.logo_path ? { kind: "existing", path: s.logo_path } : { kind: "none" },
  };
}

const text = (v: string) => (v.trim() ? v.trim() : null);
const num = (v: string) => {
  const n = parseNumber(v);
  return n === null || Number.isNaN(n) ? null : n;
};
const int = (v: string) => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};

/** Form values -> row fields (logo handled separately). */
export function fromDraft(d: Draft): Omit<SchoolFields, "logo_path"> {
  const end = d.showEnd && d.decision_end ? d.decision_end : null;
  return {
    name: d.name.trim(),
    short_name: text(d.short_name),
    location: text(d.location),
    round: d.round,
    classification: d.classification,
    status: d.status,
    submitted: d.submitted,
    deadline: d.deadline || null,
    decision_start: d.decision_start || end || null,
    decision_end: d.decision_start && end ? end : null,
    acceptance_rate: num(d.acceptance_rate),
    sat_25: int(d.sat_25),
    sat_75: int(d.sat_75),
    supplements_done: int(d.supplements_done),
    supplements_total: int(d.supplements_total),
    portal_url: normalizeUrl(d.portal_url),
    notes: text(d.notes),
    custom_fields: d.custom_fields
      .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
      .filter((f) => f.label || f.value),
  };
}

export function validateDraft(d: Draft): FieldErrors & { portal_url?: string } {
  const errors: FieldErrors & { portal_url?: string } = validateSchool({
    ...d,
    decision_end: d.showEnd ? d.decision_end : "",
  });
  if (d.portal_url.trim() && !normalizeUrl(d.portal_url)) errors.portal_url = "That doesn’t look like a web address";
  return errors;
}

/** True when saving would change something (used for "discard changes?"). */
export function isDirty(original: Draft, current: Draft): boolean {
  if (original.logo.kind !== current.logo.kind) return true;
  if (original.logo.kind === "existing" && current.logo.kind === "existing" && original.logo.path !== current.logo.path) return true;
  if (current.logo.kind === "new") return true;
  return JSON.stringify(fromDraft(original)) !== JSON.stringify(fromDraft(current));
}
