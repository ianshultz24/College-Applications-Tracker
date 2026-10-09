import { describe, expect, it } from "vitest";
import { sliceStrips, stepPiece, type Piece } from "./engine";

function piece(over: Partial<Piece> = {}): Piece {
  return {
    x: 100, y: 0, vx: 0, vy: 0, angle: 0, spin: 2, twist: 0, twistSpeed: 5, phase: 0, phaseSpeed: 4, flutter: 200, bend: 0,
    len: 60, w: 9, color: "#2e7d55", back: "#1f5539", tex: null, colorT: 0, floor: 500, rest: -1, alpha: 1, ...over,
  };
}

describe("sliceStrips", () => {
  it("covers the whole page exactly, with no gaps or overlaps", () => {
    for (const width of [170, 247, 320, 333]) {
      const s = sliceStrips(width, 9.4);
      expect(s[0].x).toBe(0);
      for (let i = 1; i < s.length; i++) expect(s[i].x).toBe(s[i - 1].x + s[i - 1].w);
      expect(s.at(-1)!.x + s.at(-1)!.w).toBe(width);
      expect(s.every((x) => x.w >= 8 && x.w <= 11)).toBe(true);
    }
  });
});

describe("stepPiece", () => {
  for (const reduced of [false, true]) {
    it(`falls, lands on the floor, then fades away${reduced ? " (reduced motion)" : ""}`, () => {
      const p = piece();
      let alive = true;
      let t = 0;
      while (alive && t < 20) {
        alive = stepPiece(p, 1 / 60, reduced);
        t += 1 / 60;
        if (p.rest >= 0) expect(p.y).toBe(500);
      }
      expect(alive).toBe(false);
      expect(p.colorT).toBe(1);
      expect(t).toBeLessThan(8);
    });
  }

  it("drifts down gently like paper, not like a stone", () => {
    const p = piece({ floor: 1e9, twistSpeed: 0, spin: 0, flutter: 0 });
    for (let i = 0; i < 120; i++) stepPiece(p, 1 / 60, false);
    expect(p.vy).toBeGreaterThan(60);
    expect(p.vy).toBeLessThan(260);
  });
});
