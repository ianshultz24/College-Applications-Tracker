import { useEffect } from "react";

/** Lock page scroll while `active`. If a scrollbar is showing, keep its space so nothing shifts. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
    if (window.innerWidth > html.clientWidth) html.style.scrollbarGutter = "stable";
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev.overflow;
      html.style.scrollbarGutter = prev.gutter;
    };
  }, [active]);
}
