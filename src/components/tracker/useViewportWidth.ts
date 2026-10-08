"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** Width of the page content box (0 during server render, so layout waits for the real width). */
export function useViewportWidth() {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.clientWidth,
    () => 0,
  );
}
