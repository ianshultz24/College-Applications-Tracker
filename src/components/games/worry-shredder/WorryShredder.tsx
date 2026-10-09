"use client";

import type { GameProps } from "../registry";

/** Phase 1 placeholder: proves the game downloads on Play and sits on the frozen tracker. */
export default function WorryShredder({ top }: GameProps) {
  return (
    <div className="flex size-full items-center justify-center" style={{ paddingTop: top }}>
      <div className="h-[380px] w-[300px] -rotate-2 rounded-[4px] bg-[#f7f2e7] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]" />
    </div>
  );
}
