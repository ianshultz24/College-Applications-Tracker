"use client";

import { AnimatePresence } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useStore } from "../tracker/store";
import { GameDrawer } from "./GameDrawer";
import { GameStage } from "./GameStage";
import type { GameMeta } from "./registry";

/**
 * Everything Game Mode adds to the page: the drawer and, once a game is chosen, its stage.
 * Downloaded only after the Game Mode button is first pressed (see Tracker.tsx).
 */
export default function GameMode({
  drawerOpen,
  narrow,
  reduced,
  onCloseDrawer,
  onFrozenChange,
}: {
  drawerOpen: boolean;
  narrow: boolean;
  reduced: boolean;
  onCloseDrawer: (refocus?: boolean) => void;
  onFrozenChange: (frozen: boolean) => void;
}) {
  const { settings } = useStore();
  const [active, setActive] = useState<GameMeta | null>(null);
  const { accepted, waitlisted, deferred, rejected } = settings.colors;
  const colors = useMemo(() => [accepted, waitlisted, deferred, rejected, "#f4c95d", "#f7f2e7"], [accepted, waitlisted, deferred, rejected]);

  const play = (game: GameMeta) => {
    onCloseDrawer(false);
    setActive(game);
    onFrozenChange(game.kind === "overlay");
  };

  const exit = useCallback(() => {
    setActive(null);
    onFrozenChange(false);
  }, [onFrozenChange]);

  return (
    <>
      <GameDrawer open={drawerOpen} narrow={narrow} onClose={() => onCloseDrawer()} onPlay={play} />
      <AnimatePresence>
        {active && <GameStage key={active.id} game={active} narrow={narrow} reduced={reduced} colors={colors} onExit={exit} />}
      </AnimatePresence>
    </>
  );
}
