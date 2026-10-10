"use client";

import { Download, LogOut, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { toISODate } from "@/lib/dates";
import { isImageFile } from "@/lib/images";
import { TILE_SIZES, type ColorKey, type TileSize } from "@/lib/types";
import { errorToast, infoToast } from "../toasts";
import { SlideOver } from "./SlideOver";
import { useStore } from "./store";

const COLOR_ROWS: [ColorKey, string][] = [
  ["accepted", "Accepted"],
  ["waitlisted", "Waitlisted"],
  ["deferred", "Deferred"],
  ["rejected", "Rejected"],
  ["withdrawn", "Withdrawn"],
  ["base", "Tile base"],
  ["text", "Tile text"],
];

const groupCls = "flex flex-col rounded-2xl border border-white/8 bg-white/6 py-1";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="m-0 px-1 pt-5 pb-2 text-[11.5px] font-semibold tracking-[0.08em] text-white/72 uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex min-h-[46px] items-center justify-between gap-3 border-0 bg-transparent pr-3 pl-3.5 text-left text-[14px] text-white"
    >
      <span>{label}</span>
      <span className="relative h-6 w-10 flex-none rounded-xl transition-colors" style={{ background: on ? "#ffffff" : "rgba(255,255,255,0.22)" }}>
        <span
          className="absolute top-0.5 left-0.5 size-5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          style={{
            background: on ? "#17181c" : "#ffffff",
            transform: on ? "translateX(16px)" : "translateX(0px)",
            transition: "transform .25s cubic-bezier(.3,1.4,.5,1)",
          }}
        />
      </span>
    </button>
  );
}

/** The S/M/L option closest to a stored pixel size. */
function sizeKey(px: number): TileSize {
  let best: TileSize = "M";
  for (const k of Object.keys(TILE_SIZES) as TileSize[]) {
    if (Math.abs(TILE_SIZES[k] - px) < Math.abs(TILE_SIZES[best] - px)) best = k;
  }
  return best;
}

export function SettingsPanel({ open, narrow, onClose }: { open: boolean; narrow: boolean; onClose: () => void }) {
  const store = useStore();
  const router = useRouter();
  const { settings } = store;
  const [editing, setEditing] = useState<ColorKey | null>(null);
  const [bgBusy, setBgBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [satText, setSatText] = useState(settings.my_sat == null ? "" : String(settings.my_sat));
  const [backupBusy, setBackupBusy] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bgInputId = useId();
  const satId = useId();

  // Collapse any open color picker when the panel closes.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setEditing(null);
  }

  // Keep the SAT box in sync after "Reset to defaults" or a rollback.
  const [lastSat, setLastSat] = useState(settings.my_sat);
  if (lastSat !== settings.my_sat) {
    setLastSat(settings.my_sat);
    setSatText(settings.my_sat == null ? "" : String(settings.my_sat));
  }

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const satValue = satText === "" ? null : Number(satText);
  const satInvalid = satText !== "" && (satText.length === 4 || satText.length > 4) && !(satValue! >= 400 && satValue! <= 1600);

  const onSat = (raw: string) => {
    const v = raw.replace(/[^0-9]/g, "").slice(0, 4);
    setSatText(v);
    if (v === "") store.updateSettings({ my_sat: null });
    else if (Number(v) >= 400 && Number(v) <= 1600) store.updateSettings({ my_sat: Number(v) });
  };

  const onBgFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isImageFile(file)) {
      errorToast("That file isn’t an image.");
      return;
    }
    setBgBusy(true);
    await store.setBackground(file);
    setBgBusy(false);
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 3200);
      return;
    }
    setConfirmReset(false);
    store.resetSettings();
    infoToast("Settings reset to defaults");
  };

  const backup = async () => {
    setBackupBusy(true);
    try {
      const data = await store.exportAll();
      const json = JSON.stringify({ app: "College Tracker", version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `college-tracker-backup-${toISODate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      errorToast("Couldn’t make the backup — check your connection and try again.");
    } finally {
      setBackupBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await store.backend.signOut();
      router.replace("/sign-in");
      router.refresh();
    } catch {
      errorToast("Couldn’t sign out — try again.");
    }
  };

  const size = sizeKey(settings.tile_size);

  return (
    <SlideOver id="ct-settings" title="Settings" open={open} narrow={narrow} onClose={onClose}>
      <Section title="Colors">
        <div className={groupCls}>
          {COLOR_ROWS.map(([key, label]) => {
            const value = settings.colors[key];
            const isEditing = editing === key;
            return (
              <div key={key}>
                <button
                  type="button"
                  aria-expanded={isEditing}
                  onClick={() => setEditing(isEditing ? null : key)}
                  className="flex min-h-[42px] w-full items-center justify-between gap-3 border-0 bg-transparent pr-3 pl-3.5 text-left text-white"
                >
                  <span className="text-[14px]">{label}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="text-[12px] tracking-[0.02em] text-white/72 tabular-nums">{value.toUpperCase()}</span>
                    <span
                      aria-hidden
                      className="size-[26px] rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_1px_3px_rgba(0,0,0,0.3)]"
                      style={{ background: value }}
                    />
                  </span>
                </button>
                {isEditing && (
                  <div className="ct-picker flex flex-col gap-2.5 px-3.5 pt-1 pb-3.5">
                    <HexColorPicker color={value} onChange={(c) => store.updateSettings({ colors: { ...settings.colors, [key]: c } })} />
                    <label className="flex items-center gap-2 text-[13px] text-white/72">
                      Hex
                      <HexColorInput
                        color={value}
                        prefixed
                        onChange={(c) => store.updateSettings({ colors: { ...settings.colors, [key]: c } })}
                        aria-label={`${label} color hex`}
                        className="h-8 w-[100px] rounded-[9px] border border-white/18 bg-white/8 px-2.5 text-[13px] font-semibold text-white uppercase outline-none focus:border-white/60"
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Background">
        <div className={`${groupCls} gap-1 py-1.5`}>
          <div className="flex min-h-11 items-center justify-between gap-2.5 pr-2.5 pl-3.5">
            <span className="text-[14px]">Photo</span>
            <span className="flex items-center gap-1.5">
              {(settings.background_path || store.backgroundUrl) && !bgBusy && (
                <button
                  type="button"
                  onClick={store.clearBackground}
                  className="h-8 rounded-[9px] border-0 bg-transparent px-2.5 text-[13px] text-white/80 hover:text-white"
                >
                  Use default
                </button>
              )}
              <label
                htmlFor={bgInputId}
                className="flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-[9px] bg-white/14 px-3 text-[13px] font-semibold whitespace-nowrap hover:bg-white/24 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-white"
              >
                <Upload size={14} strokeWidth={2.2} aria-hidden />
                {bgBusy ? "Uploading…" : "Upload image"}
                <input
                  id={bgInputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={bgBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    onBgFile(f);
                  }}
                />
              </label>
            </span>
          </div>
          <label className="flex flex-col gap-1.5 px-3.5 pt-1.5 pb-2">
            <span className="flex justify-between text-[14px]">
              <span>Blur</span>
              <span className="text-[13px] text-white/72">{settings.blur_px}px</span>
            </span>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={settings.blur_px}
              onChange={(e) => store.updateSettings({ blur_px: Number(e.target.value) })}
              className="m-0 w-full accent-white"
            />
          </label>
          <label className="flex flex-col gap-1.5 px-3.5 pt-1.5 pb-2.5">
            <span className="flex justify-between text-[14px]">
              <span>Dim</span>
              <span className="text-[13px] text-white/72">{Math.round(settings.dim * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={80}
              step={1}
              value={Math.round(settings.dim * 100)}
              onChange={(e) => store.updateSettings({ dim: Number(e.target.value) / 100 })}
              className="m-0 w-full accent-white"
            />
          </label>
        </div>
      </Section>

      <Section title="Layout">
        <div className={groupCls}>
          <div className="flex min-h-12 items-center justify-between gap-3 pr-2 pl-3.5">
            <span className="text-[14px]" id="ct-size-label">
              Tile size
            </span>
            <div role="radiogroup" aria-labelledby="ct-size-label" className="flex gap-0.5 rounded-[11px] bg-white/10 p-[3px]">
              {(Object.keys(TILE_SIZES) as TileSize[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={size === k}
                  aria-label={{ S: "Small", M: "Medium", L: "Large" }[k]}
                  onClick={() => store.updateSettings({ tile_size: TILE_SIZES[k] })}
                  className="h-[30px] w-[38px] rounded-lg border-0 text-[13px] font-semibold"
                  style={{ background: size === k ? "#ffffff" : "transparent", color: size === k ? "#17181c" : "#ffffff" }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <Toggle on={settings.show_names} label="Always show names" onToggle={() => store.updateSettings({ show_names: !settings.show_names })} />
          <Toggle on={settings.shimmer} label="Glass shimmer on hover" onToggle={() => store.updateSettings({ shimmer: !settings.shimmer })} />
          <Toggle on={settings.finishes} label="Status frames & glimmer" onToggle={() => store.updateSettings({ finishes: !settings.finishes })} />
        </div>
      </Section>

      <Section title="Data">
        <div className={groupCls}>
          <div className="flex min-h-[50px] items-center justify-between gap-3 pr-2.5 pl-3.5">
            <label htmlFor={satId} className="text-[14px]">
              My SAT
            </label>
            <input
              id={satId}
              value={satText}
              onChange={(e) => onSat(e.target.value)}
              inputMode="numeric"
              placeholder="—"
              autoComplete="off"
              aria-invalid={satInvalid}
              aria-describedby={satInvalid ? `${satId}-err` : undefined}
              className="h-[34px] w-[92px] rounded-[9px] border bg-white/8 px-2.5 text-right text-[14px] font-semibold text-white outline-none focus:border-white/60"
              style={{ borderColor: satInvalid ? "#e0685c" : "rgba(255,255,255,0.18)" }}
            />
          </div>
          {satInvalid && (
            <div id={`${satId}-err`} role="alert" className="-mt-1 px-3.5 pb-2 text-right text-[12.5px] text-[#f0a49b]">
              SAT is 400–1600
            </div>
          )}
          <div className="flex min-h-[50px] items-center justify-between gap-3 pr-2.5 pl-3.5">
            <span className="text-[14px]">Backup</span>
            <button
              type="button"
              onClick={backup}
              disabled={backupBusy}
              className="flex h-[34px] items-center gap-1.5 rounded-[9px] border border-white/18 bg-white/8 px-3 text-[13px] font-semibold text-white hover:bg-white/16 disabled:opacity-60"
            >
              <Download size={14} strokeWidth={2.2} aria-hidden />
              {backupBusy ? "Preparing…" : "Download backup"}
            </button>
          </div>
          <div className="flex min-h-[50px] items-center justify-between gap-3 pr-2.5 pl-3.5">
            <span className="text-[14px]">Defaults</span>
            <button
              type="button"
              onClick={reset}
              className="h-[34px] rounded-[9px] border px-3 text-[13px] font-semibold text-white"
              style={{
                background: confirmReset ? "#b9443a" : "rgba(255,255,255,0.08)",
                borderColor: confirmReset ? "#b9443a" : "rgba(255,255,255,0.18)",
              }}
            >
              {confirmReset ? "Tap again to reset all" : "Reset to defaults"}
            </button>
          </div>
        </div>
      </Section>

      <Section title="Account">
        <div className={groupCls}>
          <div className="flex min-h-[50px] items-center justify-between gap-3 pr-2.5 pl-3.5">
            <span className="min-w-0 truncate text-[14px] text-white/80">{store.backend.email ?? "Signed in"}</span>
            <button
              type="button"
              onClick={signOut}
              className="flex h-[34px] flex-none items-center gap-1.5 rounded-[9px] border border-white/18 bg-white/8 px-3 text-[13px] font-semibold text-white hover:bg-white/16"
            >
              <LogOut size={14} strokeWidth={2.2} aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </Section>

      <p className="m-0 px-1 pt-3.5 text-[12.5px] leading-[1.45] text-white/72">
        Changes apply instantly and are saved to your account. Colors, background and layout reset with “Reset to defaults”; your schools are never touched.
      </p>
    </SlideOver>
  );
}
