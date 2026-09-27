// Thin client for the /api/chat proxy. Reads an OpenAI-compatible SSE stream
// and hands back incremental text deltas.

export async function streamChat(params, { onDelta, onReasoning, signal } = {}) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    let msg = `Request failed (HTTP ${res.status})`;
    let detail = "";
    try {
      const j = await res.json();
      msg = j?.error || msg;
      detail = j?.detail || "";
    } catch {
      /* ignore */
    }
    const err = new Error(detail ? `${msg} — ${detail}` : msg);
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers.get("content-type") || "";

  // Non-streaming fallback (params.stream === false, or a proxy that buffered).
  if (!contentType.includes("event-stream")) {
    const j = await res.json().catch(() => null);
    const msg = j?.choices?.[0]?.message || {};
    const text = msg.content ?? "";
    const reasoning = msg.reasoning_content ?? msg.reasoning ?? "";
    if (text) onDelta?.(text);
    if (reasoning) onReasoning?.(reasoning);
    return { text, reasoning, usage: j?.usage || null, raw: j };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let reasoning = "";
  let usage = null;
  let finishReason = null;

  const handlePayload = (data) => {
    if (data === "[DONE]") return;
    let json;
    try {
      json = JSON.parse(data);
    } catch {
      return; // keepalive / comment
    }
    if (json?.error) {
      const message =
        typeof json.error === "string" ? json.error : json.error?.message;
      throw new Error(message || "Upstream returned an error");
    }
    const choice = json?.choices?.[0];
    const delta =
      choice?.delta?.content ?? choice?.message?.content ?? json?.response ?? "";
    if (delta) {
      text += delta;
      onDelta?.(delta);
    }
    // Reasoning models (Qwen/DeepSeek style) stream their chain-of-thought in
    // a separate field before any answer text arrives.
    const thought =
      choice?.delta?.reasoning_content ??
      choice?.delta?.reasoning ??
      choice?.message?.reasoning_content ??
      "";
    if (thought) {
      reasoning += thought;
      onReasoning?.(thought);
    }
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    if (json?.usage) usage = json.usage;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Providers split events on blank lines; keep the last partial chunk.
    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      for (const line of chunk.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        if (!trimmed.startsWith("data:")) continue;
        handlePayload(trimmed.slice(5).trim());
      }
    }
  }

  // Flush anything left without a trailing blank line.
  if (buffer.trim()) {
    for (const line of buffer.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) handlePayload(trimmed.slice(5).trim());
    }
  }

  return { text, reasoning, usage, finishReason };
}

export async function testConnection({ apiKey, endpoint, model }) {
  const res = await fetch("/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, endpoint, model }),
  });
  return res.json().catch(() => ({ ok: false, error: "Bad response from tester" }));
}
