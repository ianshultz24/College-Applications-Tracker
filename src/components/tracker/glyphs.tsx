import type { Status } from "@/lib/types";

/** Status glyphs from the design, so status is never shown by color alone. */
export const STATUS_GLYPH: Record<Status, string> = {
  pending: "M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0",
  accepted: "M5 12.5l4.5 4.5L19 7.5",
  waitlisted: "M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M12 7.5V12l3 2",
  deferred: "M5 12h13M13 6l6 6-6 6",
  rejected: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  withdrawn: "M6 12h12",
};

export const CHECK_PATH = "M5 12.5l4.5 4.5L19 7.5";

export function Glyph({ d, size, stroke = 2.8 }: { d: string; size: number; stroke?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flex: "none", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" }}
    >
      <path d={d} />
    </svg>
  );
}
