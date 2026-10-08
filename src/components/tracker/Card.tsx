"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { logoPath } from "@/lib/backend";
import { tileLook } from "@/lib/colors";
import { blankDraft, fromDraft, isDirty, toDraft, validateDraft, type Draft, type DraftLogo } from "@/lib/draft";
import { compressLogo, imageFromDataTransfer, isImageFile } from "@/lib/images";
import type { Layout } from "@/lib/layout";
import { positionAtEnd } from "@/lib/position";
import type { School } from "@/lib/types";
import { errorToast } from "../toasts";
import { cardSpring } from "./motion";
import { SchoolForm, type FormErrors } from "./SchoolForm";
import { SchoolView } from "./SchoolView";
import { useStore, type PendingLogo } from "./store";

export type OpenState = {
  id: string | null;
  mode: "view" | "edit" | "add";
  /** "view" = the form was opened from the card's Edit button (Cancel/Save go back to it). */
  from: "tile" | "view" | "add";
  /** Shared-layout id the card morphs from/to (a tile, the add tile, or nothing). */
  layoutKey: string;
};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),textarea,select,[tabindex]:not([tabindex="-1"])';

export function Card({
  open,
  setOpen,
  L,
  reduced,
}: {
  open: OpenState | null;
  setOpen: (next: OpenState | null | ((o: OpenState | null) => OpenState | null)) => void;
  L: Layout;
  reduced: boolean;
}) {
  const store = useStore();
  const school = open?.id ? (store.schools.find((s) => s.id === open.id) ?? null) : null;
  const cardRef = useRef<HTMLDivElement>(null);
  /** The active form registers a guard: returns false when it showed "Discard changes?" instead. */
  const guardRef = useRef<(() => boolean) | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const close = useCallback(
    (layoutKey?: string, id?: string | null) => {
      if (layoutKey === undefined) {
        setOpen(null);
        return;
      }
      // Point the card at its destination first, then let it go (so it morphs into that tile).
      setOpen((o) => (o ? { ...o, layoutKey, id: id === undefined ? o.id : id } : o));
      setTimeout(() => setOpen(null), 16);
    },
    [setOpen],
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
  const isOpen = !!open;
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [isOpen]);

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

  const flat = school ? tileLook(school.status, store.settings.colors).flat : "rgba(255,255,255,0.25)";
  const morph = !reduced && !open?.layoutKey.startsWith("none");
  const contentKey = open ? `${open.mode}-${open.mode === "view" ? open.id : formKey}` : "none";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="dim"
          aria-hidden
          onClick={requestClose}
          className="fixed inset-0 z-30 bg-[rgba(12,11,10,0.46)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.32, ease: "easeOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
        />
      )}
      {open && (
        <div
          key="wrap"
          className="pointer-events-none fixed inset-0 z-[31] flex items-center justify-center"
          style={{ padding: L.overlayPad }}
        >
          <motion.div
            ref={cardRef}
            layoutId={morph ? open.layoutKey : undefined}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ct-card-title"
            tabIndex={-1}
            onKeyDown={trapTab}
            className="pointer-events-auto relative flex max-h-full w-[min(520px,100%)] flex-col overflow-hidden text-ink outline-none"
            style={{
              borderRadius: L.cardRadius,
              boxShadow: "0 40px 100px -30px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.16)",
              outline: "none",
            }}
            initial={morph ? { backgroundColor: flat } : { opacity: 0, backgroundColor: "#ffffff" }}
            animate={{ opacity: 1, backgroundColor: "#ffffff" }}
            exit={
              morph && !open.layoutKey.startsWith("gone")
                ? { backgroundColor: flat, transition: { duration: 0.22, delay: 0.06 } }
                : { opacity: 0, scale: reduced ? 1 : 0.95, transition: { duration: 0.22, ease: "easeIn" } }
            }
            transition={{ layout: cardSpring, default: { duration: 0.26, ease: "easeOut" } }}
          >
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-[3] flex size-9 items-center justify-center rounded-full bg-[#f1f1f3] text-ink hover:bg-[#e6e6e9]"
            >
              <X size={16} strokeWidth={2.2} aria-hidden />
            </button>

            <motion.div
              key={contentKey}
              className="relative flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.24, delay: reduced ? 0 : 0.09, ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              {open.mode === "view" && school ? (
                <SchoolView
                  school={school}
                  colors={store.settings.colors}
                  L={L}
                  logoUrl={store.logoUrl(school)}
                  mySat={store.settings.my_sat}
                  reduced={reduced}
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
                      setOpen((o) =>
                        o ? { id: null, mode: "add", from: "add", layoutKey: o.mode === "add" ? o.layoutKey : `none-${id}` } : o,
                      );
                    } else if (open.mode === "edit" && open.from === "view") {
                      setOpen({ ...open, mode: "view" });
                    } else {
                      close(`tile-${id}`, id);
                    }
                  }}
                  onCancelled={() => {
                    if (open.mode === "edit" && open.from === "view") setOpen({ ...open, mode: "view" });
                    else close();
                  }}
                  onDeleted={(id) => close(`gone-${id}`, null)}
                />
              ) : null}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
  const [original] = useState<Draft>(() => (school && mode === "edit" ? toDraft(school) : blankDraft(crypto.randomUUID())));
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
      reduced={reduced}
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
