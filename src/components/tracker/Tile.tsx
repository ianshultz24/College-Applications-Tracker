"use client";

import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { baseInk, statusSwatch, tileLook } from "@/lib/colors";
import type { Layout } from "@/lib/layout";
import { monogram } from "@/lib/monogram";
import { STATUS_LABEL, STATUSES, type Colors, type School, type Status } from "@/lib/types";
import { CHECK_PATH, Glyph, STATUS_GLYPH } from "./glyphs";

export function tileAria(school: School, editAll: boolean) {
  const state =
    school.status !== "pending" ? STATUS_LABEL[school.status] : school.submitted ? "submitted, awaiting decision" : "not submitted yet";
  return `${school.name}, ${state}${editAll ? ". Open to edit" : ""}`;
}

type Props = {
  school: School;
  colors: Colors;
  L: Layout;
  logoUrl: string | null;
  showNames: boolean;
  shimmer: boolean;
  reduced: boolean;
  editAll: boolean;
  /** The card for this tile is open: keep the slot, hide the tile. */
  isOpen: boolean;
  isDragging?: boolean;
  onOpen: () => void;
  onStatus?: (status: Status) => void;
  onRemove?: () => void;
  /** Drag handle element (from the sortable grid), shown in edit-all mode. */
  handle?: ReactNode;
};

export function Tile({
  school,
  colors,
  L,
  logoUrl,
  showNames,
  shimmer,
  reduced,
  editAll,
  isOpen,
  isDragging,
  onOpen,
  onStatus,
  onRemove,
  handle,
}: Props) {
  const [hover, setHover] = useState(false);
  const [dotLabel, setDotLabel] = useState<string | null>(null);

  const look = tileLook(school.status, colors);
  const tiltOn = shimmer && !reduced && !isDragging;
  const showName = (hover && !isDragging) || (showNames && !editAll);

  const enter = (el: HTMLElement) => {
    setHover(true);
    el.style.setProperty("--ty", "-3px");
    if (tiltOn) el.style.setProperty("--sh", "1");
  };
  const leave = (el: HTMLElement) => {
    setHover(false);
    for (const p of ["--mx", "--my", "--rx", "--ry", "--tx", "--ty", "--sh"]) el.style.removeProperty(p);
  };
  const tilt = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!tiltOn || e.pointerType === "touch") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--rx", `${((0.5 - py) * 16).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((px - 0.5) * 16).toFixed(2)}deg`);
    el.style.setProperty("--tx", `${((px - 0.5) * 6).toFixed(1)}px`);
    el.style.setProperty("--ty", `${(-3 + (py - 0.5) * 6).toFixed(1)}px`);
  };

  const surface: CSSProperties = {
    appearance: "none",
    position: "relative",
    display: "block",
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    border: 0,
    font: "inherit",
    overflow: "hidden",
    isolation: "isolate",
    borderRadius: L.radius,
    background: look.surface,
    opacity: look.opacity,
    boxShadow: isDragging ? "0 30px 50px -18px rgba(0,0,0,0.6), 0 4px 10px rgba(0,0,0,0.2)" : look.shadow,
    transform: "perspective(520px) translate(var(--tx, 0px), var(--ty, 0px)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
    transition:
      "transform .55s cubic-bezier(.2,.9,.25,1), box-shadow .35s, opacity .3s, --mx .6s cubic-bezier(.2,.9,.25,1), --my .6s cubic-bezier(.2,.9,.25,1), --sh .45s ease",
    outline: "none",
  };

  return (
    <>
      <div data-tile-slot style={{ position: "relative", width: L.tile, height: L.tile }}>
        {/* While its card is open the tile stays mounted (no image reload) but hidden; the slot keeps its space. */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: L.radius,
            visibility: isOpen ? "hidden" : undefined,
          }}
        >
          <button
            type="button"
            data-tile-btn
            aria-label={tileAria(school, editAll)}
            onClick={(e) => {
              leave(e.currentTarget);
              onOpen();
            }}
            onPointerEnter={(e) => enter(e.currentTarget)}
            onPointerLeave={(e) => leave(e.currentTarget)}
            onPointerMove={tilt}
            onFocus={(e) => enter(e.currentTarget)}
            onBlur={(e) => leave(e.currentTarget)}
            className="ct-tile"
            style={surface}
          >
            <TileFace school={school} colors={colors} L={L} logoUrl={logoUrl} editAll={editAll} />
          </button>
        </div>

        {!isOpen && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: editAll ? "auto" : "calc(100% + 8px)",
              bottom: editAll ? "calc(100% + 8px)" : "auto",
              transform: "translateX(-50%)",
              opacity: showName ? 1 : 0,
              transition: "opacity .18s",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              padding: "5px 11px",
              borderRadius: 999,
              background: "rgba(20,18,16,0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#ffffff",
              fontSize: 12.5,
              fontWeight: 500,
              zIndex: 6,
              maxWidth: Math.max(L.tile + 60, 180),
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {school.name}
          </div>
        )}

        {editAll && !isOpen && (
          <>
            {handle}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              aria-label={`Remove ${school.name}`}
              title="Remove"
              className="absolute -top-2 -right-2 z-[4] flex size-7 items-center justify-center rounded-full border border-white/18 bg-[rgba(22,20,18,0.86)] text-white hover:bg-[#b9443a]"
            >
              <Glyph d="M18 6 6 18M6 6l12 12" size={12} stroke={2.8} />
            </button>
          </>
        )}
      </div>

      {editAll && (
        <div
          className="ct-dark"
          style={{
            marginTop: 8,
            width: L.tile,
            padding: "4px 3px 6px",
            borderRadius: 12,
            background: "rgba(22,20,18,0.74)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            visibility: isOpen ? "hidden" : "visible",
          }}
        >
          <div role="group" aria-label={`${school.name} status`} style={{ display: "flex", justifyContent: "center" }}>
            {STATUSES.map((key) => {
              const sel = school.status === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatus?.(key);
                  }}
                  onPointerEnter={() => setDotLabel(STATUS_LABEL[key])}
                  onPointerLeave={() => setDotLabel(null)}
                  onFocus={() => setDotLabel(STATUS_LABEL[key])}
                  onBlur={() => setDotLabel(null)}
                  aria-label={`Mark ${school.name} ${STATUS_LABEL[key]}`}
                  aria-pressed={sel}
                  title={STATUS_LABEL[key]}
                  style={{
                    width: L.dotHit,
                    height: 22,
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: statusSwatch(key, colors),
                      boxShadow: sel
                        ? "0 0 0 2px rgba(20,18,16,0.9), 0 0 0 3.5px #ffffff"
                        : key === "pending"
                          ? "inset 0 0 0 1px rgba(0,0,0,0.3)"
                          : "none",
                    }}
                  />
                </button>
              );
            })}
          </div>
          <div
            aria-live="polite"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "0.01em",
              lineHeight: "14px",
            }}
          >
            {dotLabel ?? STATUS_LABEL[school.status]}
          </div>
        </div>
      )}
    </>
  );
}

type FaceProps = { school: School; colors: Colors; L: Layout; logoUrl: string | null; editAll: boolean };

/** What's printed on a tile: logo or monogram, sheen, rim, status pill, submitted check. */
function TileFace({ school, colors, L, logoUrl, editAll }: FaceProps) {
  const [imgFailed, setImgFailed] = useState<string | null>(null);
  const look = tileLook(school.status, colors);
  const decided = school.status !== "pending";
  const logo = logoUrl && imgFailed !== logoUrl ? logoUrl : null;
  const mono = monogram(school.name, school.short_name);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingBottom: decided ? L.decidedLogoPad : 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: L.logo,
            height: L.logo,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              draggable={false}
              onError={() => setImgFailed(logo)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
                mixBlendMode: look.blend,
                filter: look.logoFilter,
                opacity: look.logoOpacity,
              }}
            />
          ) : (
            <span
              className="font-serif"
              style={{
                fontSize: L.monoFont,
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "0.01em",
                color: look.mono,
              }}
            >
              {mono}
            </span>
          )}
        </div>
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: look.sheen,
          backgroundSize: "300% 300%",
          backgroundPosition: "calc(100% - var(--mx, 50%)) calc(100% - var(--my, 50%))",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          boxShadow: look.rim,
        }}
      />
      {decided && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: L.labelBottom,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              height: 20,
              padding: "0 8px 0 7px",
              borderRadius: 999,
              background: look.labelBg,
              boxShadow: look.labelRing,
              color: look.ink,
              fontSize: L.labelFont,
              fontWeight: 600,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
            }}
          >
            <Glyph d={STATUS_GLYPH[school.status]} size={11} stroke={3} />
            <span>{STATUS_LABEL[school.status]}</span>
          </div>
        </div>
      )}
      {!decided && school.submitted && !editAll && (
        <div
          aria-hidden
          title="Submitted"
          style={{
            position: "absolute",
            top: 9,
            right: 9,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: baseInk(colors),
            color: colors.base,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Glyph d={CHECK_PATH} size={12} stroke={3.2} />
        </div>
      )}
    </>
  );
}

/** A still copy of a tile (no hover, no buttons). The card starts and ends its animation looking exactly like this. */
export function TileSkin(props: FaceProps) {
  const look = tileLook(props.school.status, props.colors);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        isolation: "isolate",
        borderRadius: props.L.radius,
        background: look.surface,
        opacity: look.opacity,
      }}
    >
      <TileFace {...props} />
    </div>
  );
}
