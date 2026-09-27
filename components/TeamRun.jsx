"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Download,
  Loader2,
  Wand2,
} from "lucide-react";
import MarkdownBody from "./Markdown";
import ReasoningBlock from "./ReasoningBlock";
import { downloadText, slugify, stamp } from "@/lib/download";
import { messageToMarkdown } from "@/lib/export";

function StatusIcon({ status }) {
  if (status === "streaming")
    return <Loader2 size={15} className="animate-spin" style={{ color: "var(--brand)" }} />;
  if (status === "done")
    return <CheckCircle2 size={15} style={{ color: "var(--ok)" }} />;
  if (status === "error")
    return <AlertTriangle size={15} style={{ color: "var(--err)" }} />;
  return <Circle size={15} style={{ color: "var(--faint)" }} />;
}

function duration(startedAt, endedAt) {
  if (!startedAt) return null;
  const ms = (endedAt ? new Date(endedAt) : Date.now()) - new Date(startedAt);
  if (ms < 0) return null;
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function StepAccordion({ step, index, fileCardMode, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (step.status === "streaming") setOpen(true);
  }, [step.status]);

  const dur = duration(step.startedAt, step.endedAt);

  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--line)", background: "var(--panel)" }}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown size={15} style={{ color: "var(--faint)" }} />
        ) : (
          <ChevronRight size={15} style={{ color: "var(--faint)" }} />
        )}
        <StatusIcon status={step.status} />
        <span className="text-sm font-semibold">
          {index + 1}. {step.name}
        </span>
        {step.role && <span className="chip">{step.role}</span>}
        <span className="chip font-mono">{step.model || "no model"}</span>
        <span className="ml-auto flex items-center gap-2 text-[11px]" style={{ color: "var(--faint)" }}>
          {dur && (
            <>
              <Clock size={11} /> {dur}
            </>
          )}
          {step.content ? `${step.content.length.toLocaleString()} chars` : ""}
        </span>
      </button>

      {open && (
        <div className="border-t px-3 py-3" style={{ borderColor: "var(--line)" }}>
          {step.error && (
            <p
              className="mb-2 rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(217,45,32,0.08)", color: "var(--err)" }}
            >
              {step.error}
            </p>
          )}
          <ReasoningBlock
            reasoning={step.reasoning}
            streaming={step.status === "streaming"}
          />
          {step.content ? (
            <MarkdownBody content={step.content} fileCardMode={fileCardMode} />
          ) : (
            <p className="text-xs" style={{ color: "var(--faint)" }}>
              {step.status === "streaming" ? "Generating…" : "No output yet."}
            </p>
          )}
          {step.content && (
            <div className="mt-3 flex gap-2">
              <button
                className="btn btn-xs"
                onClick={() =>
                  downloadText(
                    `${String(index + 1).padStart(2, "0")}-${slugify(step.name)}.md`,
                    `# ${step.name}${step.role ? ` — ${step.role}` : ""}\n\n- model: \`${step.model}\`\n\n${step.content}\n`
                  )
                }
              >
                <Download size={13} /> Download step
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamRun({ message, fileCardMode }) {
  const steps = message.steps || [];
  const summary = message.summary;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--faint)" }}>
        <span className="chip">
          {steps.filter((s) => s.status === "done").length}/{steps.length} steps complete
        </span>
        {message.status === "streaming" && (
          <span className="chip" style={{ color: "var(--brand)" }}>
            <Loader2 size={11} className="animate-spin" /> running pipeline
          </span>
        )}
        <button
          className="btn btn-xs ml-auto"
          onClick={() =>
            downloadText(
              `team-run-${stamp()}.md`,
              messageToMarkdown(message)
            )
          }
        >
          <Download size={13} /> Download full run (.md)
        </button>
      </div>

      {steps.map((step, i) => (
        <StepAccordion
          key={step.id}
          step={step}
          index={i}
          fileCardMode={fileCardMode}
          defaultOpen={i === 0}
        />
      ))}

      {summary && (summary.content || summary.status === "streaming") && (
        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: "var(--brand)",
            background: "var(--brand-soft)",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Wand2 size={15} style={{ color: "var(--brand)" }} />
            <span className="text-sm font-semibold">Final synthesis</span>
            <span className="chip font-mono">{summary.model || "no model"}</span>
            {summary.status === "streaming" && (
              <Loader2 size={13} className="animate-spin" style={{ color: "var(--brand)" }} />
            )}
            <button
              className="btn btn-xs ml-auto"
              onClick={() =>
                downloadText(
                  `final-synthesis-${stamp()}.md`,
                  `# Final synthesis\n\n- model: \`${summary.model}\`\n\n${summary.content}\n`
                )
              }
            >
              <Download size={13} /> Download .md
            </button>
          </div>
          {summary.error && (
            <p className="mb-2 text-xs" style={{ color: "var(--err)" }}>
              {summary.error}
            </p>
          )}
          <div className="rounded-lg p-3" style={{ background: "var(--panel)" }}>
            <ReasoningBlock
              reasoning={summary.reasoning}
              streaming={summary.status === "streaming"}
            />
            {summary.content ? (
              <MarkdownBody content={summary.content} fileCardMode={fileCardMode} />
            ) : (
              <p className="text-xs" style={{ color: "var(--faint)" }}>
                Waiting for the pipeline to finish…
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
