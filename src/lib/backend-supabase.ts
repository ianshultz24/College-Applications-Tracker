import { createClient } from "./supabase/client";
import { SCHOOL_COLUMNS, SETTINGS_COLUMNS, schoolFromRow, settingsFromRow, type Backend } from "./backend";
import type { School, Settings } from "./types";

const BUCKET = "ct-images";

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export function createSupabaseBackend(userId: string, email: string | null): Backend {
  const supabase = createClient();

  return {
    userId,
    email,

    async insertSchool(school) {
      const { error } = await supabase.from("ct_schools").insert({ ...school, user_id: userId });
      fail(error);
    },

    async updateSchool(id, patch) {
      // Never send ownership/bookkeeping columns in an update.
      const { id: _id, user_id: _u, updated_at: _t, ...rest } = patch as School;
      void _id;
      void _u;
      void _t;
      const { error, count } = await supabase
        .from("ct_schools")
        .update(rest, { count: "exact" })
        .eq("id", id);
      fail(error);
      if (count === 0) throw new Error("That school no longer exists.");
    },

    async deleteSchool(id) {
      const { error } = await supabase.from("ct_schools").delete().eq("id", id);
      fail(error);
    },

    async saveSettings(settings: Settings) {
      const { error } = await supabase
        .from("ct_settings")
        .upsert({ user_id: userId, ...settings }, { onConflict: "user_id" });
      fail(error);
    },

    async uploadImage(path, file) {
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
      fail(error);
    },

    async deleteImages(paths) {
      const mine = paths.filter((p) => p && p.startsWith(`${userId}/`));
      if (!mine.length) return;
      const { error } = await supabase.storage.from(BUCKET).remove(mine);
      fail(error);
    },

    imageUrl(path) {
      return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },

    async exportAll() {
      const [schools, settings] = await Promise.all([
        supabase.from("ct_schools").select(SCHOOL_COLUMNS).order("position"),
        supabase.from("ct_settings").select(SETTINGS_COLUMNS).maybeSingle(),
      ]);
      fail(schools.error);
      fail(settings.error);
      return {
        schools: (schools.data as unknown as School[]).map(schoolFromRow),
        settings: settingsFromRow(settings.data),
      };
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      fail(error);
    },
  };
}
