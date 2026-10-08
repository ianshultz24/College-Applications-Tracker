"use client";

import { LayoutGroup, MotionConfig, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Backend } from "@/lib/backend";
import { computeLayout } from "@/lib/layout";
import { STATUSES, type School, type Settings } from "@/lib/types";
import { Background } from "./Background";
import { Card, type OpenState } from "./Card";
import { EmptyState, Grid } from "./Grid";
import { Header } from "./Header";
import { TrackerProvider, useStore } from "./store";
import { useViewportWidth } from "./useViewportWidth";

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
  const [open, setOpen] = useState<OpenState | null>(null);
  const hoverId = useRef<string | null>(null);

  // When the card closes, put keyboard focus back on the tile it came from.
  const lastTarget = useRef<string | null>(null);
  useEffect(() => {
    if (open) {
      lastTarget.current = open.id ?? "__add";
      return;
    }
    const target = lastTarget.current;
    if (!target) return;
    lastTarget.current = null;
    const t = setTimeout(() => {
      const el =
        document.querySelector<HTMLElement>(`[data-tile="${target}"] [data-tile-btn]`) ??
        document.querySelector<HTMLElement>(`[data-tile="${target}"] button`);
      el?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
  }, [open]);

  const L = useMemo(
    () => computeLayout(width || 1280, settings.tile_size, { editAll, showNames: settings.show_names }),
    [width, settings.tile_size, settings.show_names, editAll],
  );

  const openTile = useCallback(
    (id: string) => {
      if (open) return;
      setOpen({ id, mode: editAll ? "edit" : "view", from: "tile", layoutKey: `tile-${id}` });
    },
    [open, editAll],
  );
  const openAdd = useCallback(() => {
    if (!open) setOpen({ id: null, mode: "add", from: "add", layoutKey: "tile-__add" });
  }, [open]);

  const toggleEdit = useCallback(() => {
    if (open) return;
    setEditAll((v) => !v);
  }, [open]);

  // Esc: settings first, then edit-all. (The card handles its own Esc.)
  // Edit-all: hover or focus a tile and press 1–6 to set its status.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (e.key === "Escape") {
        if (settingsOpen) setSettingsOpen(false);
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
  }, [open, settingsOpen, editAll, store]);

  const ready = width > 0;

  return (
    <LayoutGroup>
      <Background url={store.backgroundUrl} blur={settings.blur_px} dim={settings.dim} />
      <div className="relative z-[1] flow-root min-h-dvh">
        <Header
          narrow={L.narrow}
          editAll={editAll}
          settingsOpen={settingsOpen}
          canEdit={schools.length > 0}
          onToggleEdit={toggleEdit}
          onToggleSettings={() => setSettingsOpen((v) => !v)}
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
              openId={open?.id ?? null}
              addOpen={!!open && open.mode === "add"}
              onOpen={openTile}
              onAdd={openAdd}
              onHover={(id) => {
                hoverId.current = id;
              }}
              onStatus={store.setStatus}
              onRemove={(id) => store.removeSchool(id, "Removed")}
              onMove={store.moveSchool}
            />
          ) : (
            <EmptyState L={L} addOpen={!!open && open.mode === "add"} reduced={reduced} onAdd={openAdd} />
          )}
        </main>
      </div>
      <Card open={open} setOpen={setOpen} L={L} reduced={reduced} />
    </LayoutGroup>
  );
}
