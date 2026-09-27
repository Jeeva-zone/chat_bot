"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { testConnection } from "@/lib/client";

function Section({ title, children, hint }) {
  return (
    <div className="border-t px-4 py-4 first:border-t-0" style={{ borderColor: "var(--line)" }}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--faint)" }}>
            {hint}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export default function SettingsDrawer({
  open,
  onClose,
  settings,
  setSettings,
  apiKey,
  setApiKey,
  modelConfig,
  onReloadModels,
  onModelsFile,
  modelsError,
  loadingModels,
  onClearHistory,
}) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const fileRef = useRef(null);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const res = await testConnection({
      apiKey,
      endpoint: settings.endpoint,
      model: modelConfig?.defaultModelId,
    });
    setResult(res);
    setTesting(false);
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (file) onModelsFile(file);
    e.target.value = "";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto"
        style={{ background: "var(--panel)", borderLeft: "1px solid var(--line)" }}
      >
        <header
          className="sticky top-0 flex items-center gap-2 px-4 py-3"
          style={{
            background: "var(--panel)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Settings2 size={18} style={{ color: "var(--brand)" }} />
          <h2 className="text-sm font-semibold">Settings</h2>
          <button className="btn btn-ghost ml-auto" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </header>

        {/* ---- API credentials ---- */}
        <Section
          title="API credentials"
          hint="Stored only in this browser's localStorage. Requests are proxied through the app server, so no CORS issues."
        >
          <label className="label" htmlFor="apikey">
            Token Harbor API key
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="apikey"
                className="field pr-9 font-mono text-xs"
                type={showKey ? "text" : "password"}
                placeholder="thk_live_…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1"
                style={{ color: "var(--faint)" }}
                onClick={() => setShowKey((v) => !v)}
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button className="btn" onClick={runTest} disabled={testing || !apiKey}>
              {testing ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              {testing ? "Testing…" : "Test"}
            </button>
          </div>

          <div className="mt-3">
            <label className="label" htmlFor="endpoint">
              Chat completions endpoint
            </label>
            <input
              id="endpoint"
              className="field font-mono text-xs"
              value={settings.endpoint}
              onChange={(e) => update({ endpoint: e.target.value })}
              spellCheck={false}
            />
          </div>

          {result && (
            <div
              className="mt-3 rounded-lg border p-3 text-xs"
              style={{
                borderColor: result.ok ? "var(--ok)" : "var(--err)",
                background: result.ok ? "rgba(15,153,96,0.07)" : "rgba(217,45,32,0.07)",
              }}
            >
              <div className="flex items-start gap-2">
                {result.ok ? (
                  <CheckCircle2 size={15} style={{ color: "var(--ok)" }} />
                ) : (
                  <AlertTriangle size={15} style={{ color: "var(--err)" }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold" style={{ color: result.ok ? "var(--ok)" : "var(--err)" }}>
                    {result.ok
                      ? result.message || "Connected successfully! Status: 200 OK"
                      : result.error || "Connection failed"}
                  </p>
                  <div className="mt-1 space-y-0.5 font-mono text-[11px]" style={{ color: "var(--muted)" }}>
                    <p>endpoint: {result.endpoint}</p>
                    <p>status: {result.status ?? "n/a"} {result.statusText || ""}</p>
                    <p>latency: {result.latencyMs ?? "n/a"} ms</p>
                    {result.model && <p>model: {result.model}</p>}
                    {result.snippet && <p>reply: “{result.snippet}”</p>}
                    {result.detail && (
                      <p className="whitespace-pre-wrap break-words">detail: {result.detail}</p>
                    )}
                    {result.hint && <p>hint: {result.hint}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ---- Model registry ---- */}
        <Section
          title="Model registry"
          hint="models.json is parsed at runtime — swap the file or point at a URL and the pickers update."
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn btn-xs"
              onClick={() => fileRef.current?.click()}
              title="Upload a models.json file"
            >
              <Upload size={13} /> Upload models.json
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={pickFile}
            />
            <button className="btn btn-xs" onClick={onReloadModels} disabled={loadingModels}>
              {loadingModels ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Reload
            </button>
            <button
              className="btn btn-xs"
              onClick={() => {
                update({ modelsUrl: "/models.json" });
                onReloadModels("/models.json");
              }}
            >
              Reset source
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="field font-mono text-xs"
              placeholder="https://host/models.json (proxied)"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
            />
            <button
              className="btn btn-xs"
              onClick={() => {
                if (!remoteUrl.trim()) return;
                const proxied = "/api/models?url=" + encodeURIComponent(remoteUrl.trim());
                update({ modelsUrl: proxied });
                onReloadModels(proxied);
              }}
            >
              Load URL
            </button>
          </div>

          <div className="mt-3">
            <p className="text-xs" style={{ color: "var(--faint)" }}>
              source: <span className="font-mono">{settings.modelsUrl}</span>
            </p>
            {modelsError ? (
              <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--err)" }}>
                <ShieldAlert size={13} /> {modelsError}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(modelConfig?.models || []).map((m) => (
                  <span key={m.id} className="chip" title={m.id}>
                    {m.label}
                    <span className="font-mono text-[10px]" style={{ color: "var(--faint)" }}>
                      {m.id}
                    </span>
                    {!m.enabled && <span style={{ color: "var(--warn)" }}>(disabled)</span>}
                  </span>
                ))}
                {!modelConfig?.models?.length && (
                  <span className="text-xs" style={{ color: "var(--faint)" }}>
                    No models loaded
                  </span>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* ---- Generation ---- */}
        <Section title="Generation">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="temp">
                Temperature · {Number(settings.temperature).toFixed(2)}
              </label>
              <input
                id="temp"
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => update({ temperature: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div>
              <label className="label" htmlFor="maxtok">
                Max tokens
              </label>
              <input
                id="maxtok"
                type="number"
                min="16"
                max="32000"
                step="16"
                className="field"
                value={settings.maxTokens}
                onChange={(e) => update({ maxTokens: Number(e.target.value) || 2048 })}
              />
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.stream}
              onChange={(e) => update({ stream: e.target.checked })}
            />
            Stream responses token-by-token
          </label>

          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.fileCardMode}
              onChange={(e) => update({ fileCardMode: e.target.checked })}
            />
            Output as downloadable file (render responses as file cards)
          </label>
        </Section>

        {/* ---- Session ---- */}
        <Section title="Session">
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-xs"
              onClick={() => {
                if (confirm("Clear the conversation in this browser?")) onClearHistory();
              }}
            >
              <Trash2 size={13} /> Clear conversation
            </button>
            <button
              className="btn btn-xs"
              onClick={() => {
                if (confirm("Remove the stored API key from this browser?")) {
                  setApiKey("");
                  setResult(null);
                }
              }}
            >
              <KeyRound size={13} /> Forget API key
            </button>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: "var(--faint)" }}>
            Keys and settings live in localStorage under the <code>th-studio:</code> prefix.
          </p>
        </Section>

        <div className="h-8" />
      </aside>
    </div>
  );
}
