import { describe, expect, it } from "vitest";
import { contrast, DEFAULT_COLORS, luminance, mixHex, tileLook } from "./colors";
import { STATUSES, type Colors } from "./types";

const palettes: Colors[] = [
  DEFAULT_COLORS,
  { ...DEFAULT_COLORS, accepted: "#ffd400", waitlisted: "#00e5ff", deferred: "#1a1a6e", rejected: "#ff7aa8", withdrawn: "#c9ced6" },
  { ...DEFAULT_COLORS, accepted: "#0b3d24", withdrawn: "#1d2230", rejected: "#4a0d0d" },
];

/** The middle of a tile's base gradient (its last two hex stops). */
const midTone = (surface: string) => {
  const stops = [...surface.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0]);
  return mixHex(stops.at(-2)!, stops.at(-1)!, 0.5);
};

describe("tile looks", () => {
  it("keeps every decided label readable on its tile, at every tint strength", () => {
    for (const tint of [0.2, 0.3, 0.4, 0.5, 0.6]) {
      for (const colors of palettes) {
        for (const status of STATUSES) {
          if (status === "pending") continue;
          const look = tileLook(status, colors, true, tint);
          // The label sits on a light pill over the tile, so the tile's own middle tone is the worst case.
          const mid = midTone(look.surface);
          expect(contrast(look.ink, mid), `${status} on ${colors[status]} at ${tint}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("deepens every decided tile as tint strength goes up", () => {
    for (const status of STATUSES) {
      if (status === "pending") continue;
      const tones = [0.2, 0.4, 0.6].map((tint) => luminance(midTone(tileLook(status, DEFAULT_COLORS, true, tint).surface)));
      expect(tones[0], status).toBeGreaterThan(tones[1]);
      expect(tones[1], status).toBeGreaterThan(tones[2]);
    }
    const pending = (tint: number) => tileLook("pending", DEFAULT_COLORS, true, tint).surface;
    expect(pending(0.6)).toBe(pending(0.2));
  });

  it("fades Withdrawn into the background, and brings it back on hover", () => {
    const look = tileLook("withdrawn", DEFAULT_COLORS);
    expect(look.opacity).toBeLessThan(0.5);
    expect(look.hoverOpacity).toBeGreaterThan(0.85);
    expect(look.logoFilter).not.toContain("invert");
  });

  it("drops the frames and glimmer when finishes are off, but keeps Withdrawn faded", () => {
    for (const status of STATUSES) {
      const l = tileLook(status, DEFAULT_COLORS, false);
      expect([l.ambient, l.ringColor, l.stripes, l.grain]).toEqual([null, null, null, false]);
    }
    expect(tileLook("withdrawn", DEFAULT_COLORS, false).opacity).toBeLessThan(0.5);
  });

  it("gives each status its own finish", () => {
    const finish = (s: (typeof STATUSES)[number]) => {
      const l = tileLook(s, DEFAULT_COLORS);
      return [l.ambient, l.grain, !!l.stripes, l.opacity].join("|");
    };
    const decided = STATUSES.filter((s) => s !== "pending").map(finish);
    expect(new Set(decided).size).toBe(decided.length);
  });
});
