"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** The glass panel that slides in from the right (Settings, Game Mode). Only one is open at a time. */
export function SlideOver({
  id,
  title,
  open,
  narrow,
  onClose,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  narrow: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <aside
      id={id}
      aria-label={title}
      aria-hidden={!open}
      inert={!open}
      className="ct-dark fixed top-3 right-3 bottom-3 z-40 flex flex-col overflow-hidden rounded-[22px] border border-white/14 bg-[rgba(22,20,18,0.74)] text-white shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.5)] backdrop-blur-[28px] backdrop-saturate-[1.6]"
      style={{
        width: narrow ? "calc(100% - 24px)" : 360,
        transform: open ? "translateX(0px)" : "translateX(calc(100% + 32px))",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        // Hidden panels don't paint (no backdrop-filter cost while closed).
        visibility: open ? "visible" : "hidden",
        transition: open
          ? "transform .55s cubic-bezier(.2,1,.25,1), opacity .3s, visibility 0s"
          : "transform .55s cubic-bezier(.2,1,.25,1), opacity .3s, visibility 0s linear .55s",
      }}
    >
      <div className="flex h-[60px] flex-none items-center justify-between border-b border-white/8 pr-3 pl-5">
        <h2 className="m-0 text-[16px] font-semibold">{title}</h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={`Close ${title.toLowerCase()}`}
          className="flex size-9 items-center justify-center rounded-[11px] border border-white/14 bg-white/8 text-white hover:bg-white/18"
        >
          <X size={15} strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      <div className="ct-noscrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-5">{children}</div>
    </aside>
  );
}
