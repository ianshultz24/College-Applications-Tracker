export type Pose = { x: number; y: number; r: number };

const KEYS = ["x", "y", "r"] as const;
// Stiffness / damping per unit mass: position follows quickly with a soft settle; tilt is a little looser.
const TUNING = { x: [740, 54], y: [740, 54], r: [360, 24] } as const;

/**
 * Moves the page like a real sheet of paper: it springs toward wherever it's told to go and writes its own
 * transform, so dragging never re-renders React. Runs only while it's moving.
 */
export class PaperSpring {
  private cur: Pose;
  private tgt: Pose;
  private vel: Pose = { x: 0, y: 0, r: 0 };
  private el: HTMLElement | null = null;
  private raf = 0;
  private last = 0;

  constructor(
    start: Pose,
    /** Reduced motion: go straight there. */
    private instant: boolean,
  ) {
    this.cur = { ...start };
    this.tgt = { ...start };
  }

  attach(el: HTMLElement | null) {
    this.el = el;
    this.apply();
  }

  get target(): Pose {
    return { ...this.tgt };
  }

  /** Spring toward a new pose. */
  to(p: Partial<Pose>) {
    if (this.instant) return this.jump(p);
    Object.assign(this.tgt, p);
    this.kick();
  }

  /** Be there now, no motion. */
  jump(p: Partial<Pose>) {
    Object.assign(this.cur, p);
    Object.assign(this.tgt, p);
    for (const k of KEYS) if (k in p) this.vel[k] = 0;
    this.apply();
  }

  /** Give it a shove (e.g. a little wobble). */
  push(v: Partial<Pose>) {
    if (this.instant) return;
    for (const k of KEYS) this.vel[k] += v[k] ?? 0;
    this.kick();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.el = null;
  }

  private kick() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.step);
  }

  private step = (now: number) => {
    const dt = Math.min(1 / 30, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const h = dt / 4;
    let moving = false;
    for (const k of KEYS) {
      const [K, C] = TUNING[k];
      for (let i = 0; i < 4; i++) {
        this.vel[k] += (K * (this.tgt[k] - this.cur[k]) - C * this.vel[k]) * h;
        this.cur[k] += this.vel[k] * h;
      }
      if (Math.abs(this.tgt[k] - this.cur[k]) > 0.02 || Math.abs(this.vel[k]) > 0.02) moving = true;
      else {
        this.cur[k] = this.tgt[k];
        this.vel[k] = 0;
      }
    }
    this.apply();
    this.raf = moving ? requestAnimationFrame(this.step) : 0;
  };

  private apply() {
    if (this.el) this.el.style.transform = `translate3d(${this.cur.x}px, ${this.cur.y}px, 0) rotate(${this.cur.r}deg)`;
  }
}
