import type { CSSProperties } from "react";

/** Falling strips in the card art: [x, length, color, delay s, drift px, spin deg]. Fixed values so it renders the same every time. */
const STRIPS: [number, number, string, number, number, number][] = [
  [104, 26, "#f7f2e7", 0.0, -14, -160],
  [113, 22, "#2e7d55", 0.55, -6, 140],
  [122, 28, "#f7f2e7", 1.1, -18, 200],
  [131, 24, "#e2a336", 0.3, 4, -120],
  [140, 30, "#3566b8", 0.85, -8, 180],
  [149, 22, "#f7f2e7", 1.4, 10, -210],
  [158, 27, "#f4c95d", 0.15, -4, 150],
  [167, 24, "#b9443a", 0.7, 12, -170],
  [176, 29, "#f7f2e7", 1.25, 6, 190],
  [185, 23, "#2e7d55", 0.45, 16, -140],
  [194, 26, "#3566b8", 1.0, 8, 160],
  [203, 22, "#f7f2e7", 1.55, 20, -190],
  [212, 25, "#e2a336", 0.25, 14, 130],
];

/** Confetti already lying on the floor (always visible). */
const FLOOR: [number, number, number, string][] = [
  [92, 184, 74, "#f7f2e7"],
  [108, 188, -20, "#3566b8"],
  [126, 183, 58, "#e2a336"],
  [190, 186, -64, "#2e7d55"],
  [206, 182, 18, "#f7f2e7"],
  [226, 187, 82, "#b9443a"],
  [150, 189, -8, "#f4c95d"],
];

/**
 * The Worry Shredder card picture: a sheet feeding into the machine and confetti strips drifting out.
 * Moves only while the card is hovered or focused (and never with reduced motion).
 */
export function ShredderArt() {
  return (
    <svg viewBox="0 0 320 200" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="ct-art-light" cx="50%" cy="0%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ct-art-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34363b" />
          <stop offset="1" stopColor="#1a1b1e" />
        </linearGradient>
        <linearGradient id="ct-art-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a4c52" />
          <stop offset="1" stopColor="#36383d" />
        </linearGradient>
        <clipPath id="ct-art-above-slot">
          <rect x="0" y="0" width="320" height="104" />
        </clipPath>
        <clipPath id="ct-art-below-slot">
          <rect x="0" y="146" width="320" height="54" />
        </clipPath>
      </defs>

      <rect width="320" height="200" fill="url(#ct-art-light)" />

      {/* Floor confetti and the machine's shadow */}
      <ellipse cx="160" cy="190" rx="92" ry="7" fill="#000" opacity="0.14" />
      {FLOOR.map(([x, y, r, c], i) => (
        <rect key={i} x={x} y={y} width="4" height="13" rx="1" fill={c} transform={`rotate(${r} ${x + 2} ${y + 6})`} opacity="0.95" />
      ))}

      {/* The sheet, feeding down into the slot */}
      <g clipPath="url(#ct-art-above-slot)">
        <g className="ct-art-anim" style={{ animation: "ct-art-feed 2.4s linear infinite", transformBox: "view-box" }}>
          <rect x="116" y="14" width="88" height="100" rx="3" fill="#f7f2e7" />
          <line x1="128" y1="14" x2="128" y2="114" stroke="#e7a7a0" strokeWidth="0.8" />
          {[30, 42, 54, 66, 78, 90, 102].map((y) => (
            <line key={y} x1="116" y1={y} x2="204" y2={y} stroke="#c9d8ea" strokeWidth="0.7" />
          ))}
          <path d="M133 39 q8 -5 16 0 t16 0 t14 -1 M133 51 q7 -4 14 0 t14 0 M133 63 q9 -5 18 0 t16 0 t10 -1" stroke="#27324a" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* The machine */}
      <rect x="84" y="97" width="152" height="15" rx="6" fill="url(#ct-art-lid)" />
      <rect x="95" y="102.5" width="130" height="4" rx="2" fill="#0b0c0e" />
      <path d="M86 110 h148 v30 a10 10 0 0 1 -10 10 h-128 a10 10 0 0 1 -10 -10 z" fill="url(#ct-art-front)" />
      <rect x="86" y="110" width="148" height="1" fill="#fff" opacity="0.1" />
      <text x="160" y="133" textAnchor="middle" fontSize="6" letterSpacing="1.8" fill="#fff" opacity="0.32" fontFamily="var(--font-sans)" fontWeight="600">
        WORRY SHREDDER
      </text>
      <circle cx="221" cy="130.5" r="2.4" fill="#5fd38a" className="ct-art-anim" style={{ animation: "ct-art-led 0.9s ease-in-out infinite" }} />
      <rect x="96" y="145" width="128" height="2.5" rx="1.25" fill="#0b0c0e" />

      {/* Strips drifting out */}
      <g clipPath="url(#ct-art-below-slot)">
        {STRIPS.map(([x, len, c, delay, dx, rot], i) => (
          <rect
            key={i}
            x={x}
            y={146}
            width="4.2"
            height={len}
            rx="1"
            fill={c}
            className="ct-art-anim"
            style={
              {
                "--dx": `${dx}px`,
                "--rot": `${rot}deg`,
                animation: `ct-art-fall 1.8s -${delay}s cubic-bezier(.3,.1,.6,1) infinite`,
                transformBox: "fill-box",
                transformOrigin: "50% 0%",
              } as CSSProperties
            }
          />
        ))}
      </g>
    </svg>
  );
}
