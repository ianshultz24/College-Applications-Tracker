export const STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "waitlisted",
  "deferred",
  "withdrawn",
] as const;
export type Status = (typeof STATUSES)[number];

export const ROUNDS = ["ED1", "ED2", "EA", "REA", "RD", "Rolling"] as const;
export type Round = (typeof ROUNDS)[number];

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
  created_at: string;
  updated_at: string;
};

export type SchoolInput = Omit<School, "user_id" | "created_at" | "updated_at">;

export type ColorKey = Status | "tileBase" | "text";
export type Colors = Partial<Record<ColorKey, string>>;

/** Mirrors public.ct_settings. */
export type Settings = {
  user_id: string;
  colors: Colors;
  background_path: string | null;
  blur_px: number;
  dim: number;
  tile_size: number | null;
  show_names: boolean;
  my_sat: number | null;
};
