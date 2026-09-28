"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { testConnection, fetchProviderModels } from "@/lib/client";

function StatusDot({ hasKey }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: hasKey ? "var(--ok)" : "var(--faint)" }}
      title={hasKey ? "API key saved" : "No API key"}
    />
  );
}

function ResultBadge({ result, onDismiss }) {
  if (!result) return null;
  const ok = result.ok;
  return (
    <div
      className="mt-2 rounded-lg border p-2 text-[11px]"
      style={{
        borderColor: ok ? "var(--ok)" : "var(--err)",
        background: ok ? "rgba(15,153,96,0.07)" : "rgba(217,45,32,0.07)",
      }}
    >
      <div className="flex items-start gap-1.5">
        {ok ? (
          <CheckCircle2 size={13} style={{ color: "var(--ok)" }} className="mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle size={13} style={{ color: "var(--err)" }} className="mt-0.5 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p
            className="font-semibold"
            style={{ color: ok ? "var(--ok)" : "var(--err)" }}
          >
            {ok ? result.message || "Connected successfully! Status: 200 OK" : result.error}
          </p>
          <div className="mt-1 space-y-0.5 font-mono" style={{ color: "var(--muted)" }}>
            {result.endpoint && <p className="break-all">endpoint: {result.endpoint}</p>}
            {result.status != null && (
              <p>
                status: {result.status} {result.statusText || ""}
              </p>
            )}
            {result.latencyMs != null && <p>latency: {result.latencyMs} ms</p>}
            {result.snippet && <p>reply: “{result.snippet}”</p>}
            {result.detail && (
              <p className="whitespace-pre-wrap break-words">detail: {result.detail}</p>
            )}
            {result.hint && <p>hint: {result.hint}</p>}
          </div>
        </div>
        <button className="shrink-0 px-1" style={{ color: "var(--faint)" }} onClick={onDismiss}>
          ×
        </button>
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  apiKey,
  onKeyChange,
  custom,
  onCustomChange,
  onModelsLoaded,
}) {
  const [open, setOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [listing, setListing] = useState(false);
  const [result, setResult] = useState(null);
  const [listNote, setListNote] = useState(null);

  // provider.models is already merged with any live-fetched list upstream.
  const models = provider.models;
  const hasKey = !!apiKey;
  const isCustom = provider.custom;

  const baseUrl = isCustom ? custom.baseUrl : provider.baseUrl;
  const chatEndpoint = isCustom ? custom.chatEndpoint : provider.chatEndpoint;
  const chatUrl = baseUrl
    ? `${baseUrl.replace(/\/+$/, "")}${
        chatEndpoint.startsWith("/") ? chatEndpoint : "/" + chatEndpoint
      }`
    : "";

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const res = await testConnection({
      apiKey,
      endpoint: chatUrl,
      model: models[0]?.id,
      headers: provider.headers,
      providerLabel: provider.label,
    });
    setResult(res);
    setTesting(false);
  };

  const refreshModels = async () => {
    setListing(true);
    setListNote(null);
    const res = await fetchProviderModels({
      baseUrl,
      apiKey,
      headers: provider.headers,
      providerLabel: provider.label,
    });
    if (res.ok) {
      onModelsLoaded(provider.key, res.models || []);
      setListNote({
        ok: true,
        text: `Loaded ${res.models.length} chat models${
          res.filtered ? ` (${res.filtered} non-chat hidden)` : ""
        }.`,
      });
    } else {
      setListNote({ ok: false, text: res.error || "Could not list models" });
    }
    setListing(false);
  };

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "var(--line)", background: "var(--panel)" }}
    >
      {/* header row */}
      <div className="flex items-center gap-2">
        <button
          className="p-0.5"
          style={{ color: "var(--faint)" }}
          onClick={() => setOpen((v) => !v)}
          title={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <StatusDot hasKey={hasKey} />
        <span className="text-sm font-semibold">
          {isCustom ? custom.label || "Custom provider" : provider.label}
        </span>
        <span className="chip font-mono">{models.length} models</span>
        {provider.free || /free/i.test(provider.note || "") ? null : null}
        {provider.keyUrl && (
          <a
            href={provider.keyUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto inline-flex items-center gap-1 text-[11px]"
            style={{ color: "var(--brand)" }}
            title="Get an API key"
          >
            Get key <ExternalLink size={11} />
          </a>
        )}
      </div>

      {provider.note && !open && (
        <p className="mt-1 pl-6 text-[11px]" style={{ color: "var(--faint)" }}>
          {provider.note}
        </p>
      )}

      {open && (
        <div className="mt-3 space-y-2 pl-6">
          {provider.note && (
            <p className="text-[11px]" style={{ color: "var(--faint)" }}>
              {provider.note}
            </p>
          )}

          {/* Custom provider identity + URL */}
          {isCustom && (
            <>
              <div>
                <span className="label">Display name</span>
                <input
                  className="field px-2 py-1 text-xs"
                  value={custom.label}
                  onChange={(e) => onCustomChange({ ...custom, label: e.target.value })}
                  placeholder="My local LLM"
                />
              </div>
              <div>
                <span className="label">Base URL</span>
                <input
                  className="field px-2 py-1 font-mono text-xs"
                  value={custom.baseUrl}
                  onChange={(e) => onCustomChange({ ...custom, baseUrl: e.target.value })}
                  placeholder="http://localhost:1234/v1"
                  spellCheck={false}
                />
              </div>
              <div>
                <span className="label">Chat completions path</span>
                <input
                  className="field px-2 py-1 font-mono text-xs"
                  value={custom.chatEndpoint}
                  onChange={(e) =>
                    onCustomChange({ ...custom, chatEndpoint: e.target.value })
                  }
                  placeholder="/chat/completions"
                  spellCheck={false}
                />
              </div>
              <div>
                <span className="label">Model IDs (one per line)</span>
                <textarea
                  className="field resize-y font-mono text-[11px] leading-5"
                  rows={3}
                  value={(custom.models || []).map((m) => m.id).join("\n")}
                  onChange={(e) => {
                    const ids = e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    onCustomChange({
                      ...custom,
                      models: ids.map((id) => ({ id, label: id })),
                    });
                  }}
                  placeholder={"llama-3.1-8b-instruct\nqwen2.5-coder-7b"}
                  spellCheck={false}
                />
              </div>
            </>
          )}

          {/* API key */}
          <div>
            <span className="label">
              <KeyRound size={10} className="mr-1 inline" />
              API key
            </span>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  className="field pr-8 font-mono text-xs"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => onKeyChange(e.target.value)}
                  placeholder={isCustom ? "optional for local servers" : "paste key…"}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "var(--faint)" }}
                  onClick={() => setShowKey((v) => !v)}
                  title={showKey ? "Hide" : "Show"}
                >
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {apiKey && (
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => onKeyChange("")}
                  title="Clear this key"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className="btn btn-xs"
              onClick={runTest}
              disabled={testing || !apiKey || !chatUrl}
              title={!chatUrl ? "Set a base URL first" : "Send a 5-token test request"}
            >
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
              {testing ? "Testing…" : "Test"}
            </button>
            <button
              className="btn btn-xs"
              onClick={refreshModels}
              disabled={listing || !baseUrl || !apiKey}
              title="Fetch the live model list from this provider"
            >
              {listing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {listing ? "Loading…" : "Refresh models"}
            </button>
            {chatUrl && (
              <span
                className="ml-auto truncate font-mono text-[10px]"
                style={{ color: "var(--faint)" }}
                title={chatUrl}
              >
                {chatUrl}
              </span>
            )}
          </div>

          <ResultBadge result={result} onDismiss={() => setResult(null)} />

          {listNote && (
            <p
              className="text-[11px]"
              style={{ color: listNote.ok ? "var(--ok)" : "var(--err)" }}
            >
              {listNote.text}
            </p>
          )}

          {provider.docsUrl && (
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: "var(--brand)" }}
            >
              Provider docs <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProvidersPanel({
  config,
  providerKeys,
  onProviderKeyChange,
  customProvider,
  onCustomProviderChange,
  liveModels,
  onLiveModels,
}) {
  const providers = config?.providers || [];
  const withKeys = providers.filter((p) => providerKeys[p.key]).length;

  return (
    <div>
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Plug size={15} style={{ color: "var(--brand)" }} />
          Providers
          <span className="chip">
            {withKeys}/{providers.length} connected
          </span>
        </h3>
        <p className="mt-0.5 text-xs" style={{ color: "var(--faint)" }}>
          Each provider keeps its own key. Models from every connected provider
          appear together in the model pickers.
        </p>
      </div>

      <div className="space-y-2">
        {providers.map((p) => (
          <ProviderCard
            key={p.key}
            provider={p}
            apiKey={providerKeys[p.key] || ""}
            onKeyChange={(v) => onProviderKeyChange(p.key, v)}
            custom={customProvider}
            onCustomChange={onCustomProviderChange}
            onModelsLoaded={onLiveModels}
          />
        ))}
        {providers.length === 0 && (
          <p className="text-xs" style={{ color: "var(--faint)" }}>
            No providers found in models.json.
          </p>
        )}
      </div>
    </div>
  );
}
