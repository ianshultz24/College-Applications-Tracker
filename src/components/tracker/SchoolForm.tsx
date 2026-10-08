"use client";

import { Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { plateInk, statusSwatch, statusTone } from "@/lib/colors";
import type { Draft } from "@/lib/draft";
import type { Layout } from "@/lib/layout";
import { monogram } from "@/lib/monogram";
import { imageFromDataTransfer } from "@/lib/images";
import { CLASSIFICATIONS, ROUNDS, STATUS_LABEL, STATUSES, type Colors, type Status } from "@/lib/types";
import type { FieldErrors } from "@/lib/validate";
import { CHECK_PATH, Glyph, STATUS_GLYPH } from "./glyphs";
import { cardSpring } from "./motion";

export type FormErrors = FieldErrors & { portal_url?: string };

const inputBase =
  "ct-field w-full h-[54px] rounded-xl border bg-white px-3 pt-[22px] pb-1.5 text-[15px] font-medium text-ink";
const labelBase = "pointer-events-none absolute top-2 left-[13px] text-[12px] whitespace-nowrap text-muted";

function Field({
  label,
  hint,
  error,
  suffix,
  inputRef,
  className = "",
  ...input
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  suffix?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label className="relative block" htmlFor={id}>
        <span className={labelBase}>
          {label}
          {hint && <span className="text-[#8a8d95]"> · {hint}</span>}
        </span>
        <input
          id={id}
          ref={inputRef}
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={inputBase}
          style={{ borderColor: error ? "#b9443a" : "#e3e4e9", paddingRight: suffix ? 26 : undefined }}
          {...input}
        />
        {suffix && <span className="pointer-events-none absolute right-3 bottom-2 text-[14px] text-muted">{suffix}</span>}
      </label>
      {error && (
        <div id={`${id}-err`} role="alert" className="mt-1 ml-0.5 text-[12.5px] text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="h-9 rounded-full border px-[13px] text-[13.5px] font-semibold"
      style={{
        background: selected ? "#17181c" : "#ffffff",
        color: selected ? "#ffffff" : "#17181c",
        borderColor: selected ? "#17181c" : "#e3e4e9",
      }}
    >
      {children}
    </button>
  );
}

function Switch({ on, label, text, onToggle }: { on: boolean; label: string; text: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex h-[54px] items-center justify-between gap-2.5 rounded-xl border border-line bg-white px-3 text-left text-ink"
    >
      <span className="flex flex-col gap-[3px]">
        <span className="text-[12px] text-muted">{label}</span>
        <span className="text-[15px] font-medium">{text}</span>
      </span>
      <span className="relative h-6 w-10 flex-none rounded-xl transition-colors" style={{ background: on ? "#17181c" : "#d4d6dc" }}>
        <span
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
          style={{ transform: on ? "translateX(16px)" : "translateX(0px)", transition: "transform .25s cubic-bezier(.3,1.4,.5,1)" }}
        />
      </span>
    </button>
  );
}

function StatusPicker({ value, colors, cols, onPick }: { value: Status; colors: Colors; cols: number; onPick: (s: Status) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const dir = { ArrowRight: 1, ArrowDown: cols, ArrowLeft: -1, ArrowUp: -cols }[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + STATUSES.length) % STATUSES.length;
    onPick(STATUSES[next]);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Status" className="mt-[18px] grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {STATUSES.map((key, i) => {
        const sel = value === key;
        const t = statusTone(key, colors);
        return (
          <button
            key={key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={sel}
            tabIndex={sel ? 0 : -1}
            onClick={() => onPick(key)}
            onKeyDown={(e) => onKey(e, i)}
            className="flex h-[50px] items-center gap-2.5 rounded-[14px] px-3.5 text-left text-[14px] font-semibold transition-colors"
            style={{
              border: sel ? `1.5px solid ${t.border}` : "1.5px solid #e3e4e9",
              background: sel ? t.pillBg : "#ffffff",
              color: sel ? t.ink : "#17181c",
            }}
          >
            {sel ? (
              <Glyph d={STATUS_GLYPH[key]} size={15} />
            ) : (
              <span
                aria-hidden
                className="size-3.5 flex-none rounded-full"
                style={{ background: statusSwatch(key, colors), boxShadow: key === "pending" ? "inset 0 0 0 1.5px #c4c6cd" : "none" }}
              />
            )}
            <span>{STATUS_LABEL[key]}</span>
          </button>
        );
      })}
    </div>
  );
}

function LogoSlot({
  draft,
  logoUrl,
  busy,
  colors,
  reduced,
  onFile,
  onRemove,
}: {
  draft: Draft;
  logoUrl: string | null;
  busy: boolean;
  colors: Colors;
  reduced: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const [over, setOver] = useState(false);
  const inputId = useId();
  const mono = monogram(draft.name, draft.short_name);
  const hint = busy
    ? "Preparing image…"
    : logoUrl
      ? "Shown on the tile and card"
      : mono
        ? `Until then, the tile shows “${mono}”`
        : "Square images look best";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = imageFromDataTransfer(e.dataTransfer);
        if (file) onFile(file);
      }}
      className="mt-2.5 flex items-center gap-3.5 rounded-2xl py-2.5 pr-3 pl-2.5 transition-colors"
      style={{ border: over ? "1.5px dashed #17181c" : "1.5px dashed #d6d8de", background: over ? "#f3f4f6" : "#fafafb" }}
    >
      <div className="flex size-[60px] flex-none items-center justify-center rounded-2xl border border-[#ebebef] bg-white">
        <motion.div
          layoutId={reduced ? undefined : `logo-${draft.id}`}
          transition={cardSpring}
          className="flex size-11 items-center justify-center"
          style={{ opacity: busy ? 0.4 : 1 }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="School logo" className="size-full object-contain" />
          ) : mono ? (
            <span className="font-serif text-[25.5px] leading-none font-medium tracking-[0.01em]" style={{ color: plateInk(colors) }}>
              {mono}
            </span>
          ) : (
            <Plus size={20} strokeWidth={2} color="#a3a6ae" aria-hidden />
          )}
        </motion.div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="text-[14px] font-medium">
          Paste, drop, or{" "}
          <label htmlFor={inputId} className="cursor-pointer underline underline-offset-[3px] focus-within:outline-2">
            choose an image
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onFile(f);
            }}
          />
        </div>
        <div className="text-[12.5px] text-muted" aria-live="polite">
          {hint}
        </div>
      </div>
      {logoUrl && !busy && (
        <button type="button" onClick={onRemove} className="h-8 rounded-[9px] px-2.5 text-[13px] font-medium text-subtle hover:bg-[#f1f1f3]">
          Remove
        </button>
      )}
    </div>
  );
}

export function SchoolForm({
  mode,
  draft,
  errors,
  colors,
  L,
  reduced,
  logoUrl,
  logoBusy,
  savedFlash,
  confirmDiscard,
  confirmDelete,
  nameRef,
  update,
  onLogoFile,
  onRemoveLogo,
  onSave,
  onCancel,
  onDelete,
}: {
  mode: "edit" | "add";
  draft: Draft;
  errors: FormErrors;
  colors: Colors;
  L: Layout;
  reduced: boolean;
  logoUrl: string | null;
  logoBusy: boolean;
  savedFlash: string | null;
  confirmDiscard: boolean;
  confirmDelete: boolean;
  nameRef: RefObject<HTMLInputElement | null>;
  update: (patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => void;
  onLogoFile: (file: File) => void;
  onRemoveLogo: () => void;
  onSave: (another: boolean) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ [k]: e.target.value } as Partial<Draft>);
  const notesId = useId();

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const t = e.target as HTMLElement;
    const plainInput = t.tagName === "INPUT" && (t as HTMLInputElement).type !== "file";
    if (e.metaKey || e.ctrlKey || plainInput) {
      e.preventDefault();
      onSave(false);
    }
  };

  return (
    <>
      <div onKeyDown={onKeyDown} className="min-h-0 flex-1 overflow-y-auto" style={{ padding: L.cardPad }}>
        <div className="flex min-h-9 flex-wrap items-center gap-3 pr-11">
          <h2 id="ct-card-title" className="m-0 font-serif text-[25px] leading-[1.1] font-medium tracking-[-0.01em]">
            {mode === "add" ? "Add a school" : "Edit school"}
          </h2>
          {savedFlash && (
            <span role="status" className="inline-flex items-center gap-[5px] text-[12.5px] font-semibold text-[#2e7d55]">
              <Glyph d={CHECK_PATH} size={13} />
              {savedFlash}
            </span>
          )}
        </div>

        <StatusPicker
          value={draft.status}
          colors={colors}
          cols={L.twoCol ? 2 : 3}
          onPick={(status) => update((d) => ({ status, submitted: status !== "pending" ? true : d.submitted }))}
        />

        <LogoSlot draft={draft} logoUrl={logoUrl} busy={logoBusy} colors={colors} reduced={reduced} onFile={onLogoFile} onRemove={onRemoveLogo} />

        <div className="mt-[26px] text-[13px] font-semibold">Basics</div>
        <div className="mt-2.5 flex flex-col gap-2">
          <Field
            label="Name"
            hint="required"
            inputRef={nameRef}
            value={draft.name}
            onChange={set("name")}
            placeholder="e.g. Notre Dame"
            error={errors.name ? "Add a name to save this school." : undefined}
            required
            enterKeyHint="done"
          />
          <div className="grid gap-2" style={{ gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)" }}>
            <Field label="Location" value={draft.location} onChange={set("location")} placeholder="City, State" />
            <Field label="Short name" value={draft.short_name} onChange={set("short_name")} placeholder="e.g. UCLA" maxLength={40} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-[22px] gap-y-3">
          <div className="flex flex-col gap-[7px]" role="group" aria-label="Round">
            <div className="text-[12px] text-muted">Round</div>
            <div className="flex flex-wrap gap-1.5">
              {ROUNDS.map((r) => (
                <Chip key={r} selected={draft.round === r} onClick={() => update((d) => ({ round: d.round === r ? null : r }))}>
                  {r}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-[7px]" role="group" aria-label="Classification">
            <div className="text-[12px] text-muted">Classification</div>
            <div className="flex flex-wrap gap-1.5">
              {CLASSIFICATIONS.map((c) => (
                <Chip
                  key={c}
                  selected={draft.classification === c}
                  onClick={() => update((d) => ({ classification: d.classification === c ? null : c }))}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-[26px] text-[13px] font-semibold">Dates</div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Field label="Deadline" type="date" value={draft.deadline} onChange={set("deadline")} />
          <Field label={draft.showEnd ? "Decision starts" : "Decision date"} type="date" value={draft.decision_start} onChange={set("decision_start")} />
          {draft.showEnd && (
            <Field
              className="col-start-2"
              label="Decision ends"
              type="date"
              value={draft.decision_end}
              min={draft.decision_start || undefined}
              onChange={set("decision_end")}
              error={errors.decision_end}
            />
          )}
        </div>
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => update((d) => ({ showEnd: !d.showEnd }))}
            className="h-[30px] px-1 text-[13px] font-medium text-subtle hover:text-ink"
          >
            {draft.showEnd ? "Remove end date" : "+ Add an end date"}
          </button>
        </div>

        <div className="mt-5 text-[13px] font-semibold">Numbers</div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Field label="Acceptance" suffix="%" inputMode="decimal" placeholder="—" value={draft.acceptance_rate} onChange={set("acceptance_rate")} error={errors.acceptance_rate} />
          <Field label="SAT 25th" inputMode="numeric" placeholder="—" value={draft.sat_25} onChange={set("sat_25")} error={errors.sat_25} />
          <Field label="SAT 75th" inputMode="numeric" placeholder="—" value={draft.sat_75} onChange={set("sat_75")} error={errors.sat_75} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div
              className="flex h-[54px] flex-col justify-between rounded-xl border px-3 py-[7px]"
              style={{ borderColor: errors.supplements_done || errors.supplements_total ? "#b9443a" : "#e3e4e9" }}
            >
              <span className="text-[12px] text-muted">Supplements</span>
              <div className="flex items-center gap-1.5 text-[15px] font-medium">
                {(["supplements_done", "supplements_total"] as const).map((k, i) => (
                  <span key={k} className="contents">
                    {i === 1 && <span className="text-[13.5px] text-muted">of</span>}
                    <input
                      value={draft[k]}
                      onChange={set(k)}
                      inputMode="numeric"
                      placeholder="0"
                      autoComplete="off"
                      aria-label={i === 0 ? "Supplements done" : "Supplements total"}
                      aria-invalid={!!errors[k]}
                      className="w-[30px] border-0 border-b border-[#d6d8de] bg-transparent pb-px text-center font-medium text-ink outline-none focus:border-ink"
                    />
                  </span>
                ))}
                <span className="text-[13.5px] text-muted">done</span>
              </div>
            </div>
            {(errors.supplements_done || errors.supplements_total) && (
              <div role="alert" className="mt-1 ml-0.5 text-[12.5px] text-danger">
                {errors.supplements_done ?? errors.supplements_total}
              </div>
            )}
          </div>
          <Switch on={draft.submitted} label="Submitted" text={draft.submitted ? "Yes" : "Not yet"} onToggle={() => update((d) => ({ submitted: !d.submitted }))} />
        </div>

        <div className="mt-[26px] text-[13px] font-semibold">Notes</div>
        <div className="mt-2.5 flex flex-col gap-2">
          <Field label="Portal link" type="url" inputMode="url" placeholder="https://" value={draft.portal_url} onChange={set("portal_url")} error={errors.portal_url} />
          <label className="relative block" htmlFor={notesId}>
            <span className={labelBase}>Notes</span>
            <textarea
              id={notesId}
              value={draft.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Essays, recommenders, anything to remember"
              className="ct-field block min-h-[88px] w-full resize-y rounded-xl border border-line bg-white px-3 pt-[26px] pb-2.5 text-[14.5px] leading-normal text-ink"
            />
          </label>
          {draft.custom_fields.map((f, i) => (
            <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) 36px" }}>
              <input
                value={f.label}
                onChange={(e) => update((d) => ({ custom_fields: d.custom_fields.map((c, j) => (j === i ? { ...c, label: e.target.value } : c)) }))}
                placeholder="Label"
                aria-label={`Field ${i + 1} label`}
                autoComplete="off"
                className="ct-field h-11 w-full rounded-xl border border-line bg-white px-3 text-[13.5px] text-subtle"
              />
              <input
                value={f.value}
                onChange={(e) => update((d) => ({ custom_fields: d.custom_fields.map((c, j) => (j === i ? { ...c, value: e.target.value } : c)) }))}
                placeholder="Value"
                aria-label={`Field ${i + 1} value`}
                autoComplete="off"
                className="ct-field h-11 w-full rounded-xl border border-line bg-white px-3 text-[14.5px] font-medium text-ink"
              />
              <button
                type="button"
                onClick={() => update((d) => ({ custom_fields: d.custom_fields.filter((_, j) => j !== i) }))}
                aria-label={`Remove field ${f.label || i + 1}`}
                className="flex size-9 items-center justify-center rounded-[10px] text-muted hover:bg-[#f1f1f3] hover:text-ink"
              >
                <X size={14} strokeWidth={2.4} aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update((d) => ({ custom_fields: [...d.custom_fields, { label: "", value: "" }] }))}
            className="flex h-9 items-center gap-1.5 self-start rounded-[10px] border border-dashed border-[#cfd1d7] px-3 text-[13.5px] font-semibold text-ink hover:bg-[#f5f5f7]"
          >
            <Plus size={13} strokeWidth={2.6} aria-hidden />
            Add field
          </button>
        </div>
        <div className="h-[22px]" />
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2 border-t border-[#efeff2] bg-white" style={{ padding: L.footPad }}>
        {mode === "edit" && (
          <button
            type="button"
            onClick={onDelete}
            className="h-[42px] flex-none px-1.5 text-[13.5px] font-medium whitespace-nowrap hover:text-danger"
            style={{ color: confirmDelete ? "#b9443a" : "#6b6e76" }}
          >
            {confirmDelete ? "Click again to delete" : "Delete school"}
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="h-[42px] flex-none rounded-xl px-3.5 text-[14px] font-semibold whitespace-nowrap"
          style={{ color: confirmDiscard ? "#ffffff" : "#53565e", background: confirmDiscard ? "#b9443a" : "transparent" }}
        >
          {confirmDiscard ? "Discard changes?" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={() => onSave(true)}
          className="h-[42px] flex-none rounded-xl border border-[#dcdde3] bg-white px-3.5 text-[14px] font-semibold whitespace-nowrap text-ink hover:bg-[#f5f5f7]"
        >
          Save and add another
        </button>
        <button
          type="button"
          onClick={() => onSave(false)}
          className="h-[42px] flex-none rounded-xl bg-ink px-5 text-[14px] font-semibold whitespace-nowrap text-white hover:bg-[#2b2d34]"
          title="Save (Ctrl/⌘ + Enter)"
        >
          Save
        </button>
      </div>
    </>
  );
}
