import { settingsFromRow, type Backend } from "./backend";
import type { School, Settings } from "./types";

/**
 * Dev-preview backend: keeps everything in memory (nothing leaves the browser).
 * Set `window.__ctFail = true` in the console to make every save fail (tests rollback).
 */
export function createMemoryBackend(initial: { schools: School[]; settings: Settings }): Backend {
  let schools = initial.schools.map((s) => ({ ...s }));
  let settings = initial.settings;
  const images = new Map<string, string>();

  const delay = async () => {
    await new Promise((r) => setTimeout(r, 250));
    if ((globalThis as { __ctFail?: boolean }).__ctFail) throw new Error("Simulated network error");
  };

  return {
    userId: "preview-user",
    email: "preview@localhost",
    async insertSchool(school) {
      await delay();
      schools.push({ ...school });
    },
    async updateSchool(id, patch) {
      await delay();
      schools = schools.map((s) => (s.id === id ? { ...s, ...patch } : s));
    },
    async deleteSchool(id) {
      await delay();
      schools = schools.filter((s) => s.id !== id);
    },
    async saveSettings(next) {
      await delay();
      settings = next;
    },
    async uploadImage(path, file) {
      await delay();
      images.set(path, URL.createObjectURL(file));
    },
    async deleteImages(paths) {
      await delay();
      paths.forEach((p) => {
        const url = images.get(p);
        if (url) URL.revokeObjectURL(url);
        images.delete(p);
      });
    },
    imageUrl(path) {
      return images.get(path) ?? "";
    },
    async exportAll() {
      await delay();
      return { schools: [...schools].sort((a, b) => a.position - b.position), settings: settingsFromRow(settings) };
    },
    async signOut() {
      await delay();
    },
  };
}
