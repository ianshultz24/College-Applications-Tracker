"use client";

import { Lock } from "lucide-react";
import type { ComponentProps, Ref } from "react";

export const MAX_CHARS = 280;
const INK = "#27324a";
const PAPER = "#f8f4ea";
const RULE = "#cfdcec";
const MARGIN = "#eab0aa";

/** Measurements of a page `pw` px wide (everything scales with it). */
export function pageMetrics(pw: number) {
  const s = pw / 320;
  return {
    s,
    ph: Math.round(pw * 1.3),
    header: 44 * s,
    footer: 36 * s,
    margin: 42 * s,
    pad: 20 * s,
    line: 29 * s,
    font: 19.5 * s,
  };
}

// Paper grain: a tiny noise texture, drawn by the browser (no image download).
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.3 0 0 0 0 0.22 0 0 0 0.09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** The sheet of lined paper you write your worry on. */
export function Paper({
  pw,
  text,
  onText,
  editable,
  lifted,
  textareaRef,
  onTextKeyDown,
  onTextBlur,
  ...rest
}: {
  pw: number;
  text: string;
  onText: (v: string) => void;
  editable: boolean;
  lifted: boolean;
  textareaRef: Ref<HTMLTextAreaElement>;
  onTextKeyDown: ComponentProps<"textarea">["onKeyDown"];
  onTextBlur: ComponentProps<"textarea">["onBlur"];
} & Omit<ComponentProps<"div">, "children">) {
  const m = pageMetrics(pw);
  return (
    <div
      {...rest}
      className="relative overflow-hidden rounded-[3px] select-none"
      style={{
        width: pw,
        height: m.ph,
        backgroundColor: PAPER,
        backgroundImage: `linear-gradient(168deg, rgba(255,255,255,0.6), rgba(255,255,255,0) 38%, rgba(70,50,20,0.05)), ${GRAIN}, repeating-linear-gradient(180deg, transparent 0 ${m.line - 1}px, ${RULE} ${m.line - 1}px ${m.line}px)`,
        backgroundSize: `100% 100%, 160px 160px, 100% ${m.ph - m.header - m.footer}px`,
        backgroundPosition: `0 0, 0 0, 0 ${m.header}px`,
        backgroundRepeat: "no-repeat, repeat, no-repeat",
        boxShadow: lifted
          ? "0 1px 1px rgba(0,0,0,0.08), 0 30px 60px -18px rgba(0,0,0,0.62), 0 12px 24px -12px rgba(0,0,0,0.35)"
          : "0 1px 1px rgba(0,0,0,0.08), 0 16px 36px -14px rgba(0,0,0,0.55)",
        transition: "box-shadow .25s ease",
        touchAction: "none",
        cursor: editable ? "default" : "grab",
        ...rest.style,
      }}
    >
      {/* Red margin line */}
      <div aria-hidden className="absolute top-0 bottom-0" style={{ left: m.margin, width: Math.max(1, 1.4 * m.s), background: MARGIN }} />

      {/* Grip: drag the page from here at any time */}
      <div aria-hidden className="absolute inset-x-0 top-0 flex items-center justify-center" style={{ height: m.header, cursor: "grab" }}>
        <div className="grid grid-cols-3 gap-[3px] rounded-full px-2 py-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="size-[3.5px] rounded-full bg-[rgba(60,50,40,0.28)]" />
          ))}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onText(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={onTextKeyDown}
        onBlur={onTextBlur}
        readOnly={!editable}
        maxLength={MAX_CHARS}
        placeholder="What’s weighing on you?"
        aria-label="Your worry. It is never saved."
        autoComplete="off"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="ct-noscrollbar absolute resize-none overflow-y-auto border-0 bg-transparent p-0 font-serif italic outline-none placeholder:text-[#a59d8e]"
        style={{
          left: m.margin + 10 * m.s,
          right: m.pad,
          top: m.header,
          bottom: m.footer,
          fontSize: m.font,
          lineHeight: `${m.line}px`,
          color: INK,
          caretColor: "#c9573f",
          outline: "none", // the blinking caret shows where you're typing
          pointerEvents: editable ? "auto" : "none",
          userSelect: editable ? "text" : "none",
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between"
        style={{ height: m.footer, paddingLeft: m.margin + 10 * m.s, paddingRight: m.pad, fontSize: Math.max(10.5, 11.5 * m.s), color: "#8d8475" }}
      >
        <span className="flex items-center gap-1.5">
          <Lock size={Math.max(10, 11 * m.s)} strokeWidth={2.2} aria-hidden />
          Never saved — not even here.
        </span>
        <span className="tabular-nums" aria-hidden>
          {text.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );
}

/** Wrap `text` into lines no wider than `maxW` (breaking very long words too). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      const tryLine = line + word;
      if (ctx.measureText(tryLine).width <= maxW) {
        line = tryLine;
        continue;
      }
      if (line.trim()) out.push(line.trimEnd());
      line = /^\s+$/.test(word) ? "" : word;
      // A single word wider than the line: break it by characters.
      while (ctx.measureText(line).width > maxW && line.length > 1) {
        let i = line.length - 1;
        while (i > 1 && ctx.measureText(line.slice(0, i)).width > maxW) i--;
        out.push(line.slice(0, i));
        line = line.slice(i);
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

/**
 * Paint the page (paper, lines and the worry) into an off-screen image the shredder cuts into strips.
 * `fontFamily` is read from the on-screen text box so both use the same font.
 */
export function paintPage(pw: number, text: string, fontFamily: string, scale: number): HTMLCanvasElement {
  const m = pageMetrics(pw);
  const c = document.createElement("canvas");
  c.width = Math.ceil(pw * scale);
  c.height = Math.ceil(m.ph * scale);
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.scale(scale, scale);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, pw, m.ph);
  // Grain: a sprinkle of faint specks.
  for (let i = 0; i < (pw * m.ph) / 90; i++) {
    ctx.fillStyle = `rgba(90,70,40,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * pw, Math.random() * m.ph, 1, 1);
  }
  ctx.fillStyle = RULE;
  for (let y = m.header + m.line - 1; y <= m.ph - m.footer; y += m.line) ctx.fillRect(0, y, pw, 1);
  ctx.fillStyle = MARGIN;
  ctx.fillRect(m.margin, 0, Math.max(1, 1.4 * m.s), m.ph);

  ctx.fillStyle = INK;
  ctx.font = `italic 400 ${m.font}px ${fontFamily}`;
  ctx.textBaseline = "middle";
  const left = m.margin + 10 * m.s;
  const lines = wrap(ctx, text, pw - left - m.pad);
  const rows = Math.floor((m.ph - m.header - m.footer) / m.line);
  lines.slice(0, rows).forEach((ln, i) => ctx.fillText(ln, left, m.header + i * m.line + m.line / 2 + 0.5));

  ctx.fillStyle = "#8d8475";
  ctx.font = `500 ${Math.max(10.5, 11.5 * m.s)}px system-ui, sans-serif`;
  ctx.fillText("Never saved — not even here.", left + 16 * m.s, m.ph - m.footer / 2);
  return c;
}
