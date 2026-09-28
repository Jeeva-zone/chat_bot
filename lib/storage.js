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
  apiKey: "apiKey", // legacy single-key slot, migrated into providerKeys
  providerKeys: "providerKeys", // { providerKey: apiKey }
  settings: "settings",
  team: "team",
  history: "history",
  modelsJson: "modelsJson",
  customProvider: "customProvider", // user-defined provider config
  liveModels: "liveModels", // { providerKey: [ids] } cached from /models
};

/**
 * Keys are held per provider so a Groq key and an OpenRouter key can coexist.
 * Falls back to the legacy single `apiKey` slot for anyone upgrading.
 */
export function loadProviderKeys(fallbackProviderKey) {
  const stored = load(STORAGE_KEYS.providerKeys, null);
  if (stored && typeof stored === "object") return stored;

  const legacy = load(STORAGE_KEYS.apiKey, "");
  if (legacy && fallbackProviderKey) return { [fallbackProviderKey]: legacy };
  return {};
}

export function maskKey(key) {
  if (!key) return "";
  const s = String(key);
  if (s.length <= 10) return "•".repeat(s.length);
  return `${s.slice(0, 6)}${"•".repeat(Math.min(12, s.length - 10))}${s.slice(-4)}`;
}

