"use client";

import { Pencil, Settings as Gear } from "lucide-react";

const iconBtn =
  "flex size-[38px] items-center justify-center rounded-xl border border-white/14 text-white transition-colors hover:bg-white/18";

export function Header({
  narrow,
  editAll,
  settingsOpen,
  onToggleEdit,
  onToggleSettings,
  canEdit,
}: {
  narrow: boolean;
  editAll: boolean;
  settingsOpen: boolean;
  onToggleEdit: () => void;
  onToggleSettings: () => void;
  canEdit: boolean;
}) {
  return (
    <header
      className="ct-dark sticky z-10 flex h-14 items-center justify-between gap-3 rounded-[18px] border border-white/14 bg-[rgba(22,20,18,0.5)] pr-[9px] pl-5 text-white shadow-[0_12px_32px_-14px_rgba(0,0,0,0.45)] backdrop-blur-[22px] backdrop-saturate-150"
      style={{ top: narrow ? 10 : 16, margin: narrow ? "10px 10px 0" : "16px 16px 0" }}
    >
      <h1 className="m-0 font-semibold tracking-[-0.01em]" style={{ fontSize: narrow ? 15 : 16 }}>
        College Tracker
      </h1>
      <div className="flex items-center gap-2">
        {editAll ? (
          <button
            type="button"
            onClick={onToggleEdit}
            className="h-[38px] rounded-xl bg-white px-[18px] text-[14px] font-semibold text-ink hover:bg-[#ececee]"
          >
            Done
          </button>
        ) : (
          canEdit && (
            <button
              type="button"
              onClick={onToggleEdit}
              aria-label="Edit all schools"
              title="Edit all"
              className={`${iconBtn} bg-white/8`}
            >
              <Pencil size={18} strokeWidth={1.9} aria-hidden />
            </button>
          )
        )}
        <button
          type="button"
          onClick={onToggleSettings}
          aria-label="Settings"
          aria-expanded={settingsOpen}
          aria-controls="ct-settings"
          title="Settings"
          className={iconBtn}
          style={{ background: settingsOpen ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.08)" }}
        >
          <Gear size={18} strokeWidth={1.9} aria-hidden />
        </button>
      </div>
    </header>
  );
}
