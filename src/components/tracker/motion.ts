import type { Transition } from "motion/react";

/** Tile → card and back: no bounce, so it settles exactly where it lands. */
export const openSpring: Transition = { type: "spring", bounce: 0, duration: 0.42 };
export const closeSpring: Transition = { type: "spring", bounce: 0, duration: 0.34 };

/** The resting box of a tile (or the add tile, id "__add"), ignoring any hover lift or tilt. */
export function tileSlotRect(id: string): DOMRect | null {
  const cell = document.querySelector<HTMLElement>(`[data-tile="${CSS.escape(id)}"]`);
  const slot = cell?.matches("[data-tile-slot]") ? cell : cell?.querySelector<HTMLElement>("[data-tile-slot]");
  return slot?.getBoundingClientRect() ?? null;
}

export function isOnScreen(r: DOMRect) {
  return r.width > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}
