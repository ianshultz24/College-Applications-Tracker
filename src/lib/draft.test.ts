import { describe, expect, it } from "vitest";
import { blankDraft, fromDraft, isDirty, toDraft, validateDraft } from "./draft";
import type { School } from "./types";

const school: School = {
  id: "s1",
  user_id: "u1",
  name: "Emory",
  short_name: null,
  location: "Atlanta, GA",
  round: "RD",
  classification: "Target",
  deadline: "2027-01-01",
  decision_start: "2027-03-25",
  decision_end: "2027-04-01",
  submitted: true,
  status: "pending",
  acceptance_rate: 11,
  sat_25: 1460,
  sat_75: 1540,
  supplements_done: 2,
  supplements_total: 2,
  portal_url: "https://apply.emory.edu/",
  notes: null,
  custom_fields: [{ label: "Campus", value: "Oxford College" }],
  logo_path: "u1/logos/s1.webp",
  position: 1024,
};

describe("draft round trip", () => {
  it("is lossless for a saved school", () => {
    const d = toDraft(school);
    expect(d.showEnd).toBe(true);
    const f = fromDraft(d);
    for (const k of Object.keys(f) as (keyof typeof f)[]) expect(f[k]).toEqual(school[k]);
  });

  it("is not dirty until something changes", () => {
    const d = toDraft(school);
    expect(isDirty(d, { ...d })).toBe(false);
    expect(isDirty(d, { ...d, notes: "  " })).toBe(false); // whitespace-only is still empty
    expect(isDirty(d, { ...d, notes: "Visit in spring" })).toBe(true);
    expect(isDirty(d, { ...d, logo: { kind: "none" } })).toBe(true);
  });

  it("turns a name-only draft into a minimal row", () => {
    const f = fromDraft({ ...blankDraft("n1"), name: "  Yale  " });
    expect(f.name).toBe("Yale");
    expect(f.location).toBeNull();
    expect(f.deadline).toBeNull();
    expect(f.status).toBe("pending");
    expect(f.custom_fields).toEqual([]);
  });

  it("drops a hidden end date and empty custom rows", () => {
    const d = { ...toDraft(school), showEnd: false, custom_fields: [{ label: " ", value: "" }] };
    const f = fromDraft(d);
    expect(f.decision_end).toBeNull();
    expect(f.decision_start).toBe("2027-03-25");
    expect(f.custom_fields).toEqual([]);
  });

  it("validates the light rules", () => {
    const d = { ...blankDraft("n1"), name: "Yale", sat_25: "1700", acceptance_rate: "120", portal_url: "javascript:x" };
    const e = validateDraft(d);
    expect(e.sat_25).toBeTruthy();
    expect(e.acceptance_rate).toBeTruthy();
    expect(e.portal_url).toBeTruthy();
    expect(validateDraft({ ...blankDraft("n2"), name: "Yale" })).toEqual({});
  });
});
