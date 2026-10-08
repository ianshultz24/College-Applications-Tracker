"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createMemoryBackend } from "@/lib/backend-memory";
import { settingsFromRow } from "@/lib/backend";
import { POSITION_STEP } from "@/lib/position";
import type { Classification, Round, School, Status } from "@/lib/types";
import { Tracker } from "@/components/tracker/Tracker";

// The design's sample list (no logos: those are added by hand in the real app).
type Raw = [string, string, Round, Status, boolean, string, string, string | null, number, number, number, number, number];
const RAW: Raw[] = [
  ["Cornell", "Ithaca, NY", "ED1", "deferred", true, "2026-11-01", "2026-12-11", null, 8.4, 1510, 1560, 2, 2],
  ["USC", "Los Angeles, CA", "EA", "accepted", true, "2026-11-01", "2027-01-23", null, 9.8, 1450, 1530, 2, 2],
  ["UVA", "Charlottesville, VA", "EA", "deferred", true, "2026-11-01", "2027-01-31", null, 16.8, 1400, 1530, 1, 1],
  ["WashU", "St. Louis, MO", "EA", "accepted", true, "2026-11-01", "2026-12-15", null, 12, 1500, 1570, 1, 1],
  ["Northeastern", "Boston, MA", "EA", "pending", true, "2026-11-01", "2027-02-01", null, 5.6, 1450, 1540, 1, 1],
  ["Santa Clara", "Santa Clara, CA", "EA", "accepted", true, "2026-11-01", "2026-12-20", null, 49, 1310, 1450, 0, 0],
  ["Georgetown", "Washington, DC", "RD", "pending", false, "2027-01-10", "2027-04-01", null, 12.9, 1430, 1550, 1, 3],
  ["Vanderbilt", "Nashville, TN", "RD", "waitlisted", true, "2027-01-01", "2027-03-26", null, 5.6, 1500, 1570, 1, 1],
  ["Emory", "Atlanta, GA", "RD", "pending", true, "2027-01-01", "2027-03-25", "2027-04-01", 11, 1460, 1540, 2, 2],
  ["Notre Dame", "Notre Dame, IN", "RD", "pending", false, "2026-10-15", "2027-03-20", null, 11.3, 1450, 1550, 1, 2],
  ["Boston College", "Chestnut Hill, MA", "RD", "waitlisted", true, "2027-01-02", "2027-03-20", null, 15.4, 1450, 1520, 1, 1],
  ["Harvard", "Cambridge, MA", "RD", "rejected", true, "2027-01-01", "2027-03-26", null, 3.6, 1500, 1580, 5, 5],
  ["Bentley", "Waltham, MA", "RD", "withdrawn", true, "2027-01-15", "2027-03-20", null, 46, 1260, 1410, 0, 0],
  ["Washington State", "Pullman, WA", "Rolling", "accepted", true, "2027-01-31", "2027-02-15", null, 87, 1000, 1220, 0, 0],
];

const cls = (rate: number): Classification => (rate < 6 ? "Reach+" : rate < 15 ? "Reach" : rate < 50 ? "Target" : "Safety");

function sample(): School[] {
  return RAW.map((r, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    user_id: "preview-user",
    name: r[0],
    short_name: null,
    location: r[1],
    round: r[2],
    classification: cls(r[8]),
    status: r[3],
    submitted: r[4],
    deadline: r[5],
    decision_start: r[6],
    decision_end: r[7],
    acceptance_rate: r[8],
    sat_25: r[9],
    sat_75: r[10],
    supplements_done: r[11],
    supplements_total: r[12],
    portal_url: r[0] === "Georgetown" ? "https://www.georgetown.edu" : null,
    notes: r[0] === "Georgetown" ? "Own application, not Common App. Interview request goes out after submitting." : null,
    custom_fields:
      r[0] === "Georgetown"
        ? [
            { label: "School", value: "Walsh School of Foreign Service" },
            { label: "Interview", value: "Alumni, to schedule" },
          ]
        : [],
    logo_path: null,
    position: (i + 1) * POSITION_STEP,
  }));
}

export function Preview() {
  const empty = useSearchParams().get("empty") === "1";
  const [data] = useState(() => {
    const schools = empty ? [] : sample();
    const settings = { ...settingsFromRow(null), my_sat: 1510 };
    return { schools, settings, backend: createMemoryBackend({ schools, settings }) };
  });
  return <Tracker backend={data.backend} initialSchools={data.schools} initialSettings={data.settings} />;
}
