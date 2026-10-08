import { describe, expect, it } from "vitest";
import {
  calendarDaysBetween,
  countdownTo,
  decisionWindow,
  endOfLocalDay,
  parseLocalDate,
  toISODate,
} from "./dates";

/** Local wall-clock time in the test timezone (America/Los_Angeles). */
const at = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0) =>
  new Date(y, mo - 1, d, h, mi, s, ms);

describe("timezone setup", () => {
  it("runs in Pacific time", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/Los_Angeles");
  });

  it("shows why new Date('YYYY-MM-DD') is banned: it lands on the previous day", () => {
    expect(new Date("2026-11-01").getDate()).toBe(31);
  });
});

describe("parseLocalDate", () => {
  it("keeps the calendar day in Pacific time", () => {
    const d = parseLocalDate("2026-11-01")!;
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 11, 1, 0]);
  });

  it("round-trips through toISODate", () => {
    for (const s of ["2026-01-01", "2026-03-08", "2026-11-01", "2026-12-31", "2028-02-29"]) {
      expect(toISODate(parseLocalDate(s)!)).toBe(s);
    }
  });

  it("rejects invalid input", () => {
    expect(parseLocalDate("")).toBeNull();
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate("2026-02-31")).toBeNull();
    expect(parseLocalDate("11/01/2026")).toBeNull();
    expect(parseLocalDate("2026-11-01T00:00:00Z")).toBeNull();
  });
});

describe("countdownTo (runs to the end of the deadline day)", () => {
  it("is still open on the deadline day itself", () => {
    const c = countdownTo("2026-11-15", at(2026, 11, 15, 10))!;
    expect(c.days).toBe(0);
    expect(c.past).toBe(false);
    expect(c.label).toBe("today · 13h left");
  });

  it("is open one millisecond before midnight", () => {
    const c = countdownTo("2026-11-15", at(2026, 11, 15, 23, 59, 59, 998))!;
    expect(c.past).toBe(false);
    expect(c.msLeft).toBe(1);
    expect(c.label).toBe("today · <1h left");
  });

  it("is past at local midnight after the deadline", () => {
    const c = countdownTo("2026-11-15", at(2026, 11, 16, 0, 0))!;
    expect(c.past).toBe(true);
    expect(c.label).toBe("yesterday");
  });

  it("counts calendar days, not 24h blocks", () => {
    // 11pm the night before is still "tomorrow", not "today".
    expect(countdownTo("2026-11-15", at(2026, 11, 14, 23))!.label).toBe("tomorrow");
    expect(countdownTo("2026-11-15", at(2026, 11, 5, 8))!.label).toBe("in 10 days");
  });

  it("labels past deadlines", () => {
    expect(countdownTo("2026-11-01", at(2026, 11, 8, 12))!.label).toBe("7 days ago");
  });

  it("returns null without a date", () => {
    expect(countdownTo(null)).toBeNull();
    expect(countdownTo("nope")).toBeNull();
  });
});

describe("DST boundaries (Pacific)", () => {
  it("fall back: Nov 1 2026 is a 25-hour day", () => {
    expect(calendarDaysBetween(at(2026, 10, 31, 12), at(2026, 11, 2, 12))).toBe(2);
    const c = countdownTo("2026-11-01", at(2026, 11, 1, 0))!;
    expect(c.days).toBe(0);
    expect(c.msLeft).toBe(25 * 3_600_000 - 1);
    expect(endOfLocalDay(parseLocalDate("2026-11-01")!).getHours()).toBe(23);
  });

  it("spring forward: Mar 8 2026 is a 23-hour day", () => {
    expect(calendarDaysBetween(at(2026, 3, 7, 23), at(2026, 3, 9, 0))).toBe(2);
    expect(countdownTo("2026-03-09", at(2026, 3, 8, 0))!.label).toBe("tomorrow");
    expect(countdownTo("2026-03-08", at(2026, 3, 8, 0))!.msLeft).toBe(23 * 3_600_000 - 1);
  });

  it("long countdowns across a DST change stay whole days", () => {
    expect(countdownTo("2026-11-10", at(2026, 10, 20, 9))!.label).toBe("in 21 days");
  });
});

describe("decisionWindow", () => {
  it("counts down to the start of a range", () => {
    const w = decisionWindow("2027-03-15", "2027-04-01", at(2027, 3, 10, 9))!;
    expect(w.phase).toBe("upcoming");
    expect(w.countdown.days).toBe(5);
  });

  it("is open inside the range, counting to the end of the last day", () => {
    const w = decisionWindow("2027-03-15", "2027-04-01", at(2027, 3, 20, 9))!;
    expect(w.phase).toBe("open");
    expect(w.countdown.days).toBe(12);
  });

  it("treats a single date (start or end only) as that day", () => {
    expect(decisionWindow("2027-03-15", null, at(2027, 3, 15, 9))!.phase).toBe("open");
    expect(decisionWindow(null, "2027-03-15", at(2027, 3, 14, 9))!.phase).toBe("upcoming");
  });

  it("is passed after the last day ends", () => {
    expect(decisionWindow("2027-03-15", "2027-04-01", at(2027, 4, 2, 0))!.phase).toBe("passed");
  });

  it("is null with no dates", () => {
    expect(decisionWindow(null, null)).toBeNull();
  });
});
