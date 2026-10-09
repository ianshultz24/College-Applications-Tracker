import { Lock, Maximize2, Timer, type LucideIcon } from "lucide-react";
import { lazy, type ComponentType } from "react";
import { ShredderArt } from "./ShredderArt";

/** What every game gets from Game Mode. */
export type GameProps = {
  onExit: () => void;
  reduced: boolean;
  narrow: boolean;
  /** Space the top bar takes (px); the game may draw behind it but should keep its controls below it. */
  top: number;
  /** Sound is off until the person turns it on with the speaker button. */
  sound: boolean;
  /** Bright colors to celebrate with: the person's own status colors plus a couple of accents. */
  colors: string[];
};

export type GameMeta = {
  id: string;
  name: string;
  tagline: string;
  /**
   * "overlay": freezes and blurs the tracker and plays on top of it.
   * "tracker": plays on the tracker itself (nothing is frozen).
   */
  kind: "overlay" | "tracker";
  tags: { icon: LucideIcon; label: string }[];
  /** Card art for the drawer (part of the drawer download, not the game's). */
  art: { background: string; Art: ComponentType };
  /** Fetches the game's code (called early, on press-down of Play). */
  load: () => Promise<{ default: ComponentType<GameProps> }>;
  /** The game itself, made from `load`. Its code is only fetched when it first renders. */
  Game: ComponentType<GameProps>;
};

const loadWorryShredder = () => import("./worry-shredder/WorryShredder");

/** Every game in the drawer, in order. To add one: a new entry here and a new folder next to worry-shredder/. */
export const GAMES: GameMeta[] = [
  {
    id: "worry-shredder",
    name: "Worry Shredder",
    tagline: "Type it. Shred it. Let it go.",
    kind: "overlay",
    tags: [
      { icon: Maximize2, label: "Full screen" },
      { icon: Timer, label: "1 min" },
      { icon: Lock, label: "Nothing saved" },
    ],
    art: { background: "linear-gradient(155deg, #f4b48a 0%, #e57f5c 52%, #c9573f 100%)", Art: ShredderArt },
    load: loadWorryShredder,
    Game: lazy(loadWorryShredder),
  },
];
