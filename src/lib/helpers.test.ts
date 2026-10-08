import { describe, expect, it } from "vitest";
import { monogram } from "./monogram";
import { POSITION_STEP, positionAtEnd, positionBetween, positionForMove } from "./position";
import { normalizeUrl, parseNumber, validateSchool } from "./validate";

describe("monogram", () => {
  it("uses initials of meaningful words", () => {
    expect(monogram("Massachusetts Institute of Technology")).toBe("MIT");
    expect(monogram("University of California, Berkeley")).toBe("UCB");
    expect(monogram("Stanford University")).toBe("SU");
  });
  it("uses two letters for one word", () => {
    expect(monogram("Caltech")).toBe("CA");
  });
  it("prefers a short name", () => {
    expect(monogram("University of California, Los Angeles", "ucla")).toBe("UCLA");
  });
  it("handles blanks", () => {
    expect(monogram("   ")).toBe("?");
  });
});

describe("position", () => {
  it("places between neighbours", () => {
    expect(positionBetween(1, 2)).toBe(1.5);
    expect(positionBetween(undefined, undefined)).toBe(POSITION_STEP);
    expect(positionBetween(undefined, 10)).toBe(10 - POSITION_STEP);
    expect(positionBetween(10, undefined)).toBe(10 + POSITION_STEP);
  });
  it("computes a move", () => {
    const list = [100, 200, 300, 400];
    expect(positionForMove(list, 0, 3)).toBe(400 + POSITION_STEP); // first -> last
    expect(positionForMove(list, 3, 0)).toBe(100 - POSITION_STEP); // last -> first
    expect(positionForMove(list, 0, 1)).toBe(250); // first -> between 200 and 300
    expect(positionAtEnd(list)).toBe(400 + POSITION_STEP);
  });
});

describe("validation", () => {
  const base = {
    name: "Yale",
    decision_start: "",
    decision_end: "",
    acceptance_rate: "",
    sat_25: "",
    sat_75: "",
    supplements_done: "",
    supplements_total: "",
  };

  it("accepts a name-only school", () => {
    expect(validateSchool(base)).toEqual({});
  });
  it("requires a name", () => {
    expect(validateSchool({ ...base, name: "  " }).name).toBeTruthy();
  });
  it("checks SAT 400–1600 and order", () => {
    expect(validateSchool({ ...base, sat_25: "390" }).sat_25).toBeTruthy();
    expect(validateSchool({ ...base, sat_75: "1610" }).sat_75).toBeTruthy();
    expect(validateSchool({ ...base, sat_25: "1500", sat_75: "1400" }).sat_75).toBeTruthy();
    expect(validateSchool({ ...base, sat_25: "1470", sat_75: "1570" })).toEqual({});
  });
  it("checks acceptance 0–100 and allows a % sign", () => {
    expect(validateSchool({ ...base, acceptance_rate: "101" }).acceptance_rate).toBeTruthy();
    expect(validateSchool({ ...base, acceptance_rate: "-1" }).acceptance_rate).toBeTruthy();
    expect(validateSchool({ ...base, acceptance_rate: "4.5%" })).toEqual({});
    expect(parseNumber("4.5%")).toBe(4.5);
  });
  it("checks supplements and decision order", () => {
    expect(validateSchool({ ...base, supplements_done: "3", supplements_total: "2" }).supplements_done).toBeTruthy();
    expect(
      validateSchool({ ...base, decision_start: "2027-04-01", decision_end: "2027-03-01" }).decision_end,
    ).toBeTruthy();
  });
  it("normalizes portal URLs", () => {
    expect(normalizeUrl("apply.yale.edu/portal")).toBe("https://apply.yale.edu/portal");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
});
