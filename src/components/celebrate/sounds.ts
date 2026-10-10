import { audio } from "../games/sound";
import type { BurstKind } from "./fireworks";

/** The celebration's sounds, made live (no audio files). Returns null if audio isn't available. */
export function celebrationSounds() {
  const ac = audio();
  if (!ac) return null;
  const out = ac.createGain();
  out.gain.value = 0.55;
  out.connect(ac.destination);

  const noise = (seconds: number, decay: number) => {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    const src = ac.createBufferSource();
    src.buffer = buf;
    return src;
  };

  const tone = (freq: number, at: number, length: number, gain: number, type: OscillatorType = "sine") => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, at + length);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + length + 0.05);
  };

  return {
    /** The tile pops up: a soft pop and a bright shimmer. */
    pop() {
      const t = ac.currentTime;
      const n = noise(0.12, 3);
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1400;
      const g = ac.createGain();
      g.gain.value = 0.4;
      n.connect(bp).connect(g).connect(out);
      n.start(t);
      [1568, 2093, 2637, 3136].forEach((f, i) => tone(f, t + 0.04 + i * 0.04, 0.45, 0.035));
    },
    /** A rocket climbing: a quiet rising whistle. */
    whistle() {
      const t = ac.currentTime;
      const o = ac.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(1900, t + 0.6);
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.025, t + 0.1);
      g.gain.linearRampToValueAtTime(0, t + 0.65);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.7);
    },
    /** A firework opening: a muffled boom, plus crackle for the gold willow. */
    boom(kind: BurstKind) {
      const t = ac.currentTime;
      const n = noise(0.7, 2.5);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(900, t);
      lp.frequency.exponentialRampToValueAtTime(140, t + 0.5);
      const g = ac.createGain();
      g.gain.value = 0.55;
      n.connect(lp).connect(g).connect(out);
      n.start(t);

      const thump = ac.createOscillator();
      thump.frequency.setValueAtTime(110, t);
      thump.frequency.exponentialRampToValueAtTime(45, t + 0.3);
      const tg = ac.createGain();
      tg.gain.setValueAtTime(0.3, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      thump.connect(tg).connect(out);
      thump.start(t);
      thump.stop(t + 0.4);

      if (kind === "willow" || kind === "ring") {
        // Crackle: a scatter of tiny clicks while the sparks die.
        for (let i = 0; i < 26; i++) {
          const at = t + 0.5 + Math.random() * 1.1;
          const c = noise(0.012, 1);
          const hp = ac.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 2500;
          const cg = ac.createGain();
          cg.gain.value = 0.12 + Math.random() * 0.1;
          c.connect(hp).connect(cg).connect(out);
          c.start(at);
        }
      }
    },
    /** The banner arrives: a short, warm major chord rolled upward. */
    chime() {
      const t = ac.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(f, t + i * 0.07, 1.1, 0.05, "triangle");
        tone(f * 2, t + i * 0.07, 0.6, 0.012);
      });
    },
    dispose() {
      setTimeout(() => out.disconnect(), 3000);
    },
  };
}
