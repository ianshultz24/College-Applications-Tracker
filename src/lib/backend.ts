import { DEFAULT_COLORS, DEFAULT_SETTINGS, isHex } from "./colors";
import type { Colors, Settings, School } from "./types";

/** Everything the UI needs from storage. Supabase in the app; in-memory in the dev preview. */
export interface Backend {
  userId: string;
  email: string | null;
  insertSchool(school: School): Promise<void>;
  updateSchool(id: string, patch: Partial<School>): Promise<void>;
  deleteSchool(id: string): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  uploadImage(path: string, file: Blob): Promise<void>;
  deleteImages(paths: string[]): Promise<void>;
  imageUrl(path: string): string;
  /** Fresh reads for "Download backup". */
  exportAll(): Promise<{ schools: School[]; settings: Settings }>;
  signOut(): Promise<void>;
}

export const SCHOOL_COLUMNS =
  "id,user_id,name,short_name,location,round,classification,deadline,decision_start,decision_end,submitted,status,acceptance_rate,sat_25,sat_75,supplements_done,supplements_total,portal_url,notes,custom_fields,logo_path,position,updated_at";

export const SETTINGS_COLUMNS = "colors,background_path,blur_px,dim,tile_size,show_names,shimmer,finishes,my_sat";

type SettingsRow = Partial<Omit<Settings, "colors">> & { colors?: Record<string, unknown> | null };

/** Database row (or nothing yet) -> settings with defaults filled in. */
export function settingsFromRow(row: SettingsRow | null | undefined): Settings {
  if (!row) return { ...DEFAULT_SETTINGS, colors: { ...DEFAULT_COLORS } };
  const colors = { ...DEFAULT_COLORS };
  for (const key of Object.keys(DEFAULT_COLORS) as (keyof Colors)[]) {
    const v = row.colors?.[key];
    if (typeof v === "string" && isHex(v)) colors[key] = v;
  }
  return {
    colors,
    background_path: row.background_path ?? null,
    blur_px: row.blur_px ?? DEFAULT_SETTINGS.blur_px,
    dim: row.dim ?? DEFAULT_SETTINGS.dim,
    tile_size: row.tile_size ?? DEFAULT_SETTINGS.tile_size,
    show_names: row.show_names ?? DEFAULT_SETTINGS.show_names,
    shimmer: row.shimmer ?? DEFAULT_SETTINGS.shimmer,
    finishes: row.finishes ?? DEFAULT_SETTINGS.finishes,
    my_sat: row.my_sat ?? null,
  };
}

/** Normalizes a school row from the database (jsonb + numeric safety). */
export function schoolFromRow(row: School): School {
  return {
    ...row,
    acceptance_rate: row.acceptance_rate == null ? null : Number(row.acceptance_rate),
    custom_fields: Array.isArray(row.custom_fields)
      ? row.custom_fields
          .filter((f) => f && typeof f === "object")
          .map((f) => ({ label: String(f.label ?? ""), value: String(f.value ?? "") }))
      : [],
  };
}

/** Storage paths always start with the owner's id (enforced by storage policies). */
export function logoPath(userId: string, schoolId: string) {
  return `${userId}/logos/${schoolId}-${Date.now().toString(36)}.webp`;
}

export function backgroundPath(userId: string) {
  return `${userId}/backgrounds/${Date.now().toString(36)}.webp`;
}
