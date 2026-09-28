// Minimal ("ping") request used by the per-provider Test button.
// Sends a 1-message request with max_tokens=5 and reports status + latency.
// Works for any provider: the client supplies endpoint, key and headers.

import { normalizeEndpoint, buildHeaders, extractErrorDetail } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { apiKey, endpoint, model, headers: extraHeaders, providerLabel } = payload || {};

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        error: "No API key provided for this provider.",
        hint: "Paste the key into the provider card first.",
      },
      { status: 400 }
    );
  }
  if (!endpoint) {
    return Response.json(
      {
        ok: false,
        error: "No endpoint configured for this provider.",
        hint: "Set the base URL in the provider card.",
      },
      { status: 400 }
    );
  }

  const url = normalizeEndpoint(endpoint);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(apiKey, extraHeaders),
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
      const detail = extractErrorDetail(text);
      const label = providerLabel ? `${providerLabel}: ` : "";
      return Response.json(
        {
          ok: false,
          status: res.status,
          statusText: res.statusText,
          latencyMs,
          endpoint: url,
          error:
            res.status === 401 || res.status === 403
              ? `${label}connection failed — invalid or unauthorized API key.`
              : `${label}connection failed — HTTP ${res.status} ${
                  res.statusText || ""
                }`.trim(),
          detail,
        },
        { status: 200 }
      );
    }

    let snippet = "";
    try {
      const j = JSON.parse(text);
      const msg = j?.choices?.[0]?.message || {};
      snippet = msg.content || msg.reasoning_content || "";
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
          "Check the base URL, your firewall, or whether the provider is reachable from this machine.",
      },
      { status: 200 }
    );
  }
}
