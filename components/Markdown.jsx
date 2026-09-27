"use client";

import { useMemo } from "react";
import { markdownToHtml, splitSegments } from "@/lib/markdown";
import CodeBlock from "./CodeBlock";

/** Renders a non-code Markdown fragment. */
export function MarkdownBlock({ content }) {
  const html = useMemo(() => markdownToHtml(content), [content]);
  return (
    <div
      className="prose-md"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Renders a full assistant message: prose segments as Markdown, fenced blocks
 * as interactive <CodeBlock>s. In file-card mode code renders as a collapsed
 * downloadable file card instead of a wall of text.
 */
export default function MarkdownBody({ content, fileCardMode = false }) {
  const segments = useMemo(() => splitSegments(content), [content]);

  if (!segments.length) return null;

  return (
    <div>
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock
            key={i}
            code={seg.value}
            lang={seg.lang}
            meta={seg.meta}
            index={seg.index}
            variant={fileCardMode ? "file" : "inline"}
          />
        ) : (
          <MarkdownBlock key={i} content={seg.value} />
        )
      )}
    </div>
  );
}
