export const DEFAULT_SETTINGS = {
  modelsUrl: "/models.json",
  singleModel: "",
  theme: "light",
  temperature: 0.7,
  maxTokens: 2048,
  stream: true,
  fileCardMode: false,
  systemPrompt:
    "You are a senior full-stack engineer and pair-programming partner. " +
    "Answer with concrete, production-ready code and concise explanations. " +
    "When you output code, always wrap it in a fenced block and include the " +
    "language tag plus a suggested filename (e.g. ```python:main.py).",
  finalSynthesis: true,
};

/**
 * The custom provider is user-defined, so it lives in settings rather than in
 * the bundled models.json. Base URL, endpoint and model IDs are all editable.
 */
export const DEFAULT_CUSTOM_PROVIDER = {
  label: "Custom provider",
  baseUrl: "",
  chatEndpoint: "/chat/completions",
  modelsEndpoint: "/models",
  models: [], // [{ id, label }]
};

export const AGENT_PRESETS = {
  architect: {
    name: "Architect",
    role: "Planner",
    temperature: 0.4,
    systemPrompt:
      "You are the team architect. Break the user's request into a precise, " +
      "minimal technical plan: requirements, architecture, file layout, data " +
      "flow, edge cases and risks. Be concrete and terse. Output Markdown only, " +
      "no filler. Do not write the full implementation — the Developer will.",
  },
  developer: {
    name: "Developer",
    role: "Coder",
    temperature: 0.5,
    systemPrompt:
      "You are the team's senior developer. Implement the architect's plan " +
      "faithfully. Produce complete, runnable, production-ready code in fenced " +
      "blocks with language tags and filenames. Note assumptions briefly.",
  },
  reviewer: {
    name: "Reviewer",
    role: "QA",
    temperature: 0.3,
    systemPrompt:
      "You are the team's reviewer and QA engineer. Critically review the " +
      "implementation: correctness, security, performance, edge cases, style. " +
      "Give a bug list with severity, then produce the corrected final code " +
      "when changes are needed. End with a short verdict.",
  },
  synthesizer: {
    name: "Lead",
    role: "Synthesizer",
    temperature: 0.4,
    systemPrompt:
      "You are the team lead. Merge the agent outputs into one clean, final " +
      "deliverable for the user: a short summary, the final code/decision, and " +
      "any caveats. Drop internal debate. Be complete but concise.",
  },
};

let uid = 0;
export function makeAgent(presetKey = "architect") {
  const preset = AGENT_PRESETS[presetKey] || AGENT_PRESETS.architect;
  uid += 1;
  return {
    id: `agent-${Date.now().toString(36)}-${uid}`,
    preset: presetKey,
    name: preset.name,
    role: preset.role,
    temperature: preset.temperature,
    systemPrompt: preset.systemPrompt,
    model: "", // resolved to the registry default at runtime
    enabled: true,
  };
}

export function defaultTeam() {
  return [
    makeAgent("architect"),
    makeAgent("developer"),
    makeAgent("reviewer"),
  ];
}
