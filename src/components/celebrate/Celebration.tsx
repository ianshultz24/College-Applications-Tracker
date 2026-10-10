"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { GOLD, mixHex, rgba } from "@/lib/colors";
import type { Layout } from "@/lib/layout";
import type { Colors, School } from "@/lib/types";
import { CHECK_PATH, Glyph } from "../tracker/glyphs";
import { isOnScreen, tileSlotRect } from "../tracker/motion";
import { TileSkin } from "../tracker/Tile";
import { Fireworks, type Box } from "./fireworks";
import { celebrationSounds } from "./sounds";

export type CelebrationProps = {
  school: School;
  colors: Colors;
  finishes: boolean;
  L: Layout;
  logoUrl: string | null;
  /** A card is open: celebrate over it instead of lifting the tile. */
  overCard: boolean;
  reduced: boolean;
  sound: boolean;
  /** The hero copy of the tile is up: hide the real one. */
  onHeroStart: () => void;
  /** The hero copy has settled back exactly onto the real tile: show it again. */
  onHeroEnd: () => void;
  onDone: () => void;
};

const WORD = "Accepted!";
const POP = "cubic-bezier(.34,1.56,.64,1)";
const SOFT = "cubic-bezier(.2,.8,.2,1)";

/** Where the show happens: the tile's box (it lifts out as the hero), or a spot to center on (no hero). */
function measureStage(id: string, overCard: boolean) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tile = overCard ? null : tileSlotRect(id);
  if (tile && isOnScreen(tile)) {
    return { vw, vh, hero: true, box: { x: tile.left, y: tile.top, w: tile.width, h: tile.height } };
  }
  const card = overCard ? document.querySelector('[role="dialog"]')?.getBoundingClientRect() : null;
  const s = Math.min(150, vw * 0.3);
  const cx = card ? card.left + card.width / 2 : vw / 2;
  const cy = card ? card.top + card.height / 2 : vh / 2;
  return { vw, vh, hero: false, box: { x: cx - s / 2, y: cy - s / 2, w: s, h: s } };
}

/**
 * The Accepted moment: the tile lifts out with light rays and shockwaves behind it, fireworks and streamers go
 * off around it, and a banner names the school. About four seconds; it never blocks clicks, and any click or key
 * press wraps it up early. With reduced motion it's just a soft glow and the banner.
 */
export default function Celebration({ school, colors, finishes, L, logoUrl, overCard, reduced, sound, onHeroStart, onHeroEnd, onDone }: CelebrationProps) {
  // Measured once, as it appears: the show stays put even if the page moves underneath.
  const [stage] = useState(() => measureStage(school.id, overCard));
  const { box, vw, vh } = stage;
  const hero = stage.hero && !reduced;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const accent = colors.accepted;
  const tint = mixHex(accent, "#ffffff", 0.45);
  const raysR = Math.max(box.w * 2.8, 300);

  const rootRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const raysRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const foilRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);

  // Everything is set up and timed here, before the first paint. (Mount only: the show is fixed once it starts.)
  useLayoutEffect(() => {
    // A tab nobody can see would freeze mid-show; skip it.
    if (document.visibilityState === "hidden") {
      onDone();
      return;
    }
    const anims: Animation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const play = (el: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      if (!el) return null;
      const a = el.animate(frames, { fill: "both", ...opts });
      anims.push(a);
      return a;
    };
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const snd = sound ? celebrationSounds() : null;

    // ----- the banner: below the tile (above it if there's no room), kept on screen -----
    const banner = bannerRef.current;
    if (banner) {
      const w = banner.offsetWidth;
      const h = banner.offsetHeight;
      const grow = hero ? box.h * 0.11 : 0;
      let top = hero ? box.y + box.h + grow + 14 : cy - h / 2;
      if (hero && top + h > vh - 16) top = box.y - grow - 22 - h;
      banner.style.left = `${Math.min(vw - 16 - w, Math.max(16, cx - w / 2))}px`;
      banner.style.top = `${Math.min(vh - 16 - h, Math.max(16, top))}px`;
    }

    let heroUp = false;
    const heroEnd = () => {
      if (!heroUp) return;
      heroUp = false;
      onHeroEnd();
      // Give React a frame to show the real tile before the copy goes.
      requestAnimationFrame(() => requestAnimationFrame(() => heroRef.current && (heroRef.current.style.visibility = "hidden")));
    };

    let engineDone = true;
    let timeDone = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };
    const check = () => engineDone && timeDone && finish();
    let raf = 0;
    let hurryEngine: (() => void) | null = null;

    if (reduced) {
      play(glowRef.current, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 2600 });
      play(banner, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.88 }, { opacity: 0 }], { duration: 2700 });
      later(0, () => snd?.chime());
      later(2800, () => {
        timeDone = true;
        check();
      });
    } else {
      // Spotlight dim, light rays, two shockwaves.
      play(dimRef.current, [{ opacity: 0 }, { opacity: 1, offset: 0.09 }, { opacity: 1, offset: 0.82 }, { opacity: 0 }], { duration: 4000, easing: "ease-out" });
      play(
        raysRef.current,
        [
          { opacity: 0, transform: "rotate(0deg) scale(0.5)" },
          { opacity: 1, transform: "rotate(12deg) scale(1)", offset: 0.15 },
          { opacity: 0.9, transform: "rotate(48deg) scale(1.05)", offset: 0.75 },
          { opacity: 0, transform: "rotate(64deg) scale(1.1)" },
        ],
        { duration: 3300, delay: 100 },
      );
      play(ring1Ref.current, [{ opacity: 0.95, transform: "scale(0.6)" }, { opacity: 0, transform: "scale(3.2)" }], { duration: 900, delay: 60, easing: SOFT });
      play(ring2Ref.current, [{ opacity: 0.85, transform: "scale(0.7)" }, { opacity: 0, transform: "scale(4.2)" }], { duration: 1150, delay: 200, easing: SOFT });

      // The hero tile springs up, glows, holds, and settles back onto its spot.
      if (hero) {
        heroUp = true;
        onHeroStart();
        const glow = `0 0 0 2px ${rgba(GOLD, 0.85)}, 0 0 60px 10px ${rgba(GOLD, 0.5)}, 0 30px 60px -20px rgba(0,0,0,0.6)`;
        const rest = "0 0 0 0 rgba(0,0,0,0), 0 0 0 0 rgba(0,0,0,0), 0 0 0 0 rgba(0,0,0,0)";
        const lift = play(
          heroRef.current,
          [
            { transform: "translateY(0) scale(1)", boxShadow: rest, easing: POP },
            { transform: "translateY(-10px) scale(1.22)", boxShadow: glow, offset: 0.16 },
            { transform: "translateY(-10px) scale(1.18)", boxShadow: glow, offset: 0.24 },
            { transform: "translateY(-10px) scale(1.18)", boxShadow: glow, offset: 0.84, easing: "cubic-bezier(.5,0,.3,1)" },
            { transform: "translateY(0) scale(1)", boxShadow: rest },
          ],
          { duration: 3200 },
        );
        lift?.addEventListener("finish", heroEnd);
        play(foilRef.current, [{ transform: "translateX(-130%)" }, { transform: "translateX(130%)" }], { duration: 750, delay: 450, easing: "ease-in-out" });
      }

      // The banner, its letters one by one, and a sheen across it.
      play(
        banner,
        [
          { opacity: 0, transform: "translateY(14px) scale(0.92)", easing: POP },
          { opacity: 1, transform: "none", offset: 0.15 },
          { opacity: 1, transform: "none", offset: 0.88 },
          { opacity: 0, transform: "translateY(-8px)" },
        ],
        { duration: 3300, delay: 420 },
      );
      banner?.querySelectorAll("[data-letter]").forEach((el, i) =>
        play(el, [{ opacity: 0, transform: "translateY(0.45em) rotate(-8deg)" }, { opacity: 1, transform: "none" }], {
          duration: 440,
          delay: 540 + i * 38,
          easing: POP,
        }),
      );
      play(sheenRef.current, [{ transform: "translateX(-120%)" }, { transform: "translateX(120%)" }], { duration: 900, delay: 1050, easing: "ease-in-out" });

      // Fireworks, sparks and streamers on the canvas.
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        const fw = new Fireworks({
          width: vw,
          height: vh,
          origin: box as Box,
          palette: [accent, tint, GOLD, "#ffe7a3", "#ffffff"],
          onLaunch: () => snd?.whistle(),
          onBurst: (kind) => snd?.boom(kind),
        });
        engineDone = false;
        let last = 0;
        const frame = (now: number) => {
          // Clamp the step so a stalled frame doesn't make everything jump.
          const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
          last = now;
          fw.step(dt);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          fw.draw(ctx, dpr);
          if (fw.done) {
            engineDone = true;
            check();
          } else raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        hurryEngine = () => fw.hurry();
      }

      later(0, () => snd?.pop());
      later(560, () => snd?.chime());
      later(4000, () => {
        timeDone = true;
        check();
      });
    }

    // Any click or key press wraps it up quickly (the click still reaches the page underneath).
    let hurried = false;
    function hurry(e: Event) {
      if (hurried || (e instanceof KeyboardEvent && e.repeat)) return;
      hurried = true;
      hurryEngine?.();
      heroEnd();
      rootRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, fill: "forwards", easing: "ease-out" });
      later(320, () => {
        timeDone = true;
        engineDone = true;
        check();
      });
    }
    window.addEventListener("pointerdown", hurry, true);
    window.addEventListener("keydown", hurry, true);
    // Never outstay: wrap up even if frames stop coming.
    later(7000, finish);

    return () => {
      window.removeEventListener("pointerdown", hurry, true);
      window.removeEventListener("keydown", hurry, true);
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.cancel());
      snd?.dispose();
      if (heroUp) {
        heroUp = false;
        onHeroEnd();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abs: CSSProperties = { position: "absolute", pointerEvents: "none" };
  const ring = (size: number, border: string): CSSProperties => ({
    ...abs,
    left: cx - size / 2,
    top: cy - size / 2,
    width: size,
    height: size,
    borderRadius: "50%",
    border,
    opacity: 0,
  });

  return (
    <div ref={rootRef} className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
      <p role="status" className="sr-only">
        Accepted to {school.name}. Congratulations!
      </p>

      {!reduced && (
        <>
          <div
            ref={dimRef}
            aria-hidden
            style={{
              ...abs,
              inset: 0,
              opacity: 0,
              background: `radial-gradient(circle at ${cx}px ${cy}px, rgba(10,9,8,0) ${box.w * 0.75}px, rgba(10,9,8,0.55) ${box.w * 2.8}px)`,
            }}
          />
          <div
            ref={raysRef}
            aria-hidden
            style={{
              ...abs,
              left: cx - raysR,
              top: cy - raysR,
              width: raysR * 2,
              height: raysR * 2,
              borderRadius: "50%",
              opacity: 0,
              background: `repeating-conic-gradient(from 0deg, ${rgba("#ffe39a", 0.34)} 0deg 5deg, ${rgba("#ffe39a", 0)} 5deg 15deg)`,
              WebkitMaskImage: "radial-gradient(circle, #000 16%, transparent 68%)",
              maskImage: "radial-gradient(circle, #000 16%, transparent 68%)",
            }}
          />
          <div ref={ring1Ref} aria-hidden style={ring(box.w, `3px solid ${rgba(tint, 0.95)}`)} />
          <div ref={ring2Ref} aria-hidden style={ring(box.w, `2px solid ${rgba(GOLD, 0.9)}`)} />
          <canvas ref={canvasRef} aria-hidden style={{ ...abs, inset: 0, width: "100%", height: "100%" }} />
        </>
      )}

      {reduced && stage.hero && (
        <div
          ref={glowRef}
          aria-hidden
          style={{
            ...abs,
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
            borderRadius: L.radius,
            opacity: 0,
            boxShadow: `0 0 0 3px ${rgba(GOLD, 0.85)}, 0 0 40px 8px ${rgba(GOLD, 0.5)}`,
          }}
        />
      )}

      {hero && (
        <div
          ref={heroRef}
          aria-hidden
          style={{ ...abs, left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: L.radius, willChange: "transform" }}
        >
          <TileSkin school={school} colors={colors} finishes={finishes} L={L} logoUrl={logoUrl} editAll={false} />
          <div style={{ ...abs, inset: 0, borderRadius: L.radius, overflow: "hidden" }}>
            <div
              ref={foilRef}
              style={{
                ...abs,
                inset: 0,
                transform: "translateX(-130%)",
                background: "linear-gradient(105deg, rgba(255,255,255,0) 30%, rgba(255,236,180,0.75) 48%, rgba(255,255,255,0.9) 50%, rgba(255,236,180,0.75) 52%, rgba(255,255,255,0) 70%)",
              }}
            />
          </div>
        </div>
      )}

      <div ref={bannerRef} aria-hidden style={{ ...abs, left: 0, top: 0, opacity: 0, maxWidth: "calc(100vw - 32px)" }}>
        <div
          className="relative flex items-center gap-3 overflow-hidden rounded-[22px] bg-white"
          style={{
            padding: L.narrow ? "11px 18px 12px 12px" : "13px 22px 14px 14px",
            boxShadow: `0 24px 60px -20px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.18), inset 0 0 0 1px ${rgba(GOLD, 0.55)}`,
          }}
        >
          <div
            className="flex flex-none items-center justify-center rounded-full text-white"
            style={{
              width: L.narrow ? 34 : 40,
              height: L.narrow ? 34 : 40,
              background: `radial-gradient(circle at 35% 30%, #fff1c2, ${GOLD} 55%, #b58426)`,
              boxShadow: `0 4px 12px -4px ${rgba(GOLD, 0.8)}, inset 0 1px 1px rgba(255,255,255,0.7)`,
            }}
          >
            <Glyph d={CHECK_PATH} size={L.narrow ? 17 : 20} stroke={3.2} />
          </div>
          <div className="min-w-0">
            <div className="font-serif leading-none font-medium whitespace-nowrap text-ink" style={{ fontSize: L.narrow ? 26 : 31 }}>
              {[...WORD].map((ch, i) => (
                <span key={i} data-letter style={{ display: "inline-block" }}>
                  {ch}
                </span>
              ))}
            </div>
            <div className="mt-1.5 truncate text-[13.5px] font-medium text-muted" style={{ maxWidth: L.narrow ? 200 : 280 }}>
              {school.name}
            </div>
          </div>
          <div
            ref={sheenRef}
            className="pointer-events-none absolute inset-0"
            style={{
              transform: "translateX(-120%)",
              background: "linear-gradient(105deg, rgba(255,255,255,0) 35%, rgba(255,236,180,0.65) 50%, rgba(255,255,255,0) 65%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
