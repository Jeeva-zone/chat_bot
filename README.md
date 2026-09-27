# Token Harbor · AI Team Studio

A modern, developer-centric AI chat workspace with **single-agent** and **multi-agent
team** workflows, built on any OpenAI-compatible endpoint.

Built with Next.js 14 (App Router), Tailwind CSS, Lucide Icons and highlight.js.

---

## Features

### 1. API configuration & connection tester
- API key stored in `localStorage` (never sent anywhere but your chosen endpoint).
- **Test** button fires a minimal `max_tokens: 5` request and reports a clear badge:
  `Connected successfully! Status: 200 OK`, or a diagnostic failure with the
  upstream status, latency, and error detail.
- Editable endpoint — defaults to `https://tokenharbor.ai/v1/chat/completions`.
- All upstream calls are proxied through the app's own server routes, so
  **browser CORS is never an issue**.

### 2. Dynamic model selection (`models.json`)
- `models.json` is fetched at runtime from `/models.json`, so you can swap the file
  without rebuilding.
- Also supports uploading a local `models.json`, or pointing at a remote URL
  (fetched through a server-side proxy).
- Model pickers everywhere are generated from that file.

### 3. AI team / agent collaboration mode
- Toggle between **Single Chat** and **AI Team**.
- Define a custom pipeline: add, remove, rename and reorder-capable agents.
- Built-in role presets — **Architect / Planner**, **Developer / Coder**,
  **Reviewer / QA** — or write your own role + system prompt.
- Assign a **different model and temperature to each agent**.
- Sequential collaborative execution: Agent 1 produces the plan → Agent 2 receives
  the task *plus* Agent 1's output → Agent 3 reviews → a **final synthesis** pass
  merges everything into one deliverable.
- Step-by-step UI: collapsible accordions per agent, live streaming inside each
  one, duration + model + char count per step, then the consolidated summary.

### 4. Output & download
- **Download as `.md`** on every assistant message and on every team run.
- Per code block: **Copy** (with "Copied!" feedback) and **Download** as a real file
  (`python:hello.py` → `hello.py`, `javascript` → `.js`, and ~40 more languages).
- Global **"Output as downloadable file"** switch renders code blocks as collapsible
  file cards instead of raw text.

### 5. Code display & long input
- Syntax highlighting via highlight.js with light/dark-aware token colors.
- Paste anything over **2,000 characters** and it automatically collapses into an
  expandable attachment card inside the composer.
- Upload `.txt`, `.md`, `.js`, `.py`, `.json`, `.html`, `.css`, and more (multi-select
  + drag & drop).
- A collapsible **Reasoning** panel surfaces `reasoning_content` from thinking models
  (Qwen / DeepSeek style), so the UI never looks frozen while the model thinks.

---

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000, then:

1. Click the **gear icon** to open Settings.
2. Paste your API key.
3. Click **Test** — you should see a green `200 OK` badge.
4. Start chatting, or flip the toggle to **AI Team** and describe a task.

### Production

```bash
npm run build
npm start
```

---

## Project structure

```
app/
  layout.jsx              Root layout + metadata
  page.jsx                Main orchestrator (state, streaming, pipeline)
  globals.css             Theme tokens, component classes, hljs theme
  api/
    chat/route.js         Streaming proxy to /chat/completions
    test/route.js         Minimal connection tester
    models/route.js       Proxy for remotely hosted models.json
components/
  Header.jsx              Top bar, mode toggle, theme switch
  SidePanel.jsx           Workspace panel (model, prompt, output options)
  SettingsDrawer.jsx      API key, endpoint, test, model registry, session
  TeamBuilder.jsx         Agent pipeline editor
  Composer.jsx            Input, attachments, long-paste collapsing
  MessageItem.jsx         Message shell + per-message actions
  TeamRun.jsx             Step accordions + final synthesis
  Markdown.jsx            Markdown renderer
  CodeBlock.jsx           Highlighted code + copy/download
  ReasoningBlock.jsx      Collapsible chain-of-thought panel
lib/
  models.js               models.json normalisation
  client.js               SSE stream reader
  markdown.js             Dependency-free Markdown → HTML (XSS-safe)
  download.js             Blob downloads + filename inference
  export.js               Markdown serialisation
  storage.js              Namespaced localStorage helpers
public/
  models.json             Model registry
```

---

## Configuration reference

`models.json` accepts this shape. Only `models` is required; everything else has
sensible defaults, and unknown keys are ignored.

```json
{
  "provider": {
    "name": "tokenharbor",
    "base_url": "https://tokenharbor.ai/v1",
    "chat_endpoint": "/chat/completions",
    "api_style": "openai-compatible"
  },
  "models": {
    "qwen": {
      "id": "qwen3.8-flash:free",
      "enabled": true,
      "modalities": ["text", "image", "video"],
      "use_for": ["general_text", "image_understanding"]
    }
  },
  "routing": { "text": ["qwen"], "image": ["qwen"], "video": ["qwen"] },
  "defaults": { "text": "qwen", "image": "qwen", "video": "qwen" }
}
```

Each entry under `models` is keyed by a short alias. `routing.text` controls the
display order of the model pickers, and `defaults.text` selects the initial model.
Set `"enabled": false` to hide a model without deleting it.

---

## Security notes

- **Your API key lives in `localStorage` under the `th-studio:` prefix** and is sent
  only to the endpoint you configure, via the app's own server proxy.
- If you deploy this publicly, anyone with access to the deployment can enter their
  own key — but your key is never baked into the build. Keep `.env` files out of git
  (already covered by `.gitignore`).
- Model output is escaped before Markdown rendering, so a model cannot inject HTML
  or scripts into the page.
