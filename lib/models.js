// Normalises models.json into a flat, UI-ready shape.
//
// Supports two config generations:
//   1. Legacy  — a single `provider` object plus top-level `models`.
//   2. Current — a `providers` map, each entry carrying its own `models`.
// Both are normalised into the same output, so the rest of the app never has to
// care which shape the file uses.
//
// The file is fetched at runtime from /models.json so it stays swappable
// without a rebuild — that is the "dynamic parsing" requirement.

export const DEFAULT_PROVIDER = {
  label: "Provider",
  base_url: "",
  chat_endpoint: "/chat/completions",
  models_endpoint: "/models",
  api_style: "openai-compatible",
};

export const DEFAULT_CONFIG = {
  providers: {},
  routing: {},
  defaults: {},
};

/** Model picker values are composite so ids can repeat across providers. */
export const MODEL_VALUE_SEP = "::";

export function modelValue(providerKey, modelId) {
  return `${providerKey}${MODEL_VALUE_SEP}${modelId}`;
}

export function parseModelValue(value) {
  const raw = String(value || "");
  const i = raw.indexOf(MODEL_VALUE_SEP);
  if (i === -1) return { providerKey: "", modelId: raw };
  return {
    providerKey: raw.slice(0, i),
    modelId: raw.slice(i + MODEL_VALUE_SEP.length),
  };
}

const TITLE_CASE = {
  qwen: "Qwen",
  deepseek: "DeepSeek",
  mimo: "MiMo",
  groq: "Groq",
  openrouter: "OpenRouter",
  gemini: "Gemini",
  tokenharbor: "Token Harbor",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  nvidia: "NVIDIA",
  meta: "Meta",
};

function titleCase(str) {
  return String(str || "")
    .split(/[-_/:\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function prettyName(key, id) {
  if (TITLE_CASE[key]) return TITLE_CASE[key];
  return titleCase(id || key) || key;
}

/** Join a base URL and a path without doubling or dropping slashes. */
export function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");
  if (!b) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return `${b}${p.startsWith("/") ? p : "/" + p}`;
}

/** Finish a partial URL: add https:// and the chat path if missing. */
export function normalizeChatUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (/\/chat\/completions\/?$/i.test(withScheme)) return withScheme;
  return `${withScheme.replace(/\/+$/, "")}/chat/completions`;
}

function normalizeModels(rawModels, providerKey, providerLabel) {
  const entries = Object.entries(rawModels || {});
  const models = entries.map(([key, m]) => {
    const model = typeof m === "string" ? { id: m } : { ...m };
    const id = model.id || model.model || key;
    return {
      key,
      id,
      value: modelValue(providerKey, id),
      providerKey,
      providerLabel,
      label: model.label || model.name || prettyName(key, id),
      enabled: model.enabled !== false,
      isDefault: model.default === true,
      modalities: Array.isArray(model.modalities) ? model.modalities : ["text"],
      inputTypes: Array.isArray(model.input_types)
        ? model.input_types
        : Array.isArray(model.modalities)
        ? model.modalities
        : ["text"],
      useFor: Array.isArray(model.use_for) ? model.use_for : [],
      context: model.context ?? model.context_length ?? null,
      free: /:free$/i.test(String(id)) || /\(free\)/i.test(model.label || ""),
    };
  });

  // Deterministic order.
  models.sort((a, b) => a.label.localeCompare(b.label));
  return models;
}

function normalizeProvider(key, raw, routingOrder) {
  const p = { ...DEFAULT_PROVIDER, ...(raw || {}) };
  const label = p.label || prettyName(key, key);
  const models = normalizeModels(p.models, key, label);

  return {
    key,
    label,
    baseUrl: String(p.base_url || "").replace(/\/+$/, ""),
    chatEndpoint: p.chat_endpoint || "/chat/completions",
    modelsEndpoint: p.models_endpoint || "/models",
    chatUrl: joinUrl(p.base_url, p.chat_endpoint || "/chat/completions"),
    modelsUrl: joinUrl(p.base_url, p.models_endpoint || "/models"),
    apiStyle: p.api_style || "openai-compatible",
    keyUrl: p.key_url || "",
    docsUrl: p.docs_url || "",
    note: p.note || "",
    headers: p.headers && typeof p.headers === "object" ? p.headers : null,
    custom: p.custom === true,
    enabled: p.enabled !== false,
    models,
    order: routingOrder.indexOf(key),
  };
}

/** Turn any supported models.json into { providers, models, ... }. */
export function normalizeModelConfig(raw) {
  const cfg = raw || {};

  // ---- Build the provider map from whichever shape was supplied ----
  let providerEntries = [];

  if (cfg.providers && typeof cfg.providers === "object") {
    providerEntries = Object.entries(cfg.providers);
  } else if (cfg.models && typeof cfg.models === "object") {
    // Legacy: one implicit provider wrapping the top-level models.
    const legacy = cfg.provider || {};
    const name = legacy.name || "default";
    providerEntries = [
      [
        name,
        {
          label: prettyName(name, name),
          base_url: legacy.base_url,
          chat_endpoint: legacy.chat_endpoint,
          api_style: legacy.api_style,
          models: cfg.models,
        },
      ],
    ];
  }

  // Routing drives both semantics and display order. Legacy files routed by
  // model key, current files route by provider key — accept either.
  const routingText = Array.isArray(cfg.routing?.text) ? cfg.routing.text : [];
  const providerKeys = providerEntries.map(([k]) => k);
  const orderList = routingText.filter((k) => providerKeys.includes(k));
  for (const k of providerKeys) if (!orderList.includes(k)) orderList.push(k);

  let providers = providerEntries.map(([key, value]) =>
    normalizeProvider(key, value, orderList)
  );

  providers = providers.filter((p) => p.enabled);
  providers.sort((a, b) => a.order - b.order);

  // ---- Flatten models for pickers ----
  const models = providers.flatMap((p) => p.models.filter((m) => m.enabled));

  // ---- Default selection ----
  const defaultProviderKey = cfg.defaults?.provider || providers[0]?.key || "";
  const defaultProvider =
    providers.find((p) => p.key === defaultProviderKey) || providers[0];

  let defaultModel = defaultProvider?.models.find((m) => m.isDefault && m.enabled);
  if (!defaultModel) {
    // Legacy fallback: defaults.text named a model key.
    const legacyName = cfg.defaults?.text;
    if (legacyName) {
      defaultModel = models.find(
        (m) => m.key === legacyName || m.id === legacyName
      );
    }
  }
  if (!defaultModel) defaultModel = defaultProvider?.models[0] || models[0];

  return {
    providers,
    models,
    routing: cfg.routing || {},
    defaults: cfg.defaults || {},
    defaultModelId: defaultModel?.value || "",
    defaultProviderKey: defaultProvider?.key || "",
  };
}

/** Look up a provider by its key. */
export function findProvider(config, providerKey) {
  return (config?.providers || []).find((p) => p.key === providerKey) || null;
}

/** Resolve a picker value ("groq::llama-3.3-70b") into { provider, model }. */
export function resolveModel(config, value) {
  const { providerKey, modelId } = parseModelValue(value);
  if (!providerKey) {
    // Legacy bare id — find whichever provider owns it.
    const model = (config?.models || []).find((m) => m.id === modelId);
    if (model) return { provider: findProvider(config, model.providerKey), model };
    return { provider: null, model: null };
  }
  const provider = findProvider(config, providerKey);
  const model = provider?.models.find((m) => m.id === modelId) || null;
  return { provider, model };
}

/** True when a config parses into something usable. */
export function isUsableConfig(config) {
  return !!config && config.providers.length > 0 && config.models.length > 0;
}

export async function fetchModelConfig(customUrl) {
  const url = customUrl || "/models.json";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
  const json = await res.json();
  return normalizeModelConfig(json);
}

/** Merge live-fetched models into a provider without losing curated metadata. */
export function mergeLiveModels(provider, liveModels) {
  const curated = new Map(provider.models.map((m) => [m.id, m]));
  const merged = liveModels.map((live) => {
    const existing = curated.get(live.id);
    if (existing) {
      curated.delete(live.id);
      return { ...existing, live: true };
    }
    return {
      key: live.id,
      id: live.id,
      value: modelValue(provider.key, live.id),
      providerKey: provider.key,
      providerLabel: provider.label,
      label: live.label || live.id,
      enabled: true,
      isDefault: false,
      modalities: live.modalities || ["text"],
      inputTypes: live.modalities || ["text"],
      useFor: [],
      context: live.context ?? null,
      free: /:free$/i.test(live.id),
      live: true,
    };
  });

  // Keep curated models the live list did not mention, so a hand-picked entry
  // never disappears just because a provider hides it from /models.
  const leftovers = [...curated.values()].map((m) => ({ ...m, live: false }));
  return [...merged, ...leftovers].sort((a, b) => a.label.localeCompare(b.label));
}
