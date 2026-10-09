/**
 * The Worry Shredder's canvas: the page coming out of the machine as thin strips (still showing bits of the
 * handwriting), breaking off into pieces that turn into bright confetti, tumble down, settle and fade.
 * Plain canvas 2D, no libraries. The loop only runs while something is moving.
 */

export type Slice = { x: number; w: number };

/** Cut a page `width` px wide into strips about `approx` px wide that cover it exactly. */
export function sliceStrips(width: number, approx: number): Slice[] {
  const n = Math.max(1, Math.round(width / approx));
  const out: Slice[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = Math.round((i * width) / n);
    const x1 = Math.round(((i + 1) * width) / n);
    out.push({ x: x0, w: x1 - x0 });
  }
  return out;
}

/** One loose piece of shredded paper. */
export type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation in the screen plane (radians); 0 = hanging straight down. */
  angle: number;
  spin: number;
  /** Rotation around its own long axis: makes it flip and catch the light like real paper. */
  twist: number;
  twistSpeed: number;
  /** Side-to-side flutter. */
  phase: number;
  phaseSpeed: number;
  flutter: number;
  bend: number;
  len: number;
  w: number;
  color: string;
  back: string;
  /** Where its handwriting comes from on the page (null = plain confetti). */
  tex: { sx: number; sy: number; sw: number; sh: number } | null;
  /** 0 = still looks like paper, 1 = fully confetti-colored. Starts below 0 to hold the paper look briefly. */
  colorT: number;
  floor: number;
  /** Seconds since it landed (-1 while falling). */
  rest: number;
  alpha: number;
};

const GRAVITY = 820;
const HOLD = 1.4; // seconds a landed piece stays before fading
const FADE = 1.6;

/** Advance one piece by `dt` seconds. Returns false once it has faded away. */
export function stepPiece(p: Piece, dt: number, reduced: boolean): boolean {
  if (p.rest < 0) {
    p.vy += GRAVITY * dt;
    // Paper falls slower when it's broad-side to the air.
    const k = reduced ? 5 : 3.4 + 3.2 * Math.abs(Math.cos(p.twist));
    const damp = Math.exp(-k * dt);
    p.vx *= damp;
    p.vy *= damp;
    if (!reduced) {
      p.phase += p.phaseSpeed * dt;
      p.vx += Math.sin(p.phase) * p.flutter * dt;
      p.twist += p.twistSpeed * dt;
      p.angle += p.spin * dt;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.colorT = Math.min(1, p.colorT + dt / 0.55);
    if (p.y >= p.floor) {
      p.y = p.floor;
      p.vx = 0;
      p.vy = 0;
      p.rest = 0;
    }
  } else {
    p.rest += dt;
    p.colorT = Math.min(1, p.colorT + dt / 0.55);
    // Settle flat on the floor: lying sideways, face up.
    const flatAngle = Math.round((p.angle - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
    p.angle += (flatAngle - p.angle) * Math.min(1, dt * 10);
    const flatTwist = Math.round(p.twist / Math.PI) * Math.PI;
    p.twist += (flatTwist - p.twist) * Math.min(1, dt * 10);
    const hold = reduced ? 0.6 : HOLD;
    p.alpha = p.rest < hold ? 1 : Math.max(0, 1 - (p.rest - hold) / FADE);
  }
  return p.alpha > 0;
}

type Strip = Slice & {
  /** Length already broken off the tip. */
  cut: number;
  /** Length at which the next piece breaks off. */
  next: number;
  curl: number;
  lean: number;
  phase: number;
};

export type ShredJob = {
  /** The page as an image (text and all), `scale` image px per page px. */
  raster: HTMLCanvasElement;
  scale: number;
  /** Where the strips come out: left edge of the page's path, and the outlet line. */
  x: number;
  y: number;
  pw: number;
  ph: number;
  durationMs: number;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const SEG = 7;

/** Darker version of a hex color, for the back of a piece. */
function shade(hex: string, f = 0.68) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = [0, 2, 4].map((i) => Math.round((parseInt(n.substr(i, 2), 16) || 0) * f));
  return `rgb(${v[0]},${v[1]},${v[2]})`;
}

export class ShredEngine {
  private ctx: CanvasRenderingContext2D | null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private job: ShredJob | null = null;
  /** The page image loose pieces still draw their words from, until they've all turned to color. */
  private page: { raster: HTMLCanvasElement; scale: number } | null = null;
  private strips: Strip[] = [];
  private pieces: Piece[] = [];
  private fed = 0;
  private feedStart = 0;
  private time = 0;
  private raf = 0;
  private last = 0;

  /** Called every frame while the page feeds in (fed = px of the page that has gone through). */
  onFeed?: (fed: number) => void;
  /** The whole page is through: strips burst into confetti. */
  onBurst?: () => void;
  /** Everything has settled and faded. */
  onIdle?: () => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private colors: string[],
    private reduced: boolean,
  ) {
    this.ctx = canvas.getContext("2d");
  }

  setColors(colors: string[]) {
    this.colors = colors;
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    if (!this.raf) this.draw();
  }

  /** Start feeding a page through the cutters. */
  shred(job: ShredJob) {
    this.forgetPage();
    this.job = job;
    this.page = { raster: job.raster, scale: job.scale };
    this.fed = 0;
    this.feedStart = performance.now();
    this.strips = sliceStrips(job.pw, Math.max(7, job.pw / 34)).map((s) => ({
      ...s,
      cut: 0,
      next: this.pieceLen(),
      curl: rand(-0.9, 0.9),
      lean: rand(-0.05, 0.05),
      phase: rand(0, Math.PI * 2),
    }));
    this.start();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.pieces = [];
    this.strips = [];
    this.forgetPage();
  }

  private pieceLen() {
    return this.reduced ? rand(70, 120) : rand(42, 96);
  }

  /** Drop every trace of the page image, so the words don't linger anywhere. */
  private forgetPage() {
    if (this.page) {
      this.page.raster.width = 0;
      this.page.raster.height = 0;
    }
    this.page = null;
    this.job = null;
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    // Never jump more than ~2 frames (e.g. after the tab was in the background).
    const dt = Math.min(1 / 30, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.update(dt, now);
    this.draw();
    if (this.job || this.pieces.length) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.raf = 0;
      this.onIdle?.();
    }
  };

  /** Point on strip `s`'s curled spine `d` px below the outlet, with the direction it's heading. */
  private spine(s: Strip, d: number) {
    const job = this.job!;
    let x = job.x + s.x + s.w / 2;
    let y = job.y;
    let a = 0;
    for (let t = 0; t < d; t += SEG) {
      const step = Math.min(SEG, d - t);
      a = this.angleAt(s, t);
      x += Math.sin(a) * step;
      y += Math.cos(a) * step;
    }
    return { x, y, a };
  }

  private angleAt(s: Strip, d: number) {
    const sway = this.reduced ? 0 : Math.sin(this.time * 2.2 + s.phase) * 0.0016 * d;
    return s.lean + (s.curl * d) / 260 + sway;
  }

  private update(dt: number, now: number) {
    const job = this.job;
    if (job) {
      // The page feeds by the clock, so it takes the same time however smooth the frames are.
      this.fed = Math.min(job.ph, ((now - this.feedStart) / job.durationMs) * job.ph);
      this.onFeed?.(this.fed);
      // Break pieces off strips that have grown long enough.
      for (const s of this.strips) {
        const hanging = this.fed - s.cut;
        if (hanging > s.next + 6 && this.fed < job.ph) {
          this.release(s, s.next, { vx: rand(-140, 140), vy: rand(20, 80) });
          s.cut += s.next;
          s.next = this.pieceLen();
        }
      }
      if (this.fed >= job.ph) this.burst();
    }
    this.pieces = this.pieces.filter((p) => stepPiece(p, dt, this.reduced) && p.x > -200 && p.x < this.w + 200);
    if (!this.job && this.page && this.pieces.every((p) => !p.tex || p.colorT >= 1)) this.forgetPage();
  }

  /** Turn the bottom `len` px of a hanging strip into a loose piece. */
  private release(s: Strip, len: number, v: { vx: number; vy: number }) {
    const job = this.job!;
    const hanging = this.fed - s.cut;
    const mid = this.spine(s, hanging - len / 2);
    const color = pick(this.colors);
    this.pieces.push({
      x: mid.x,
      y: mid.y,
      vx: v.vx,
      vy: v.vy,
      angle: -mid.a,
      spin: rand(-3, 3),
      twist: 0,
      twistSpeed: rand(-7, 7),
      phase: rand(0, Math.PI * 2),
      phaseSpeed: rand(3, 6),
      flutter: rand(120, 320),
      bend: rand(-0.5, 0.5) * s.w,
      len,
      w: s.w,
      color,
      back: shade(color),
      tex: { sx: s.x, sy: job.ph - s.cut - len, sw: s.w, sh: len },
      colorT: -0.35,
      floor: this.h - rand(4, 22),
      rest: -1,
      alpha: 1,
    });
  }

  /** The last of the page is through: everything still hanging bursts out as confetti. */
  private burst() {
    const job = this.job!;
    const cx = job.x + job.pw / 2;
    for (const s of this.strips) {
      let left = job.ph - s.cut;
      while (left > 4) {
        const len = Math.min(left, this.pieceLen());
        const spread = (job.x + s.x + s.w / 2 - cx) / (job.pw / 2);
        const power = this.reduced ? 0.25 : 1;
        this.release(s, len, { vx: (spread * rand(160, 340) + rand(-90, 90)) * power, vy: -rand(140, 420) * power });
        s.cut += len;
        left -= len;
      }
    }
    if (!this.reduced) {
      // A handful of plain bright confetti for sparkle.
      for (let i = 0; i < 46; i++) {
        const color = pick(this.colors);
        const a = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const sp = rand(220, 560);
        this.pieces.push({
          x: cx + rand(-job.pw * 0.35, job.pw * 0.35),
          y: job.y + 4,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          angle: rand(0, Math.PI * 2),
          spin: rand(-8, 8),
          twist: rand(0, Math.PI),
          twistSpeed: rand(-12, 12),
          phase: rand(0, Math.PI * 2),
          phaseSpeed: rand(3, 7),
          flutter: rand(150, 360),
          bend: rand(-2, 2),
          len: rand(9, 18),
          w: rand(5, 8),
          color,
          back: shade(color),
          tex: null,
          colorT: 1,
          floor: this.h - rand(4, 22),
          rest: -1,
          alpha: 1,
        });
      }
    }
    this.strips = [];
    this.job = null;
    this.onBurst?.();
  }

  private draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const job = this.job;
    if (job) this.drawStrips(ctx, job);
    for (const p of this.pieces) this.drawPiece(ctx, p);
  }

  private drawStrips(ctx: CanvasRenderingContext2D, job: ShredJob) {
    const { raster, scale } = job;
    if (!raster.width) return;
    for (const s of this.strips) {
      const hanging = this.fed - s.cut;
      if (hanging <= 0) continue;
      let x = job.x + s.x + s.w / 2;
      let y = job.y;
      for (let d = 0; d < hanging; d += SEG) {
        const step = Math.min(SEG, hanging - d);
        const a = this.angleAt(s, d);
        // The newest paper is at the outlet; the page's bottom edge is at the tip.
        const sy = job.ph - this.fed + d;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-a);
        ctx.drawImage(raster, s.x * scale, sy * scale, s.w * scale, step * scale, -s.w / 2, 0, s.w + 0.35, step + 0.6);
        // A little shading so each strip reads as its own curled ribbon.
        ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.abs(a) * 0.12})`;
        ctx.fillRect(-s.w / 2, 0, 0.8, step + 0.6);
        ctx.restore();
        x += Math.sin(a) * step;
        y += Math.cos(a) * step;
      }
    }
    // Shadow just under the machine's outlet.
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const g = ctx.createLinearGradient(0, job.y, 0, job.y + 26);
    g.addColorStop(0, "rgba(0,0,0,0.38)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(job.x - 20, job.y, job.pw + 40, 26);
    ctx.restore();
  }

  private drawPiece(ctx: CanvasRenderingContext2D, p: Piece) {
    const c = Math.cos(p.twist);
    const face = c >= 0;
    const sx = Math.max(0.12, Math.abs(c));
    const t = Math.max(0, Math.min(1, p.colorT));
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.scale(sx, 1);
    const hw = p.w / 2;
    const hl = p.len / 2;
    const page = this.page;
    if (t < 1) {
      if (p.tex && face && page && page.raster.width) {
        const k = page.scale;
        ctx.drawImage(page.raster, p.tex.sx * k, p.tex.sy * k, p.tex.sw * k, p.tex.sh * k, -hw, -hl, p.w, p.len);
      } else {
        ctx.fillStyle = face ? "#f8f4ea" : "#e4ddcd";
        ctx.fillRect(-hw, -hl, p.w, p.len);
      }
      ctx.globalAlpha = p.alpha * t;
    }
    // A gently bent ribbon in the confetti color (darker on its back).
    const b = this.reduced ? 0 : p.bend * Math.sin(p.phase);
    ctx.beginPath();
    ctx.moveTo(-hw, -hl);
    ctx.quadraticCurveTo(-hw + b, 0, -hw, hl);
    ctx.lineTo(hw, hl);
    ctx.quadraticCurveTo(hw + b, 0, hw, -hl);
    ctx.closePath();
    ctx.fillStyle = face ? p.color : p.back;
    ctx.fill();
    if (face && sx > 0.5) {
      // Sheen where it faces the light.
      ctx.globalAlpha = p.alpha * t * (sx - 0.5) * 0.4;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-hw, -hl, p.w * 0.45, p.len);
    }
    ctx.restore();
  }
}
