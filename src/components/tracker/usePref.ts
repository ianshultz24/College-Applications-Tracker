"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Choices remembered on this device (List vs Grid, the list's sort). When storage refuses a write, the value is kept here instead. */
const memory = new Map<string, string>();
const EVENT = "ct-pref";

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A remembered text value (null until set, and during server render). */
export function usePref(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);
  const set = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
        memory.delete(key);
      } catch {
        // Private windows can refuse storage; the choice lasts until the page is closed.
        memory.set(key, next);
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set];
}
