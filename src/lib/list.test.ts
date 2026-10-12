import { describe, expect, it } from "vitest";
import { compactValue, deadlineInfo, decisionInfo, groupSchools, nextSort, sortSchools, summarize, visibleColumns, type SortKey } from "./list";
import type { School } from "./types";

let n = 0;
function school(fields: Partial<School>): School {
  n++;
  return {
    id: `id-${n}`,
    user_id: "u",
    name: `School ${n}`,
    short_name: null,
    location: null,
    round: null,
    classification: null,
    deadline: null,
    decision_start: null,
    decision_end: null,
    submitted: false,
    status: "pending",
    acceptance_rate: null,
    sat_25: null,
    sat_75: null,
    supplements_done: null,
    supplements_total: null,
    portal_url: null,
    notes: null,
    custom_fields: [],
    logo_path: null,
    position: n * 1000,
    ...fields,
  };
}

const names = (list: School[]) => list.map((s) => s.name);
const now = new Date(2026, 9, 11, 12); // Oct 11 2026, noon

describe("sortSchools", () => {
  const list = [
    school({ name: "Cornell", status: "deferred", round: "ED1", classification: "Reach", deadline: "2026-11-01", acceptance_rate: 8.4, sat_25: 1510, sat_75: 1560, supplements_done: 1, supplements_total: 2 }),
    school({ name: "bentley", status: "withdrawn", round: "RD", classification: "Safety", deadline: "2027-01-15", acceptance_rate: 46, sat_25: 1260, sat_75: 1410 }),
    school({ name: "Harvard", status: "rejected", classification: "Reach+", decision_start: "2027-03-26", acceptance_rate: 3.6, supplements_done: 5, supplements_total: 5 }),
    school({ name: "USC", status: "accepted", round: "EA", deadline: "2026-11-01", decision_start: "2026-12-01", sat_25: 1450, sat_75: 1530, supplements_total: 3 }),
    school({ name: "Empty", status: "pending" }),
  ];
  const sorted = (key: SortKey, dir: "asc" | "desc") => names(sortSchools(list, { key, dir }));

  it("keeps your order by default", () => {
    expect(sorted("order", "asc")).toEqual(["Cornell", "bentley", "Harvard", "USC", "Empty"]);
  });
  it("sorts names ignoring case", () => {
    expect(sorted("name", "asc")).toEqual(["bentley", "Cornell", "Empty", "Harvard", "USC"]);
  });
  it("puts good news first for status", () => {
    expect(sorted("status", "asc")).toEqual(["USC", "Cornell", "Empty", "Harvard", "bentley"]);
  });
  it("sorts round and type by their natural order, empties last both ways", () => {
    expect(sorted("round", "asc")).toEqual(["Cornell", "USC", "bentley", "Harvard", "Empty"]);
    expect(sorted("round", "desc")).toEqual(["bentley", "USC", "Cornell", "Harvard", "Empty"]);
    expect(sorted("type", "asc")).toEqual(["Harvard", "Cornell", "bentley", "USC", "Empty"]);
  });
  it("sorts dates soonest first, ties keep your order", () => {
    expect(sorted("deadline", "asc")).toEqual(["Cornell", "USC", "bentley", "Harvard", "Empty"]);
    expect(sorted("deadline", "desc")).toEqual(["bentley", "Cornell", "USC", "Harvard", "Empty"]);
    expect(sorted("decision", "asc")).toEqual(["USC", "Harvard", "Cornell", "bentley", "Empty"]);
  });
  it("sorts numbers with empties last", () => {
    expect(sorted("acceptance", "asc")).toEqual(["Harvard", "Cornell", "bentley", "USC", "Empty"]);
    expect(sorted("sat", "desc")).toEqual(["Cornell", "USC", "bentley", "Harvard", "Empty"]);
    // Most supplements left first: USC 3, Cornell 1, Harvard 0.
    expect(sorted("supplements", "desc")).toEqual(["USC", "Cornell", "Harvard", "bentley", "Empty"]);
  });
  it("doesn't change the list it was given", () => {
    sortSchools(list, { key: "name", dir: "desc" });
    expect(names(list)[0]).toBe("Cornell");
  });
});

describe("nextSort", () => {
  it("starts each column in its own direction, then flips", () => {
    expect(nextSort({ key: "order", dir: "asc" }, "sat")).toEqual({ key: "sat", dir: "desc" });
    expect(nextSort({ key: "sat", dir: "desc" }, "sat")).toEqual({ key: "sat", dir: "asc" });
    expect(nextSort({ key: "sat", dir: "asc" }, "deadline")).toEqual({ key: "deadline", dir: "asc" });
  });
});

describe("groupSchools", () => {
  const list = [
    school({ name: "A", status: "pending", round: "RD", classification: "Target" }),
    school({ name: "B", status: "accepted", round: "EA" }),
    school({ name: "C", status: "pending", classification: "Target" }),
  ];
  it("groups by status in good-news order, skipping empty groups", () => {
    const g = groupSchools(list, "status");
    expect(g.map((x) => x.label)).toEqual(["Accepted", "Undecided"]);
    expect(names(g[1].schools)).toEqual(["A", "C"]);
  });
  it("puts schools with no round or type last", () => {
    expect(groupSchools(list, "round").map((x) => x.label)).toEqual(["EA", "RD", "No round"]);
    expect(groupSchools(list, "type").map((x) => x.label)).toEqual(["Target", "No type"]);
  });
  it("returns one group when not grouping", () => {
    expect(groupSchools(list, "none")).toHaveLength(1);
  });
});

describe("date lines", () => {
  it("counts down to an open deadline and marks it urgent within two weeks", () => {
    expect(deadlineInfo(school({ deadline: "2026-10-20" }), now)).toEqual({ value: "Oct 20", sub: "In 9 days", strong: true });
    expect(deadlineInfo(school({ deadline: "2026-11-01", submitted: true }), now)).toEqual({ value: "Nov 1", sub: "Submitted", strong: false });
    expect(deadlineInfo(school({ deadline: "2026-11-01", status: "accepted" }), now)?.sub).toBeUndefined();
  });
  it("describes the decision window", () => {
    const open = decisionInfo(school({ decision_start: "2026-10-01", decision_end: "2026-10-20" }), now);
    expect(open?.range).toBe(true);
    expect(open?.sub).toBe("Open now · ends in 9 days");
    expect(decisionInfo(school({ decision_start: "2026-10-01" }), now)?.sub).toBe("Should be out");
    expect(decisionInfo(school({}), now)).toBeNull();
  });
});

describe("summarize", () => {
  const list = [
    school({ name: "Past", deadline: "2026-10-01", decision_start: "2026-12-01" }),
    school({ name: "Soon", deadline: "2026-11-01", decision_start: "2027-03-01", supplements_done: 1, supplements_total: 3 }),
    school({ name: "Later", deadline: "2027-01-01", decision_start: "2026-10-01", decision_end: "2026-10-30" }),
    school({ name: "Done", status: "accepted", deadline: "2026-10-15", supplements_done: 9, supplements_total: 2, sat_25: 1400, sat_75: 1500 }),
    school({ name: "Sent", submitted: true, deadline: "2026-10-12", sat_25: 1520, sat_75: 1580 }),
  ];
  const s = summarize(list, 1510, now);

  it("counts statuses and submissions", () => {
    expect(s.total).toBe(5);
    expect(s.counts.pending).toBe(4);
    expect(s.counts.accepted).toBe(1);
    expect(s.submitted).toBe(2);
  });
  it("finds the next deadline among undecided, unsubmitted schools", () => {
    expect(s.nextDeadline?.school.name).toBe("Soon");
  });
  it("finds the next decision, counting an open window", () => {
    expect(s.nextDecision?.school.name).toBe("Later");
  });
  it("adds up supplements without counting extras", () => {
    expect(s.supplements).toEqual({ done: 3, total: 5 });
  });
  it("places your SAT against each school", () => {
    expect(s.sat).toEqual({ above: 1, within: 0, below: 1 });
    expect(summarize(list, null, now).sat).toBeNull();
  });
});

describe("short dates", () => {
  it("leaves the year off within six months, keeps it further out", () => {
    expect(deadlineInfo(school({ deadline: "2027-01-10" }), now, true)?.value).toBe("Jan 10");
    expect(deadlineInfo(school({ deadline: "2027-01-10" }), now)?.value).toBe("Jan 10, 2027");
    expect(deadlineInfo(school({ deadline: "2027-08-10" }), now, true)?.value).toBe("Aug 10, 2027");
    expect(decisionInfo(school({ decision_start: "2027-03-25", decision_end: "2027-04-01" }), now, true)?.value).toBe("Mar 25 – Apr 1");
  });
});

describe("visibleColumns", () => {
  it("shows everything when there's room", () => {
    expect(visibleColumns(1180, true)).toHaveLength(10);
  });
  it("leaves out Portal when no school has a link", () => {
    expect(visibleColumns(1180, false)).not.toContain("portal");
  });
  it("drops columns in order and always keeps School, Status and Deadline", () => {
    expect(visibleColumns(1000, true)).toEqual(["name", "status", "deadline", "decision", "acceptance", "sat", "supplements"]);
    expect(visibleColumns(200, true)).toEqual(["name", "status", "deadline"]);
  });
});

describe("compactValue", () => {
  it("shows the sorted-by value, or the deadline", () => {
    const s = school({ deadline: "2026-10-20", acceptance_rate: 12, round: "EA" });
    expect(compactValue(s, "acceptance", now)).toEqual({ value: "12%", sub: "Acceptance", strong: false });
    expect(compactValue(s, "round", now)?.sub).toBe("Early Action");
    expect(compactValue(s, "order", now)).toEqual({ value: "Oct 20", sub: "In 9 days", strong: true });
    expect(compactValue(school({ status: "accepted", deadline: "2026-11-01" }), "name", now)?.sub).toBe("Deadline");
    expect(compactValue(s, "sat", now)).toBeNull();
  });
});
