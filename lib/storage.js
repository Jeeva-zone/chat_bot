// Tiny SSR-safe localStorage helpers. Everything is namespaced so a future
// version can migrate without clobbering user data.

const NS = "th-studio:";

export function load(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(NS + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* quota or private mode — non fatal */
  }
}

export function remove(key) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(NS + key);
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEYS = {
  apiKey: "apiKey",
  settings: "settings",
  team: "team",
  history: "history",
  modelsJson: "modelsJson",
};
