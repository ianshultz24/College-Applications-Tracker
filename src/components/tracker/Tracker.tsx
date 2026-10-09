"use client";

import { MotionConfig, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Backend } from "@/lib/backend";
import { computeLayout } from "@/lib/layout";
import { STATUSES, type School, type Settings } from "@/lib/types";
import { Background } from "./Background";
import { Card, type OpenState } from "./Card";
import { EmptyState, Grid } from "./Grid";
import { Header } from "./Header";
import { SettingsPanel } from "./SettingsPanel";
import { TrackerProvider, useStore } from "./store";
import { useViewportWidth } from "./useViewportWidth";

// Game Mode downloads only the first time its button is pressed; each game downloads only on Play.
const GameMode = dynamic(() => import("../games/GameMode"), { ssr: false });

export function Tracker(props: { backend: Backend; initialSchools: School[]; initialSettings: Settings }) {
  return (
    <TrackerProvider backend={props.backend} initialSchools={props.initialSchools} initialSettings={props.initialSettings}>
      <MotionConfig reducedMotion="user">
        <TrackerView />
      </MotionConfig>
    </TrackerProvider>
  );
}

function TrackerView() {
  const store = useStore();
  const { schools, settings } = store;
  const reduced = !!useReducedMotion();
  const width = useViewportWidth();

  const [editAll, setEditAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  /** Stays true once Game Mode has been opened, so its code is fetched once and the drawer can slide out. */
  const [gamesLoaded, setGamesLoaded] = useState(false);
  /** A full-screen game is playing: the tracker is frozen (no clicks, hover, keys or scroll) and blurred. */
  const [frozen, setFrozen] = useState(false);
  const [open, setOpen] = useState<OpenState | null>(null);
  /** The tile a closing card is shrinking back into; it stays hidden until the card lands on it. */
  const [landing, setLanding] = useState<string | null>(null);
  const seq = useRef(0);
  const hoverId = useRef<string | null>(null);

  const hidden = useMemo(
    () => new Set([open?.returnId, landing].filter((id): id is string => !!id)),
    [open?.returnId, landing],
  );

  // When the card has closed (and landed), put keyboard focus back on the tile it came from.
  const lastTarget = useRef<string | null>(null);
  useEffect(() => {
    if (open) {
      lastTarget.current = open.id ?? "__add";
      return;
    }
    if (landing) return;
    const target = lastTarget.current;
    if (!target) return;
    lastTarget.current = null;
    const el =
      document.querySelector<HTMLElement>(`[data-tile="${target}"] [data-tile-btn]`) ??
      document.querySelector<HTMLElement>(`[data-tile="${target}"] button`);
    el?.focus({ preventScroll: true });
  }, [open, landing]);

  const L = useMemo(
    () => computeLayout(width || 1280, settings.tile_size, { editAll, showNames: settings.show_names }),
    [width, settings.tile_size, settings.show_names, editAll],
  );

  const openTile = useCallback(
    (id: string) => {
      if (open) return;
      setOpen({ id, mode: editAll ? "edit" : "view", from: "tile", returnId: id, seq: ++seq.current });
    },
    [open, editAll],
  );
  const openAdd = useCallback(() => {
    if (!open) setOpen({ id: null, mode: "add", from: "add", returnId: "__add", seq: ++seq.current });
  }, [open]);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    document.querySelector<HTMLElement>('[aria-controls="ct-settings"]')?.focus({ preventScroll: true });
  }, []);

  const closeGames = useCallback((refocus = true) => {
    setGamesOpen(false);
    if (refocus) document.querySelector<HTMLElement>('[aria-controls="ct-games"]')?.focus({ preventScroll: true });
  }, []);

  const toggleGames = useCallback(() => {
    if (open) return;
    if (gamesOpen) return closeGames();
    setSettingsOpen(false);
    setGamesLoaded(true);
    setGamesOpen(true);
  }, [open, gamesOpen, closeGames]);

  // When a game ends, give keyboard focus back to the Game Mode button.
  const wasFrozen = useRef(false);
  useEffect(() => {
    if (wasFrozen.current && !frozen) {
      document.querySelector<HTMLElement>('[aria-controls="ct-games"]')?.focus({ preventScroll: true });
    }
    wasFrozen.current = frozen;
  }, [frozen]);

  const toggleEdit = useCallback(() => {
    if (open) return;
    setEditAll((v) => !v);
  }, [open]);

  // Esc: game drawer or settings first, then edit-all. (The card and a running game handle their own Esc.)
  // Edit-all: hover or focus a tile and press 1–6 to set its status.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open || frozen) return;
      if (e.key === "Escape") {
        if (gamesOpen) closeGames();
        else if (settingsOpen) closeSettings();
        else if (editAll) setEditAll(false);
        return;
      }
      if (!editAll || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const n = Number(e.key);
      const id = hoverId.current;
      if (id && n >= 1 && n <= STATUSES.length) {
        e.preventDefault();
        store.setStatus(id, STATUSES[n - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, frozen, gamesOpen, settingsOpen, editAll, store, closeSettings, closeGames]);

  const ready = width > 0;

  return (
    <>
      <Background url={store.backgroundUrl} blur={settings.blur_px} dim={settings.dim} />
      <div className="relative z-[1] flow-root min-h-dvh" inert={frozen} aria-hidden={frozen || undefined}>
        <Header
          narrow={L.narrow}
          editAll={editAll}
          settingsOpen={settingsOpen}
          gamesOpen={gamesOpen}
          canEdit={schools.length > 0}
          onToggleEdit={toggleEdit}
          onToggleSettings={() => {
            if (settingsOpen) return closeSettings();
            closeGames(false);
            setSettingsOpen(true);
          }}
          onToggleGames={toggleGames}
        />
        <main
          className="flex items-center justify-center"
          style={{
            minHeight: L.narrow ? "calc(100dvh - 66px)" : "calc(100dvh - 72px)",
            padding: L.narrow ? "22px 16px 44px" : "28px 32px 56px",
            visibility: ready ? "visible" : "hidden",
          }}
        >
          {!ready ? null : schools.length > 0 ? (
            <Grid
              schools={schools}
              colors={settings.colors}
              L={L}
              logoUrl={store.logoUrl}
              showNames={settings.show_names}
              shimmer={settings.shimmer}
              reduced={reduced}
              editAll={editAll}
              hidden={hidden}
              onOpen={openTile}
              onAdd={openAdd}
              onHover={(id, on) => {
                if (on) hoverId.current = id;
                else if (hoverId.current === id) hoverId.current = null;
              }}
              onStatus={store.setStatus}
              onRemove={(id) => store.removeSchool(id, "Removed")}
              onMove={store.moveSchool}
            />
          ) : (
            <EmptyState L={L} addOpen={hidden.has("__add")} onAdd={openAdd} />
          )}
        </main>
      </div>
      <SettingsPanel open={settingsOpen} narrow={L.narrow} onClose={closeSettings} />
      {gamesLoaded && (
        <GameMode drawerOpen={gamesOpen} narrow={L.narrow} reduced={reduced} onCloseDrawer={closeGames} onFrozenChange={setFrozen} />
      )}
      <Card open={open} setOpen={setOpen} landing={landing} setLanding={setLanding} L={L} reduced={reduced} />
    </>
  );
}
