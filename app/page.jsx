"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Layers, Sparkles, Users, Wrench } from "lucide-react";
import Header from "@/components/Header";
import SidePanel from "@/components/SidePanel";
import SettingsDrawer from "@/components/SettingsDrawer";
import Composer from "@/components/Composer";
import MessageItem from "@/components/MessageItem";
import { load, save, STORAGE_KEYS } from "@/lib/storage";
import { DEFAULT_SETTINGS, defaultTeam, AGENT_PRESETS } from "@/lib/defaults";
import { fetchModelConfig, normalizeModelConfig } from "@/lib/models";
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
      out.push({ role: "user", content: buildUserContent(m.content, m.attachments) });
    } else if (m.role === "assistant") {
      if (m.content && !m.error) out.push({ role: "assistant", content: m.content });
    } else if (m.role === "team") {
      out.push({ role: "user", content: buildUserContent(m.content, m.attachments) });
      if (m.summary?.content) out.push({ role: "assistant", content: m.summary.content });
    }
  }
  return out;
}

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
    singleModel: "",
    theme: "light",
  });
  const [team, setTeam] = useState(EMPTY_TEAM);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("single");

  const [modelConfig, setModelConfig] = useState(null);
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
    setApiKey(load(STORAGE_KEYS.apiKey, ""));
    const savedSettings = load(STORAGE_KEYS.settings, null);
    if (savedSettings) setSettings((s) => ({ ...s, ...savedSettings }));
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
    if (hydrated) save(STORAGE_KEYS.apiKey, apiKey);
  }, [apiKey, hydrated]);

  // ----------------------------------------------------------------- theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [settings.theme]);

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
          const url = overrideUrl || settings.modelsUrl;
          if (url && url.startsWith("data:")) {
            throw new Error("Unsupported models source");
          }
          cfg = await fetchModelConfig(url);
        }
        setModelConfig(cfg);
        setSettings((s) =>
          s.singleModel && cfg.models.some((m) => m.id === s.singleModel)
            ? s
            : { ...s, singleModel: cfg.defaultModelId }
        );
        setTeam((t) =>
          t.agents.some((a) => a.model)
            ? t
            : { ...t, agents: t.agents.map((a) => ({ ...a, model: cfg.defaultModelId })) }
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
      setModelConfig(normalizeModelConfig(custom));
      setSettings((s) =>
        s.singleModel ? s : { ...s, singleModel: normalizeModelConfig(custom).defaultModelId }
      );
    } else {
      loadModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------- scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 220;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // ---------------------------------------------------------------- helpers
  const patchMessage = useCallback((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const patchStep = useCallback((msgId, index, patch) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, steps: m.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) }
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
                i === index ? { ...s, reasoning: (s.reasoning || "") + delta } : s
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

  const callModel = useCallback(
    async ({ model, systemPrompt, temperature, history, onDelta, onReasoning, signal }) => {
      return streamChat(
        {
          apiKey,
          endpoint: settings.endpoint,
          model,
          messages: [{ role: "system", content: systemPrompt || "" }, ...history],
          temperature: temperature ?? settings.temperature,
          max_tokens: settings.maxTokens,
          stream: settings.stream !== false,
        },
        { onDelta, onReasoning, signal }
      );
    },
    [apiKey, settings.endpoint, settings.temperature, settings.maxTokens, settings.stream]
  );

  const models = useMemo(
    () =>
      modelConfig?.enabledModels?.length ? modelConfig.enabledModels : modelConfig?.models || [],
    [modelConfig]
  );

  // ------------------------------------------------------------ single chat
  const runSingle = useCallback(
    async ({ history, content, msgId, model, systemPrompt, temperature }) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);
      patchMessage(msgId, { content: "", reasoning: "", status: "streaming", error: null });
      try {
        let acc = "";
        let thought = "";
        const res = await callModel({
          model,
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
        patchStep(msgId, i, { status: "streaming", startedAt: new Date().toISOString() });

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
                  (t) => `## ${t.name} (${t.role}) — \`${t.model}\`\n\n${t.content}`
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
            model: agent.model,
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
          transcript.push({
            name: agent.name,
            role: agent.role,
            model: agent.model,
            content: final,
          });
          produced += 1;
        } catch (err) {
          const aborted = err?.name === "AbortError";
          patchStep(msgId, i, {
            status: aborted ? "aborted" : "error",
            error: aborted ? "Stopped by user." : err?.message || "Request failed",
            endedAt: new Date().toISOString(),
          });
          transcript.push({
            name: agent.name,
            role: agent.role,
            model: agent.model,
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
            model: synth.model || agents[0].model,
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
            error: aborted ? "Stopped by user." : err?.message || "Request failed",
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
    ]
  );

  // ------------------------------------------------------------------ send
  const sendMessage = async ({ text, attachments }) => {
    if (!apiKey) {
      setDrawerOpen(true);
      return;
    }
    const content = buildUserContent(text, attachments);
    const history = historyFrom(messages);

    if (mode === "single") {
      const model = settings.singleModel || modelConfig?.defaultModelId || models[0]?.id;
      if (!model) {
        setModelsError("No model available — check models.json.");
        return;
      }
      const assistantMsg = {
        id: uid(),
        role: "assistant",
        content: "",
        model,
        status: "streaming",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, { id: uid(), role: "user", content: text, attachments, createdAt: new Date().toISOString() }, assistantMsg]);
      await runSingle({
        history,
        content,
        msgId: assistantMsg.id,
        model,
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
        model: a.model || models[0]?.id || modelConfig?.defaultModelId,
        systemPrompt: a.systemPrompt,
        temperature: a.temperature,
      }));

    if (!agents.length) {
      alert("AI Team mode needs at least one enabled agent.");
      return;
    }
    if (!models.length) {
      setModelsError("No model available — check models.json.");
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
      steps: agents.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        model: a.model,
        content: "",
        status: "pending",
      })),
      summary: {
        model: team.synth.model || models[0]?.id,
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
      synth: {
        ...team.synth,
        model: team.synth.model || models[0]?.id,
      },
    });
  };

  const stop = () => {
    abortRef.current?.abort();
    setBusy(false);
  };

  const regenerate = (msgId) => {
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx < 1) return;
    const prev = messages[idx - 1];
    const history = historyFrom(messages.slice(0, idx - 1));
    if (prev?.role === "team") {
      // Re-run the whole pipeline with the same task.
      const agents = (prev.steps || []).map((s, i) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        model: s.model,
        systemPrompt: team.agents[i]?.systemPrompt || "",
        temperature: team.agents[i]?.temperature,
      }));
      if (!agents.length) return;
      runTeam({
        history,
        content: buildUserContent(prev.content, prev.attachments),
        msgId: prev.id,
        agents,
        synth: { ...team.synth, model: team.synth.model || models[0]?.id },
      });
      return;
    }
    runSingle({
      history,
      content: buildUserContent(prev.content, prev.attachments),
      msgId,
      model: messages[idx].model || settings.singleModel,
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
        model: settings.singleModel,
        endpoint: settings.endpoint,
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

  const disabledReason = !apiKey
    ? "Add your API key in Settings first"
    : models.length === 0
    ? "No models loaded"
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
          setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))
        }
        onOpenSettings={() => setDrawerOpen(true)}
        onExport={exportChat}
        onClear={() => {
          if (confirm("Clear the conversation?")) clearHistory();
        }}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        hasMessages={messages.length > 0}
        keyReady={!!apiKey}
      />

      <div className="relative flex min-h-0 flex-1">
        <main ref={scrollRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto">
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
                      title: "Model switching",
                      body: "Every picker is built from models.json at runtime — swap the file and the UI follows.",
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
                {!apiKey && (
                  <button
                    className="btn btn-primary mt-6"
                    onClick={() => setDrawerOpen(true)}
                  >
                    <Wrench size={14} /> Add your API key to start
                  </button>
                )}
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
          style={{ borderLeft: "1px solid var(--line)", background: "var(--surface)" }}
        >
          <SidePanel
            mode={mode}
            modelConfig={modelConfig}
            settings={settings}
            setSettings={setSettings}
            singleModel={settings.singleModel}
            setSingleModel={(v) => setSettings((s) => ({ ...s, singleModel: v }))}
            team={team}
            setTeam={setTeam}
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
                style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}
              >
                <span className="text-sm font-semibold">Workspace</span>
                <button className="btn btn-xs btn-ghost" onClick={() => setSidebarOpen(false)}>
                  Close
                </button>
              </div>
              <SidePanel
                mode={mode}
                modelConfig={modelConfig}
                settings={settings}
                setSettings={setSettings}
                singleModel={settings.singleModel}
                setSingleModel={(v) => setSettings((s) => ({ ...s, singleModel: v }))}
                team={team}
                setTeam={setTeam}
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
        apiKey={apiKey}
        setApiKey={setApiKey}
        modelConfig={modelConfig}
        onReloadModels={(url) => loadModels(url)}
        onModelsFile={onModelsFile}
        modelsError={modelsError}
        loadingModels={loadingModels}
        onClearHistory={clearHistory}
      />
    </div>
  );
}
