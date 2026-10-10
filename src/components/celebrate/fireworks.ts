/**
 * The acceptance celebration's canvas show: a burst of sparks off the tile, rockets that climb from the bottom
 * and open into fireworks (peony, ring, willow), and ribbon streamers that flutter down. Plain 2D canvas, no React.
 */

export type Box = { x: number; y: number; w: number; h: number };
export type BurstKind = "peony" | "ring" | "willow";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
  size: number;
  drag: number;
  gravity: number;
  /** How long a streak it leaves (seconds of travel); 0 = a dot. */
  trail: number;
  /** Crackles (flickers) as it dies. */
  twinkle: boolean;
  phase: number;
  /** A bright flash where a firework opens. */
  flash?: boolean;
};

type Rocket = { x: number; y: number; vx: number; vy: number; kind: BurstKind; colors: [string, string] };

type Ribbon = {
  x: number;
  y: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  sway: number;
  swaySpeed: number;
  phase: number;
  color: string;
  back: string;
  age: number;
  life: number;
};

export type FireworksOptions = {
  width: number;
  height: number;
  /** The tile the sparks fly off (or the spot the show centers on). */
  origin: Box;
  /** Bright colors: the person's Accepted color, its tint, golds, white. */
  palette: string[];
  rand?: () => number;
  onLaunch?: () => void;
  onBurst?: (kind: BurstKind) => void;
};

const ROCKET_GRAVITY = 1800;
const TAU = Math.PI * 2;

/** A darker version of a hex color (the back of a ribbon). */
export function shade(hex: string, t: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  const f = (v: number) => Math.round(v * (1 - t));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export class Fireworks {
  sparks: Spark[] = [];
  rockets: Rocket[] = [];
  ribbons: Ribbon[] = [];
  time = 0;
  /** The most sparks alive at once (tests use it to check the show scales with the screen). */
  peak = 0;

  private queue: { at: number; run: () => void }[] = [];
  private rand: () => number;
  private readonly W: number;
  private readonly H: number;
  private readonly palette: string[];
  /** Overall amount: fewer particles on small screens. */
  private readonly amount: number;
  /** Overall size/speed: bursts are smaller on small screens. */
  private readonly reach: number;

  constructor(private opts: FireworksOptions) {
    this.W = opts.width;
    this.H = opts.height;
    this.rand = opts.rand ?? Math.random;
    this.palette = opts.palette.length ? opts.palette : ["#ffffff"];
    this.amount = Math.min(1.2, Math.max(0.45, (this.W * this.H) / (1440 * 900)));
    this.reach = Math.min(1.1, Math.max(0.6, Math.sqrt(this.W * this.H) / 1100));

    this.sparkBurst(opts.origin);

    const narrow = this.W < 640;
    const times = narrow ? [0.3, 0.75, 1.2] : [0.3, 0.62, 0.95, 1.3, 1.65];
    const kinds: BurstKind[] = narrow ? ["peony", "willow", "ring"] : ["peony", "ring", "willow", "peony", "ring"];
    const xs = this.rocketColumns(times.length);
    times.forEach((at, i) => this.at(at, () => this.launch(xs[i], kinds[i], i)));

    // Streamers start once the first fireworks are up, in a few waves.
    const ribbons = Math.round((narrow ? 34 : 64) * Math.min(1, this.amount + 0.2));
    const waves = 5;
    for (let w = 0; w < waves; w++) {
      this.at(0.85 + w * 0.28, () => {
        for (let i = 0; i < Math.ceil(ribbons / waves); i++) this.ribbon();
      });
    }
  }

  get done() {
    return this.time > 0.2 && !this.queue.length && !this.sparks.length && !this.rockets.length && !this.ribbons.length;
  }

  /** The person clicked: no more launches, and everything on screen fades out fast. */
  hurry() {
    this.queue = [];
    this.rockets = [];
    for (const s of this.sparks) s.life = Math.min(s.life, s.age + 0.3);
    for (const r of this.ribbons) r.life = Math.min(r.life, r.age + 0.3);
  }

  step(dt: number) {
    this.time += dt;
    const due = this.queue.filter((q) => q.at <= this.time);
    if (due.length) {
      this.queue = this.queue.filter((q) => q.at > this.time);
      for (const q of due) q.run();
    }

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.vy += ROCKET_GRAVITY * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      // A short glowing tail of embers.
      for (let k = 0; k < 2; k++) {
        this.sparks.push({
          x: r.x + (this.rand() - 0.5) * 3,
          y: r.y + 4,
          vx: (this.rand() - 0.5) * 40,
          vy: 30 + this.rand() * 50,
          age: 0,
          life: 0.25 + this.rand() * 0.2,
          color: "#ffd99a",
          size: 1.6,
          drag: 2,
          gravity: 60,
          trail: 0,
          twinkle: false,
          phase: 0,
        });
      }
      if (r.vy >= -40) {
        this.rockets.splice(i, 1);
        this.burst(r);
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.age += dt;
      if (s.age >= s.life) {
        this.sparks.splice(i, 1);
        continue;
      }
      const d = Math.exp(-s.drag * dt);
      s.vx *= d;
      s.vy = s.vy * d + s.gravity * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.peak = Math.max(this.peak, this.sparks.length);

    for (let i = this.ribbons.length - 1; i >= 0; i--) {
      const r = this.ribbons[i];
      r.age += dt;
      if (r.age >= r.life || r.y > this.H + 40) {
        this.ribbons.splice(i, 1);
        continue;
      }
      r.y += r.vy * dt;
      r.x += Math.sin(r.age * r.swaySpeed + r.phase) * r.sway * dt;
      r.rot += r.spin * dt;
      r.flip += r.flipSpeed * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, dpr: number) {
    // Streamers first, painted normally.
    ctx.globalCompositeOperation = "source-over";
    for (const r of this.ribbons) {
      const fade = Math.min(1, (r.life - r.age) / 0.6, r.age / 0.15);
      const c = Math.cos(r.flip);
      const cr = Math.cos(r.rot);
      const sr = Math.sin(r.rot);
      // translate · rotate · squash(1, cos flip): the squash fakes a ribbon turning over in 3D.
      ctx.setTransform(dpr * cr, dpr * sr, -dpr * sr * c, dpr * cr * c, dpr * r.x, dpr * r.y);
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = c >= 0 ? r.color : r.back;
      ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    }

    // Fire adds up into glow.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const s of this.sparks) {
      const t = s.age / s.life;
      let a = 1 - t * t;
      if (s.twinkle && t > 0.55 && Math.sin(s.age * 38 + s.phase) < 0) a *= 0.2;
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      if (s.flash) {
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1 - t * 0.5), 0, TAU);
        ctx.fill();
      } else if (s.trail > 0) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.x - s.vx * s.trail, s.y - s.vy * s.trail);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // ----- the parts of the show -----

  private at(t: number, run: () => void) {
    this.queue.push({ at: t, run });
  }

  private pick(list: string[]) {
    return list[Math.floor(this.rand() * list.length) % list.length];
  }

  /** Sparks flying off every edge of the tile. */
  private sparkBurst(o: Box) {
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const n = Math.round(80 * this.amount);
    for (let i = 0; i < n; i++) {
      // A random point on the tile's outline, flying outward from the middle.
      const edge = this.rand() * 2 * (o.w + o.h);
      const px = edge < o.w ? o.x + edge : edge < o.w + o.h ? o.x + o.w : edge < 2 * o.w + o.h ? o.x + (edge - o.w - o.h) : o.x;
      const py = edge < o.w ? o.y : edge < o.w + o.h ? o.y + (edge - o.w) : edge < 2 * o.w + o.h ? o.y + o.h : o.y + (edge - 2 * o.w - o.h);
      const ang = Math.atan2(py - cy, px - cx) + (this.rand() - 0.5) * 0.6;
      const sp = (260 + this.rand() * 320) * this.reach;
      this.sparks.push({
        x: px,
        y: py,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        age: 0,
        life: 0.8 + this.rand() * 0.5,
        color: this.pick(["#ffffff", "#ffe7a3", "#f3c25b", this.palette[1] ?? "#ffffff"]),
        size: 1.8,
        drag: 2.8,
        gravity: 480,
        trail: 0.03,
        twinkle: this.rand() < 0.3,
        phase: this.rand() * TAU,
      });
    }
  }

  /** Where rockets go up: spread across the screen, leaving room around the tile so it stays the star. */
  private rocketColumns(n: number) {
    const o = this.opts.origin;
    const cx = o.x + o.w / 2;
    const keep = Math.max(o.w * 1.3, 120);
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      let x = this.W * (0.14 + (0.72 * (i + 0.5)) / n) + (this.rand() - 0.5) * this.W * 0.06;
      if (Math.abs(x - cx) < keep) x = cx + Math.sign(x - cx || (i % 2 ? 1 : -1)) * keep;
      xs.push(Math.min(this.W - 40, Math.max(40, x)));
    }
    // Alternate sides so the show moves around.
    return xs.map((_, i) => xs[i % 2 ? n - 1 - Math.floor(i / 2) : Math.floor(i / 2)]);
  }

  private launch(x: number, kind: BurstKind, i: number) {
    const top = this.H * (0.14 + this.rand() * 0.26);
    const startY = this.H + 10;
    const vy = -Math.sqrt(2 * ROCKET_GRAVITY * Math.max(80, startY - top));
    const p = this.palette;
    const main = p[i % 2 ? 1 % p.length : 0];
    const second = kind === "willow" ? "#f3c25b" : this.pick(["#f3c25b", "#ffffff", "#ffe7a3"]);
    this.rockets.push({ x: x + (this.rand() - 0.5) * 60, y: startY, vx: (this.rand() - 0.5) * 60, vy, kind, colors: [main, second] });
    this.opts.onLaunch?.();
  }

  private burst(r: Rocket) {
    this.opts.onBurst?.(r.kind);
    const base = 420 * this.reach;
    this.sparks.push({
      x: r.x,
      y: r.y,
      vx: 0,
      vy: 0,
      age: 0,
      life: 0.18,
      color: "#fff6dc",
      size: 30 * this.reach,
      drag: 0,
      gravity: 0,
      trail: 0,
      twinkle: false,
      phase: 0,
      flash: true,
    });

    if (r.kind === "peony") {
      const n = Math.round(104 * this.amount);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU + this.rand() * 0.08;
        const sp = base * (0.86 + this.rand() * 0.14);
        this.fire(r, ang, sp, {
          color: i % 3 === 2 ? r.colors[1] : r.colors[0],
          life: 1.2 + this.rand() * 0.4,
          drag: 1.6,
          gravity: 220,
          trail: 0.045,
          size: 2.5,
          twinkle: this.rand() < 0.3,
        });
      }
    } else if (r.kind === "ring") {
      const n = Math.round(72 * this.amount);
      const tilt = (this.rand() - 0.5) * 1.2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        // A circle seen at an angle: squashed, then turned.
        const x = Math.cos(a);
        const y = Math.sin(a) * 0.5;
        const ang = Math.atan2(x * Math.sin(tilt) + y * Math.cos(tilt), x * Math.cos(tilt) - y * Math.sin(tilt));
        const len = Math.hypot(x, y);
        this.fire(r, ang, base * 1.05 * len, {
          color: i % 2 ? r.colors[1] : r.colors[0],
          life: 1.1 + this.rand() * 0.2,
          drag: 1.5,
          gravity: 160,
          trail: 0.04,
          size: 2.4,
          twinkle: false,
        });
      }
      // A small bright core inside the ring.
      for (let i = 0; i < Math.round(18 * this.amount); i++) {
        this.fire(r, this.rand() * TAU, base * 0.3 * this.rand(), {
          color: "#ffffff",
          life: 0.7,
          drag: 2,
          gravity: 120,
          trail: 0.02,
          size: 1.6,
          twinkle: true,
        });
      }
    } else {
      // Willow: slow gold that droops into long falling trails and crackles out.
      const n = Math.round(80 * this.amount);
      for (let i = 0; i < n; i++) {
        this.fire(r, this.rand() * TAU, base * 0.7 * (0.6 + this.rand() * 0.4), {
          color: this.rand() < 0.8 ? "#f3c25b" : "#ffe7a3",
          life: 2 + this.rand() * 0.5,
          drag: 1.3,
          gravity: 150,
          trail: 0.1,
          size: 2,
          twinkle: true,
        });
      }
    }
  }

  private fire(
    r: Rocket,
    ang: number,
    sp: number,
    s: { color: string; life: number; drag: number; gravity: number; trail: number; size: number; twinkle: boolean },
  ) {
    this.sparks.push({
      x: r.x,
      y: r.y,
      vx: Math.cos(ang) * sp + r.vx * 0.3,
      vy: Math.sin(ang) * sp,
      age: 0,
      phase: this.rand() * TAU,
      ...s,
    });
  }

  private ribbon() {
    const color = this.pick(this.palette);
    // Each streamer lives until about 4.5s into the show at the latest, fading as it goes.
    const life = Math.max(0.8, Math.min(3, 4.5 - this.time));
    this.ribbons.push({
      x: this.rand() * this.W,
      y: -20 - this.rand() * 60,
      vy: (170 + this.rand() * 130) * Math.max(0.75, this.H / 900),
      w: 6 + this.rand() * 4,
      h: 13 + this.rand() * 9,
      rot: this.rand() * TAU,
      spin: (this.rand() - 0.5) * 4,
      flip: this.rand() * TAU,
      flipSpeed: 6 + this.rand() * 7,
      sway: 30 + this.rand() * 40,
      swaySpeed: 2 + this.rand() * 3,
      phase: this.rand() * TAU,
      color,
      back: shade(color.startsWith("#") ? color : "#ffffff", 0.32),
      age: 0,
      life,
    });
  }
}
