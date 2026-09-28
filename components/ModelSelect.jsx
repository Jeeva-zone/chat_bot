"use client";

import { AlertTriangle } from "lucide-react";
import { modelValue } from "@/lib/models";

/**
 * Model picker grouped by provider. Values are composite
 * ("groq::openai/gpt-oss-120b") so the same model id can exist under several
 * providers without collision.
 */
export default function ModelSelect({
  config,
  value,
  onChange,
  providerKeys = {},
  id,
  className = "",
  emptyLabel = "No models loaded",
  showProviderTag = false,
}) {
  const providers = config?.providers || [];
  const usable = providers.filter((p) => p.models.length > 0);

  if (usable.length === 0) {
    return (
      <select className={`field ${className}`} id={id} disabled>
        <option value="">{emptyLabel}</option>
      </select>
    );
  }

  return (
    <select
      className={`field ${className}`}
      id={id}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {!value && <option value="">Select a model…</option>}
      {usable.map((p) => (
        <optgroup
          key={p.key}
          label={`${p.label}${providerKeys[p.key] ? "" : "  ·  no key"}`}
        >
          {p.models.map((m) => {
            const v = m.value || modelValue(p.key, m.id);
            const noKey = !providerKeys[p.key];
            return (
              <option key={v} value={v}>
                {noKey ? "⚠ " : ""}
                {m.label}
                {showProviderTag ? ` — ${m.id}` : ""}
              </option>
            );
          })}
        </optgroup>
      ))}
    </select>
  );
}

/** Small warning shown when the selected model's provider has no key yet. */
export function MissingKeyNotice({ provider, hasKey }) {
  if (!provider || hasKey) return null;
  return (
    <p
      className="mt-2 flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-[11px]"
      style={{ background: "rgba(180,83,9,0.1)", color: "var(--warn)" }}
    >
      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
      <span>
        No API key for <strong>{provider.label}</strong>. Add one in Settings →
        Providers.
      </span>
    </p>
  );
}
