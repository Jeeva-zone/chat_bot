"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Square,
  X,
} from "lucide-react";

const ACCEPT =
  ".txt,.md,.markdown,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.yaml,.yml,.toml,.csv,.sql,.sh,.ini,.env,.java,.go,.rs,.c,.cpp,.cs,.php,.rb,.xml";

const LANG_BY_EXT = {
  txt: "text",
  md: "markdown",
  markdown: "markdown",
  json: "json",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  html: "html",
  css: "css",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  csv: "csv",
  sql: "sql",
  sh: "bash",
  ini: "ini",
  env: "bash",
  java: "java",
  go: "go",
  rs: "rust",
  c: "c",
  cpp: "cpp",
  cs: "csharp",
  php: "php",
  rb: "ruby",
  xml: "xml",
};

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB guard for localStorage-backed history
const LONG_PASTE_THRESHOLD = 2000;

let attachSeq = 0;
function makeAttachment(name, content, lang) {
  attachSeq += 1;
  return {
    id: `att-${Date.now().toString(36)}-${attachSeq}`,
    name,
    content,
    lang: lang || "text",
    chars: content.length,
  };
}

function AttachmentCard({ att, onRemove, readOnly }) {
  const [open, setOpen] = useState(false);
  const preview = att.content.split("\n").slice(0, 8).join("\n");
  return (
    <div
      className="rounded-lg border px-2.5 py-2"
      style={{ borderColor: "var(--line)", background: "var(--elevated)" }}
    >
      <div className="flex items-center gap-2">
        <button
          className="p-0.5"
          onClick={() => setOpen((v) => !v)}
          style={{ color: "var(--faint)" }}
          title={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <FileText size={14} style={{ color: "var(--brand)" }} />
        <span className="truncate font-mono text-xs">{att.name}</span>
        <span className="text-[11px]" style={{ color: "var(--faint)" }}>
          {att.chars.toLocaleString()} chars
        </span>
        {!readOnly && (
          <button
            className="ml-auto p-0.5"
            onClick={() => onRemove(att.id)}
            style={{ color: "var(--faint)" }}
            title="Remove"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <pre
          className="mt-2 max-h-52 overflow-auto rounded p-2 font-mono text-[11px] leading-5"
          style={{ background: "var(--code-bg)", border: "1px solid var(--line)" }}
        >
          {preview}
          {att.content.split("\n").length > 8 && (
            <span style={{ color: "var(--faint)" }}>{"\n…"}</span>
          )}
        </pre>
      )}
    </div>
  );
}

export default function Composer({
  onSend,
  onStop,
  busy,
  disabledReason,
  placeholder,
  resetSignal,
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [dragging, setDragging] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const pasteCounter = useRef(0);

  useEffect(() => {
    if (resetSignal) {
      setText("");
      setAttachments([]);
    }
  }, [resetSignal]);

  const autoGrow = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 260) + "px";
  }, []);

  useEffect(autoGrow, [text, autoGrow]);

  const addFile = async (file) => {
    if (file.size > MAX_FILE_BYTES) {
      alert(`"${file.name}" is larger than 2 MB — trimmed to the first 2 MB.`);
    }
    const content = await file.text();
    const ext = file.name.split(".").pop().toLowerCase();
    setAttachments((prev) => [
      ...prev,
      makeAttachment(file.name, content.slice(0, MAX_FILE_BYTES), LANG_BY_EXT[ext]),
    ]);
  };

  const onPaste = (e) => {
    const pasted = e.clipboardData?.getData("text") || "";
    if (pasted.length > LONG_PASTE_THRESHOLD) {
      e.preventDefault();
      pasteCounter.current += 1;
      const name = `pasted-snippet-${pasteCounter.current}.txt`;
      setAttachments((prev) => [...prev, makeAttachment(name, pasted, "text")]);
      setText((t) =>
        (t + `\n[${name} · ${pasted.length.toLocaleString()} chars attached]`).trimStart()
      );
    }
  };

  const submit = () => {
    const value = text.trim();
    if (busy || (!value && attachments.length === 0)) return;
    onSend({ text: value, attachments });
    setText("");
    setAttachments([]);
    requestAnimationFrame(autoGrow);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="card p-3"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragging(false);
        for (const f of Array.from(e.dataTransfer.files || [])) await addFile(f);
      }}
      style={dragging ? { borderColor: "var(--brand)" } : undefined}
    >
      {attachments.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {attachments.map((a) => (
            <AttachmentCard
              key={a.id}
              att={a}
              onRemove={(id) => setAttachments((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          className="btn"
          onClick={() => fileRef.current?.click()}
          title="Attach a text/code file"
        >
          <Paperclip size={15} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={async (e) => {
            for (const f of Array.from(e.target.files || [])) await addFile(f);
            e.target.value = "";
          }}
        />

        <textarea
          ref={taRef}
          className="field max-h-[260px] flex-1 resize-none py-2.5"
          rows={2}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />

        {busy ? (
          <button className="btn" onClick={onStop} title="Stop generation">
            <Square size={14} /> Stop
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!!disabledReason || (!text.trim() && attachments.length === 0)}
            title={disabledReason || "Send (Enter)"}
          >
            <Send size={14} /> Send
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: "var(--faint)" }}>
        <span>{text.length.toLocaleString()} chars</span>
        <span>·</span>
        <span>Enter to send, Shift+Enter for a new line</span>
        <span>·</span>
        <span>Pastes over {LONG_PASTE_THRESHOLD.toLocaleString()} chars auto-collapse into a file card</span>
        {busy && (
          <span className="ml-auto inline-flex items-center gap-1" style={{ color: "var(--brand)" }}>
            <Loader2 size={12} className="animate-spin" /> working…
          </span>
        )}
      </div>
    </div>
  );
}
