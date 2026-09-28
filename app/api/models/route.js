// Two jobs, both server-side to avoid browser CORS:
//
//   1. Load a remote models.json
//        GET /api/models?url=https://host/models.json
//
//   2. List the live models a provider actually serves right now
//        POST /api/models   { providerKey, baseUrl, apiKey, headers }
//
// (2) matters because providers retire and add models constantly — Groq in
// particular. The bundled registry is a curated seed; this keeps it honest.

import {
  normalizeModelsEndpoint,
  buildHeaders,
  extractErrorDetail,
  normalizeModelList,
  filterChatModels,
} from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Load a remote models.json. */
export async function GET(req) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return Response.json({ error: "Missing ?url=" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return Response.json(
      { error: "Only http(s) URLs are allowed." },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch models.json (HTTP ${res.status})` },
        { status: 502 }
      );
    }
    const json = await res.json();
    return Response.json(json);
  } catch (err) {
    return Response.json(
      {
        error: `Failed to fetch models.json: ${err?.message || "network error"}`,
      },
      { status: 502 }
    );
  }
}

/** List live models from a provider's /models endpoint. */
export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { baseUrl, apiKey, headers: extraHeaders, providerLabel } = payload || {};

  if (!baseUrl) {
    return Response.json(
      {
        error: "No base URL configured for this provider.",
        hint: "Set the base URL in the provider card, then try again.",
      },
      { status: 400 }
    );
  }
  if (!apiKey) {
    return Response.json(
      {
        error: "No API key for this provider.",
        hint: "Some providers allow anonymous /models, but most require a key.",
      },
      { status: 400 }
    );
  }

  const url = normalizeModelsEndpoint(baseUrl);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...buildHeaders(apiKey, extraHeaders),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      const label = providerLabel ? `${providerLabel}: ` : "";
      return Response.json(
        {
          ok: false,
          status: res.status,
          endpoint: url,
          error: `${label}could not list models (HTTP ${res.status} ${
            res.statusText || ""
          })`.trim(),
          detail: extractErrorDetail(text),
        },
        { status: 200 }
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return Response.json(
        { ok: false, endpoint: url, error: "Provider returned a non-JSON body." },
        { status: 200 }
      );
    }

    const all = normalizeModelList(json);
    const chat = filterChatModels(all);

    return Response.json({
      ok: true,
      status: 200,
      endpoint: url,
      latencyMs: Date.now() - started,
      total: all.length,
      filtered: all.length - chat.length,
      models: chat,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        endpoint: url,
        latencyMs: Date.now() - started,
        error: `Could not reach ${url}: ${err?.message || "network error"}`,
      },
      { status: 200 }
    );
  }
}
