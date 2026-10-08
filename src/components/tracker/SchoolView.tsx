"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { plateInk, statusTone } from "@/lib/colors";
import { countdownTo, decisionWindow, formatLocalDate, formatLocalRange } from "@/lib/dates";
import type { Layout } from "@/lib/layout";
import { monogram } from "@/lib/monogram";
import { ROUND_NAME, STATUS_LABEL, type Colors, type School } from "@/lib/types";
import { CHECK_PATH, Glyph, STATUS_GLYPH } from "./glyphs";
import { cardSpring } from "./motion";

type Fact = { label: string; value: string; sub?: string; strong?: boolean; segs?: boolean[] };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function facts(s: School, now: Date): Fact[] {
  const out: Fact[] = [];
  const decided = s.status !== "pending";

  if (s.deadline) {
    let sub: string | undefined;
    let strong = false;
    if (!decided && !s.submitted) {
      const c = countdownTo(s.deadline, now);
      if (c) {
        sub = cap(c.label);
        strong = !c.past && c.days <= 14;
      }
    } else if (!decided && s.submitted) sub = "Submitted";
    out.push({ label: "Deadline", value: formatLocalDate(s.deadline, now), sub, strong });
  }

  if (s.decision_start || s.decision_end) {
    const range = !!(s.decision_start && s.decision_end && s.decision_start !== s.decision_end);
    let sub: string | undefined;
    if (!decided) {
      const w = decisionWindow(s.decision_start, s.decision_end, now);
      if (w?.phase === "upcoming") sub = cap(w.countdown.label);
      else if (w?.phase === "open") sub = range ? `Open now · ends ${w.countdown.label}` : "Expected today";
      else if (w?.phase === "passed") sub = "Should be out";
    }
    out.push({
      label: range ? "Decision window" : "Decision",
      value: formatLocalRange(s.decision_start, s.decision_end, now),
      sub,
    });
  }

  if (s.acceptance_rate != null) out.push({ label: "Acceptance", value: `${s.acceptance_rate}%` });

  if (s.supplements_total) {
    const done = Math.min(s.supplements_done ?? 0, s.supplements_total);
    out.push({
      label: "Supplements",
      value: `${done} of ${s.supplements_total}`,
      segs: Array.from({ length: Math.min(s.supplements_total, 8) }, (_, i) => i < done),
    });
  } else if (s.supplements_done) {
    out.push({ label: "Supplements", value: `${s.supplements_done} done` });
  }

  for (const f of s.custom_fields) out.push({ label: f.label || "Note", value: f.value || "—" });
  return out;
}

function SatBar({ lo25, hi75, you }: { lo25: number; hi75: number; you: number | null }) {
  const lo = Math.max(400, Math.min(1000, Math.floor((Math.min(lo25, you ?? 9999) - 60) / 100) * 100));
  const hi = 1600;
  const p = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
  const rel =
    you == null ? null : you > hi75 ? "You’re above the middle 50%" : you < lo25 ? "You’re below the middle 50%" : "You’re within the middle 50%";
  return (
    <div className="mt-6 rounded-[18px] bg-[#f5f5f7] px-5 pt-4 pb-3.5">
      <div className="flex flex-col gap-[3px]">
        <div className="text-[12.5px] whitespace-nowrap text-muted">Middle 50% SAT</div>
        <div className="text-[16.5px] font-semibold">
          {lo25}–{hi75}
        </div>
      </div>
      <div
        className="relative mt-2.5 h-[54px]"
        role="img"
        aria-label={`Middle 50% SAT ${lo25} to ${hi75}${you != null ? `. Your SAT ${you}. ${rel}` : ""}`}
      >
        <div className="absolute inset-x-0 top-[35px] h-0.5 rounded-[1px] bg-[#dcdde3]" />
        <div
          className="absolute top-[29px] h-3.5 rounded-[7px] bg-[#cfd2dc] shadow-[inset_0_0_0_1.5px_#17181c]"
          style={{ left: `${p(lo25)}%`, width: `${Math.max(1, p(hi75) - p(lo25))}%` }}
        />
        {you != null && (
          <>
            <div className="absolute top-[23px] -ml-px h-[26px] w-0.5 rounded-[1px] bg-ink" style={{ left: `${p(you)}%` }} />
            <div
              className="absolute top-0 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-white"
              style={{ left: `${Math.max(9, Math.min(91, p(you)))}%` }}
            >
              You · {you}
            </div>
          </>
        )}
      </div>
      <div className="flex justify-between text-[11.5px] text-muted" aria-hidden>
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
      {rel && <div className="mt-2 text-[13px] text-subtle">{rel}</div>}
    </div>
  );
}

export function SchoolView({
  school,
  colors,
  L,
  logoUrl,
  mySat,
  reduced,
  onEdit,
}: {
  school: School;
  colors: Colors;
  L: Layout;
  logoUrl: string | null;
  mySat: number | null;
  reduced: boolean;
  onEdit: () => void;
}) {
  const now = new Date();
  const decided = school.status !== "pending";
  const list = facts(school, now);
  const tone = statusTone(school.status, colors);
  const pill = decided
    ? { bg: tone.pillBg, fg: tone.ink, label: STATUS_LABEL[school.status], glyph: STATUS_GLYPH[school.status] }
    : school.submitted
      ? { bg: "#eef0f3", fg: "#17181c", label: "Submitted · awaiting decision", glyph: CHECK_PATH }
      : { bg: "#eef0f3", fg: "#3d4048", label: "Not submitted yet", glyph: STATUS_GLYPH.pending };
  const locLine = [school.location, school.classification].filter(Boolean).join(" · ");

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: L.cardPad }}>
        <div className="flex items-center gap-4 pr-11">
          <div className="flex size-[72px] flex-none items-center justify-center rounded-[20px] border border-[#ebebef] bg-white">
            <motion.div
              layoutId={reduced ? undefined : `logo-${school.id}`}
              transition={cardSpring}
              className="flex size-[52px] items-center justify-center"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-full object-contain" />
              ) : (
                <span className="font-serif text-[30px] leading-none font-medium tracking-[0.01em]" style={{ color: plateInk(colors) }}>
                  {monogram(school.name, school.short_name)}
                </span>
              )}
            </motion.div>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="ct-card-title" className="m-0 font-serif text-[30px] leading-[1.08] font-medium tracking-[-0.012em] text-balance">
              {school.name}
            </h2>
            {locLine && <div className="text-[14px] text-muted">{locLine}</div>}
          </div>
        </div>

        <div className="mt-[18px] flex flex-wrap gap-2">
          {school.round && (
            <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line px-3 text-[13px] whitespace-nowrap">
              <strong className="font-semibold">{school.round}</strong>
              <span className="text-muted">{ROUND_NAME[school.round]}</span>
            </span>
          )}
          <span
            className="inline-flex h-[30px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap"
            style={{ background: pill.bg, color: pill.fg }}
          >
            <Glyph d={pill.glyph} size={13} />
            <span>{pill.label}</span>
          </span>
        </div>

        {list.length > 0 && (
          <dl
            className="m-0 mt-[26px] grid gap-5"
            style={{ gridTemplateColumns: L.twoCol ? "repeat(2, minmax(0,1fr))" : "repeat(3, minmax(0,1fr))" }}
          >
            {list.map((f, i) => (
              <div key={i} className="flex min-w-0 flex-col gap-[3px]">
                <dt className="text-[12.5px] text-muted">{f.label}</dt>
                <dd className="m-0 text-[16.5px] font-semibold tracking-[-0.005em] [overflow-wrap:anywhere]">{f.value}</dd>
                {f.sub && (
                  <dd className="m-0 text-[13px]" style={{ color: f.strong ? "#17181c" : "#6b6e76", fontWeight: f.strong ? 600 : 400 }}>
                    {f.sub}
                  </dd>
                )}
                {f.segs && (
                  <dd className="m-0 mt-[5px] flex max-w-[120px] gap-1" aria-hidden>
                    {f.segs.map((on, j) => (
                      <div key={j} className="h-[5px] flex-1 rounded-[3px]" style={{ background: on ? "#17181c" : "#e3e4e9" }} />
                    ))}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        )}

        {school.sat_25 != null && school.sat_75 != null && <SatBar lo25={school.sat_25} hi75={school.sat_75} you={mySat} />}

        {school.notes && (
          <div className="mt-[22px] flex flex-col gap-1">
            <div className="text-[12.5px] text-muted">Notes</div>
            <div className="text-[14.5px] leading-[1.55] whitespace-pre-wrap text-pretty">{school.notes}</div>
          </div>
        )}
        <div className="h-[22px]" />
      </div>

      <div className="flex flex-none gap-2.5 border-t border-[#efeff2]" style={{ padding: L.footPad }}>
        {school.portal_url && (
          <a
            href={school.portal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[13px] bg-ink text-[14.5px] font-semibold !text-white no-underline hover:bg-[#2b2d34]"
          >
            Open portal
            <ExternalLink size={15} strokeWidth={2.2} aria-hidden />
          </a>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[13px] border border-[#dcdde3] bg-white text-[14.5px] font-semibold text-ink hover:bg-[#f5f5f7]"
        >
          <Pencil size={15} strokeWidth={2} aria-hidden />
          Edit
        </button>
      </div>
    </>
  );
}
