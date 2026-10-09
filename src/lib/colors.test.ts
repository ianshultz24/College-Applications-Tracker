import { describe, expect, it } from "vitest";
import { contrast, DEFAULT_COLORS, mixHex, tileLook } from "./colors";
import { STATUSES, type Colors } from "./types";

const palettes: Colors[] = [
  DEFAULT_COLORS,
  { ...DEFAULT_COLORS, accepted: "#ffd400", waitlisted: "#00e5ff", deferred: "#1a1a6e", rejected: "#ff7aa8", withdrawn: "#c9ced6" },
  { ...DEFAULT_COLORS, accepted: "#0b3d24", withdrawn: "#1d2230", rejected: "#4a0d0d" },
];

describe("tile looks", () => {
  it("keeps every decided label readable on its tile", () => {
    for (const colors of palettes) {
      for (const status of STATUSES) {
        if (status === "pending") continue;
        const look = tileLook(status, colors);
        // The label sits on a light pill over the tile, so the tile's own middle tone is the worst case.
        const stops = [...look.surface.matchAll(/#[0-9a-f]{6}/gi)].map((m) => m[0]);
        const mid = mixHex(stops.at(-2)!, stops.at(-1)!, 0.5);
        expect(contrast(look.ink, mid), `${status} on ${colors[status]}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("fades Withdrawn into the background, and brings it back on hover", () => {
    const look = tileLook("withdrawn", DEFAULT_COLORS);
    expect(look.opacity).toBeLessThan(0.5);
    expect(look.hoverOpacity).toBeGreaterThan(0.85);
    expect(look.logoFilter).not.toContain("invert");
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
