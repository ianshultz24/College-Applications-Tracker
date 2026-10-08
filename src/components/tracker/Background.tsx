"use client";

/**
 * One fixed, blurred background layer for the whole app (tiles never use backdrop-filter).
 * The image extends past the viewport so the blur never fades out at the edges.
 */

// The built-in default: a soft misty-green landscape made of gradients (no outside photo service).
export const DEFAULT_BACKGROUND = [
  "radial-gradient(120% 70% at 72% 115%, #0d140e 0%, rgba(13,20,14,0) 62%)",
  "radial-gradient(70% 60% at 88% 46%, #32492a 0%, rgba(50,73,42,0) 60%)",
  "radial-gradient(60% 55% at 58% 58%, #55703f 0%, rgba(85,112,63,0) 62%)",
  "radial-gradient(75% 55% at 14% 78%, #263222 0%, rgba(38,50,34,0) 64%)",
  "radial-gradient(110% 55% at 30% 6%, #d5d8d9 0%, rgba(213,216,217,0) 62%)",
  "linear-gradient(180deg, #a3abad 0%, #7d8a7a 34%, #46553e 62%, #161c14 100%)",
].join(", ");

export function Background({ url, blur, dim }: { url: string | null; blur: number; dim: number }) {
  const bleed = Math.max(48, Math.round(blur * 2.5));
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#2a2623]">
      <div
        style={{
          position: "absolute",
          inset: -bleed,
          backgroundImage: url ? `url("${url}")` : DEFAULT_BACKGROUND,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
          transform: "scale(1.04)",
          willChange: "transform",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: `rgba(12,11,10,${dim.toFixed(2)})` }} />
    </div>
  );
}
