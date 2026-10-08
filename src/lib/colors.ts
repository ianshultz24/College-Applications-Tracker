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

/** Tints of a status color, with an ink that keeps 4.6:1 contrast on the tile. */
export function tones(color: string) {
  const m = (t: number) => mixHex(color, "#ffffff", t);
  const c = m(0.7);
  let i = 0.2;
  let ink = mixHex(color, "#000000", i);
  while (contrast(ink, c) < 4.6 && i < 0.9) {
    i += 0.06;
    ink = mixHex(color, "#000000", i);
  }
  return { C: color, a: m(0.86), b: m(0.5), c, ink, pillBg: m(0.82), border: m(0.35) };
}

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
  /** Flat color used to morph the card's background while it grows. */
  flat: string;
};

const highlight = (a: number) =>
  `radial-gradient(85% 75% at calc(var(--mx, 50%) - 20%) calc(var(--my, 50%) - 30%), rgba(255,255,255,${a}), rgba(255,255,255,0) 58%)`;
const sheen = (a: number) =>
  `linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,calc(var(--sh, 0.3) * ${a})) 50%, rgba(255,255,255,0) 60%)`;

/** The glassy tile surface for a status (ported from the design). */
export function tileLook(status: Status, colors: Colors): TileLook {
  const base = colors.base;
  if (status === "withdrawn") {
    const W = colors.withdrawn;
    const top = mixHex(W, "#ffffff", 0.06);
    const bot = mixHex(W, "#000000", 0.4);
    return {
      surface: `${highlight(0.16)}, linear-gradient(160deg, ${top}, ${bot})`,
      shadow: "0 10px 26px -16px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.18)",
      rim: "inset 0 1px 0.5px rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -14px 24px -14px rgba(0,0,0,0.35)",
      sheen: sheen(0.14),
      blend: "screen",
      logoFilter: "grayscale(1) invert(1) contrast(1.15)",
      logoOpacity: 0.5,
      mono: "rgba(255,255,255,0.5)",
      ink: "#eceef1",
      labelBg: "rgba(255,255,255,0.12)",
      labelRing: "inset 0 0 0 1px rgba(255,255,255,0.1)",
      opacity: 0.88,
      flat: mixHex(W, "#000000", 0.2),
    };
  }
  if (status === "pending") {
    const ink = contrast(colors.text, base) >= 3 ? colors.text : inkOn(base);
    return {
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
      flat: base,
    };
  }
  const T = tones(colors[status]);
  return {
    surface: `${highlight(0.85)}, radial-gradient(110% 100% at calc(120% - var(--mx, 50%)) calc(130% - var(--my, 50%)), ${rgba(T.b, 0.85)}, ${rgba(T.b, 0)} 70%), linear-gradient(160deg, ${T.a}, ${T.c})`,
    shadow: `0 18px 34px -16px ${rgba(T.C, 0.6)}, 0 2px 6px rgba(0,0,0,0.12)`,
    rim: `inset 0 1px 1px rgba(255,255,255,0.95), inset 0 0 0 1px rgba(255,255,255,0.45), inset 0 -14px 24px -16px ${rgba(T.C, 0.5)}`,
    sheen: sheen(0.55),
    blend: "multiply",
    logoFilter: "none",
    logoOpacity: 1,
    mono: T.ink,
    ink: T.ink,
    labelBg: "rgba(255,255,255,0.62)",
    labelRing: "inset 0 0 0 1px rgba(255,255,255,0.7)",
    opacity: 1,
    flat: T.a,
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
