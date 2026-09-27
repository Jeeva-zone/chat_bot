"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";

/** Collapsible chain-of-thought panel for reasoning models. */
export default function ReasoningBlock({ reasoning, streaming }) {
  const [open, setOpen] = useState(false);
  if (!reasoning && !streaming) return null;

  return (
    <div
      className="mb-3 overflow-hidden rounded-lg border"
      style={{ borderColor: "var(--line)", background: "var(--elevated)" }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown size={14} style={{ color: "var(--faint)" }} />
        ) : (
          <ChevronRight size={14} style={{ color: "var(--faint)" }} />
        )}
        <Brain size={14} style={{ color: "var(--brand)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
          Reasoning
        </span>
        {streaming && !open && (
          <span className="text-[11px] animate-pulse-dot" style={{ color: "var(--brand)" }}>
            thinking…
          </span>
        )}
        <span className="ml-auto text-[11px]" style={{ color: "var(--faint)" }}>
          {(reasoning || "").length.toLocaleString()} chars
        </span>
      </button>
      {open && (
        <div
          className="max-h-72 overflow-auto whitespace-pre-wrap px-3 pb-3 pt-1 font-mono text-[11px] leading-5"
          style={{ color: "var(--muted)" }}
        >
          {reasoning || "(waiting for tokens…)"}
        </div>
      )}
    </div>
  );
}
