"use client";

import { Gamepad2, LayoutGrid, Pencil, Rows3, Settings as Gear } from "lucide-react";

const iconBtn =
  "flex size-[38px] items-center justify-center rounded-xl border border-white/14 text-white transition-colors hover:bg-white/18";

export type View = "grid" | "list";

const VIEWS = [
  { id: "grid", label: "Grid view", Icon: LayoutGrid },
  { id: "list", label: "List view", Icon: Rows3 },
] as const;

export function Header({
  narrow,
  view,
  onView,
  editAll,
  settingsOpen,
  gamesOpen,
  onToggleEdit,
  onToggleSettings,
  onToggleGames,
  canEdit,
}: {
  narrow: boolean;
  view: View;
  onView: (view: View) => void;
  editAll: boolean;
  settingsOpen: boolean;
  gamesOpen: boolean;
  onToggleEdit: () => void;
  onToggleSettings: () => void;
  onToggleGames: () => void;
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
        {!editAll && (
          <div role="group" aria-label="View" className="flex h-[38px] items-center gap-0.5 rounded-xl border border-white/14 bg-white/8 p-[3px]">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onView(id)}
                aria-label={label}
                aria-pressed={view === id}
                title={label}
                className="flex h-full w-[34px] items-center justify-center rounded-[9px] text-white transition-colors hover:bg-white/14"
                style={{ background: view === id ? "rgba(255,255,255,0.26)" : undefined }}
              >
                <Icon size={17} strokeWidth={1.9} aria-hidden />
              </button>
            ))}
          </div>
        )}
        {!editAll && (
          <button
            type="button"
            onClick={onToggleGames}
            aria-label="Game Mode"
            aria-expanded={gamesOpen}
            aria-controls="ct-games"
            title="Game Mode"
            className={iconBtn}
            style={{ background: gamesOpen ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.08)" }}
          >
            <Gamepad2 size={19} strokeWidth={1.9} aria-hidden />
          </button>
        )}
        {editAll ? (
          <button
            type="button"
            onClick={onToggleEdit}
            className="h-[38px] rounded-xl bg-white px-[18px] text-[14px] font-semibold text-ink hover:bg-[#ececee]"
          >
            Done
          </button>
        ) : (
          canEdit &&
          view === "grid" && (
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
