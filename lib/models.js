// Normalises the (arbitrarily shaped) models.json into a flat, UI-ready list.
// The file is fetched at runtime from /models.json so it stays swappable
// without a rebuild — that is the "dynamic parsing" requirement.

export const DEFAULT_CONFIG = {
  provider: {
    name: "tokenharbor",
    base_url: "https://tokenharbor.ai/v1",
    chat_endpoint: "/chat/completions",
    api_style: "openai-compatible",
  },
  models: {},
  routing: {},
  defaults: {},
};

const TITLE_CASE = {
  qwen: "Qwen",
  deepseek: "DeepSeek",
  mimo: "MiMo",
};

function prettyName(key, id) {
  if (TITLE_CASE[key]) return TITLE_CASE[key];
  // "gpt-4o-mini" -> "Gpt 4o Mini"
  return String(id || key)
    .split(/[-_/:]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** Turn models.json into { provider, chatUrl, models[], routing, defaults }. */
export function normalizeModelConfig(raw) {
  const cfg = { ...DEFAULT_CONFIG, ...(raw || {}) };
  const provider = { ...DEFAULT_CONFIG.provider, ...(cfg.provider || {}) };

  const rawModels = cfg.models || {};
  const models = Object.entries(rawModels).map(([key, m]) => {
    const model = typeof m === "string" ? { id: m } : { ...m };
    const id = model.id || model.model || key;
    const enabled = model.enabled !== false;
    return {
      key,
      id,
      label: model.label || model.name || prettyName(key, id),
      enabled,
      modalities: Array.isArray(model.modalities) ? model.modalities : ["text"],
      inputTypes: Array.isArray(model.input_types)
        ? model.input_types
        : Array.isArray(model.modalities)
        ? model.modalities
        : ["text"],
      useFor: Array.isArray(model.use_for) ? model.use_for : [],
      context: model.context ?? model.context_length ?? null,
      free: /:free$/i.test(String(id)),
    };
  });

  // Keep a stable, deterministic order: routing.text first, then the rest.
  const order = Array.isArray(cfg.routing?.text) ? cfg.routing.text : [];
  models.sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.label.localeCompare(b.label);
  });

  const baseUrl = String(provider.base_url || "").replace(/\/+$/, "");
  const endpoint = String(provider.chat_endpoint || "/chat/completions");
  const chatUrl = endpoint.startsWith("http")
    ? endpoint
    : `${baseUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  const defaultKey = cfg.defaults?.text || models[0]?.key || null;
  const defaultModel =
    models.find((m) => m.key === defaultKey)?.id ||
    models.find((m) => m.enabled)?.id ||
    "";

  return {
    provider,
    chatUrl,
    models,
    enabledModels: models.filter((m) => m.enabled),
    routing: cfg.routing || {},
    defaults: cfg.defaults || {},
    defaultModelId: defaultModel,
  };
}

/** Resolve a model id from either its registry key ("qwen") or its id. */
export function resolveModelId(config, keyOrId) {
  if (!config || !keyOrId) return "";
  const hit = config.models.find(
    (m) => m.key === keyOrId || m.id === keyOrId
  );
  return hit ? hit.id : keyOrId;
}

export async function fetchModelConfig(customUrl) {
  const url = customUrl || "/models.json";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
  const json = await res.json();
  return normalizeModelConfig(json);
}
