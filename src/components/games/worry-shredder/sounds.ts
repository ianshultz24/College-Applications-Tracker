import { audio } from "../sound";

/** Crackly paper-tearing noise: white noise chopped into tiny random grains, made once and looped. */
function shredNoise(ac: AudioContext) {
  const len = Math.floor(ac.sampleRate * 1.2);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let env = 0;
  for (let i = 0; i < len; i++) {
    if (Math.random() < 90 / ac.sampleRate) env = 0.35 + Math.random() * 0.65; // a new tear every ~11ms
    env *= 0.9993;
    data[i] = (Math.random() * 2 - 1) * env;
  }
  return buf;
}

/** The shredder's sounds. Returns null if audio isn't available. */
export function shredderSounds() {
  const ac = audio();
  if (!ac) return null;
  const out = ac.createGain();
  out.gain.value = 0.55;
  out.connect(ac.destination);
  let stopMotor: (() => void) | null = null;
  let shredGain: GainNode | null = null;

  return {
    /** Motor hum + tearing paper (silent until `setShred`). */
    start() {
      if (stopMotor) return;
      const t = ac.currentTime;
      const motor = ac.createGain();
      motor.gain.setValueAtTime(0, t);
      motor.gain.linearRampToValueAtTime(0.16, t + 0.18);
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 340;
      lp.Q.value = 1.2;
      const o1 = ac.createOscillator();
      o1.type = "sawtooth";
      o1.frequency.setValueAtTime(38, t);
      o1.frequency.linearRampToValueAtTime(58, t + 0.25);
      const o2 = ac.createOscillator();
      o2.type = "square";
      o2.frequency.setValueAtTime(76, t);
      o2.frequency.linearRampToValueAtTime(117, t + 0.25);
      const o2g = ac.createGain();
      o2g.gain.value = 0.25;
      // Rumble: a slow wobble in volume.
      const lfo = ac.createOscillator();
      lfo.frequency.value = 13;
      const lfoG = ac.createGain();
      lfoG.gain.value = 0.03;
      lfo.connect(lfoG).connect(motor.gain);
      o1.connect(lp);
      o2.connect(o2g).connect(lp);
      lp.connect(motor).connect(out);

      const noise = ac.createBufferSource();
      noise.buffer = shredNoise(ac);
      noise.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2300;
      bp.Q.value = 0.7;
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 500;
      shredGain = ac.createGain();
      shredGain.gain.value = 0;
      noise.connect(bp).connect(hp).connect(shredGain).connect(out);

      const srcs = [o1, o2, lfo, noise];
      srcs.forEach((s) => s.start(t));
      stopMotor = () => {
        const now = ac.currentTime;
        motor.gain.cancelScheduledValues(now);
        motor.gain.setValueAtTime(motor.gain.value, now);
        motor.gain.linearRampToValueAtTime(0, now + 0.3);
        o1.frequency.linearRampToValueAtTime(30, now + 0.3);
        shredGain?.gain.setTargetAtTime(0, now, 0.05);
        srcs.forEach((s) => s.stop(now + 0.35));
      };
    },
    /** How much paper is going through right now (0–1). */
    setShred(level: number) {
      shredGain?.gain.setTargetAtTime(0.32 * level, ac.currentTime, 0.04);
    },
    stop() {
      stopMotor?.();
      stopMotor = null;
      shredGain = null;
    },
    /** The confetti burst: a soft pop and a few light chimes. */
    pop() {
      const t = ac.currentTime;
      const n = ac.createBufferSource();
      const len = Math.floor(ac.sampleRate * 0.14);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      n.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1100;
      const ng = ac.createGain();
      ng.gain.value = 0.5;
      n.connect(bp).connect(ng).connect(out);
      n.start(t);

      const thump = ac.createOscillator();
      thump.frequency.setValueAtTime(420, t);
      thump.frequency.exponentialRampToValueAtTime(110, t + 0.14);
      const tg = ac.createGain();
      tg.gain.setValueAtTime(0.28, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      thump.connect(tg).connect(out);
      thump.start(t);
      thump.stop(t + 0.2);

      [1318.5, 1568, 1975.5, 2349.3, 2637].forEach((f, i) => {
        const o = ac.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        const g = ac.createGain();
        const at = t + 0.05 + i * 0.055 + Math.random() * 0.03;
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.045, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0008, at + 0.5);
        o.connect(g).connect(out);
        o.start(at);
        o.stop(at + 0.55);
      });
    },
    dispose() {
      this.stop();
      setTimeout(() => out.disconnect(), 800);
    },
  };
}

export type ShredderSounds = NonNullable<ReturnType<typeof shredderSounds>>;
