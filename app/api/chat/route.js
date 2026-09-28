// Server-side proxy for the OpenAI-compatible /chat/completions endpoint.
// Keeping the call on the server means the API key never has to be exposed to
// browser CORS restrictions, and streaming passes straight through.
//
// Works with any provider: the client sends the resolved endpoint, key and any
// provider-specific headers (e.g. OpenRouter's HTTP-Referer / X-Title).

import { normalizeEndpoint, buildHeaders, extractErrorDetail } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    apiKey,
    endpoint,
    model,
    messages,
    temperature = 0.7,
    max_tokens = 2048,
    top_p,
    stream = true,
    headers: extraHeaders,
  } = payload || {};

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing API key for this provider. Add it in Settings → Providers.",
      },
      { status: 401 }
    );
  }
  if (!model) {
    return Response.json({ error: "Missing model id." }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Missing messages[]." }, { status: 400 });
  }

  const url = normalizeEndpoint(endpoint);

  const body = {
    model,
    messages: messages.map((m) => ({
      role:
        m.role === "system"
          ? "system"
          : m.role === "assistant"
          ? "assistant"
          : "user",
      content: String(m.content ?? ""),
    })),
    temperature: Number(temperature),
    max_tokens: Number(max_tokens),
    stream: Boolean(stream),
  };
  if (top_p != null) body.top_p = Number(top_p);

  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        ...buildHeaders(apiKey, extraHeaders),
        Accept: stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(body),
      signal: req.signal,
      cache: "no-store",
    });
  } catch (err) {
    const aborted = err?.name === "AbortError";
    return Response.json(
      {
        error: aborted
          ? "Request aborted."
          : `Network error reaching ${url}: ${err?.message || "unknown"}`,
        endpoint: url,
      },
      { status: aborted ? 499 : 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    let detail = "";
    try {
      detail = await upstream.text();
    } catch {
      /* ignore */
    }
    return Response.json(
      {
        error: `Upstream error ${upstream.status} ${
          upstream.statusText || ""
        }`.trim(),
        status: upstream.status,
        endpoint: url,
        detail: extractErrorDetail(detail),
      },
      { status: upstream.status || 502 }
    );
  }

  if (stream) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Upstream-Endpoint": url,
      },
    });
  }

  const json = await upstream.json().catch(() => null);
  if (!json) {
    return Response.json(
      { error: "Upstream returned a non-JSON response." },
      { status: 502 }
    );
  }
  return Response.json(json);
}
