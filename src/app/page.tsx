import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SCHOOL_COLUMNS, SETTINGS_COLUMNS, schoolFromRow, settingsFromRow } from "@/lib/backend";
import { createClient } from "@/lib/supabase/server";
import type { School } from "@/lib/types";
import { LoadError, TrackerClient } from "./tracker-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#2a2623]" />}>
      <TrackerLoader />
    </Suspense>
  );
}

/** Reads the session and the person's data at request time (RLS limits rows to them). */
async function TrackerLoader() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) redirect("/sign-in");

  const [schools, settings] = await Promise.all([
    supabase.from("ct_schools").select(SCHOOL_COLUMNS).order("position"),
    supabase.from("ct_settings").select(SETTINGS_COLUMNS).maybeSingle(),
  ]);
  if (schools.error || settings.error) {
    return <LoadError message={schools.error?.message ?? settings.error?.message ?? "Unknown error"} />;
  }

  return (
    <TrackerClient
      userId={claims.sub}
      email={typeof claims.email === "string" ? claims.email : null}
      schools={(schools.data as unknown as School[]).map(schoolFromRow)}
      settings={settingsFromRow(settings.data)}
    />
  );
}
