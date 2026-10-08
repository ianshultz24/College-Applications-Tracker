/** Order matches the design: dots, status buttons and keys 1–6 all follow it. */
export const STATUSES = [
  "pending",
  "accepted",
  "waitlisted",
  "deferred",
  "rejected",
  "withdrawn",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Undecided",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  deferred: "Deferred",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const ROUNDS = ["ED1", "ED2", "EA", "REA", "RD", "Rolling"] as const;
export type Round = (typeof ROUNDS)[number];

export const ROUND_NAME: Record<Round, string> = {
  ED1: "Early Decision I",
  ED2: "Early Decision II",
  EA: "Early Action",
  REA: "Restrictive Early Action",
  RD: "Regular Decision",
  Rolling: "Rolling admission",
};

export const CLASSIFICATIONS = ["Reach+", "Reach", "Target", "Safety"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export type CustomField = { label: string; value: string };

/** Mirrors public.ct_schools. Dates are local calendar dates: "YYYY-MM-DD". */
export type School = {
  id: string;
  user_id: string;
  name: string;
  short_name: string | null;
  location: string | null;
  round: Round | null;
  classification: Classification | null;
  deadline: string | null;
  decision_start: string | null;
  decision_end: string | null;
  submitted: boolean;
  status: Status;
  acceptance_rate: number | null;
  sat_25: number | null;
  sat_75: number | null;
  supplements_done: number | null;
  supplements_total: number | null;
  portal_url: string | null;
  notes: string | null;
  custom_fields: CustomField[];
  logo_path: string | null;
  position: number;
  updated_at?: string;
};

/** The editable columns (everything except ids and bookkeeping). */
export type SchoolFields = Omit<School, "id" | "user_id" | "position" | "updated_at">;

/** Colors the person can change. Undecided tiles use `base`. */
export type ColorKey = Exclude<Status, "pending"> | "base" | "text";
export type Colors = Record<ColorKey, string>;

export const TILE_SIZES = { S: 116, M: 140, L: 168 } as const;
export type TileSize = keyof typeof TILE_SIZES;

/** Mirrors public.ct_settings (colors merged over defaults). */
export type Settings = {
  colors: Colors;
  background_path: string | null;
  blur_px: number;
  dim: number;
  tile_size: number;
  show_names: boolean;
  shimmer: boolean;
  my_sat: number | null;
};
