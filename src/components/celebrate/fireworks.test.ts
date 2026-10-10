import { describe, expect, it } from "vitest";
import { Fireworks, shade, type BurstKind } from "./fireworks";

/** A repeatable stand-in for Math.random. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const palette = ["#2e7d55", "#8ec2a6", "#e9b949", "#ffe7a3", "#ffffff"];

function run(width: number, height: number, seed = 1) {
  const bursts: BurstKind[] = [];
  let launches = 0;
  const fw = new Fireworks({
    width,
    height,
    origin: { x: width / 2 - 70, y: height / 2 - 70, w: 140, h: 140 },
    palette,
    rand: seeded(seed),
    onLaunch: () => launches++,
    onBurst: (k) => bursts.push(k),
  });
  let t = 0;
  while (!fw.done && t < 10) {
    fw.step(1 / 60);
    t += 1 / 60;
  }
  return { fw, t, bursts, launches };
}

describe("fireworks", () => {
  it("plays the whole show and is gone within about 5 seconds", () => {
    for (const [w, h] of [[1440, 900], [390, 760], [2560, 1400]]) {
      const { t, bursts, launches } = run(w, h);
      expect(t).toBeLessThan(5);
      expect(t).toBeGreaterThan(3);
      expect(bursts.length).toBe(launches);
    }
  });

  it("uses fewer rockets and particles on a phone", () => {
    const big = run(1440, 900);
    const small = run(390, 760);
    expect(small.launches).toBe(3);
    expect(big.launches).toBe(5);
    expect(small.fw.peak).toBeLessThan(big.fw.peak);
    expect(new Set(big.bursts)).toEqual(new Set(["peony", "ring", "willow"]));
  });

  it("is repeatable with the same random seed", () => {
    expect(run(1200, 800, 7).fw.peak).toBe(run(1200, 800, 7).fw.peak);
  });

  it("clears out quickly when hurried", () => {
    const fw = new Fireworks({ width: 1200, height: 800, origin: { x: 500, y: 300, w: 140, h: 140 }, palette, rand: seeded(3) });
    for (let i = 0; i < 90; i++) fw.step(1 / 60);
    fw.hurry();
    let t = 0;
    while (!fw.done && t < 5) {
      fw.step(1 / 60);
      t += 1 / 60;
    }
    expect(t).toBeLessThan(0.4);
  });

  it("darkens colors for the backs of ribbons", () => {
    expect(shade("#ffffff", 0.5)).toBe("rgb(128,128,128)");
    expect(shade("#fff", 0)).toBe("rgb(255,255,255)");
  });
});
