"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Layers, Sparkles, Users, Wrench } from "lucide-react";
import Header from "@/components/Header";
import SidePanel from "@/components/SidePanel";
import SettingsDrawer from "@/components/SettingsDrawer";
import Composer from "@/components/Composer";
import MessageItem from "@/components/MessageItem";
import { load, save, STORAGE_KEYS, loadProviderKeys } from "@/lib/storage";
import {
  DEFAULT_SETTINGS,
  DEFAULT_CUSTOM_PROVIDER,
  defaultTeam,
  AGENT_PRESETS,
} from "@/lib/defaults";
import {
  fetchModelConfig,
  normalizeModelConfig,
  resolveModel,
  modelValue,
  mergeLiveModels,
  joinUrl,
} from "@/lib/models";
import { streamChat } from "@/lib/client";
import { conversationToMarkdown } from "@/lib/export";
import { downloadText, stamp } from "@/lib/download";

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const EMPTY_TEAM = {
  agents: [],
  synth: { enabled: true, model: "", systemPrompt: "", temperature: 0.4 },
};

function buildUserContent(text, attachments = []) {
  let content = text || "";
  for (const a of attachments) {
    content += `\n\nAttached file \`${a.name}\` (${a.chars.toLocaleString()} chars):\n\`\`\`${
      a.lang || "text"
    }:${a.name}\n${a.content}\n\`\`\`\n`;
  }
  return content;
}

/** Flatten rendered messages back into plain OpenAI-style turns. */
function historyFrom(messages) {
  const out = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({
        role: "user",
        content: buildUserContent(m.content, m.attachments),
      });
    } else if (m.role === "assistant") {
      if (m.content && !m.error)
        out.push({ role: "assistant", content: m.content });
    } else if (m.role === "team") {
      out.push({
        role: "user",
        content: buildUserContent(m.content, m.attachments),
      });
      if (m.summary?.content)
        out.push({ role: "assistant", content: m.summary.content });
    }
  }
  return out;
}

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [providerKeys, setProviderKeys] = useState({});
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
    customProvider: DEFAULT_CUSTOM_PROVIDER,
  });
  const [team, setTeam] = useState(EMPTY_TEAM);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("single");

  const [modelConfig, setModelConfig] = useState(null);
  const [liveModels, setLiveModels] = useState({});
  const [modelsError, setModelsError] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  // ---------------------------------------------------------------- hydrate
  useEffect(() => {
    const savedSettings = load(STORAGE_KEYS.settings, null);
    if (savedSettings) {
      setSettings((s) => ({
        ...s,
        ...savedSettings,
        customProvider: {
          ...DEFAULT_CUSTOM_PROVIDER,
          ...(savedSettings.customProvider || {}),
        },
      }));
    }
    setProviderKeys(loadProviderKeys("tokenharbor"));
    setLiveModels(load(STORAGE_KEYS.liveModels, {}) || {});
    const savedTeam = load(STORAGE_KEYS.team, null);
    setTeam(
      savedTeam?.agents?.length
        ? { ...EMPTY_TEAM, ...savedTeam }
        : {
            ...EMPTY_TEAM,
            ...defaultTeam(),
            synth: {
              enabled: true,
              model: "",
              systemPrompt: AGENT_PRESETS.synthesizer.systemPrompt,
              temperature: AGENT_PRESETS.synthesizer.temperature,
            },
          }
    );
    setMessages(load(STORAGE_KEYS.history, []));
    setHydrated(true);
  }, []);

  // ------------------------------------------------------------ persistence
  useEffect(() => {
    if (hydrated) save(STORAGE_KEYS.settings, settings);
  }, [settings, hydrated]);
  useEffect(() => {
    if (hydrated) save(STORAGE_KEYS.team, team);
  }, [team, hydrated]);
  useEffect(() => {
    if (hydrated) save(STORAGE_KEYS.history, messages.slice(-40));
  }, [messages, hydrated]);
  useEffect(() => {
    if (hydrated) save(STORAGE_KEYS.providerKeys, providerKeys);
  }, [providerKeys, hydrated]);
  useEffect(() => {
    if (hydrated) save(STORAGE_KEYS.liveModels, liveModels);
  }, [liveModels, hydrated]);

  // ----------------------------------------------------------------- theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [settings.theme]);

  // ------------------------------------------------------ effective config
  // The bundled registry is a seed. On top of it we layer:
  //   - the user's custom provider (base URL, endpoint, model ids)
  //   - live model lists fetched from each provider
  const config = useMemo(() => {
    if (!modelConfig) return null;
    const custom = {
      ...DEFAULT_CUSTOM_PROVIDER,
      ...(settings.customProvider || {}),
    };

    const providers = modelConfig.providers.map((p) => {
      if (p.custom) {
        const baseUrl = String(custom.baseUrl || "").replace(/\/+$/, "");
        const chatEndpoint = custom.chatEndpoint || "/chat/completions";
        const label = custom.label || "Custom provider";
        const models = (custom.models || []).map((m) => ({
          key: m.id,
          id: m.id,
          value: modelValue(p.key, m.id),
          providerKey: p.key,
          providerLabel: label,
          label: m.label || m.id,
          enabled: true,
          isDefault: false,
          modalities: ["text"],
          inputTypes: ["text"],
          useFor: [],
          context: null,
          free: false,
        }));
        return {
          ...p,
          label,
          baseUrl,
          chatEndpoint,
          chatUrl: joinUrl(baseUrl, chatEndpoint),
          modelsUrl: joinUrl(baseUrl, custom.modelsEndpoint || "/models"),
          models,
        };
      }
      const live = liveModels[p.key];
      if (Array.isArray(live) && live.length) {
        return { ...p, models: mergeLiveModels(p, live) };
      }
      return p;
    });

    const models = providers.flatMap((p) => p.models.filter((m) => m.enabled));
    const defaultModelId = modelConfig.defaultModelId || models[0]?.value || "";

    return { ...modelConfig, providers, models, defaultModelId };
  }, [modelConfig, settings.customProvider, liveModels]);

  // ---------------------------------------------------------- model registry
  const loadModels = useCallback(
    async (overrideUrl, rawJson) => {
      setLoadingModels(true);
      setModelsError("");
      try {
        let cfg;
        if (rawJson) {
          cfg = normalizeModelConfig(rawJson);
          save(STORAGE_KEYS.modelsJson, rawJson);
        } else {
          cfg = await fetchModelConfig(overrideUrl || settings.modelsUrl);
        }
        setModelConfig(cfg);
        setSettings((s) =>
          s.singleModel && cfg.models.some((m) => m.value === s.singleModel)
            ? s
            : { ...s, singleModel: cfg.defaultModelId }
        );
      } catch (err) {
        setModelsError(err?.message || "Could not load models.json");
      } finally {
        setLoadingModels(false);
      }
    },
    [settings.modelsUrl]
  );

  useEffect(() => {
    const custom = load(STORAGE_KEYS.modelsJson, null);
    if (custom) {
      const cfg = normalizeModelConfig(custom);
      setModelConfig(cfg);
      setSettings((s) =>
        s.singleModel ? s : { ...s, singleModel: cfg.defaultModelId }
      );
    } else {
      loadModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fill in any blank agent/synthesis model once the registry is known.
  useEffect(() => {
    const d = config?.defaultModelId;
    if (!d) return;
    setTeam((t) => {
      let changed = false;
      const agents = t.agents.map((a) => {
        if (!a.model) {
          changed = true;
          return { ...a, model: d };
        }
        return a;
      });
      let synth = t.synth;
      if (!synth?.model) {
        synth = { ...synth, model: d };
        changed = true;
      }
      return changed ? { ...t, agents, synth } : t;
    });
  }, [config?.defaultModelId]);

  // ------------------------------------------------------------- scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    if (nearBottom)
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // ---------------------------------------------------------------- helpers
  const patchMessage = useCallback((id, patch) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }, []);

  const patchStep = useCallback((msgId, index, patch) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              steps: m.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
            }
          : m
      )
    );
  }, []);

  const appendStepDelta = useCallback((msgId, index, delta) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              steps: m.steps.map((s, i) =>
                i === index ? { ...s, content: (s.content || "") + delta } : s
              ),
            }
          : m
      )
    );
  }, []);

  const appendStepReasoning = useCallback((msgId, index, delta) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              steps: m.steps.map((s, i) =>
                i === index
                  ? { ...s, reasoning: (s.reasoning || "") + delta }
                  : s
              ),
            }
          : m
      )
    );
  }, []);

  const patchSummary = useCallback((msgId, patch) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, summary: { ...(m.summary || {}), ...patch } } : m
      )
    );
  }, []);

  /** Everything needed to call a model: provider, key, endpoint, headers. */
  const resolveTarget = useCallback(
    (value) => {
      const { provider, model } = resolveModel(config, value);
      if (!provider || !model) return null;
      return {
        provider,
        model,
        apiKey: providerKeys[provider.key] || "",
        endpoint: provider.chatUrl,
        headers: provider.headers || null,
      };
    },
    [config, providerKeys]
  );

  const callModel = useCallback(
    async ({
      modelValue: mv,
      systemPrompt,
      temperature,
      history,
      onDelta,
      onReasoning,
      signal,
    }) => {
      const target = resolveTarget(mv);
      if (!target) throw new Error("No model selected.");
      if (!target.endpoint) {
        throw new Error(
          `${target.provider.label} has no base URL configured. Set it in Settings → Providers.`
        );
      }
      if (!target.apiKey) {
        throw new Error(
          `No API key for ${target.provider.label}. Add it in Settings → Providers.`
        );
      }
      return streamChat(
        {
          apiKey: target.apiKey,
          endpoint: target.endpoint,
          headers: target.headers,
          model: target.model.id,
          messages: [{ role: "system", content: systemPrompt || "" }, ...history],
          temperature: temperature ?? settings.temperature,
          max_tokens: settings.maxTokens,
          stream: settings.stream !== false,
        },
        { onDelta, onReasoning, signal }
      );
    },
    [resolveTarget, settings.temperature, settings.maxTokens, settings.stream]
  );

  // ------------------------------------------------------------ single chat
  const runSingle = useCallback(
    async ({ history, content, msgId, mv, systemPrompt, temperature }) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      patchMessage(msgId, {
        content: "",
        reasoning: "",
        status: "streaming",
        error: null,
      });
      try {
        let acc = "";
        let thought = "";
        const res = await callModel({
          modelValue: mv,
          systemPrompt,
          temperature,
          history: [...history, { role: "user", content }],
          onDelta: (d) => {
            acc += d;
            patchMessage(msgId, { content: acc });
          },
          onReasoning: (d) => {
            thought += d;
            patchMessage(msgId, { reasoning: thought });
          },
          signal: controller.signal,
        });
        patchMessage(msgId, {
          content: res.text || acc,
          reasoning: res.reasoning || thought,
          status: "done",
          usage: res.usage || null,
        });
      } catch (err) {
        const aborted = err?.name === "AbortError";
        patchMessage(msgId, {
          status: aborted ? "done" : "error",
          error: aborted ? "Stopped by user." : err?.message || "Request failed",
        });
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [callModel, patchMessage]
  );

  // -------------------------------------------------------------- team mode
  const runTeam = useCallback(
    async ({ history, content, msgId, agents, synth }) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      const transcript = [];
      let produced = 0;

      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        patchStep(msgId, i, {
          status: "streaming",
          startedAt: new Date().toISOString(),
        });

        const pkg =
          i === 0
            ? content
            : [
                content,
                "",
                "---",
                "",
                "# Team context (earlier agents)",
                "",
                ...transcript.map(
                  (t) =>
                    `## ${t.name} (${t.role}) — \`${t.providerLabel} / ${t.model}\`\n\n${t.content}`
                ),
                "",
                "---",
                "",
                `# Your turn: ${agent.name} (${agent.role})`,
                "Build on the context above and produce ONLY your own deliverable. Do not repeat earlier content verbatim.",
              ].join("\n");

        try {
          let acc = "";
          const res = await callModel({
            modelValue: agent.model,
            systemPrompt: agent.systemPrompt,
            temperature: agent.temperature,
            history: [...history, { role: "user", content: pkg }],
            onDelta: (d) => {
              acc += d;
              appendStepDelta(msgId, i, d);
            },
            onReasoning: (d) => appendStepReasoning(msgId, i, d),
            signal: controller.signal,
          });
          const final = res.text || acc;
          patchStep(msgId, i, {
            status: "done",
            content: final,
            reasoning: res.reasoning || undefined,
            endedAt: new Date().toISOString(),
          });
          const t = resolveTarget(agent.model);
          transcript.push({
            name: agent.name,
            role: agent.role,
            model: t?.model.id || agent.model,
            providerLabel: t?.provider.label || "",
            content: final,
          });
          produced += 1;
        } catch (err) {
          const aborted = err?.name === "AbortError";
          patchStep(msgId, i, {
            status: aborted ? "aborted" : "error",
            error: aborted
              ? "Stopped by user."
              : err?.message || "Request failed",
            endedAt: new Date().toISOString(),
          });
          transcript.push({
            name: agent.name,
            role: agent.role,
            model: agent.model,
            providerLabel: "",
            content: `_(${agent.name} failed: ${err?.message || "error"})_`,
          });
          if (aborted) break;
        }
      }

      // Final synthesis
      const synthEnabled = synth?.enabled !== false;
      if (!controller.signal.aborted && synthEnabled && produced > 0) {
        patchSummary(msgId, { status: "streaming" });
        const pkg = [
          content,
          "",
          "---",
          "",
          "# Full team transcript",
          "",
          ...transcript.map(
            (t) => `## ${t.name} (${t.role}) — \`${t.model}\`\n\n${t.content}`
          ),
          "",
          "---",
          "",
          "Produce the consolidated final deliverable for the user now.",
        ].join("\n");
        try {
          let acc = "";
          let thought = "";
          const res = await callModel({
            modelValue: synth.model || agents[0].model,
            systemPrompt: synth.systemPrompt,
            temperature: synth.temperature ?? 0.4,
            history: [...history, { role: "user", content: pkg }],
            onDelta: (d) => {
              acc += d;
              patchSummary(msgId, { content: acc });
            },
            onReasoning: (d) => {
              thought += d;
              patchSummary(msgId, { reasoning: thought });
            },
            signal: controller.signal,
          });
          patchSummary(msgId, {
            status: "done",
            content: res.text || acc,
            reasoning: res.reasoning || thought,
          });
        } catch (err) {
          const aborted = err?.name === "AbortError";
          patchSummary(msgId, {
            status: aborted ? "skipped" : "error",
            error: aborted
              ? "Stopped by user."
              : err?.message || "Request failed",
          });
        }
      } else if (!synthEnabled) {
        patchSummary(msgId, { status: "skipped" });
      }

      patchMessage(msgId, { status: "done" });
      setBusy(false);
      abortRef.current = null;
    },
    [
      callModel,
      patchStep,
      appendStepDelta,
      appendStepReasoning,
      patchSummary,
      patchMessage,
      resolveTarget,
    ]
  );

  // ------------------------------------------------------------------ send
  const sendMessage = async ({ text, attachments }) => {
    const content = buildUserContent(text, attachments);
    const history = historyFrom(messages);

    if (mode === "single") {
      const mv = settings.singleModel || config?.defaultModelId;
      const target = mv ? resolveTarget(mv) : null;
      if (!target) {
        setModelsError("No model available — check models.json.");
        return;
      }
      if (!target.apiKey) {
        setDrawerOpen(true);
        return;
      }
      const assistantMsg = {
        id: uid(),
        role: "assistant",
        content: "",
        model: target.model.id,
        providerKey: target.provider.key,
        providerLabel: target.provider.label,
        status: "streaming",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "user",
          content: text,
          attachments,
          createdAt: new Date().toISOString(),
        },
        assistantMsg,
      ]);
      await runSingle({
        history,
        content,
        msgId: assistantMsg.id,
        mv,
        systemPrompt: settings.systemPrompt,
        temperature: settings.temperature,
      });
      return;
    }

    const agents = team.agents
      .filter((a) => a.enabled)
      .map((a) => ({
        id: uid(),
        name: a.name || "Agent",
        role: a.role || "",
        model: a.model || config?.defaultModelId,
        systemPrompt: a.systemPrompt,
        temperature: a.temperature,
      }));

    if (!agents.length) {
      alert("AI Team mode needs at least one enabled agent.");
      return;
    }

    // Warn early if any agent's provider is missing a key.
    const missing = [
      ...new Set(
        agents
          .map((a) => resolveTarget(a.model))
          .filter((t) => t && !t.apiKey)
          .map((t) => t.provider.label)
      ),
    ];
    if (missing.length) {
      alert(
        `These providers have no API key yet: ${missing.join(
          ", "
        )}. Add keys in Settings → Providers, or point those agents at a connected provider.`
      );
      setDrawerOpen(true);
      return;
    }

    const msgId = uid();
    const teamMsg = {
      id: msgId,
      role: "team",
      content: text,
      attachments,
      status: "streaming",
      createdAt: new Date().toISOString(),
      steps: agents.map((a) => {
        const t = resolveTarget(a.model);
        return {
          id: a.id,
          name: a.name,
          role: a.role,
          model: t?.model.id || a.model,
          providerLabel: t?.provider.label || "",
          content: "",
          status: "pending",
        };
      }),
      summary: {
        model:
          resolveTarget(team.synth.model)?.model.id ||
          resolveTarget(agents[0].model)?.model.id ||
          "",
        content: "",
        status: team.synth.enabled === false ? "skipped" : "pending",
      },
    };
    setMessages((prev) => [...prev, teamMsg]);
    await runTeam({
      history,
      content,
      msgId,
      agents,
      synth: { ...team.synth, model: team.synth.model || agents[0].model },
    });
  };

  const stop = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  const regenerate = (msgId) => {
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx < 1) return;
    const target = messages[idx];
    const prev = messages[idx - 1];
    const history = historyFrom(messages.slice(0, idx - 1));

    if (prev?.role === "team") {
      const agents = (prev.steps || []).map((s, i) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        model: team.agents[i]?.model || s.model,
        systemPrompt: team.agents[i]?.systemPrompt || "",
        temperature: team.agents[i]?.temperature,
      }));
      if (!agents.length) return;
      runTeam({
        history,
        content: buildUserContent(prev.content, prev.attachments),
        msgId: prev.id,
        agents,
        synth: { ...team.synth, model: team.synth.model || agents[0].model },
      });
      return;
    }

    // Rebuild the composite picker value from the stored provider + model id.
    const mv =
      target.providerKey && target.model
        ? modelValue(target.providerKey, target.model)
        : settings.singleModel;

    runSingle({
      history,
      content: buildUserContent(prev.content, prev.attachments),
      msgId,
      mv,
      systemPrompt: settings.systemPrompt,
      temperature: settings.temperature,
    });
  };

  // --------------------------------------------------------------- actions
  const exportChat = () => {
    downloadText(
      `chat-${stamp()}.md`,
      conversationToMarkdown(messages, {
        mode,
        model: resolveTarget(settings.singleModel)?.model.id || settings.singleModel,
        endpoint: resolveTarget(settings.singleModel)?.endpoint || "",
      })
    );
  };

  const clearHistory = () => {
    setMessages([]);
    setResetSignal((n) => n + 1);
  };

  const onModelsFile = async (file) => {
    try {
      const json = JSON.parse(await file.text());
      await loadModels(null, json);
    } catch (err) {
      setModelsError(`Invalid models.json: ${err?.message}`);
    }
  };

  const onProviderKeyChange = (providerKey, value) => {
    setProviderKeys((prev) => {
      const next = { ...prev };
      if (value) next[providerKey] = value;
      else delete next[providerKey];
      return next;
    });
  };

  const onLiveModels = (providerKey, models) => {
    setLiveModels((prev) => ({ ...prev, [providerKey]: models }));
  };

  const setCustomProvider = (v) =>
    setSettings((s) => ({ ...s, customProvider: v }));

  // --------------------------------------------------------------- derived
  const selectedTarget = resolveTarget(settings.singleModel);
  const selectedHasKey = selectedTarget ? !!selectedTarget.apiKey : false;
  const connectedCount = (config?.providers || []).filter(
    (p) => providerKeys[p.key]
  ).length;

  const disabledReason = !config
    ? "Loading model registry…"
    : config.providers.length === 0
    ? "No providers configured"
    : config.models.length === 0
    ? "No models available"
    : mode === "single" && !settings.singleModel
    ? "Select a model"
    : mode === "single" && !selectedHasKey
    ? `Add a ${selectedTarget?.provider.label || ""} API key in Settings`
    : null;

  const placeholder =
    mode === "single"
      ? "Ask anything — paste long code or drop a .py/.js/.json file…"
      : "Describe the task for your AI team (e.g. “Build a FastAPI rate limiter with tests”)…";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        mode={mode}
        setMode={setMode}
        theme={settings.theme}
        toggleTheme={() =>
          setSettings((s) => ({
            ...s,
            theme: s.theme === "dark" ? "light" : "dark",
          }))
        }
        onOpenSettings={() => setDrawerOpen(true)}
        onExport={exportChat}
        onClear={() => {
          if (confirm("Clear the conversation?")) clearHistory();
        }}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        hasMessages={messages.length > 0}
        keyReady={mode === "team" ? connectedCount > 0 : selectedHasKey}
        keyLabel={
          mode === "team"
            ? `${connectedCount}/${(config?.providers || []).length} providers`
            : selectedHasKey
            ? `${selectedTarget?.provider.label} ready`
            : "no key"
        }
      />

      <div className="relative flex min-h-0 flex-1">
        <main
          ref={scrollRef}
          className="flex min-w-0 flex-1 flex-col overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-4xl flex-1 px-3 py-4">
            {messages.length === 0 ? (
              <div className="mx-auto max-w-2xl py-10">
                <div
                  className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl text-white"
                  style={{ background: "var(--brand)" }}
                >
                  <Sparkles size={22} />
                </div>
                <h2 className="text-2xl font-bold">
                  {mode === "single" ? "Single Chat Mode" : "AI Team Mode"}
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                  {mode === "single"
                    ? "One model, full control. Stream answers, download any response as Markdown, and grab individual code files straight from the message."
                    : "A pipeline of specialised agents — planner, coder, reviewer — each with its own model and system prompt, handing off work until a final synthesis."}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: Bot,
                      title: "Mix providers",
                      body: "Token Harbor, Groq, OpenRouter, Gemini and any custom OpenAI-compatible endpoint — each with its own key.",
                    },
                    {
                      icon: Users,
                      title: "Sequential handoff",
                      body: "Each agent sees the task plus all prior output, then the Lead merges it.",
                    },
                    {
                      icon: Layers,
                      title: "Export anything",
                      body: "Download a run as .md, or pull a single code block out as a real file.",
                    },
                  ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="card p-3">
                      <Icon size={16} style={{ color: "var(--brand)" }} />
                      <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                        {body}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={() => setDrawerOpen(true)}
                  >
                    <Wrench size={14} />
                    {connectedCount > 0
                      ? "Manage providers"
                      : "Connect a provider to start"}
                  </button>
                  {connectedCount > 0 && (
                    <span className="chip" style={{ color: "var(--ok)" }}>
                      {connectedCount} provider{connectedCount === 1 ? "" : "s"}{" "}
                      connected · {config?.models.length || 0} models
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((m) => (
                  <MessageItem
                    key={m.id}
                    message={m}
                    fileCardMode={settings.fileCardMode}
                    onRegenerate={mode === "single" ? regenerate : undefined}
                    onDelete={() =>
                      setMessages((prev) => prev.filter((x) => x.id !== m.id))
                    }
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="sticky bottom-0 px-3 pb-3">
            <div className="mx-auto w-full max-w-4xl">
              <Composer
                onSend={sendMessage}
                onStop={stop}
                busy={busy}
                disabledReason={disabledReason}
                placeholder={placeholder}
                resetSignal={resetSignal}
              />
            </div>
          </div>
        </main>

        {/* Desktop sidebar */}
        <aside
          className="hidden w-[350px] shrink-0 overflow-y-auto xl:block"
          style={{
            borderLeft: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          <SidePanel
            mode={mode}
            config={config}
            settings={settings}
            setSettings={setSettings}
            singleModel={settings.singleModel}
            setSingleModel={(v) => setSettings((s) => ({ ...s, singleModel: v }))}
            team={team}
            setTeam={setTeam}
            providerKeys={providerKeys}
          />
        </aside>

        {/* Mobile / narrow sidebar */}
        {sidebarOpen && (
          <>
            <div
              className="absolute inset-0 z-20 bg-black/30 xl:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className="absolute right-0 top-0 z-30 h-full w-[350px] max-w-[85vw] overflow-y-auto xl:hidden"
              style={{
                background: "var(--surface)",
                borderLeft: "1px solid var(--line)",
              }}
            >
              <div
                className="sticky top-0 flex items-center justify-between px-3 py-2"
                style={{
                  background: "var(--panel)",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <span className="text-sm font-semibold">Workspace</span>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => setSidebarOpen(false)}
                >
                  Close
                </button>
              </div>
              <SidePanel
                mode={mode}
                config={config}
                settings={settings}
                setSettings={setSettings}
                singleModel={settings.singleModel}
                setSingleModel={(v) =>
                  setSettings((s) => ({ ...s, singleModel: v }))
                }
                team={team}
                setTeam={setTeam}
                providerKeys={providerKeys}
              />
            </aside>
          </>
        )}
      </div>

      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        settings={settings}
        setSettings={setSettings}
        config={config}
        providerKeys={providerKeys}
        onProviderKeyChange={onProviderKeyChange}
        customProvider={{
          ...DEFAULT_CUSTOM_PROVIDER,
          ...(settings.customProvider || {}),
        }}
        onCustomProviderChange={setCustomProvider}
        liveModels={liveModels}
        onLiveModels={onLiveModels}
        onReloadModels={(url) => loadModels(url)}
        onModelsFile={onModelsFile}
        modelsError={modelsError}
        loadingModels={loadingModels}
        onClearHistory={clearHistory}
        onForgetAllKeys={() => setProviderKeys({})}
      />
    </div>
  );
}
