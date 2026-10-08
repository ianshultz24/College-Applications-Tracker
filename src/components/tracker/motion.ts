import type { Transition } from "motion/react";

/** The design's springs: open/grow (bounce .24, ~0.52s), close (bounce .06, ~0.4s). */
export const cardSpring: Transition = { type: "spring", bounce: 0.24, duration: 0.52 };
export const closeSpring: Transition = { type: "spring", bounce: 0.06, duration: 0.4 };
export const reorderSpring: Transition = { type: "spring", bounce: 0.16, duration: 0.36 };
export const fade: Transition = { duration: 0.24, ease: "easeOut" };
