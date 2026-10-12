"use client";

import { ArrowDown, ArrowUp, ExternalLink, NotebookText, Plus } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { plateInk } from "@/lib/colors";
import { deadlineInfo, decisionInfo, DEFAULT_SORT, nextSort, SORT_KEYS, sortSchools, type DateInfo, type Sort, type SortKey } from "@/lib/list";
import { monogram } from "@/lib/monogram";
import { ROUND_NAME, type Colors, type School } from "@/lib/types";
import { Glyph } from "./glyphs";
import { ListSummary } from "./ListSummary";
import { statusPill } from "./SchoolView";
import { usePref } from "./usePref";

type Props = {
  schools: School[];
  colors: Colors;
  mySat: number | null;
  logoUrl: (s: School) => string | null;
  onOpen: (id: string) => void;
  onAdd: () => void;
};

const SHADOW = "0 40px 100px -30px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.16)";

/** The list's remembered sort (anything unreadable falls back to your own order). */
function useSort(): [Sort, (s: Sort) => void] {
  const [raw, setRaw] = usePref("ct-list");
  const sort = useMemo<Sort>(() => {
    try {
      const v = JSON.parse(raw ?? "") as Partial<Sort>;
      if (SORT_KEYS.includes(v.key as SortKey) && (v.dir === "asc" || v.dir === "desc")) return { key: v.key as SortKey, dir: v.dir };
    } catch {}
    return DEFAULT_SORT;
  }, [raw]);
  return [sort, (s) => setRaw(JSON.stringify(s))];
}

export function ListView({ schools, colors, mySat, logoUrl, onOpen, onAdd }: Props) {
  const [sort, setSort] = useSort();
  const rows = useMemo(() => sortSchools(schools, sort), [schools, sort]);
  const now = new Date();
  const satScale = useMemo(() => {
    const lows = schools.flatMap((s) => (s.sat_25 != null ? [s.sat_25] : []));
    if (mySat != null) lows.push(mySat);
    const lo = lows.length ? Math.max(400, Math.min(1200, Math.floor((Math.min(...lows) - 60) / 100) * 100)) : 1000;
    return { lo, hi: 1600 };
  }, [schools, mySat]);

  const header = (key: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className="px-2.5 pb-2.5 font-normal whitespace-nowrap first:pl-6 last:pr-6"
        style={{ textAlign: align }}
      >
        <button
          type="button"
          onClick={() => setSort(nextSort(sort, key))}
          className="-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12.5px] hover:bg-[#f1f1f3] hover:text-ink"
          style={{ color: active ? "#17181c" : "#6b6e76", fontWeight: active ? 600 : 400 }}
        >
          {label}
          {active && (sort.dir === "asc" ? <ArrowUp size={13} strokeWidth={2.2} aria-hidden /> : <ArrowDown size={13} strokeWidth={2.2} aria-hidden />)}
        </button>
      </th>
    );
  };

  return (
    <section aria-labelledby="ct-list-title" className="w-full max-w-[1180px] self-start rounded-[28px] bg-white text-ink" style={{ boxShadow: SHADOW }}>
      <div className="flex items-end justify-between gap-4 px-6 pt-6 pb-5">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 id="ct-list-title" className="m-0 font-serif text-[30px] leading-[1.08] font-medium tracking-[-0.012em]">
            All schools
          </h2>
          <span className="text-[14px] text-muted">
            {schools.length} {schools.length === 1 ? "school" : "schools"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {sort.key !== "order" && (
            <button
              type="button"
              onClick={() => setSort(DEFAULT_SORT)}
              className="h-10 rounded-[12px] px-3 text-[13.5px] font-medium text-subtle hover:bg-[#f5f5f7] hover:text-ink"
            >
              Back to your order
            </button>
          )}
          <span data-tile="__add">
            <button
              type="button"
              onClick={onAdd}
              className="flex h-10 items-center gap-1.5 rounded-[12px] bg-ink px-4 text-[14px] font-semibold whitespace-nowrap text-white hover:bg-[#2b2d34]"
            >
              <Plus size={16} strokeWidth={2.2} aria-hidden />
              Add school
            </button>
          </span>
        </div>
      </div>

      <ListSummary schools={schools} colors={colors} mySat={mySat} onOpen={onOpen} />

      <div className="overflow-x-auto pb-3">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr>
              {header("name", "School")}
              {header("status", "Status")}
              {header("round", "Round")}
              {header("type", "Type")}
              {header("deadline", "Deadline")}
              {header("decision", "Decision")}
              {header("acceptance", "Acceptance", "right")}
              {header("sat", "SAT")}
              {header("supplements", "Supplements")}
              <th scope="col" className="pr-6 pb-2.5">
                <span className="sr-only">Portal</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <Row key={s.id} school={s} colors={colors} logoUrl={logoUrl(s)} mySat={mySat} satScale={satScale} now={now} onOpen={onOpen} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const Empty = () => <span className="text-[14px] text-[#b4b6bd]">—</span>;

function Cell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-2.5 py-3 align-middle first:pl-6 last:pr-6 ${className}`}>{children}</td>;
}

function DateCell({ info }: { info: DateInfo | null }) {
  if (!info) return <Empty />;
  return (
    <div className="flex flex-col gap-0.5 whitespace-nowrap">
      <span className="text-[14.5px] font-semibold tracking-[-0.005em]">{info.value}</span>
      {info.sub && (
        <span className="text-[12.5px]" style={{ color: info.strong ? "#17181c" : "#6b6e76", fontWeight: info.strong ? 600 : 400 }}>
          {info.sub}
        </span>
      )}
    </div>
  );
}

function Row({
  school: s,
  colors,
  logoUrl,
  mySat,
  satScale,
  now,
  onOpen,
}: {
  school: School;
  colors: Colors;
  logoUrl: string | null;
  mySat: number | null;
  satScale: { lo: number; hi: number };
  now: Date;
  onOpen: (id: string) => void;
}) {
  const pill = statusPill(s, colors, true);
  const mono = monogram(s.name, s.short_name);
  const hasNotes = !!s.notes || s.custom_fields.length > 0;
  const done = s.supplements_total ? Math.min(s.supplements_done ?? 0, s.supplements_total) : 0;

  return (
    <tr data-tile={s.id} onClick={() => onOpen(s.id)} className="group cursor-pointer border-t border-[#efeff2] transition-colors hover:bg-[#f7f7f9]">
      <Cell>
        <div className="flex min-w-[184px] items-center gap-3">
          <div className="flex size-10 flex-none items-center justify-center rounded-[12px] border border-[#ebebef] bg-white">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-[30px] object-contain" />
            ) : (
              <span className="font-serif leading-none font-medium" style={{ color: plateInk(colors), fontSize: mono.length > 3 ? 11.5 : mono.length > 2 ? 13.5 : 17 }}>
                {mono}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                data-tile-btn
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(s.id);
                }}
                className="truncate rounded-sm text-left text-[15px] font-semibold tracking-[-0.005em] text-ink"
              >
                {s.name}
              </button>
              {hasNotes && (
                <span title="Has notes" className="flex-none text-[#9a9ca3]">
                  <NotebookText size={13} strokeWidth={2} aria-label="Has notes" />
                </span>
              )}
            </span>
            {s.location && <span className="truncate text-[12.5px] text-muted">{s.location}</span>}
          </div>
        </div>
      </Cell>
      <Cell>
        <span
          className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold whitespace-nowrap"
          style={{ background: pill.bg, color: pill.fg }}
        >
          <Glyph d={pill.glyph} size={12} />
          {pill.label}
        </span>
      </Cell>
      <Cell>{s.round ? <strong className="text-[14px] font-semibold" title={ROUND_NAME[s.round]}>{s.round}</strong> : <Empty />}</Cell>
      <Cell>{s.classification ? <span className="text-[14px] whitespace-nowrap">{s.classification}</span> : <Empty />}</Cell>
      <Cell>
        <DateCell info={deadlineInfo(s, now, true)} />
      </Cell>
      <Cell>
        <DateCell info={decisionInfo(s, now, true)} />
      </Cell>
      <Cell className="text-right">
        {s.acceptance_rate != null ? <span className="text-[14.5px] font-semibold tabular-nums">{s.acceptance_rate}%</span> : <Empty />}
      </Cell>
      <Cell>
        {s.sat_25 != null && s.sat_75 != null ? <MiniSat lo25={s.sat_25} hi75={s.sat_75} you={mySat} scale={satScale} /> : <Empty />}
      </Cell>
      <Cell>
        {s.supplements_total ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[14px] font-semibold whitespace-nowrap tabular-nums">
              {done} of {s.supplements_total}
            </span>
            <div className="flex w-[72px] gap-[3px]" aria-hidden>
              {Array.from({ length: Math.min(s.supplements_total, 8) }, (_, i) => (
                <div key={i} className="h-[5px] flex-1 rounded-[3px]" style={{ background: i < done ? "#17181c" : "#e3e4e9" }} />
              ))}
            </div>
          </div>
        ) : s.supplements_done ? (
          <span className="text-[14px] font-semibold whitespace-nowrap">{s.supplements_done} done</span>
        ) : (
          <Empty />
        )}
      </Cell>
      <Cell>
        {s.portal_url && (
          <a
            href={s.portal_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Open ${s.name} portal`}
            title="Open portal"
            className="flex size-8 items-center justify-center rounded-full border border-[#dcdde3] bg-white !text-ink hover:bg-[#f1f1f3]"
          >
            <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
          </a>
        )}
      </Cell>
    </tr>
  );
}

/** The card's SAT bar, shrunk to fit a row. Every row shares one scale so the bars can be compared. */
function MiniSat({ lo25, hi75, you, scale }: { lo25: number; hi75: number; you: number | null; scale: { lo: number; hi: number } }) {
  const p = (v: number) => Math.max(0, Math.min(100, ((v - scale.lo) / (scale.hi - scale.lo)) * 100));
  const rel = you == null ? "" : you > hi75 ? ". You’re above the middle 50%" : you < lo25 ? ". You’re below the middle 50%" : ". You’re within the middle 50%";
  return (
    <div className="flex flex-col gap-1.5" role="img" aria-label={`Middle 50% SAT ${lo25} to ${hi75}${rel}`}>
      <span className="text-[14px] font-semibold whitespace-nowrap tabular-nums">
        {lo25}–{hi75}
      </span>
      <div className="relative h-2 w-[128px]" aria-hidden>
        <div className="absolute inset-x-0 top-[3px] h-0.5 rounded-[1px] bg-[#e3e4e9]" />
        <div
          className="absolute top-0 h-2 rounded-[4px] bg-[#cfd2dc] shadow-[inset_0_0_0_1.25px_#17181c]"
          style={{ left: `${p(lo25)}%`, width: `${Math.max(2, p(hi75) - p(lo25))}%` }}
        />
        {you != null && <div className="absolute -top-[3px] -ml-px h-3.5 w-0.5 rounded-[1px] bg-ink" style={{ left: `${p(you)}%` }} />}
      </div>
    </div>
  );
}
