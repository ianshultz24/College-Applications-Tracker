import { mixHex } from "./colors";

/**
 * A tile is treated as a slab with real thickness: it tips away under the cursor, so the side rising toward
 * you shows, and it's lit by a lamp above it, a little to the left.
 */
export const TILT = {
  /** Degrees of tip with the cursor at an edge. */
  max: 6.75,
  /** The slab's thickness in px: about a 3px side at full tip. */
  depth: 24,
  /** How far the lamp's reflection slides across the face, in % of the tile. */
  glare: 25,
} as const;

/** Direction the lamp's light travels on screen (down, slightly to the right). */
const LIGHT = (() => {
  const x = 0.3;
  const y = 1;
  const n = Math.hypot(x, y);
  return { x: x / n, y: y / n };
})();

const RAD = Math.PI / 180;

/** rotateX tips the top away for positive angles; rotateY tips the right side away. */
export function tiltAngles(nx: number, ny: number) {
  return { rx: -ny * TILT.max, ry: nx * TILT.max };
}

/**
 * Where the slab's back face shows past its front face, measured in the tile's own plane: the back face
 * projected forward along the line of sight. It is zero when flat and sits on the side tipping toward you.
 */
export function edgeOffset(rx: number, ry: number, depth: number = TILT.depth) {
  const x = rx * RAD;
  const y = ry * RAD;
  return { x: -depth * Math.tan(y), y: (depth * Math.tan(x)) / Math.cos(y) };
}

/** The visible side's color: lighter where it faces up into the lamp, darker where it faces down. */
export function edgeShade(edge: string, ox: number, oy: number): string {
  const len = Math.hypot(ox, oy);
  if (len < 1e-6) return edge;
  const facing = -(ox * LIGHT.x + oy * LIGHT.y) / len;
  return facing >= 0 ? mixHex(edge, "#ffffff", 0.38 * facing) : mixHex(edge, "#000000", 0.22 * -facing);
}

/**
 * The tile's CSS variables for a cursor at (nx, ny), each −1…1 from the center. The side is filled by three
 * hard copies along the offset (--ex/--ey, colors --e1…--e3), so rounded corners join up like a real slab;
 * the lip nearest the face catches a little more light.
 */
export function tiltVars(nx: number, ny: number, edge: string): Record<string, string> {
  const { rx, ry } = tiltAngles(nx, ny);
  const e = edgeOffset(rx, ry);
  const side = edgeShade(edge, e.x, e.y);
  return {
    "--rx": `${rx.toFixed(2)}deg`,
    "--ry": `${ry.toFixed(2)}deg`,
    // The tile drifts a touch toward the cursor as it lifts.
    "--tx": `${(nx * 2.5).toFixed(1)}px`,
    "--ty": `${(-3 + ny * 2.5).toFixed(1)}px`,
    "--ex": `${e.x.toFixed(2)}px`,
    "--ey": `${e.y.toFixed(2)}px`,
    "--e1": mixHex(side, "#ffffff", 0.12),
    "--e2": side,
    "--e3": mixHex(side, "#000000", 0.08),
    // The lamp's reflection slides toward the side tipping up into the light.
    "--mx": `${(50 - nx * TILT.glare).toFixed(1)}%`,
    "--my": `${(50 - ny * TILT.glare).toFixed(1)}%`,
  };
}

export const TILT_VARS = ["--rx", "--ry", "--tx", "--ty", "--ex", "--ey", "--e1", "--e2", "--e3", "--mx", "--my", "--sh"] as const;
