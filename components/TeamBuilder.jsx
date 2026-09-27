"use client";

import {
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { AGENT_PRESETS, makeAgent } from "@/lib/defaults";

function AgentCard({ agent, index, models, onChange, onRemove, onPreset }) {
  const set = (patch) => onChange({ ...agent, ...patch });

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        borderColor: "var(--line)",
        background: agent.enabled ? "var(--panel)" : "var(--elevated)",
        opacity: agent.enabled ? 1 : 0.65,
      }}
    >
      <div className="flex items-center gap-2">
        <GripVertical size={14} style={{ color: "var(--faint)" }} />
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: "var(--brand-soft)", color: "var(--brand)" }}
        >
          {index + 1}
        </span>
        <input
          className="field flex-1 px-2 py-1"
          value={agent.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Agent name"
        />
        <input
          className="field w-24 px-2 py-1"
          value={agent.role}
          onChange={(e) => set({ role: e.target.value })}
          placeholder="Role"
        />
        <label className="flex items-center gap-1 text-xs" title="Include in run">
          <input
            type="checkbox"
            checked={agent.enabled}
            onChange={(e) => set({ enabled: e.target.checked })}
          />
        </label>
        <button
          className="btn btn-xs btn-ghost"
          onClick={onRemove}
          title="Remove agent"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <span className="label">Model</span>
          <select
            className="field px-2 py-1 text-xs"
            value={agent.model || models[0]?.id || ""}
            onChange={(e) => set({ model: e.target.value })}
          >
            {models.length === 0 && <option value="">No models loaded</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">
            Preset · temp {Number(agent.temperature).toFixed(2)}
          </span>
          <div className="flex gap-2">
            <select
              className="field px-2 py-1 text-xs"
              value={agent.preset || "custom"}
              onChange={(e) => onPreset(e.target.value)}
            >
              <option value="architect">Architect / Planner</option>
              <option value="developer">Developer / Coder</option>
              <option value="reviewer">Reviewer / QA</option>
              <option value="custom">Custom</option>
            </select>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={agent.temperature}
              onChange={(e) => set({ temperature: Number(e.target.value) })}
              className="w-16"
              title="Temperature"
            />
          </div>
        </div>
      </div>

      <div className="mt-2">
        <span className="label">System prompt</span>
        <textarea
          className="field resize-y font-mono text-[11px] leading-5"
          rows={3}
          value={agent.systemPrompt}
          onChange={(e) => set({ systemPrompt: e.target.value })}
        />
      </div>
    </div>
  );
}

export default function TeamBuilder({ team, setTeam, models }) {
  const updateAgent = (id, patch) =>
    setTeam((t) => ({
      ...t,
      agents: t.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));

  const removeAgent = (id) =>
    setTeam((t) => ({ ...t, agents: t.agents.filter((a) => a.id !== id) }));

  const applyPreset = (id, presetKey) => {
    const preset = AGENT_PRESETS[presetKey];
    if (!preset) {
      updateAgent(id, { preset: "custom" });
      return;
    }
    updateAgent(id, {
      preset: presetKey,
      name: preset.name,
      role: preset.role,
      temperature: preset.temperature,
      systemPrompt: preset.systemPrompt,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users size={16} style={{ color: "var(--brand)" }} />
        <h3 className="text-sm font-semibold">Team pipeline</h3>
        <button
          className="btn btn-xs ml-auto"
          onClick={() =>
            setTeam((t) => ({
              ...t,
              agents: [...t.agents, makeAgent("developer")],
            }))
          }
        >
          <Plus size={13} /> Agent
        </button>
        <button
          className="btn btn-xs btn-ghost"
          title="Reset to the 3-agent preset"
          onClick={() => {
            if (!confirm("Reset the team to Architect / Developer / Reviewer?")) return;
            setTeam({
              agents: [
                makeAgent("architect"),
                makeAgent("developer"),
                makeAgent("reviewer"),
              ],
              synth: { model: models[0]?.id || "", systemPrompt: AGENT_PRESETS.synthesizer.systemPrompt, temperature: 0.4 },
            });
          }}
        >
          <RotateCcw size={13} />
        </button>
      </div>

      <p className="text-xs" style={{ color: "var(--faint)" }}>
        Agents run in order. Each one receives the task plus every earlier
        agent&apos;s output, so the pipeline refines instead of restarting.
      </p>

      {team.agents.map((agent, i) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          index={i}
          models={models}
          onChange={(patch) => updateAgent(agent.id, patch)}
          onRemove={() => removeAgent(agent.id)}
          onPreset={(p) => applyPreset(agent.id, p)}
        />
      ))}

      {team.agents.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs" style={{ color: "var(--faint)" }}>
          No agents yet — add one to build a pipeline.
        </p>
      )}

      {/* Final synthesis */}
      <div className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-2">
          <Wand2 size={14} style={{ color: "var(--brand)" }} />
          <span className="text-sm font-semibold">Final synthesis</span>
          <label className="ml-auto flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={team.synth.enabled !== false}
              onChange={(e) =>
                setTeam((t) => ({
                  ...t,
                  synth: { ...t.synth, enabled: e.target.checked },
                }))
              }
            />
            Enabled
          </label>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--faint)" }}>
          A closing pass that merges every agent&apos;s work into one deliverable.
        </p>
        <div className="mt-2">
          <span className="label">Model</span>
          <select
            className="field px-2 py-1 text-xs"
            value={team.synth.model || models[0]?.id || ""}
            onChange={(e) =>
              setTeam((t) => ({ ...t, synth: { ...t.synth, model: e.target.value } }))
            }
          >
            {models.length === 0 && <option value="">No models loaded</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.id}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2">
          <span className="label">System prompt</span>
          <textarea
            className="field resize-y font-mono text-[11px] leading-5"
            rows={3}
            value={team.synth.systemPrompt}
            onChange={(e) =>
              setTeam((t) => ({
                ...t,
                synth: { ...t.synth, systemPrompt: e.target.value },
              }))
            }
          />
        </div>
      </div>
    </div>
  );
}
