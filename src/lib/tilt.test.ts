import { describe, expect, it } from "vitest";
import { luminance } from "./colors";
import { edgeOffset, edgeShade, tiltAngles, tiltVars } from "./tilt";

const at = (nx: number, ny: number) => {
  const { rx, ry } = tiltAngles(nx, ny);
  return edgeOffset(rx, ry);
};

describe("tile tilt", () => {
  it("shows no side when the tile is flat", () => {
    const e = at(0, 0);
    expect(Math.abs(e.x)).toBeLessThan(1e-9);
    expect(Math.abs(e.y)).toBeLessThan(1e-9);
  });

  it("shows the side that tips toward you, opposite the cursor", () => {
    expect(at(1, 0).x).toBeLessThan(0); // cursor right → left side rises
    expect(at(-1, 0).x).toBeGreaterThan(0);
    expect(at(0, -1).y).toBeGreaterThan(0); // cursor top → bottom side rises
    expect(at(0, 1).y).toBeLessThan(0); // cursor bottom → top side rises
  });

  it("is equally thick on all four sides", () => {
    const sides = [at(1, 0).x, at(-1, 0).x, at(0, 1).y, at(0, -1).y].map(Math.abs);
    for (const s of sides) expect(s).toBeCloseTo(sides[0], 6);
    expect(sides[0]).toBeGreaterThan(2);
    expect(sides[0]).toBeLessThan(4);
  });

  it("grows with the tip", () => {
    expect(Math.abs(at(0.5, 0).x)).toBeLessThan(Math.abs(at(1, 0).x));
    expect(Math.abs(at(0.5, 0).x)).toBeCloseTo(Math.abs(at(1, 0).x) / 2, 1);
  });

  it("lights the top side and shades the bottom side", () => {
    const edge = "#7a8aa0";
    expect(luminance(edgeShade(edge, 0, -3))).toBeGreaterThan(luminance(edge));
    expect(luminance(edgeShade(edge, 0, 3))).toBeLessThan(luminance(edge));
  });

  it("lifts and leaves the side hidden with the cursor in the middle", () => {
    const v = tiltVars(0, 0, "#7a8aa0");
    expect(v["--ty"]).toBe("-3.0px");
    expect(parseFloat(v["--ex"])).toBeCloseTo(0, 6);
    expect(parseFloat(v["--ey"])).toBeCloseTo(0, 6);
  });
});
