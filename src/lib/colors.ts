import type { Colors, Settings, Status } from "./types";

/** Defaults from the design. Blur/dim follow the database defaults. */
export const DEFAULT_COLORS: Colors = {
  accepted: "#2e7d55",
  waitlisted: "#e2a336",
  deferred: "#3566b8",
  rejected: "#b9443a",
  withdrawn: "#5d6878",
  base: "#ffffff",
  text: "#17181c",
};

export const DEFAULT_SETTINGS: Settings = {
  colors: DEFAULT_COLORS,
  background_path: null,
  blur_px: 12,
  dim: 0.25,
  tile_size: 140,
  show_names: false,
  shimmer: true,
  my_sat: null,
};

export const INK = "#17181c";
export const MUTED = "#6b6e76";
export const DANGER = "#b9443a";

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX.test(value);
}

export function rgb(hex: string): [number, number, number] {
  let h = String(hex || "#ffffff").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) || 0) as [number, number, number];
}

export function mixHex(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function luminance(hex: string): number {
  const ch = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function inkOn(bg: string): string {
  return contrast("#ffffff", bg) >= contrast(INK, bg) ? "#ffffff" : INK;
}

/** A darker shade of `color` that keeps 4.6:1 contrast on `bg`. */
export function inkFor(color: string, bg: string): string {
  let i = 0.2;
  let ink = mixHex(color, "#000000", i);
  while (contrast(ink, bg) < 4.6 && i < 0.9) {
    i += 0.06;
    ink = mixHex(color, "#000000", i);
  }
  return ink;
}

/** Tints of a status color, with an ink that keeps 4.6:1 contrast on the tile. */
export function tones(color: string) {
  const m = (t: number) => mixHex(color, "#ffffff", t);
  const c = m(0.7);
  return { C: color, a: m(0.86), b: m(0.5), c, ink: inkFor(color, c), pillBg: m(0.82), border: m(0.35) };
}

/** The warm gold used for Accepted's foil and the celebration. */
export const GOLD = "#e9b949";

export type TileLook = {
  surface: string;
  shadow: string;
  rim: string;
  sheen: string;
  blend: "multiply" | "screen";
  logoFilter: string;
  logoOpacity: number;
  mono: string;
  ink: string;
  labelBg: string;
  labelRing: string;
  opacity: number;
  /** Opacity while hovered or focused (the faded Withdrawn tile comes back so it can be read). */
  hoverOpacity: number;
  /** The tile's side, seen when it lifts or tilts (a darker shade of its lower edge). */
  edge: string;
  /** Fine paper grain (Rejected's matte finish). */
  grain: boolean;
  /** A slow effect while the tile rests: a gold foil glint (Accepted) or a marching dashed ring (Waitlisted). */
  ambient: "foil" | "march" | null;
  /** Color of the dashed ring (Waitlisted). */
  ringColor: string | null;
  /** Color of the airmail-stripe border (Deferred). */
  stripes: string | null;
};

const highlight = (a: number) =>
  `radial-gradient(85% 75% at calc(var(--mx, 50%) - 20%) calc(var(--my, 50%) - 30%), rgba(255,255,255,${a}), rgba(255,255,255,0) 58%)`;
const sheen = (a: number) =>
  `linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,calc(var(--sh, 0.3) * ${a})) 50%, rgba(255,255,255,0) 60%)`;

const extras = { grain: false, ambient: null, ringColor: null, stripes: null } as const;

/** The tile surface for a status: glass, plus a finish of its own so status never rests on color alone. */
export function tileLook(status: Status, colors: Colors): TileLook {
  const base = colors.base;
  if (status === "withdrawn") {
    // A pale, shaded ghost that lets the background show through: it doesn't matter anymore.
    const W = colors.withdrawn;
    const top = mixHex(W, "#ffffff", 0.74);
    const bot = mixHex(W, "#ffffff", 0.5);
    return {
      ...extras,
      surface: `${highlight(0.2)}, linear-gradient(160deg, ${top}, ${bot})`,
      shadow: "0 1px 2px rgba(0,0,0,0.1)",
      rim: "inset 0 0 0 1px rgba(255,255,255,0.4), inset 0 -14px 24px -16px rgba(0,0,0,0.18)",
      sheen: sheen(0.08),
      blend: "multiply",
      logoFilter: "grayscale(1) contrast(0.85)",
      logoOpacity: 0.6,
      mono: inkFor(W, mixHex(top, bot, 0.5)),
      ink: inkFor(W, mixHex(top, bot, 0.5)),
      labelBg: "rgba(255,255,255,0.45)",
      labelRing: "inset 0 0 0 1px rgba(255,255,255,0.5)",
      opacity: 0.42,
      hoverOpacity: 0.92,
      edge: mixHex(bot, "#000000", 0.22),
    };
  }
  if (status === "pending") {
    const ink = contrast(colors.text, base) >= 3 ? colors.text : inkOn(base);
    return {
      ...extras,
      surface: `${highlight(0.9)}, linear-gradient(160deg, ${base}, ${mixHex(base, "#d9dde5", 0.4)})`,
      shadow: "0 14px 34px -16px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.14)",
      rim: "inset 0 1px 1px rgba(255,255,255,1), inset 0 0 0 1px rgba(255,255,255,0.6), inset 0 -14px 24px -16px rgba(30,34,44,0.2)",
      sheen: sheen(0.5),
      blend: "multiply",
      logoFilter: "none",
      logoOpacity: 1,
      mono: ink,
      ink,
      labelBg: "transparent",
      labelRing: "none",
      opacity: 1,
      hoverOpacity: 1,
      edge: mixHex(mixHex(base, "#d9dde5", 0.4), "#000000", 0.26),
    };
  }
  const T = tones(colors[status]);
  if (status === "rejected") {
    // Matte: a flat, papery finish that sits low, with no gloss.
    const top = mixHex(T.C, "#ffffff", 0.8);
    const bot = mixHex(T.C, "#ffffff", 0.68);
    return {
      ...extras,
      grain: true,
      surface: `${highlight(0.28)}, linear-gradient(170deg, ${top}, ${bot})`,
      shadow: `0 8px 18px -12px ${rgba(T.C, 0.45)}, 0 1px 3px rgba(0,0,0,0.12)`,
      rim: `inset 0 0 0 1px rgba(255,255,255,0.35), inset 0 -10px 18px -14px ${rgba(T.C, 0.35)}`,
      sheen: sheen(0.1),
      blend: "multiply",
      logoFilter: "saturate(0.55)",
      logoOpacity: 0.88,
      mono: inkFor(T.C, bot),
      ink: inkFor(T.C, bot),
      labelBg: "rgba(255,255,255,0.5)",
      labelRing: "inset 0 0 0 1px rgba(255,255,255,0.55)",
      opacity: 1,
      hoverOpacity: 1,
      edge: mixHex(bot, "#000000", 0.28),
    };
  }
  const accepted = status === "accepted";
  return {
    ...extras,
    ambient: accepted ? "foil" : status === "waitlisted" ? "march" : null,
    ringColor: status === "waitlisted" ? rgba(T.ink, 0.42) : null,
    stripes: status === "deferred" ? T.C : null,
    surface: `${highlight(0.85)}, radial-gradient(110% 100% at calc(120% - var(--mx, 50%)) calc(130% - var(--my, 50%)), ${rgba(T.b, 0.85)}, ${rgba(T.b, 0)} 70%), linear-gradient(160deg, ${T.a}, ${T.c})`,
    shadow: accepted
      ? `0 0 0 1px ${rgba(GOLD, 0.35)}, 0 20px 40px -14px ${rgba(T.C, 0.7)}, 0 0 26px -6px ${rgba(GOLD, 0.45)}, 0 2px 6px rgba(0,0,0,0.12)`
      : `0 18px 34px -16px ${rgba(T.C, 0.6)}, 0 2px 6px rgba(0,0,0,0.12)`,
    rim: accepted
      ? `inset 0 1px 1px rgba(255,255,255,0.95), inset 0 0 0 1.5px ${rgba(GOLD, 0.7)}, inset 0 0 0 3px rgba(255,255,255,0.4), inset 0 -14px 24px -16px ${rgba(T.C, 0.5)}`
      : `inset 0 1px 1px rgba(255,255,255,0.95), inset 0 0 0 1px rgba(255,255,255,0.45), inset 0 -14px 24px -16px ${rgba(T.C, 0.5)}`,
    sheen: sheen(0.55),
    blend: "multiply",
    logoFilter: "none",
    logoOpacity: 1,
    mono: T.ink,
    ink: T.ink,
    labelBg: "rgba(255,255,255,0.62)",
    labelRing: "inset 0 0 0 1px rgba(255,255,255,0.7)",
    opacity: 1,
    hoverOpacity: 1,
    edge: mixHex(T.c, "#000000", 0.3),
  };
}

/** Ink for monograms on the white card plate. */
export function plateInk(colors: Colors): string {
  return contrast(colors.text, "#ffffff") >= 3 ? colors.text : INK;
}

/** Ink readable on the tile base (used for the "submitted" check). */
export function baseInk(colors: Colors): string {
  return contrast(colors.text, colors.base) >= 3 ? colors.text : inkOn(colors.base);
}

/** Pill + selected-button tones for a status (the card and the form). */
export function statusTone(status: Status, colors: Colors) {
  if (status === "pending") return { pillBg: "#f1f2f4", ink: INK, border: INK, swatch: "#ffffff" };
  const t = tones(colors[status]);
  return { pillBg: t.pillBg, ink: t.ink, border: t.border, swatch: colors[status] };
}

/** Swatch color for a status dot. */
export function statusSwatch(status: Status, colors: Colors): string {
  return status === "pending" ? "#ffffff" : colors[status];
}
