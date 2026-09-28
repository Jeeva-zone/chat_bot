// Server-side helpers shared by the API routes.
// Keeping these here means the endpoint-normalisation rules stay identical
// across the chat proxy and the connection tester.

export const DEFAULT_ENDPOINT = "https://tokenharbor.ai/v1/chat/completions";

/** Join a base URL and a path without doubling or dropping slashes. */
export function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");
  if (!b) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return `${b}${p.startsWith("/") ? p : "/" + p}`;
}

/** Finish a partial chat URL: add https:// and the chat path if missing. */
export function normalizeEndpoint(raw) {
  const url = String(raw || DEFAULT_ENDPOINT).trim();
  if (!url) return DEFAULT_ENDPOINT;
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (/\/chat\/completions\/?$/i.test(withScheme)) return withScheme;
  return `${withScheme.replace(/\/+$/, "")}/chat/completions`;
}

/** Same idea for the model-listing URL. */
export function normalizeModelsEndpoint(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (/\/models\/?$/i.test(withScheme)) return withScheme;
  return `${withScheme.replace(/\/+$/, "")}/models`;
}

/**
 * Build request headers for a provider. `extra` carries provider-specific
 * headers such as OpenRouter's HTTP-Referer / X-Title attribution.
 */
export function buildHeaders(apiKey, extra) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (extra && typeof extra === "object") {
    for (const [k, v] of Object.entries(extra)) {
      if (typeof k === "string" && k && v != null) headers[k] = String(v);
    }
  }
  return headers;
}

/** Extract a readable message from an upstream error body. */
export function extractErrorDetail(text) {
  const raw = String(text || "").slice(0, 800);
  try {
    const j = JSON.parse(text);
    return (
      j?.error?.message ||
      j?.error?.error?.message ||
      (typeof j?.error === "string" ? j.error : "") ||
      j?.message ||
      j?.detail ||
      raw
    );
  } catch {
    return raw;
  }
}

/**
 * Normalise the many shapes a /models endpoint can return:
 *   OpenAI/Groq/OpenRouter  { data: [{ id, name, context_length, ... }] }
 *   Gemini native           { models: [{ name: "models/gemini-3.8-flash" }] }
 */
export function normalizeModelList(json) {
  const rows = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.models)
    ? json.models
    : Array.isArray(json)
    ? json
    : [];

  return rows
    .map((m) => {
      if (typeof m === "string") return { id: m };
      const rawId = m?.id || m?.model || m?.name || "";
      // Gemini's native shape prefixes ids with "models/".
      const id = String(rawId).replace(/^models\//, "");
      return {
        id,
        label: m?.name && !String(m.name).startsWith("models/") ? m.name : "",
        context: m?.context_length ?? m?.context_window ?? m?.inputTokenLimit ?? null,
        modalities:
          Array.isArray(m?.architecture?.input_modalities)
            ? m.architecture.input_modalities
            : undefined,
      };
    })
    .filter((m) => m.id && !m.id.includes("/models/"));
}

/** Drop models that cannot serve chat completions. */
const NON_CHAT = /(whisper|tts|speech|audio|embedding|embed-|moderation|guard|rerank|image-gen|dall-e|stable-diffusion|sora|veo|realtime|transcribe)/i;

export function filterChatModels(models) {
  return models.filter((m) => !NON_CHAT.test(m.id));
}
