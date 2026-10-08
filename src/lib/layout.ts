/** Grid and card metrics from the design, derived from the available width. */

export type Layout = ReturnType<typeof computeLayout>;

export function computeLayout(width: number, tileSize: number, opts: { editAll: boolean; showNames: boolean }) {
  const narrow = width < 640;
  const base = tileSize;
  const gap = narrow ? 14 : 24;
  let tile = base;
  if (narrow) {
    const cols = base >= 160 ? 2 : 3;
    tile = Math.min(base, Math.floor((width - 32 - (cols - 1) * gap) / cols));
  }
  const maxCols = base <= 120 ? 8 : 6;
  const logo = Math.round(tile * 0.49);
  // Explicit column count (auto-fill can drop a column to sub-pixel rounding).
  const available = width - (narrow ? 32 : 64);
  const cols = Math.max(1, Math.min(maxCols, Math.floor((available + gap + 0.5) / (tile + gap))));
  return {
    narrow,
    cols,
    tile,
    radius: Math.round(tile * 0.17),
    logo,
    monoFont: Math.round(logo * 0.58),
    labelFont: tile < 124 ? 10.5 : 11.5,
    labelBottom: Math.round(tile * 0.07),
    decidedLogoPad: Math.round(tile * 0.15),
    gap,
    rowGap: opts.editAll ? 22 : opts.showNames ? 48 : gap,
    dotHit: narrow ? 16 : 19,
    cardRadius: narrow ? 24 : 28,
    cardPad: narrow ? "22px 20px 0" : "28px 28px 0",
    footPad: narrow ? "12px 16px 16px" : "14px 24px 20px",
    overlayPad: narrow ? 12 : 24,
    twoCol: narrow,
  };
}
