"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Download,
  FileText,
  RefreshCw,
  Trash2,
  User as UserIcon,
  Users,
} from "lucide-react";
import MarkdownBody from "./Markdown";
import TeamRun from "./TeamRun";
import ReasoningBlock from "./ReasoningBlock";
import { copyToClipboard, downloadText, slugify, stamp } from "@/lib/download";
import { messageToMarkdown } from "@/lib/export";

function UserAttachments({ attachments }) {
  const [open, setOpen] = useState({});
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {attachments.map((a) => (
        <div
          key={a.id}
          className="rounded-lg border px-2.5 py-2"
          style={{ borderColor: "var(--line)", background: "var(--elevated)" }}
        >
          <button
            className="flex w-full items-center gap-2 text-left"
            onClick={() => setOpen((o) => ({ ...o, [a.id]: !o[a.id] }))}
          >
            <FileText size={14} style={{ color: "var(--brand)" }} />
            <span className="truncate font-mono text-xs">{a.name}</span>
            <span className="text-[11px]" style={{ color: "var(--faint)" }}>
              {a.chars.toLocaleString()} chars
            </span>
            <span className="ml-auto text-[11px]" style={{ color: "var(--faint)" }}>
              {open[a.id] ? "hide" : "preview"}
            </span>
          </button>
          {open[a.id] && (
            <pre
              className="mt-2 max-h-60 overflow-auto rounded p-2 font-mono text-[11px] leading-5"
              style={{ background: "var(--code-bg)", border: "1px solid var(--line)" }}
            >
              {a.content}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MessageItem({
  message,
  fileCardMode,
  onRegenerate,
  onDelete,
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isTeam = message.role === "team";

  const onCopy = async () => {
    try {
      await copyToClipboard(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const onDownloadMd = () => {
    const name = isTeam
      ? `team-run-${stamp()}.md`
      : `${isUser ? "user" : slugify(message.model || "assistant")}-${stamp()}.md`;
    downloadText(name, messageToMarkdown(message));
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            background: isUser ? "var(--elevated)" : isTeam ? "var(--brand-soft)" : "var(--brand-soft)",
            color: isUser ? "var(--muted)" : "var(--brand)",
          }}
        >
          {isUser ? <UserIcon size={13} /> : isTeam ? <Users size={13} /> : <Bot size={13} />}
          {isUser ? "You" : isTeam ? "AI Team" : "Assistant"}
        </span>
        {message.model && <span className="chip font-mono">{message.model}</span>}
        {message.createdAt && (
          <span className="text-[11px]" style={{ color: "var(--faint)" }}>
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
        )}
        {message.status === "streaming" && (
          <span className="chip" style={{ color: "var(--brand)" }}>
            streaming…
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button className="btn btn-xs btn-ghost" onClick={onCopy} title="Copy message">
            {copied ? <Check size={13} style={{ color: "var(--ok)" }} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button className="btn btn-xs btn-ghost" onClick={onDownloadMd} title="Download as .md">
            <Download size={13} /> .md
          </button>
          {!isUser && !isTeam && onRegenerate && (
            <button className="btn btn-xs btn-ghost" onClick={onRegenerate} title="Regenerate">
              <RefreshCw size={13} />
            </button>
          )}
          <button
            className="btn btn-xs btn-ghost"
            onClick={onDelete}
            title="Delete message"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div
        className="rounded-xl border px-4 py-3"
        style={{
          borderColor: "var(--line)",
          background: isUser ? "var(--elevated)" : "var(--panel)",
        }}
      >
        {message.error && (
          <p
            className="mb-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
            style={{ background: "rgba(217,45,32,0.08)", color: "var(--err)" }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {message.error}
          </p>
        )}

        {isTeam ? (
          <>
            {(message.content || message.attachments?.length) && (
              <div className="mb-3 pb-3" style={{ borderBottom: "1px solid var(--line)" }}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--faint)" }}>
                  Task
                </p>
                <div className="prose-md whitespace-pre-wrap text-sm">{message.content}</div>
                <UserAttachments attachments={message.attachments} />
              </div>
            )}
            <TeamRun message={message} fileCardMode={fileCardMode} />
          </>
        ) : (
          <>
            <ReasoningBlock
              reasoning={message.reasoning}
              streaming={message.status === "streaming"}
            />
            <div className="whitespace-pre-wrap text-[15px] leading-7">
              {message.content ? (
                <MarkdownBody
                  content={message.content}
                  fileCardMode={fileCardMode}
                />
              ) : (
                <span style={{ color: "var(--faint)" }}>
                  {message.status === "streaming" ? "Thinking…" : "(empty)"}
                </span>
              )}
            </div>
            <UserAttachments attachments={message.attachments} />
          </>
        )}
      </div>
    </div>
  );
}
