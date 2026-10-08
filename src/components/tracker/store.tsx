"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { backgroundPath, type Backend } from "@/lib/backend";
import { DEFAULT_SETTINGS } from "@/lib/colors";
import { compressBackground } from "@/lib/images";
import type { School, Settings, Status } from "@/lib/types";
import { errorToast, undoToast } from "../toasts";

/** A logo picked in the form: a local preview now, a storage path once uploaded. */
export type PendingLogo = { preview: string; path: Promise<string> };

type Store = {
  backend: Backend;
  schools: School[];
  settings: Settings;
  logoUrl: (school: Pick<School, "id" | "logo_path">) => string | null;
  backgroundUrl: string | null;
  createSchool: (school: School, logo?: PendingLogo | null) => void;
  updateSchool: (id: string, fields: Partial<School>, logo?: PendingLogo | null) => void;
  setStatus: (id: string, status: Status) => void;
  removeSchool: (id: string, verb?: "Removed" | "Deleted") => void;
  moveSchool: (id: string, position: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
  setBackground: (file: File) => Promise<void>;
  clearBackground: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const store = use(StoreContext);
  if (!store) throw new Error("useStore must be used inside <TrackerProvider>");
  return store;
}

function withoutKey<T>(obj: Record<string, T>, key: string) {
  const next = { ...obj };
  delete next[key];
  return next;
}

const byPosition = (a: School, b: School) => a.position - b.position;
const errMsg = (what: string) => `Couldn't save ${what} — check your connection and try again.`;

export function TrackerProvider({
  backend,
  initialSchools,
  initialSettings,
  children,
}: {
  backend: Backend;
  initialSchools: School[];
  initialSettings: Settings;
  children: ReactNode;
}) {
  const [schools, setSchools] = useState<School[]>(() => [...initialSchools].sort(byPosition));
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [bgPreview, setBgPreview] = useState<string | null>(null);

  const schoolsRef = useRef(schools);
  useEffect(() => {
    schoolsRef.current = schools;
  }, [schools]);

  // Writes for one school run in order, so an update never overtakes its insert.
  const queues = useRef(new Map<string, Promise<unknown>>());
  const dead = useRef(new Set<string>());
  const enqueue = useCallback((id: string, task: () => Promise<void>) => {
    const prev = queues.current.get(id) ?? Promise.resolve();
    const next = prev.catch(() => {}).then(() => (dead.current.has(id) ? undefined : task()));
    queues.current.set(id, next);
    return next;
  }, []);

  const find = useCallback((id: string) => schoolsRef.current.find((s) => s.id === id), []);
  const replace = useCallback(
    (school: School) => setSchools((list) => list.map((s) => (s.id === school.id ? school : s)).sort(byPosition)),
    [],
  );

  const createSchool = useCallback<Store["createSchool"]>(
    (school, logo) => {
      dead.current.delete(school.id);
      if (logo) setPreviews((p) => ({ ...p, [school.id]: logo.preview }));
      setSchools((list) => [...list, school].sort(byPosition));
      enqueue(school.id, async () => {
        const logo_path = logo ? await logo.path : school.logo_path;
        await backend.insertSchool({ ...school, logo_path });
        if (logo) replace({ ...(find(school.id) ?? school), logo_path });
      }).catch(() => {
        dead.current.add(school.id);
        setSchools((list) => list.filter((s) => s.id !== school.id));
        errorToast(errMsg(school.name));
      });
    },
    [backend, enqueue, find, replace],
  );

  const updateSchool = useCallback<Store["updateSchool"]>(
    (id, fields, logo) => {
      const prev = find(id);
      if (!prev) return;
      const removingLogo = logo === null;
      const optimistic: School = { ...prev, ...fields, ...(removingLogo ? { logo_path: null } : {}) };
      if (logo) setPreviews((p) => ({ ...p, [id]: logo.preview }));
      if (removingLogo) setPreviews((p) => withoutKey(p, id));
      replace(optimistic);

      enqueue(id, async () => {
        const patch: Partial<School> = { ...fields };
        if (logo) patch.logo_path = await logo.path;
        if (removingLogo) patch.logo_path = null;
        await backend.updateSchool(id, patch);
        if (logo) {
          const cur = find(id);
          if (cur) replace({ ...cur, logo_path: patch.logo_path ?? null });
        }
        // The old file is no longer referenced once the row points elsewhere.
        if ((logo || removingLogo) && prev.logo_path && prev.logo_path !== patch.logo_path) {
          backend.deleteImages([prev.logo_path]).catch(() => {});
        }
      }).catch(() => {
        replace(prev);
        if (logo) setPreviews((p) => withoutKey(p, id));
        errorToast(errMsg(prev.name));
      });
    },
    [backend, enqueue, find, replace],
  );

  const setStatus = useCallback<Store["setStatus"]>(
    (id, status) => {
      const prev = find(id);
      if (!prev || prev.status === status) return;
      // A decision implies the application went in (the design's rule).
      updateSchool(id, { status, submitted: status !== "pending" ? true : prev.submitted });
    },
    [updateSchool, find],
  );

  const removeSchool = useCallback<Store["removeSchool"]>(
    (id, verb = "Removed") => {
      const school = find(id);
      if (!school) return;
      setSchools((list) => list.filter((s) => s.id !== id));
      const deleting = enqueue(id, () => backend.deleteSchool(id));
      deleting.catch(() => {
        setSchools((list) => (list.some((s) => s.id === id) ? list : [...list, school].sort(byPosition)));
        errorToast(`Couldn't remove ${school.name} — it's back in your list.`);
      });

      undoToast(
        `${verb} ${school.name}`,
        () => {
          // Re-insert the identical row (same id + position); the logo file was kept.
          setSchools((list) => (list.some((s) => s.id === id) ? list : [...list, school].sort(byPosition)));
          enqueue(id, () => backend.insertSchool(school)).catch(() => {
            setSchools((list) => list.filter((s) => s.id !== id));
            errorToast(`Couldn't restore ${school.name}.`);
          });
        },
        () => {
          if (school.logo_path) {
            deleting.then(() => backend.deleteImages([school.logo_path!])).catch(() => {});
          }
        },
      );
    },
    [backend, enqueue, find],
  );

  const moveSchool = useCallback<Store["moveSchool"]>(
    (id, position) => {
      const prev = find(id);
      if (!prev || prev.position === position) return;
      replace({ ...prev, position });
      enqueue(id, () => backend.updateSchool(id, { position })).catch(() => {
        replace(prev);
        errorToast("Couldn't save the new order.");
      });
    },
    [backend, enqueue, find, replace],
  );

  // ----- settings: apply instantly, save after a short pause -----
  const saved = useRef(initialSettings);
  const latest = useRef(initialSettings);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const persistSettings = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const next = latest.current;
      const before = saved.current;
      try {
        await backend.saveSettings(next);
        saved.current = next;
        if (before.background_path && before.background_path !== next.background_path) {
          backend.deleteImages([before.background_path]).catch(() => {});
        }
      } catch {
        latest.current = saved.current;
        setSettings(saved.current);
        setBgPreview(null);
        errorToast(errMsg("your settings"));
      }
    }, 450);
  }, [backend]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const updateSettings = useCallback<Store["updateSettings"]>(
    (patch) => {
      const next = { ...latest.current, ...patch, colors: { ...latest.current.colors, ...(patch.colors ?? {}) } };
      latest.current = next;
      setSettings(next);
      persistSettings();
    },
    [persistSettings],
  );

  const resetSettings = useCallback(() => {
    setBgPreview(null);
    const next = { ...DEFAULT_SETTINGS, colors: { ...DEFAULT_SETTINGS.colors } };
    latest.current = next;
    setSettings(next);
    persistSettings();
  }, [persistSettings]);

  const setBackground = useCallback<Store["setBackground"]>(
    async (file) => {
      const preview = URL.createObjectURL(file);
      setBgPreview(preview);
      try {
        const small = await compressBackground(file);
        const path = backgroundPath(backend.userId);
        await backend.uploadImage(path, small);
        updateSettings({ background_path: path });
      } catch {
        setBgPreview(null);
        errorToast("Couldn't upload that photo — try a different image.");
      }
    },
    [backend, updateSettings],
  );

  const clearBackground = useCallback(() => {
    setBgPreview(null);
    updateSettings({ background_path: null });
  }, [updateSettings]);

  const logoUrl = useCallback<Store["logoUrl"]>(
    (school) => previews[school.id] ?? (school.logo_path ? backend.imageUrl(school.logo_path) : null),
    [previews, backend],
  );

  const backgroundUrl = bgPreview ?? (settings.background_path ? backend.imageUrl(settings.background_path) : null);

  const value = useMemo<Store>(
    () => ({
      backend,
      schools,
      settings,
      logoUrl,
      backgroundUrl,
      createSchool,
      updateSchool,
      setStatus,
      removeSchool,
      moveSchool,
      updateSettings,
      resetSettings,
      setBackground,
      clearBackground,
    }),
    [backend, schools, settings, logoUrl, backgroundUrl, createSchool, updateSchool, setStatus, removeSchool, moveSchool, updateSettings, resetSettings, setBackground, clearBackground],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}
