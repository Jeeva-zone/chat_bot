// Server-side proxy for the OpenAI-compatible /chat/completions endpoint.
// Keeping the call on the server means the API key never has to be exposed to
// browser CORS restrictions, and streaming passes straight through.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_ENDPOINT = "https://tokenharbor.ai/v1/chat/completions";

function normalizeEndpoint(raw) {
  const url = String(raw || DEFAULT_ENDPOINT).trim();
  if (/^https?:\/\//i.test(url)) return url;
  // Accept bare hosts or base URLs and finish the path for the user.
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (/\/chat\/completions\/?$/.test(withScheme)) return withScheme;
  return withScheme.replace(/\/+$/, "") + "/chat/completions";
}

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
  } = payload || {};

  if (!apiKey) {
    return Response.json(
      { error: "Missing API key. Add it in Settings." },
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
      role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
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
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
        error: `Upstream error ${upstream.status} ${upstream.statusText || ""}`.trim(),
        status: upstream.status,
        endpoint: url,
        detail: detail.slice(0, 2000),
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
