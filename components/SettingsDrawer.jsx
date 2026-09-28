"use client";

import { useRef, useState } from "react";
import {
  FileJson,
  Loader2,
  RefreshCw,
  Settings2,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ProvidersPanel from "./ProvidersPanel";

function Section({ title, children, hint, icon: Icon }) {
  return (
    <div
      className="border-t px-4 py-4 first:border-t-0"
      style={{ borderColor: "var(--line)" }}
    >
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon size={15} style={{ color: "var(--brand)" }} />}
          {title}
        </h3>
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
  config,
  providerKeys,
  onProviderKeyChange,
  customProvider,
  onCustomProviderChange,
  liveModels,
  onLiveModels,
  onReloadModels,
  onModelsFile,
  modelsError,
  loadingModels,
  onClearHistory,
  onForgetAllKeys,
}) {
  const [remoteUrl, setRemoteUrl] = useState("");
  const fileRef = useRef(null);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));

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
          className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3"
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

        {/* ---- Providers ---- */}
        <Section
          title="API providers"
          hint="Keys are stored in this browser's localStorage only. All requests are proxied through the app server, so there are no CORS issues."
        >
          <ProvidersPanel
            config={config}
            providerKeys={providerKeys}
            onProviderKeyChange={onProviderKeyChange}
            customProvider={customProvider}
            onCustomProviderChange={onCustomProviderChange}
            liveModels={liveModels}
            onLiveModels={onLiveModels}
          />
        </Section>

        {/* ---- Model registry source ---- */}
        <Section
          icon={FileJson}
          title="Model registry source"
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
            <button
              className="btn btn-xs"
              onClick={() => onReloadModels()}
              disabled={loadingModels}
            >
              {loadingModels ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
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
                const proxied =
                  "/api/models?url=" + encodeURIComponent(remoteUrl.trim());
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
              <p
                className="mt-1 flex items-center gap-1 text-xs"
                style={{ color: "var(--err)" }}
              >
                <ShieldAlert size={13} /> {modelsError}
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                {(config?.providers || []).map((p) => (
                  <div key={p.key} className="text-xs">
                    <span className="font-semibold">{p.label}</span>
                    <span className="ml-1.5" style={{ color: "var(--faint)" }}>
                      {p.models.length} models
                    </span>
                  </div>
                ))}
                {!config?.providers?.length && (
                  <span className="text-xs" style={{ color: "var(--faint)" }}>
                    No providers loaded
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
                onChange={(e) =>
                  update({ maxTokens: Number(e.target.value) || 2048 })
                }
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
                if (confirm("Clear the conversation in this browser?"))
                  onClearHistory();
              }}
            >
              <Trash2 size={13} /> Clear conversation
            </button>
            <button
              className="btn btn-xs"
              onClick={() => {
                if (confirm("Remove every stored API key from this browser?")) {
                  onForgetAllKeys();
                }
              }}
            >
              <Trash2 size={13} /> Forget all keys
            </button>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: "var(--faint)" }}>
            Keys and settings live in localStorage under the{" "}
            <code>th-studio:</code> prefix.
          </p>
        </Section>

        <div className="h-8" />
      </aside>
    </div>
  );
}
