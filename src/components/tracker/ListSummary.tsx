"use client";

import type { ReactNode } from "react";
import { mixHex } from "@/lib/colors";
import { deadlineInfo, decisionInfo, STATUS_ORDER, summarize, type DateInfo } from "@/lib/list";
import { STATUS_LABEL, type Colors, type School, type Status } from "@/lib/types";

/** A status's color in the breakdown bar (Undecided is white with a ring, Withdrawn is faded like its tile). */
function barColor(status: Status, colors: Colors) {
  if (status === "pending") return { background: "#ffffff", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.2)" };
  if (status === "withdrawn") return { background: mixHex(colors.withdrawn, "#ffffff", 0.45) };
  return { background: colors[status] };
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function Box({ label, children, wide, onClick }: { label: string; children: ReactNode; wide?: boolean; onClick?: () => void }) {
  const className = "flex min-w-0 flex-col gap-[3px] rounded-[18px] bg-[#f5f5f7] px-4 pt-3.5 pb-3.5 text-left";
  const style = { flex: wide ? "2 1 330px" : "1 1 168px" };
  const body = (
    <>
      <span className="text-[12.5px] whitespace-nowrap text-muted">{label}</span>
      {children}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${className} transition-colors hover:bg-[#ededf0]`} style={style}>
      {body}
    </button>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}

function Meter({ done, total }: { done: number; total: number }) {
  return (
    <div className="mt-[5px] h-[5px] w-full overflow-hidden rounded-[3px] bg-[#e3e4e9]" aria-hidden>
      <div className="h-full rounded-[3px] bg-ink" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
    </div>
  );
}

/** A school and when: "Georgetown" / "Jan 10 · in 91 days". */
function Upcoming({ school, info, empty }: { school?: School; info?: DateInfo | null; empty: [string, string] }) {
  if (!school || !info) {
    return (
      <>
        <span className="text-[16.5px] font-semibold tracking-[-0.005em]">{empty[0]}</span>
        <span className="text-[13px] text-muted">{empty[1]}</span>
      </>
    );
  }
  return (
    <>
      <span className="truncate text-[16.5px] font-semibold tracking-[-0.005em]">{school.name}</span>
      <span className="truncate text-[13px]" style={{ color: info.strong ? "#17181c" : "#6b6e76", fontWeight: info.strong ? 600 : 400 }}>
        {info.value}
        {info.sub && ` · ${lower(info.sub)}`}
      </span>
    </>
  );
}

/** The row of numbers above the table: where everything stands at a glance. */
export function ListSummary({
  schools,
  colors,
  mySat,
  onOpen,
}: {
  schools: School[];
  colors: Colors;
  mySat: number | null;
  onOpen: (id: string) => void;
}) {
  const now = new Date();
  const s = summarize(schools, mySat, now);
  const shown = STATUS_ORDER.filter((st) => s.counts[st] > 0);
  const deadline = s.nextDeadline?.school;
  const decision = s.nextDecision?.school;
  const breakdown = shown.map((st) => `${STATUS_LABEL[st]} ${s.counts[st]}`).join(", ");

  return (
    <div className="flex flex-wrap gap-3 px-6 pb-6">
      <Box label="Decisions" wide>
        <span className="text-[16.5px] font-semibold tracking-[-0.005em]">
          {s.counts.accepted} accepted <span className="font-normal text-muted">of {s.total}</span>
        </span>
        <div className="mt-2 flex h-2.5 gap-[2px]" role="img" aria-label={`Status breakdown: ${breakdown}`}>
          {shown.map((st) => (
            <div
              key={st}
              title={`${STATUS_LABEL[st]}: ${s.counts[st]}`}
              className="h-full min-w-1.5 rounded-[4px]"
              style={{ flex: s.counts[st], ...barColor(st, colors) }}
            />
          ))}
        </div>
        <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0" aria-hidden>
          {shown.map((st) => (
            <li key={st} className="flex items-center gap-1.5 text-[12.5px] whitespace-nowrap">
              <span className="size-2 rounded-[2px]" style={barColor(st, colors)} />
              <span className="text-subtle">{STATUS_LABEL[st]}</span>
              <span className="font-semibold tabular-nums">{s.counts[st]}</span>
            </li>
          ))}
        </ul>
      </Box>

      <Box label="Submitted">
        <span className="text-[16.5px] font-semibold tracking-[-0.005em] tabular-nums">
          {s.submitted} <span className="font-normal text-muted">of {s.total}</span>
        </span>
        <Meter done={s.submitted} total={s.total} />
        {s.supplements.total > 0 && (
          <>
            <span className="mt-2.5 flex items-baseline justify-between gap-2 text-[12.5px]">
              <span className="text-muted">Supplements</span>
              <span className="font-semibold tabular-nums">
                {s.supplements.done} of {s.supplements.total}
              </span>
            </span>
            <Meter done={s.supplements.done} total={s.supplements.total} />
          </>
        )}
      </Box>

      <Box label="Next deadline" onClick={deadline ? () => onOpen(deadline.id) : undefined}>
        <Upcoming school={deadline} info={deadline && deadlineInfo(deadline, now, true)} empty={["All caught up", "No deadlines ahead"]} />
      </Box>

      <Box label="Next decision" onClick={decision ? () => onOpen(decision.id) : undefined}>
        <Upcoming school={decision} info={decision && decisionInfo(decision, now, true)} empty={["Nothing pending", "No decisions to wait for"]} />
      </Box>

      {s.sat && (
        <Box label={`Your SAT · ${mySat}`}>
          <div className="mt-0.5 grid grid-cols-3 gap-2">
            {(
              [
                ["Above", s.sat.above],
                ["Within", s.sat.within],
                ["Below", s.sat.below],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="flex flex-col">
                <span className="text-[16.5px] font-semibold tabular-nums">{n}</span>
                <span className="text-[12px] text-muted">{label}</span>
              </div>
            ))}
          </div>
          <span className="mt-1.5 text-[12px] text-muted">vs. each middle 50%</span>
        </Box>
      )}
    </div>
  );
}
