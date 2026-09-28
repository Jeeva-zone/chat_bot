"use client";

import { Bot, FileDown, Gauge } from "lucide-react";
import TeamBuilder from "./TeamBuilder";
import ModelSelect, { MissingKeyNotice } from "./ModelSelect";
import { resolveModel } from "@/lib/models";

function ModelInfo({ model, provider }) {
  if (!model) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {provider && (
        <span className="chip" style={{ color: "var(--brand)" }}>
          {provider.label}
        </span>
      )}
      <span className="chip">{model.label}</span>
      <span className="chip font-mono">{model.id}</span>
      {model.free && <span className="chip">free</span>}
      {model.context && (
        <span className="chip">{Math.round(model.context / 1024)}K ctx</span>
      )}
      {model.modalities.map((m) => (
        <span key={m} className="chip">
          {m}
        </span>
      ))}
      {model.useFor.map((u) => (
        <span key={u} className="chip" style={{ color: "var(--faint)" }}>
          {u.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

export default function SidePanel({
  mode,
  config,
  settings,
  setSettings,
  singleModel,
  setSingleModel,
  team,
  setTeam,
  providerKeys,
}) {
  const { provider, model } = resolveModel(config, singleModel);
  const connected = (config?.providers || []).filter((p) => providerKeys[p.key]);

  return (
    <div className="space-y-4 p-3">
      {mode === "single" ? (
        <section className="card p-3">
          <div className="mb-2 flex items-center gap-2">
            <Bot size={16} style={{ color: "var(--brand)" }} />
            <h3 className="text-sm font-semibold">Agent</h3>
          </div>

          <label className="label" htmlFor="single-model">
            Model
          </label>
          <ModelSelect
            id="single-model"
            config={config}
            value={singleModel}
            onChange={setSingleModel}
            providerKeys={providerKeys}
          />
          <MissingKeyNotice
            provider={provider}
            hasKey={provider ? !!providerKeys[provider.key] : true}
          />
          <ModelInfo model={model} provider={provider} />

          <div className="mt-3">
            <label className="label" htmlFor="sys">
              System prompt
            </label>
            <textarea
              id="sys"
              className="field resize-y font-mono text-[11px] leading-5"
              rows={7}
              value={settings.systemPrompt}
              onChange={(e) =>
                setSettings((s) => ({ ...s, systemPrompt: e.target.value }))
              }
            />
          </div>

          <div className="mt-3">
            <label className="label" htmlFor="sp-temp">
              Temperature · {Number(settings.temperature).toFixed(2)}
            </label>
            <input
              id="sp-temp"
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={settings.temperature}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  temperature: Number(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>

          <div className="mt-3">
            <label className="label" htmlFor="sp-max">
              Max tokens
            </label>
            <input
              id="sp-max"
              type="number"
              min="16"
              max="32000"
              step="16"
              className="field"
              value={settings.maxTokens}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  maxTokens: Number(e.target.value) || 2048,
                }))
              }
            />
          </div>
        </section>
      ) : (
        <section className="card p-3">
          <TeamBuilder
            team={team}
            setTeam={setTeam}
            config={config}
            providerKeys={providerKeys}
          />
        </section>
      )}

      <section className="card p-3">
        <div className="mb-2 flex items-center gap-2">
          <FileDown size={16} style={{ color: "var(--brand)" }} />
          <h3 className="text-sm font-semibold">Output</h3>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.fileCardMode}
            onChange={(e) =>
              setSettings((s) => ({ ...s, fileCardMode: e.target.checked }))
            }
          />
          <span>
            Output as downloadable file
            <span className="block text-xs" style={{ color: "var(--faint)" }}>
              Renders code blocks as collapsible file cards with a Download
              button.
            </span>
          </span>
        </label>
        <label className="mt-2 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.stream}
            onChange={(e) =>
              setSettings((s) => ({ ...s, stream: e.target.checked }))
            }
          />
          <span>
            Stream responses
            <span className="block text-xs" style={{ color: "var(--faint)" }}>
              Live token streaming; turn off for a single buffered reply.
            </span>
          </span>
        </label>
      </section>

      <section className="card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Gauge size={16} style={{ color: "var(--brand)" }} />
          <h3 className="text-sm font-semibold">Providers</h3>
        </div>
        <dl className="space-y-1 text-xs" style={{ color: "var(--muted)" }}>
          <div className="flex justify-between gap-2">
            <dt>connected</dt>
            <dd className="font-mono">
              {connected.length}/{(config?.providers || []).length}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>models</dt>
            <dd className="font-mono">{config?.models?.length || 0}</dd>
          </div>
          {provider && (
            <>
              <div className="flex justify-between gap-2">
                <dt>selected via</dt>
                <dd className="truncate font-mono">{provider.label}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>endpoint</dt>
                <dd className="truncate font-mono" title={provider.chatUrl}>
                  {provider.chatUrl || "not set"}
                </dd>
              </div>
            </>
          )}
          {mode === "team" && (
            <div className="flex justify-between gap-2">
              <dt>agents</dt>
              <dd className="font-mono">
                {team.agents.filter((a) => a.enabled).length}/{team.agents.length}
              </dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
