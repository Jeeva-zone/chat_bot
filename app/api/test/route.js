// Minimal ("ping") request used by the Test Connection button.
// Sends a 1-message request with max_tokens=5 and reports status + latency.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ENDPOINT = "https://tokenharbor.ai/v1/chat/completions";

function normalizeEndpoint(raw) {
  const url = String(raw || DEFAULT_ENDPOINT).trim();
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  if (/\/chat\/completions\/?$/.test(withScheme)) return withScheme;
  return withScheme.replace(/\/+$/, "") + "/chat/completions";
}

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { apiKey, endpoint, model } = payload || {};
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "No API key provided.", hint: "Paste your Token Harbor key first." },
      { status: 400 }
    );
  }

  const url = normalizeEndpoint(endpoint);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || undefined,
        messages: [{ role: "user", content: "Say OK" }],
        max_tokens: 5,
        stream: false,
      }),
      cache: "no-store",
    });

    const latencyMs = Date.now() - started;
    const text = await res.text();

    if (!res.ok) {
      let detail = text.slice(0, 600);
      try {
        const j = JSON.parse(text);
        detail = j?.error?.message || j?.message || detail;
      } catch {
        /* keep raw */
      }
      return Response.json(
        {
          ok: false,
          status: res.status,
          statusText: res.statusText,
          latencyMs,
          endpoint: url,
          error:
            res.status === 401 || res.status === 403
              ? "Connection failed: invalid or unauthorized API key."
              : `Connection failed: HTTP ${res.status} ${res.statusText || ""}`.trim(),
          detail,
        },
        { status: 200 }
      );
    }

    let snippet = "";
    try {
      const j = JSON.parse(text);
      snippet = j?.choices?.[0]?.message?.content || "";
    } catch {
      snippet = text.slice(0, 120);
    }

    return Response.json({
      ok: true,
      status: 200,
      statusText: "OK",
      latencyMs,
      endpoint: url,
      model: model || null,
      snippet: String(snippet).slice(0, 120),
      message: "Connected successfully! Status: 200 OK",
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        endpoint: url,
        latencyMs: Date.now() - started,
        error: `Connection failed: ${err?.message || "network unreachable"}`,
        hint:
          "Check the endpoint host, your firewall, or whether the provider is reachable from this machine.",
      },
      { status: 200 }
    );
  }
}
