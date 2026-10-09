"use client";

/** Size and position of the machine for a page `pw` wide whose slot line is at (cx, slotY). */
export function machineGeometry(pw: number, cx: number, slotY: number) {
  const s = pw / 320;
  const bodyW = pw + 74 * s;
  const lidH = 30 * s;
  const slotH = 9 * s;
  const frontTop = slotY + slotH / 2;
  const frontH = lidH / 2 - slotH / 2 + 94 * s;
  const outletInset = 11 * s;
  return {
    s,
    left: cx - bodyW / 2,
    bodyW,
    lidTop: slotY - lidH / 2,
    lidH,
    slotH,
    slotW: pw + 18 * s,
    frontTop,
    frontH,
    lip: lidH / 2 - slotH / 2,
    /** Where the strips come out. */
    outletY: frontTop + frontH - outletInset,
    outletW: pw + 8 * s,
    outletInset,
  };
}

type G = ReturnType<typeof machineGeometry>;
export type MachineState = "idle" | "ready" | "running";

const lidGradient = "linear-gradient(180deg, #5a5d64 0%, #45474e 55%, #3b3d43 100%)";

/** The back half of the machine: the lid and its slot (the page slides in front of this). */
export function ShredderBack({ g, state, glow }: { g: G; state: MachineState; glow: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ left: g.left, top: g.lidTop, width: g.bodyW, height: g.lidH }}>
      <div
        className="absolute inset-0"
        style={{
          borderRadius: `${14 * g.s}px ${14 * g.s}px 0 0`,
          background: lidGradient,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.25)",
        }}
      />
      {/* The slot, with cutters glinting inside while it runs */}
      <div
        className="absolute left-1/2 -translate-x-1/2 overflow-hidden rounded-full"
        style={{
          top: g.lidH / 2 - g.slotH / 2,
          width: g.slotW,
          height: g.slotH,
          background: "#070708",
          boxShadow: glow
            ? "inset 0 2px 3px rgba(0,0,0,0.9), 0 0 0 1.5px rgba(255,214,150,0.65), 0 0 26px 4px rgba(255,190,110,0.45)"
            : "inset 0 2px 3px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.14)",
          transition: "box-shadow .2s ease",
        }}
      >
        <div
          className={state === "running" ? "ct-motion absolute inset-x-2 bottom-0 h-1/2" : "absolute inset-x-2 bottom-0 h-1/2"}
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, rgba(190,195,205,0.32) 0 1.5px, transparent 1.5px 7px)",
            backgroundSize: "100% 12px",
            animation: state === "running" ? "ct-cutters .12s linear infinite" : undefined,
            opacity: state === "running" ? 1 : 0.5,
          }}
        />
      </div>
    </div>
  );
}

/** The front of the machine (drawn over the page, so the page disappears into the slot). */
export function ShredderFront({ g, state }: { g: G; state: MachineState }) {
  const running = state === "running";
  const led = running ? "#ffb347" : state === "ready" ? "#7ff0a8" : "#5fd38a";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${running ? "ct-motion" : ""}`}
      style={{ left: g.left, top: g.frontTop, width: g.bodyW, height: g.frontH, animation: running ? "ct-shake .07s linear infinite" : undefined }}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: `0 0 ${22 * g.s}px ${22 * g.s}px`,
          background: `linear-gradient(180deg, #45474e 0px, #3b3d43 ${g.lip}px, #2a2c31 ${g.lip}px, #34363c ${g.lip + 2 * g.s}px, #26282c 45%, #18191c 100%)`,
          boxShadow:
            "inset 1px 0 0 rgba(255,255,255,0.06), inset -1px 0 0 rgba(0,0,0,0.35), 0 34px 60px -22px rgba(0,0,0,0.75), 0 12px 24px -16px rgba(0,0,0,0.5)",
        }}
      >
        {/* Brushed-metal grain */}
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 3px)" }} />
        {/* Soft reflection across the face */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(105deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0) 60%)" }}
        />
        <div
          className="absolute inset-x-0 text-center font-semibold uppercase"
          style={{
            top: g.lip + 30 * g.s,
            fontSize: 9.5 * g.s,
            letterSpacing: "0.34em",
            color: "rgba(255,255,255,0.3)",
            textShadow: "0 -1px 0 rgba(0,0,0,0.7)",
          }}
        >
          Worry Shredder
        </div>
        {/* Status light */}
        <div
          className={`absolute rounded-full ${running ? "ct-motion" : ""}`}
          style={{
            right: 30 * g.s,
            top: g.lip + 31 * g.s,
            width: 8 * g.s,
            height: 8 * g.s,
            background: led,
            boxShadow: `0 0 ${10 * g.s}px ${led}, inset 0 -1px 1px rgba(0,0,0,0.3)`,
            animation: running ? "ct-led-pulse .5s ease-in-out infinite" : undefined,
            transition: "background .2s, box-shadow .2s",
          }}
        />
        {/* Power mark */}
        <div
          className="absolute rounded-full border"
          style={{ left: 28 * g.s, top: g.lip + 29 * g.s, width: 12 * g.s, height: 12 * g.s, borderColor: "rgba(255,255,255,0.16)" }}
        />
        {/* Outlet the strips come out of */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ bottom: g.outletInset - 3 * g.s, width: g.outletW, height: 6 * g.s, background: "#060607", boxShadow: "inset 0 2px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.08)" }}
        />
      </div>
    </div>
  );
}
