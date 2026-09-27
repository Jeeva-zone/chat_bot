// Markdown serialisation used by every "Download as .md" button.

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "";
  }
}

export function attachmentsToMarkdown(attachments = []) {
  if (!attachments?.length) return "";
  return attachments
    .map(
      (a) =>
        `### Attached: ${a.name}\n\n\`\`\`${a.lang || "text"}:${a.name}\n${a.content}\n\`\`\`\n`
    )
    .join("\n");
}

export function messageToMarkdown(msg) {
  const head = [];
  const who = msg.role === "user" ? "User" : "Assistant";
  head.push(`## ${who}${msg.model ? ` · ${msg.model}` : ""}`);
  if (msg.createdAt) head.push(`_${fmtTime(msg.createdAt)}_`);

  if (msg.role === "team" || msg.kind === "team") {
    const lines = [
      "# AI Team Run",
      "",
      msg.createdAt ? `_${fmtTime(msg.createdAt)}_` : "",
      "",
      "## Task",
      "",
      (msg.content || "").trim(),
      "",
      attachmentsToMarkdown(msg.attachments),
    ];
    (msg.steps || []).forEach((s, i) => {
      lines.push(
        `## Step ${i + 1} — ${s.name}${s.role ? ` (${s.role})` : ""}`,
        "",
        `- model: \`${s.model || "n/a"}\``,
        s.endedAt && s.startedAt
          ? `- duration: ${Math.max(
              0,
              Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 1000)
            )}s`
          : null,
        s.error ? `- status: error — ${s.error}` : null,
        "",
        s.reasoning ? `<details><summary>Reasoning</summary>\n\n${s.reasoning}\n\n</details>\n` : null,
        s.content || "_no output_",
        ""
      );
    });
    if (msg.summary?.content) {
      lines.push("## Final synthesis", "", `- model: \`${msg.summary.model}\``, "", msg.summary.content, "");
    }
    return lines.filter((l) => l !== null).join("\n");
  }

  const body = [
    head.join("  \n"),
    "",
    msg.reasoning
      ? `<details><summary>Reasoning</summary>\n\n${msg.reasoning}\n\n</details>\n`
      : null,
    msg.content || "",
  ].filter((x) => x !== null);
  const atts = attachmentsToMarkdown(msg.attachments);
  if (atts) body.push("", atts);
  if (msg.error) body.push("", `> Error: ${msg.error}`);
  return body.join("\n");
}

export function conversationToMarkdown(messages, meta = {}) {
  const header = [
    "# Conversation export",
    "",
    `- exported: ${fmtTime(new Date().toISOString())}`,
    meta.mode ? `- mode: ${meta.mode}` : null,
    meta.model ? `- model: ${meta.model}` : null,
    meta.endpoint ? `- endpoint: ${meta.endpoint}` : null,
    "",
    "---",
    "",
  ].filter((l) => l !== null);

  const body = messages
    .map((m) => messageToMarkdown(m))
    .join("\n\n---\n\n");

  return header.join("\n") + body + "\n";
}
