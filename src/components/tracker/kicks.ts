"use client";

import { useEffect, useState } from "react";
import { rgba } from "@/lib/colors";
import type { Status } from "@/lib/types";
import { useStore } from "./store";

/** A status change on one tile, waiting to be played once the tile can be seen. */
export type Kick = { to: Status; seq: number };

let kickSeq = 0;

/** The latest status the person set on school `id` (adding a new school doesn't count). */
export function useStatusKick(id: string): Kick | null {
  const { onStatusChange } = useStore();
  const [kick, setKick] = useState<Kick | null>(null);
  useEffect(
    () =>
      onStatusChange((c) => {
        if (c.id === id && c.from !== null) setKick({ to: c.to, seq: ++kickSeq });
      }),
    [onStatusChange, id],
  );
  return kick;
}

/**
 * A small one-time move that matches the new status. `wrap` holds the tile (free to move); `tile` is the tile
 * itself (only its opacity and blur are touched). Accepted has none here: the celebration plays instead.
 */
export function playKick(wrap: HTMLElement, tile: HTMLElement, to: Status, color: string) {
  switch (to) {
    case "waitlisted":
      // A pulse and a ripple: still in the running.
      wrap.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.06)", offset: 0.25 },
          { transform: "scale(0.985)", offset: 0.55 },
          { transform: "scale(1.01)", offset: 0.78 },
          { transform: "scale(1)" },
        ],
        { duration: 750, easing: "ease-out" },
      );
      wrap.animate([{ boxShadow: `0 0 0 0 ${rgba(color, 0.6)}` }, { boxShadow: `0 0 0 18px ${rgba(color, 0)}` }], {
        duration: 900,
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
      break;
    case "deferred":
      // Nudged aside to later, then back.
      wrap.animate(
        [
          { transform: "none" },
          { transform: "translateX(16px) rotate(2deg)", offset: 0.3 },
          { transform: "translateX(-5px) rotate(-0.6deg)", offset: 0.62 },
          { transform: "translateX(2px)", offset: 0.82 },
          { transform: "none" },
        ],
        { duration: 700, easing: "cubic-bezier(.3,.7,.3,1)" },
      );
      break;
    case "rejected":
      // Sinks a little and settles, without bouncing back up.
      wrap.animate(
        [
          { transform: "none" },
          { transform: "translateY(7px) scale(0.95)", offset: 0.35 },
          { transform: "translateY(-1px) scale(1.005)", offset: 0.72 },
          { transform: "none" },
        ],
        { duration: 650, easing: "cubic-bezier(.25,.8,.25,1)" },
      );
      break;
    case "withdrawn": {
      // A slow dissolve into the background (ending at whatever opacity the tile now rests at).
      const end = Number(tile.style.opacity || 1);
      tile.animate(
        [
          { opacity: 1, filter: "blur(0px)" },
          { opacity: (1 + end) / 2, filter: "blur(2.5px)", offset: 0.4 },
          { opacity: end, filter: "blur(0px)" },
        ],
        { duration: 1300, easing: "ease-out" },
      );
      wrap.animate([{ transform: "scale(1)" }, { transform: "scale(0.965)", offset: 0.4 }, { transform: "scale(1)" }], {
        duration: 1300,
        easing: "ease-in-out",
      });
      break;
    }
    case "pending":
      // A quick reset bob.
      wrap.animate([{ transform: "scale(0.96)" }, { transform: "scale(1.02)", offset: 0.6 }, { transform: "scale(1)" }], {
        duration: 380,
        easing: "ease-out",
      });
      break;
  }
}
