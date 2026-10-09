"use client";

import { Volume2, VolumeX, X } from "lucide-react";
import { motion } from "motion/react";
import { Component, Suspense, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useScrollLock } from "../tracker/useScrollLock";
import type { GameMeta } from "./registry";
import { audio, readSoundPref, writeSoundPref } from "./sound";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select,[tabindex]:not([tabindex="-1"])';

/**
 * Where a game plays. "overlay" games get a blurred, dimmed backdrop over the frozen tracker, a top bar
 * (name, sound, close), Esc to close and a focus trap. "tracker" games get the same bar but no backdrop.
 */
export function GameStage({
  game,
  narrow,
  reduced,
  colors,
  onExit,
}: {
  game: GameMeta;
  narrow: boolean;
  reduced: boolean;
  colors: string[];
  onExit: () => void;
}) {
  const overlay = game.kind === "overlay";
  const rootRef = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useState(readSoundPref);
  const { Game } = game;
  const top = narrow ? 66 : 72;

  useScrollLock(overlay);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    writeSoundPref(next);
    if (next) audio(); // Unlock audio during this tap so the first sound isn't blocked.
  };

  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!overlay || e.key !== "Tab" || !rootRef.current) return;
    const items = [...rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const iconBtn =
    "flex size-[38px] items-center justify-center rounded-xl border border-white/14 bg-white/8 text-white transition-colors hover:bg-white/18";

  return (
    <motion.div
      ref={rootRef}
      role={overlay ? "dialog" : "region"}
      aria-modal={overlay || undefined}
      aria-label={game.name}
      onKeyDown={trapTab}
      className={`ct-dark fixed inset-0 z-50 ${overlay ? "" : "pointer-events-none"}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: reduced ? 0.15 : 0.35, ease: "easeOut" } }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0.12 : 0.28, ease: "easeIn" } }}
    >
      {overlay && <div aria-hidden className="absolute inset-0 bg-[rgba(12,11,10,0.42)] backdrop-blur-[18px] backdrop-saturate-[1.15]" />}

      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { scale: 0.97, y: 10 }}
        animate={{ scale: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.5 } }}
        exit={reduced ? undefined : { scale: 0.98, transition: { duration: 0.25 } }}
      >
        <GameErrorBoundary onExit={onExit}>
          <Suspense fallback={<Loading />}>
            <Game onExit={onExit} reduced={reduced} narrow={narrow} top={top} sound={sound} colors={colors} />
          </Suspense>
        </GameErrorBoundary>
      </motion.div>

      {/* Sits exactly where the tracker's header is, so the switch feels like one bar changing. */}
      <div
        className="pointer-events-auto absolute right-0 left-0 flex h-14 items-center justify-between gap-3 rounded-[18px] border border-white/14 bg-[rgba(22,20,18,0.5)] pr-[9px] pl-4 text-white shadow-[0_12px_32px_-14px_rgba(0,0,0,0.45)] backdrop-blur-[22px]"
        style={{ top: narrow ? 10 : 16, margin: narrow ? "0 10px" : "0 16px" }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="size-6 flex-none rounded-[7px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]" style={{ background: game.art.background }} />
          <h2 className="m-0 truncate font-semibold tracking-[-0.01em]" style={{ fontSize: narrow ? 15 : 16 }}>
            {game.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label="Sound"
            title={sound ? "Sound on" : "Sound off"}
            className={iconBtn}
          >
            {sound ? <Volume2 size={18} strokeWidth={1.9} aria-hidden /> : <VolumeX size={18} strokeWidth={1.9} aria-hidden />}
          </button>
          <button type="button" onClick={onExit} aria-label="Close game" title="Back to tracker (Esc)" className={iconBtn}>
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Loading() {
  return (
    <div className="flex size-full items-center justify-center" role="status">
      <div className="flex items-center gap-3 text-[14px] text-white/80">
        <span className="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white" aria-hidden />
        Loading…
      </div>
    </div>
  );
}

/** If the game's download fails (offline, new deploy), say so instead of leaving a blank screen. */
class GameErrorBoundary extends Component<{ onExit: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex size-full flex-col items-center justify-center gap-4 px-6 text-center text-white" role="alert">
        <p className="m-0 text-[15px]">Couldn’t load the game. Check your connection and try again.</p>
        <button
          type="button"
          onClick={this.props.onExit}
          className="h-10 rounded-xl bg-white px-4 text-[14px] font-semibold text-ink hover:bg-[#ececee]"
        >
          Back to tracker
        </button>
      </div>
    );
  }
}
