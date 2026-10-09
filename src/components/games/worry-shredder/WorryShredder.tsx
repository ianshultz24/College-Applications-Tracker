"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { GameProps } from "../registry";
import { ShredEngine } from "./engine";
import { pageMetrics, Paper, paintPage } from "./Paper";
import { machineGeometry, ShredderBack, ShredderFront, type MachineState } from "./Shredder";
import { shredderSounds, type ShredderSounds } from "./sounds";
import { PaperSpring } from "./spring";

type Phase = "write" | "ready" | "feeding" | "done";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const HOME_TILT = -2.5;

/** Where everything sits for a stage of W × H. Wide: page on the left, machine on the right. Narrow: page above the machine. */
function layout(W: number, H: number, top: number, narrow: boolean) {
  const wide = W >= 820 && !narrow;
  const avail = H - top - 16;
  let pw: number;
  if (wide) pw = clamp(Math.min((avail - 130) / 1.63, (W - 40 - 90 - 76) / 2), 200, 330);
  else pw = clamp(Math.min(W - 64, (avail - 134) / 1.63), 170, 320);
  pw = Math.round(pw);
  const { ph } = pageMetrics(pw);
  let homeX: number, homeY: number, cx: number, slotY: number;
  if (wide) {
    const bodyW = machineGeometry(pw, 0, 0).bodyW;
    const startX = (W - (pw + 90 + bodyW)) / 2;
    slotY = top + 16 + ph + 6;
    homeX = startX;
    homeY = slotY - ph - 10;
    cx = startX + pw + 90 + bodyW / 2;
  } else {
    homeX = (W - pw) / 2;
    homeY = top + 10;
    slotY = homeY + ph + 44;
    cx = W / 2;
  }
  const g = machineGeometry(pw, cx, slotY);
  return {
    wide,
    pw,
    ph,
    home: { x: homeX, y: homeY },
    target: { x: cx - pw / 2, y: slotY - ph },
    cx,
    slotY,
    g,
    /** Close enough to the slot for the shredder to take the page. */
    inZone(x: number, y: number) {
      const bottom = y + ph;
      return Math.abs(x + pw / 2 - cx) < pw * 0.42 && bottom > slotY - (wide ? 40 : 14) && bottom < slotY + 110;
    },
  };
}

/**
 * Worry Shredder: write a worry on a page, drag it into the shredder, and watch it come out as confetti.
 * The words live only in this component's memory and are cleared the moment the page is shredded.
 */
export default function WorryShredder({ onExit, reduced, narrow, top, sound, colors }: GameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const engineRef = useRef<ShredEngine | null>(null);
  const soundsRef = useRef<ShredderSounds | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = useRef(false);
  // Dragging the page.
  const drag = useRef<{ id: number; ox: number; oy: number; x0: number; y0: number; moved: boolean; lastX: number; lastT: number; vx: number } | null>(null);
  const zoneRef = useRef(false);
  const zoneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("write");
  const [dragging, setDragging] = useState(false);
  const [inZone, setInZone] = useState(false);
  const [round, setRound] = useState(0);
  const [announce, setAnnounce] = useState("");

  const L = useMemo(() => (size.w ? layout(size.w, size.h, top, narrow) : null), [size.w, size.h, top, narrow]);
  const hasText = text.trim().length > 0;

  // Where the page is (x, y, tilt). It springs toward targets and moves itself, so dragging never re-renders.
  const [paper] = useState(() => new PaperSpring({ x: 0, y: 0, r: HOME_TILT }, reduced));
  useEffect(() => () => paper.destroy(), [paper]);

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  // Measure the stage.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The canvas engine lives as long as the game is open.
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new ShredEngine(canvasRef.current, colors, reduced);
    engineRef.current = engine;
    const pending = timers.current;
    return () => {
      engine.destroy();
      engineRef.current = null;
      pending.forEach(clearTimeout);
      soundsRef.current?.dispose();
      soundsRef.current = null;
      navigator.vibrate?.(0);
    };
    // Colors and motion setting are passed in below when they change; the engine is made once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => engineRef.current?.setColors(colors), [colors]);
  useEffect(() => {
    if (size.w) engineRef.current?.resize(size.w, size.h);
  }, [size.w, size.h]);

  // Keep the page at home when the window changes size (unless it's being dragged or shredded).
  const placed = useRef(false);
  useEffect(() => {
    if (!L || dragging || phase === "feeding") return;
    if (placed.current) paper.to({ x: L.home.x, y: L.home.y });
    else paper.jump({ x: L.home.x, y: L.home.y });
    placed.current = true;
  }, [L, dragging, phase, paper]);

  // Start typing straight away (and again after "Shred another").
  const ready = !!L;
  useEffect(() => {
    if (ready) textRef.current?.focus({ preventScroll: true });
  }, [round, ready]);

  // Turning sound off mid-shred silences it at once.
  useEffect(() => {
    if (!sound) {
      soundsRef.current?.dispose();
      soundsRef.current = null;
      navigator.vibrate?.(0);
    }
  }, [sound]);

  const nudge = useCallback(() => {
    setAnnounce("Write a worry on the page first.");
    paper.push({ r: -90, x: -60 });
    textRef.current?.focus({ preventScroll: true });
  }, [paper]);

  /** The shredder takes the page: line it up, start the motor, feed it through. */
  const grab = useCallback(() => {
    if (!L || busy.current || !hasText) return;
    busy.current = true;
    drag.current = null;
    zoneRef.current = false;
    clearTimeout(zoneTimer.current);
    setDragging(false);
    setInZone(false);
    setPhase("feeding");
    textRef.current?.blur();
    paper.to({ x: L.target.x, y: L.target.y, r: 0 });

    const font = textRef.current ? getComputedStyle(textRef.current).fontFamily : "Georgia, serif";
    const raster = paintPage(L.pw, text, font, Math.min(2, window.devicePixelRatio || 1));
    const snd = sound ? shredderSounds() : null;
    soundsRef.current = snd;
    snd?.start();
    const duration = reduced ? 1500 : 2300;
    if (sound) navigator.vibrate?.(Array.from({ length: Math.round(duration / 70) }, (_, i) => (i % 2 ? 50 : 20)));

    later(() => {
      const engine = engineRef.current;
      if (!engine) return;
      paper.jump({ x: L.target.x, y: L.target.y, r: 0 });
      engine.onFeed = (fed) => {
        // Pull the page down into the slot, hiding what's gone through, with a little machine shudder.
        paper.jump({ x: L.target.x + (reduced ? 0 : (Math.random() - 0.5) * 1.1), y: L.target.y + fed });
        if (paperRef.current) paperRef.current.style.clipPath = `inset(0 0 ${fed}px 0)`;
        soundsRef.current?.setShred(fed < L.ph ? 0.75 + Math.random() * 0.25 : 0);
      };
      engine.onBurst = () => {
        engine.onFeed = undefined;
        soundsRef.current?.stop();
        soundsRef.current?.pop();
        if (sound) navigator.vibrate?.(28);
        setText(""); // The words are gone for good.
        setAnnounce("Shredded. Nothing was saved.");
        later(() => setPhase("done"), reduced ? 400 : 900);
      };
      engine.shred({ raster, scale: Math.min(2, window.devicePixelRatio || 1), x: L.target.x, y: L.g.outletY, pw: L.pw, ph: L.ph, durationMs: duration });
    }, 260);
  }, [L, hasText, text, sound, reduced, paper]);

  const setZone = (on: boolean) => {
    if (zoneRef.current === on) return;
    zoneRef.current = on;
    setInZone(on);
    clearTimeout(zoneTimer.current);
    // Hold it over the slot for a moment and the shredder pulls it in, like a real one.
    if (on) zoneTimer.current = setTimeout(grab, 320);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!L || (phase !== "write" && phase !== "ready") || e.button !== 0) return;
    if (phase === "write" && (e.target as HTMLElement).tagName === "TEXTAREA") return; // typing, not dragging
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const at = paper.target;
    drag.current = { id: e.pointerId, ox: e.clientX - at.x, oy: e.clientY - at.y, x0: e.clientX, y0: e.clientY, moved: false, lastX: e.clientX, lastT: e.timeStamp, vx: 0 };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id || !L) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
      if (!hasText) {
        drag.current = null;
        nudge();
        return;
      }
      d.moved = true;
      setDragging(true);
      textRef.current?.blur();
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.vx = d.vx * 0.75 + ((e.clientX - d.lastX) / dt) * 1000 * 0.25;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    const x = e.clientX - d.ox;
    const y = e.clientY - d.oy;
    if (L.inZone(x, y)) {
      // Magnet: the page straightens and lines up with the slot.
      paper.to({ x: x + (L.target.x - x) * 0.65, y: y + (L.target.y - y) * 0.5, r: 0 });
      setZone(true);
    } else {
      paper.to({ x, y, r: reduced ? 0 : clamp(d.vx * 0.012, -14, 14) });
      setZone(false);
    }
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id || !L) return;
    drag.current = null;
    if (!d.moved) {
      // A tap on the finished page goes back to editing it.
      if (!cancelled && phase === "ready") {
        setPhase("write");
        requestAnimationFrame(() => textRef.current?.focus({ preventScroll: true }));
      }
      return;
    }
    setDragging(false);
    if (!cancelled && zoneRef.current) return grab();
    setZone(false);
    paper.to({ x: L.home.x, y: L.home.y, r: HOME_TILT });
  };

  /** Keyboard (and anyone who'd rather not drag): the page glides over and goes in. */
  const shredIt = () => {
    if (!L) return;
    if (!hasText) return nudge();
    paper.to({ x: L.target.x, y: L.target.y, r: 0 });
    setZone(true);
    clearTimeout(zoneTimer.current);
    later(grab, reduced ? 120 : 420);
  };

  const again = () => {
    busy.current = false;
    zoneRef.current = false;
    setAnnounce("");
    setPhase("write");
    setRound((r) => r + 1);
    if (L) {
      // The fresh page drops in from just above its spot.
      paper.jump({ x: L.home.x, y: L.home.y - 36, r: HOME_TILT });
      paper.to({ y: L.home.y });
    }
  };

  const machine: MachineState = phase === "feeding" ? "running" : inZone ? "ready" : "idle";
  const showHint = phase === "write" || phase === "ready";

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      {/* A soft pool of light under the scene */}
      {L && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60% 55% at ${(L.cx / size.w) * 100}% ${(L.slotY / size.h) * 100}%, rgba(255,236,214,0.09), rgba(255,236,214,0) 70%)` }}
        />
      )}

      {L && (
        <>
          <ShredderBack g={L.g} state={machine} glow={inZone || phase === "feeding"} />

          {phase !== "done" && (
            <div
              key={round}
              ref={(el) => {
                paperRef.current = el;
                paper.attach(el);
              }}
              className="absolute top-0 left-0"
              style={{ zIndex: dragging ? 3 : 1, animation: "ct-fade-in .3s ease-out", willChange: "transform" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => endDrag(e, false)}
              onPointerCancel={(e) => endDrag(e, true)}
            >
              <Paper
                pw={L.pw}
                text={text}
                onText={setText}
                editable={phase === "write"}
                lifted={dragging}
                textareaRef={textRef}
                onTextKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (hasText) {
                      setPhase("ready");
                      textRef.current?.blur();
                    }
                  }
                }}
                onTextBlur={() => {
                  // (Not while the shredder is taking the page: that blur is the shredder's own.)
                  if (hasText && phase === "write" && !busy.current) setPhase("ready");
                }}
              />
            </div>
          )}

          <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
            <ShredderFront g={L.g} state={machine} />
          </div>
        </>
      )}

      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute top-0 left-0 z-[4]" />

      {/* Wide screens: a dashed arrow from the page to the slot */}
      {L && L.wide && showHint && hasText && !dragging && (
        <svg aria-hidden className="pointer-events-none absolute top-0 left-0 z-[2] overflow-visible" width={size.w} height={size.h}>
          <path
            d={`M ${L.home.x + L.pw + 16} ${L.home.y + L.ph * 0.42} C ${L.home.x + L.pw + 70} ${L.home.y + L.ph * 0.3}, ${L.g.left - 10} ${L.slotY - 120}, ${L.g.left + 26} ${L.slotY - 34}`}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.6"
            strokeDasharray="5 6"
            strokeLinecap="round"
            className="ct-motion"
            style={{ animation: "ct-dash 1s linear infinite" }}
          />
          <path
            d={`M ${L.g.left + 18} ${L.slotY - 40} L ${L.g.left + 26} ${L.slotY - 33} L ${L.g.left + 17} ${L.slotY - 29}`}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {L && showHint && (
        <div className="absolute z-[5] flex flex-col items-center gap-2.5 text-center" style={{ left: L.cx - 160, width: 320, top: L.g.outletY + (L.wide ? 40 : 26) }}>
          <p className="m-0 text-[14px] text-white/80">
            {hasText ? (L.wide ? "Drag the page into the shredder" : "Pull the page down into the shredder") : "Write it down. It goes nowhere but the shredder."}
          </p>
          {hasText && (
            <button
              type="button"
              onClick={shredIt}
              className="flex h-9 items-center gap-1.5 rounded-[11px] border border-white/18 bg-white/10 px-3.5 text-[13.5px] font-semibold text-white backdrop-blur-md hover:bg-white/20"
            >
              Shred it
              <ArrowRight size={14} strokeWidth={2.3} aria-hidden />
            </button>
          )}
        </div>
      )}

      {L && phase === "done" && (
        <motion.div
          className="absolute z-[6] flex flex-col items-center text-center text-white"
          style={{ left: L.home.x + L.pw / 2 - 170, width: 340, top: L.home.y + L.ph * (L.wide ? 0.28 : 0.2) }}
          initial={{ opacity: 0, y: reduced ? 0 : 14 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 1, 0.25, 1] } }}
        >
          <h3 className="m-0 font-serif text-[64px] leading-none font-normal tracking-[-0.02em] italic">Gone.</h3>
          <p className="m-0 mt-3 text-[15px] text-white/75">Nothing was saved.</p>
          <div className="mt-7 flex gap-2.5">
            <button
              type="button"
              onClick={again}
              className="h-11 rounded-[13px] bg-white px-5 text-[14.5px] font-semibold text-ink hover:bg-[#ececee]"
            >
              Shred another
            </button>
            <button
              type="button"
              onClick={onExit}
              className="h-11 rounded-[13px] border border-white/18 bg-white/10 px-5 text-[14.5px] font-semibold text-white backdrop-blur-md hover:bg-white/20"
            >
              Back to tracker
            </button>
          </div>
        </motion.div>
      )}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
