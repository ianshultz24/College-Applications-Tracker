"use client";

import { X } from "lucide-react";
import { animate, AnimatePresence, motion, usePresence, type AnimationPlaybackControls } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { logoPath } from "@/lib/backend";
import { blankDraft, fromDraft, isDirty, toDraft, validateDraft, type Draft, type DraftLogo } from "@/lib/draft";
import { newId } from "@/lib/id";
import { compressLogo, imageFromDataTransfer, isImageFile } from "@/lib/images";
import type { Layout } from "@/lib/layout";
import { positionAtEnd } from "@/lib/position";
import type { School } from "@/lib/types";
import { errorToast } from "../toasts";
import { AddSkin, addTileLabel } from "./Grid";
import { closeSpring, isOnScreen, openSpring, tileSlotRect } from "./motion";
import { SchoolForm, type FormErrors } from "./SchoolForm";
import { SchoolView } from "./SchoolView";
import { useStore, type PendingLogo } from "./store";
import { TileSkin } from "./Tile";
import { useScrollLock } from "./useScrollLock";

export type OpenState = {
  id: string | null;
  mode: "view" | "edit" | "add";
  /** "view" = the form was opened from the card's Edit button (Cancel/Save go back to it). */
  from: "tile" | "view" | "add";
  /** The tile the card grew from and shrinks back into ("__add" = the add tile, null = just fade). */
  returnId: string | null;
  /** Bumped on every open, so a new card never reuses one that is still closing. */
  seq: number;
};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),textarea,select,[tabindex]:not([tabindex="-1"])';
const cardShadow = (a: number) => `0 40px 100px -30px rgba(0,0,0,${0.6 * a}), 0 8px 24px rgba(0,0,0,${0.16 * a})`;

/** The tile a closing card is flying back into (a closing card keeps its old props, but still sees context). */
const LandingContext = createContext<string | null>(null);

export function Card({
  open,
  setOpen,
  landing,
  setLanding,
  L,
  reduced,
}: {
  open: OpenState | null;
  setOpen: (next: OpenState | null | ((o: OpenState | null) => OpenState | null)) => void;
  landing: string | null;
  setLanding: (id: string | null) => void;
  L: Layout;
  reduced: boolean;
}) {
  const store = useStore();
  const school = open?.id ? (store.schools.find((s) => s.id === open.id) ?? null) : null;
  const cardRef = useRef<HTMLDivElement | null>(null);
  /** The active form registers a guard: returns false when it showed "Discard changes?" instead. */
  const guardRef = useRef<(() => boolean) | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  /** Close the card, shrinking it into `target` (default: the tile it came from; null = fade out). */
  const close = useCallback(
    (target?: string | null) => {
      setLanding(target === undefined ? (open?.returnId ?? null) : target);
      setOpen(null);
    },
    [open, setOpen, setLanding],
  );

  const requestClose = useCallback(() => {
    if (!open) return;
    if (open.mode !== "view" && guardRef.current && !guardRef.current()) return;
    if (open.mode === "edit" && open.from === "view") setOpen({ ...open, mode: "view" });
    else close();
  }, [open, close, setOpen]);

  // Esc closes (or steps back from edit to view).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  // Lock page scroll behind the card.
  useScrollLock(!!open);

  // View mode: focus the dialog so Tab starts inside it.
  useEffect(() => {
    if (open?.mode === "view") cardRef.current?.focus({ preventScroll: true });
  }, [open?.mode, open?.id]);

  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !cardRef.current) return;
    const items = [...cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === cardRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const contentKey = open ? `${open.mode}-${open.mode === "view" ? open.id : formKey}` : "none";

  return (
    <LandingContext.Provider value={landing}>
      <AnimatePresence onExitComplete={() => setLanding(null)}>
        {open && (
          <motion.div
            key={`dim-${open.seq}`}
            aria-hidden
            onClick={requestClose}
            className="fixed inset-0 z-30 bg-[rgba(12,11,10,0.46)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.32, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
          />
        )}
        {open && (
          <CardShell key={`card-${open.seq}`} startId={open.returnId} cardRef={cardRef} L={L} reduced={reduced} onKeyDown={trapTab}>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-[3] flex size-9 items-center justify-center rounded-full bg-[#f1f1f3] text-ink hover:bg-[#e6e6e9]"
            >
              <X size={16} strokeWidth={2.2} aria-hidden />
            </button>

            {/* Switching view ↔ edit cross-fades; a card's first content simply arrives with the card. */}
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={contentKey}
                className="relative flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.22, delay: reduced ? 0 : 0.06, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                {open.mode === "view" && school ? (
                  <SchoolView
                    school={school}
                    colors={store.settings.colors}
                    L={L}
                    logoUrl={store.logoUrl(school)}
                    mySat={store.settings.my_sat}
                    onEdit={() => {
                      setFormKey((k) => k + 1);
                      setOpen({ ...open, mode: "edit", from: "view" });
                    }}
                  />
                ) : open.mode !== "view" ? (
                  <FormPanel
                    key={formKey}
                    open={open}
                    school={open.mode === "edit" ? school : null}
                    L={L}
                    reduced={reduced}
                    guardRef={guardRef}
                    savedFlash={savedFlash}
                    onSaved={(name, another, id) => {
                      if (another) {
                        setSavedFlash(`Saved ${name}`);
                        setTimeout(() => setSavedFlash(null), 2600);
                        setFormKey((k) => k + 1);
                        setOpen((o) => (o ? { ...o, id: null, mode: "add", from: "add", returnId: o.mode === "add" ? o.returnId : null } : o));
                      } else if (open.mode === "edit" && open.from === "view") {
                        setOpen({ ...open, mode: "view" });
                      } else {
                        close(id);
                      }
                    }}
                    onCancelled={() => {
                      if (open.mode === "edit" && open.from === "view") setOpen({ ...open, mode: "view" });
                      else close();
                    }}
                    onDeleted={() => close(null)}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </CardShell>
        )}
      </AnimatePresence>
    </LandingContext.Provider>
  );
}

/**
 * How the card moves between a tile and its full size. The card is always laid out at full size; only a
 * transform shrinks it. `grow`: offset and scale that make the card cover the tile. `fade`: no tile to fly to
 * (deleted, scrolled out of view, reduced motion), so it just fades.
 */
type Morph =
  | { kind: "grow"; dx: number; dy: number; sx: number; sy: number; w: number; h: number; r0: number; r1: number }
  | { kind: "fade"; r1: number; scale: boolean };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The positioned card. It plays its own grow-in on mount and shrink-back on exit, then tells AnimatePresence it's done. */
function CardShell({
  startId,
  cardRef,
  L,
  reduced,
  onKeyDown,
  children,
}: {
  startId: string | null;
  cardRef: RefObject<HTMLDivElement | null>;
  L: Layout;
  reduced: boolean;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  const [isPresent, safeToRemove] = usePresence();
  const landing = useContext(LandingContext);
  const target = isPresent ? startId : landing;
  const store = useStore();
  const elRef = useRef<HTMLDivElement>(null);
  const skinRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const morph = useRef<Morph>({ kind: "fade", r1: L.cardRadius, scale: !reduced });

  /** Paint one frame: t = 0 looks exactly like the tile, t = 1 is the finished card. */
  const draw = useCallback((t: number) => {
    progress.current = t;
    const el = elRef.current;
    const skin = skinRef.current;
    const body = bodyRef.current;
    if (!el || !skin || !body) return;
    const m = morph.current;
    if (m.kind === "grow") {
      const sx = m.sx + (1 - m.sx) * t;
      const sy = m.sy + (1 - m.sy) * t;
      const r = m.r0 + (m.r1 - m.r0) * t;
      const solid = clamp01(t / 0.45);
      el.style.transform = t >= 1 ? "none" : `translate(${m.dx * (1 - t)}px, ${m.dy * (1 - t)}px) scale(${sx}, ${sy})`;
      // Divide by the scale so the corners stay round instead of stretching.
      el.style.borderRadius = t >= 1 ? `${m.r1}px` : `${r / sx}px / ${r / sy}px`;
      el.style.backgroundColor = `rgba(255,255,255,${solid})`;
      el.style.boxShadow = cardShadow(t);
      el.style.opacity = "1";
      skin.style.width = `${m.w}px`;
      skin.style.height = `${m.h}px`;
      skin.style.transform = `scale(${1 / m.sx}, ${1 / m.sy})`;
      skin.style.opacity = String(1 - solid);
      body.style.opacity = String(clamp01((t - 0.4) / 0.6));
    } else {
      el.style.transform = !m.scale || t >= 1 ? "none" : `scale(${0.96 + 0.04 * t})`;
      el.style.borderRadius = `${m.r1}px`;
      el.style.backgroundColor = "#ffffff";
      el.style.boxShadow = cardShadow(1);
      el.style.opacity = String(t);
      skin.style.opacity = "0";
      body.style.opacity = "1";
    }
  }, []);

  /** Work out the morph between the card's real box and tile `id`, measured right now. */
  const measure = useCallback(
    (id: string | null): Morph => {
      const el = elRef.current;
      const fade: Morph = { kind: "fade", r1: L.cardRadius, scale: !reduced };
      const from = id && !reduced ? tileSlotRect(id) : null;
      if (!el || !from || !isOnScreen(from)) return fade;
      el.style.transform = "none";
      const to = el.getBoundingClientRect();
      if (!to.width || !to.height) return fade;
      return {
        kind: "grow",
        dx: from.left + from.width / 2 - (to.left + to.width / 2),
        dy: from.top + from.height / 2 - (to.top + to.height / 2),
        sx: from.width / to.width,
        sy: from.height / to.height,
        w: from.width,
        h: from.height,
        r0: L.radius,
        r1: L.cardRadius,
      };
    },
    [reduced, L.radius, L.cardRadius],
  );

  // Grow in from the tile. Runs before the first paint, so the card never flashes at full size.
  useLayoutEffect(() => {
    morph.current = measure(startId);
    draw(0);
    anim.current = animate(0, 1, {
      ...(morph.current.kind === "grow" ? openSpring : { duration: reduced ? 0.15 : 0.22, ease: "easeOut" }),
      onUpdate: draw,
      onComplete: () => draw(1),
    });
    return () => anim.current?.stop();
    // Mount only: where the card starts is fixed the moment it appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shrink back into the tile it's landing on (from wherever it is now), then let AnimatePresence remove it.
  useLayoutEffect(() => {
    if (isPresent) return;
    anim.current?.stop();
    const t = progress.current;
    morph.current = measure(target);
    draw(t);
    anim.current = animate(t, 0, {
      ...(morph.current.kind === "grow" ? closeSpring : { duration: reduced ? 0.15 : 0.2, ease: "easeIn" }),
      onUpdate: draw,
      onComplete: () => {
        draw(0);
        safeToRemove?.();
      },
    });
  }, [isPresent, target, measure, draw, reduced, safeToRemove]);

  const skinSchool = target && target !== "__add" ? store.schools.find((s) => s.id === target) : undefined;

  return (
    <div className="pointer-events-none fixed inset-0 z-[31] flex items-center justify-center" style={{ padding: L.overlayPad }}>
      <div
        ref={(el) => {
          elRef.current = el;
          if (el) cardRef.current = el;
          return () => {
            elRef.current = null;
            if (cardRef.current === el) cardRef.current = null;
          };
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ct-card-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex max-h-full w-[min(520px,100%)] flex-col overflow-hidden text-ink outline-none"
        style={{ pointerEvents: isPresent ? "auto" : "none", outline: "none" }}
      >
        {/* The tile's own face sits on top while the card is small and fades out as it grows. */}
        <div ref={skinRef} aria-hidden className="pointer-events-none absolute top-0 left-0 z-[5]" style={{ transformOrigin: "0 0", opacity: 0 }}>
          {skinSchool ? (
            <TileSkin
              school={skinSchool}
              colors={store.settings.colors}
              finishes={store.settings.finishes}
              L={L}
              logoUrl={store.logoUrl(skinSchool)}
              editAll={false}
            />
          ) : target === "__add" ? (
            <AddSkin L={L} label={addTileLabel(store.schools.length)} />
          ) : null}
        </div>
        <div ref={bodyRef} className="relative flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

/** The add/edit form's state and actions. Re-mounted (fresh state) for every new form. */
function FormPanel({
  open,
  school,
  L,
  reduced,
  guardRef,
  savedFlash,
  onSaved,
  onCancelled,
  onDeleted,
}: {
  open: OpenState;
  school: School | null;
  L: Layout;
  reduced: boolean;
  guardRef: RefObject<(() => boolean) | null>;
  savedFlash: string | null;
  onSaved: (name: string, another: boolean, id: string) => void;
  onCancelled: () => void;
  onDeleted: (id: string) => void;
}) {
  const store = useStore();
  const mode = open.mode === "add" || !school ? "add" : "edit";
  const [original] = useState<Draft>(() => (school && mode === "edit" ? toDraft(school) : blankDraft(newId())));
  const [draft, setDraft] = useState<Draft>(original);
  const [errors, setErrors] = useState<FormErrors>({});
  const [logoBusy, setLogoBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const compressing = useRef<Promise<void> | null>(null);
  /** Uploads made in this form that the saved row doesn't reference (deleted on cancel/replace). */
  const strayUploads = useRef(new Set<Promise<string>>());
  const committed = useRef(false);
  const discardTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const update = useCallback((patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => {
    setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
    setConfirmDiscard(false);
    setErrors((e) => (Object.keys(e).length ? {} : e));
  }, []);

  const cleanupStray = useCallback(() => {
    for (const p of strayUploads.current) p.then((path) => store.backend.deleteImages([path])).catch(() => {});
    strayUploads.current.clear();
  }, [store.backend]);

  // Focus the name on open (on touch screens only when adding, to avoid popping the keyboard over a card you're reading).
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (mode === "edit" && !fine) return;
    const t = setTimeout(() => nameRef.current?.focus({ preventScroll: true }), reduced ? 0 : 260);
    return () => clearTimeout(t);
  }, [mode, reduced]);

  // Clean up uploads that never got saved when this form goes away.
  useEffect(() => () => {
    if (!committed.current) cleanupStray();
    clearTimeout(discardTimer.current);
    clearTimeout(deleteTimer.current);
  }, [cleanupStray]);

  const onLogoFile = useCallback(
    (file: File) => {
      if (!isImageFile(file)) {
        errorToast("That file isn’t an image.");
        return;
      }
      setLogoBusy(true);
      const job = (async () => {
        try {
          const small = await compressLogo(file);
          const preview = URL.createObjectURL(small);
          const path = logoPath(store.backend.userId, draftRef.current.id);
          const upload = store.backend.uploadImage(path, small).then(() => path);
          strayUploads.current.add(upload);
          upload.catch(() => {
            strayUploads.current.delete(upload);
            errorToast("Couldn’t upload that logo — try again.");
            setDraft((d) => (d.logo.kind === "new" && d.logo.path === upload ? { ...d, logo: original.logo } : d));
          });
          update({ logo: { kind: "new", preview, path: upload } });
        } catch {
          errorToast("Couldn’t read that image — try a PNG, JPG or WebP.");
        } finally {
          setLogoBusy(false);
          compressing.current = null;
        }
      })();
      compressing.current = job;
    },
    [store.backend, update, original.logo],
  );

  // Ctrl/Cmd+V anywhere while the form is open: an image in the clipboard becomes the logo.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFromDataTransfer(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      onLogoFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onLogoFile]);

  const save = useCallback(
    async (another: boolean) => {
      if (compressing.current) await compressing.current;
      const d = draftRef.current;
      const errs = validateDraft(d);
      if (Object.keys(errs).length) {
        setErrors(errs);
        if (errs.name) nameRef.current?.focus();
        else setTimeout(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus(), 0);
        return;
      }
      const fields = fromDraft(d);
      let logo: PendingLogo | null | undefined;
      if (d.logo.kind === "new") {
        logo = { preview: d.logo.preview, path: d.logo.path };
        strayUploads.current.delete(d.logo.path);
      } else if (d.logo.kind === "none" && original.logo.kind !== "none") logo = null;

      if (mode === "add") {
        store.createSchool(
          {
            id: d.id,
            user_id: store.backend.userId,
            ...fields,
            logo_path: d.logo.kind === "existing" ? d.logo.path : null,
            position: positionAtEnd(store.schools.map((s) => s.position)),
          },
          logo ?? undefined,
        );
      } else if (isDirty(original, d)) {
        store.updateSchool(d.id, fields, logo);
      }
      committed.current = true;
      cleanupStray();
      onSaved(fields.name, another, d.id);
    },
    [mode, original, store, cleanupStray, onSaved],
  );

  const cancel = useCallback(() => {
    if (isDirty(original, draftRef.current) && !confirmDiscard) {
      setConfirmDiscard(true);
      clearTimeout(discardTimer.current);
      discardTimer.current = setTimeout(() => setConfirmDiscard(false), 3200);
      return false;
    }
    cleanupStray();
    committed.current = true;
    return true;
  }, [original, confirmDiscard, cleanupStray]);

  useEffect(() => {
    guardRef.current = cancel;
    return () => {
      if (guardRef.current === cancel) guardRef.current = null;
    };
  }, [guardRef, cancel]);

  const remove = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      clearTimeout(deleteTimer.current);
      deleteTimer.current = setTimeout(() => setConfirmDelete(false), 3200);
      return;
    }
    committed.current = true;
    cleanupStray();
    store.removeSchool(draft.id, "Deleted");
    onDeleted(draft.id);
  };

  const logoUrl = logoUrlFor(draft.logo, draft.id, store.logoUrl);

  return (
    <SchoolForm
      mode={mode}
      draft={draft}
      errors={errors}
      colors={store.settings.colors}
      L={L}
      logoUrl={logoUrl}
      logoBusy={logoBusy}
      savedFlash={savedFlash}
      confirmDiscard={confirmDiscard}
      confirmDelete={confirmDelete}
      nameRef={nameRef}
      update={update}
      onLogoFile={onLogoFile}
      onRemoveLogo={() => update({ logo: { kind: "none" } })}
      onSave={save}
      onCancel={() => {
        if (cancel()) onCancelled();
      }}
      onDelete={remove}
    />
  );
}

function logoUrlFor(logo: DraftLogo, id: string, resolve: (s: { id: string; logo_path: string | null }) => string | null) {
  if (logo.kind === "new") return logo.preview;
  if (logo.kind === "existing") return resolve({ id, logo_path: logo.path });
  return null;
}
