/** Game sound: off by default, the person's choice is remembered on this device. Sounds are made live (no audio files). */

const KEY = "ct-game-sound";

export function readSoundPref(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function writeSoundPref(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Private windows can refuse storage; the choice just won't be remembered.
  }
}

let ctx: AudioContext | null = null;

/** The shared audio context, created on first use (call from a tap or key press so browsers allow it). */
export function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}
