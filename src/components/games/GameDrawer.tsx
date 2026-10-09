"use client";

import { Play } from "lucide-react";
import { SlideOver } from "../tracker/SlideOver";
import { GAMES, type GameMeta } from "./registry";

/** The Game Mode drawer: one card per game in the registry. */
export function GameDrawer({
  open,
  narrow,
  onClose,
  onPlay,
}: {
  open: boolean;
  narrow: boolean;
  onClose: () => void;
  onPlay: (game: GameMeta) => void;
}) {
  return (
    <SlideOver id="ct-games" title="Game Mode" open={open} narrow={narrow} onClose={onClose}>
      <p className="m-0 px-1 pt-4 pb-4 text-[13.5px] leading-[1.45] text-white/72">A quick break. Your tracker waits right here.</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {GAMES.map((game) => (
          <li key={game.id}>
            <GameCard game={game} onPlay={() => onPlay(game)} />
          </li>
        ))}
      </ul>
    </SlideOver>
  );
}

function GameCard({ game, onPlay }: { game: GameMeta; onPlay: () => void }) {
  const { Art } = game.art;
  return (
    <article className="group overflow-hidden rounded-[20px] border border-white/10 bg-white/6 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
      {/* The whole picture is a Play target too (the button below is the one keyboards and screen readers use). */}
      <div
        aria-hidden
        onClick={onPlay}
        onPointerDown={() => void game.load()}
        className="relative aspect-[16/10] cursor-pointer overflow-hidden"
        style={{ background: game.art.background }}
      >
        <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(.2,1,.25,1)] group-hover:scale-[1.035]">
          <Art />
        </div>
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_-40px_50px_-30px_rgba(0,0,0,0.25)]" />
      </div>
      <div className="flex flex-col gap-3 px-4 pt-3.5 pb-4">
        <div>
          <h3 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">{game.name}</h3>
          <p className="m-0 mt-0.5 font-serif text-[15px] text-white/80 italic">{game.tagline}</p>
        </div>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="About this game">
          {game.tags.map(({ icon: Icon, label }) => (
            <li key={label} className="flex h-[26px] items-center gap-1.5 rounded-full bg-white/9 px-2.5 text-[12px] font-medium text-white/80">
              <Icon size={12} strokeWidth={2.2} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onPlay}
          // Start fetching the game the moment Play is pressed down, so it's ready when the press ends.
          onPointerDown={() => void game.load()}
          aria-label={`Play ${game.name}`}
          className="flex h-11 items-center justify-center gap-2 rounded-[13px] bg-white text-[15px] font-semibold text-ink transition-transform hover:bg-[#ececee] active:scale-[0.98]"
        >
          <Play size={15} strokeWidth={2.4} fill="currentColor" aria-hidden />
          Play
        </button>
      </div>
    </article>
  );
}
