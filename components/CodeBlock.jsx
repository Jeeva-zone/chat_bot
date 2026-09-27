"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/common";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
} from "lucide-react";
import { copyToClipboard, downloadText, filenameForCodeBlock } from "@/lib/download";
import { escapeHtml } from "@/lib/markdown";

/** Pull a filename out of a fence info string: ```python:app.py / title="app.py" */
export function parseFenceMeta(lang, meta) {
  const m = String(meta || "").trim();
  if (!m) return "";
  const quoted = /title\s*=\s*["']?([^"']+)["']?/i.exec(m);
  if (quoted) return quoted[1].trim();
  const fileish = /([\w.\-/]+\.[A-Za-z0-9]{1,8})/.exec(m);
  if (fileish) return fileish[1];
  return m.split(/\s+/)[0];
}

function highlightCode(code, lang) {
  const l = String(lang || "").toLowerCase();
  try {
    if (l && hljs.getLanguage(l)) {
      return hljs.highlight(code, { language: l, ignoreIllegals: true }).value;
    }
    if (l) {
      const alias = { js: "javascript", ts: "typescript", py: "python", sh: "bash", yml: "yaml" }[l];
      if (alias && hljs.getLanguage(alias)) {
        return hljs.highlight(code, { language: alias, ignoreIllegals: true }).value;
      }
    }
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

const PREVIEW_LINES = 22;

export default function CodeBlock({
  code,
  lang = "",
  meta = "",
  index = 1,
  variant = "inline", // "inline" | "file"
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(variant === "inline");
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const text = String(code ?? "");
  const lines = useMemo(() => text.split("\n"), [text]);
  const hint = parseFenceMeta(lang, meta);
  const filename = filenameForCodeBlock(lang, hint, index);
  const isFile = variant === "file";
  const collapsed = isFile && !expanded;

  const visible = useMemo(() => {
    if (!collapsed) return text;
    return lines.slice(0, PREVIEW_LINES).join("\n");
  }, [collapsed, lines, text]);

  const html = useMemo(
    () => highlightCode(visible, lang),
    [visible, lang]
  );

  const bytes = useMemo(() => new TextEncoder().encode(text).length, [text]);

  const onCopy = async () => {
    try {
      await copyToClipboard(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const onDownload = () => {
    downloadText(filename, text, "text/plain;charset=utf-8");
  };

  const kb = bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;

  return (
    <div
      className="my-3 overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--line)", background: "var(--code-bg)" }}
    >
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2"
        style={{ borderBottom: collapsed ? "none" : "1px solid var(--line)" }}
      >
        {isFile && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <FileCode2 size={14} style={{ color: "var(--brand)" }} />
            <span className="font-mono">{filename}</span>
          </span>
        )}
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[11px] uppercase"
          style={{ background: "var(--elevated)", color: "var(--faint)" }}
        >
          {lang || "code"}
        </span>
        <span className="text-[11px]" style={{ color: "var(--faint)" }}>
          {lines.length} lines · {kb}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {isFile && (
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Collapse code" : "Show code"}
            >
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {expanded ? "Hide" : "Show"}
            </button>
          )}
          <button className="btn btn-xs" onClick={onCopy} title="Copy code">
            {copied ? (
              <Check size={13} style={{ color: "var(--ok)" }} />
            ) : (
              <Copy size={13} />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="btn btn-xs" onClick={onDownload} title={`Download ${filename}`}>
            <Download size={13} />
            Download
          </button>
        </div>
      </div>

      {!collapsed && (
        <pre
          className="overflow-x-auto px-3 py-3 text-[13px] leading-6"
          style={{ maxHeight: 520, overflowY: "auto" }}
        >
          <code
            className="hljs font-mono"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      )}

      {collapsed && (
        <div
          className="px-3 pb-3 text-[13px] leading-6"
          style={{ maxHeight: 260, overflow: "hidden" }}
        >
          <pre className="overflow-x-auto">
            <code
              className="hljs font-mono"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </pre>
          {lines.length > PREVIEW_LINES && (
            <button
              className="mt-2 text-xs font-medium"
              style={{ color: "var(--brand)" }}
              onClick={() => setExpanded(true)}
            >
              Show all {lines.length} lines
            </button>
          )}
        </div>
      )}
    </div>
  );
}
