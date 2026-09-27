# Token Harbor · AI Team Studio

A modern, developer-centric AI chat workspace with **single-agent** and **multi-agent
team** workflows, built on any OpenAI-compatible endpoint.

Built with Next.js 14 (App Router), Tailwind CSS, Lucide Icons and highlight.js.

**Live repo:** https://github.com/Jeeva-zone/chat_bot

---

## Table of contents

- [What this app does](#what-this-app-does)
- [Quick start (5 minutes)](#quick-start-5-minutes)
- [Full user guide](#full-user-guide)
  - [1. The interface at a glance](#1-the-interface-at-a-glance)
  - [2. Setting up your API key](#2-setting-up-your-api-key)
  - [3. Testing the connection](#3-testing-the-connection)
  - [4. Single Chat mode](#4-single-chat-mode)
  - [5. AI Team mode](#5-ai-team-mode)
  - [6. Working with code](#6-working-with-code)
  - [7. Downloading and exporting](#7-downloading-and-exporting)
  - [8. Long input, paste and file upload](#8-long-input-paste-and-file-upload)
  - [9. Settings reference](#9-settings-reference)
- [Configuration reference (`models.json`)](#configuration-reference-modelsjson)
- [Customisation recipes](#customisation-recipes)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Roadmap / known limits](#roadmap--known-limits)
- [License](#license)

---

## What this app does

Token Harbor AI Team Studio is a self-hosted chat interface that talks to **any
OpenAI-compatible API**. It adds three things a plain chat window does not have:

1. **A connection tester** that proves your key and endpoint work before you waste
   time debugging a prompt.
2. **An AI Team mode** where several models work a task in sequence — a planner, a
   coder, a reviewer — each with its own model, temperature and system prompt, ending
   in one merged deliverable.
3. **Real file output.** Every response can be exported as Markdown, and every code
   block can be copied or saved as an actual file with the right extension.

Everything runs locally or on your own server. Your API key never leaves your browser
except to reach the endpoint you configured.

---

## Quick start (5 minutes)

### Prerequisites

- **Node.js 18.17 or newer** (Node 22 recommended). Check with `node -v`.
- npm (ships with Node) or pnpm/yarn if you prefer.
- An API key from an OpenAI-compatible provider.

### 1. Install

```bash
git clone https://github.com/Jeeva-zone/chat_bot.git
cd chat_bot
npm install
```

### 2. Run it

```bash
npm run dev
```

You should see:

```
▲ Next.js 14
- Local:        http://localhost:3000
✓ Ready
```

### 3. Open and connect

1. Go to **http://localhost:3000**.
2. Click the **gear icon** (top right) to open Settings.
3. Paste your API key into the **Token Harbor API key** field.
4. Click **Test**.
5. You want a green badge reading **"Connected successfully! Status: 200 OK"**.

### 4. Chat

Close the settings panel, type into the box at the bottom, and press **Enter**.

That's it. For the multi-agent workflow, see [AI Team mode](#5-ai-team-mode).

### Production build

```bash
npm run build
npm start
```

Serves the optimised build on port 3000. To use a different port, run
`npm start -- -p 8080`.

---

## Full user guide

### 1. The interface at a glance

The screen has four regions:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER                                                      │
│  logo · [Single Chat | AI Team] · key status · actions       │
├────────────────────────────────────────┬─────────────────────┤
│                                        │                     │
│   CONVERSATION                         │   WORKSPACE PANEL   │
│   messages stream in here,             │   model picker      │
│   newest at the bottom                 │   system prompt     │
│                                        │   team builder      │
│                                        │   output options    │
│                                        │   provider info     │
│                                        │                     │
├────────────────────────────────────────┤                     │
│  COMPOSER  (attach · type · send)      │                     │
└────────────────────────────────────────┴─────────────────────┘
```

**Header controls, left to right:**

| Control | What it does |
|---|---|
| **TH** logo + title | App identity |
| **Single Chat / AI Team** | Switches between the two modes |
| **key ready / no key** badge | Green dot = a key is stored; amber = none yet |
| **Export chat** | Downloads the whole conversation as a `.md` file (disabled when empty) |
| **Trash icon** | Clears the conversation |
| **Moon / Sun icon** | Toggles dark and light theme |
| **Gear icon** | Opens the Settings drawer |
| **Panel icon** | Opens the workspace panel on narrow screens |

> **Note on the workspace panel:** on wide screens (≥1280px) it is always visible on
> the right. On narrower windows it hides and you open it with the panel icon in the
> header. This is the single most common source of "where did my options go?" —
> it hasn't gone anywhere, the window is just narrow.

---

### 2. Setting up your API key

Open **Settings** (gear icon) → **API credentials**.

1. **Token Harbor API key** — paste your key. It is masked by default; click the
   **eye icon** to reveal it. This is stored in your browser's `localStorage`, not on
   any server.
2. **Chat completions endpoint** — already filled in with
   `https://tokenharbor.ai/v1/chat/completions`. Change it if you use a different
   provider.

**Where the key lives:** `localStorage` key `th-studio:apiKey`. It survives page
reloads and browser restarts, but is scoped to the origin (`localhost:3000`), so a
different port or domain will need the key entered again.

**To remove it:** Settings → **Session** → **Forget API key**.

> **Formatting tip:** the endpoint field accepts either a full path
> (`https://host/v1/chat/completions`) or just a base URL (`https://host/v1`). If you
> give it a base URL, `/chat/completions` is appended for you. A bare host like
> `api.example.com` gets `https://` prepended and the path added.

---

### 3. Testing the connection

Next to the key field is the **Test** button. Click it and one of these appears:

**Success:**

```
✓ Connected successfully! Status: 200 OK
  endpoint: https://tokenharbor.ai/v1/chat/completions
  status:   200 OK
  latency:  2539 ms
  model:    qwen3.8-flash:free
  reply:    "OK"
```

**Failure:**

```
⚠ Connection failed: invalid or unauthorized API key.
  endpoint: https://tokenharbor.ai/v1/chat/completions
  status:   401 Unauthorized
  latency:  640 ms
  detail:   Invalid or revoked API key. Rotate your key at ...
```

The test sends the smallest possible request — a single message, `max_tokens: 5` —
so it costs almost nothing and returns in seconds. What it proves:

| Observation | Meaning |
|---|---|
| `200 OK` + a reply string | Key, endpoint, model name and network path all work |
| `401` / `403` | Key is wrong, expired or revoked |
| `404` | Endpoint path is wrong (check for `/v1` in the URL) |
| `429` | Rate limited — wait and retry |
| Timeout or "network unreachable" | The server cannot reach the provider (firewall, DNS, offline) |

> Because the request is proxied by the app's own server, a successful test also
> proves the **server** has network access — not just your browser.

---

### 4. Single Chat mode

This is the default mode: one model, one system prompt, a normal back-and-forth.

**Setup (workspace panel → Agent):**

| Field | Purpose |
|---|---|
| **Model** | Picked from `models.json`. Model cards below the picker show the ID, whether it is a free tier, supported modalities, and what it is suited for |
| **System prompt** | Instructions that apply to every turn in this conversation |
| **Temperature** | Randomness slider, `0.00`–`1.50`. Low = deterministic, high = creative |
| **Max tokens** | Upper bound on the reply length |

**Recommended temperature by task:**

| Task | Temperature |
|---|---|
| Extraction, classification, strict formatting | `0.0 – 0.3` |
| Code generation, refactoring | `0.3 – 0.6` |
| Explanations, writing, brainstorming | `0.7 – 1.0` |
| Creative / divergent ideation | `1.0 – 1.3` |

**Sending a message:**

- Press **Enter** to send.
- Press **Shift+Enter** for a newline inside the message.
- The char counter under the box shows your current input length.

**While it is generating:**

- Text streams in token by token.
- The Send button becomes **Stop** — click it to abort mid-generation.
- If the model is a "thinking" model (Qwen / DeepSeek style), a **Reasoning** panel
  appears above the answer showing the chain of thought. It is collapsed by default;
  click it to read, and note the char count so you know something is happening.
- The message header shows a `streaming…` chip while in flight.

**Per-message actions** (top-right of every reply):

| Button | Action |
|---|---|
| **Copy** | Copies the raw Markdown to your clipboard; flips to "Copied!" |
| **.md** | Downloads that single message as a Markdown file |
| **Refresh** | Regenerates the reply using the same prompt and history |
| **Trash** | Deletes that message |

Context is maintained: each request sends the whole conversation plus your system
prompt, so follow-up questions keep their thread.

---

### 5. AI Team mode

Flip the header toggle to **AI Team**. The workspace panel changes from a single
agent to a pipeline editor.

#### How the pipeline works

```
        ┌─────────────────────────────────────────────────────┐
        │  Your task                                          │
        └───────────────────────┬─────────────────────────────┘
                                ▼
        ┌─────────────────────────────────────────────────────┐
        │  Step 1 — Architect (model A, temp 0.4)             │
        │  Plans: requirements, file layout, risks            │
        └───────────────────────┬─────────────────────────────┘
                                ▼  task + step 1 output
        ┌─────────────────────────────────────────────────────┐
        │  Step 2 — Developer (model B, temp 0.5)             │
        │  Implements the plan as complete code               │
        └───────────────────────┬─────────────────────────────┘
                                ▼  task + steps 1–2 output
        ┌─────────────────────────────────────────────────────┐
        │  Step 3 — Reviewer (model C, temp 0.3)              │
        │  Finds bugs, verifies, corrects                     │
        └───────────────────────┬─────────────────────────────┘
                                ▼  full transcript
        ┌─────────────────────────────────────────────────────┐
        │  Final synthesis (Lead)                             │
        │  One merged deliverable: summary + final code       │
        └─────────────────────────────────────────────────────┘
```

Each agent **receives the original task plus every earlier agent's full output**, so
the work refines rather than restarts. The final synthesis pass drops the internal
debate and produces a single clean answer.

#### Running a team task

1. Switch to **AI Team**.
2. (Optional) adjust the pipeline — see below.
3. Type your task in the composer. Be specific:
   > *"Build a FastAPI service with JWT auth, a `/users` CRUD endpoint, and pytest
   > tests. Target Python 3.12."*
4. Press **Enter**.

#### Reading the results

Steps appear as **collapsible accordions**, one per agent:

```
▸ 1. Architect   [Planner]  qwen3.8-flash:free        4.2s   1,240 chars
▾ 2. Developer   [Coder]    deepseek-v4.1-flash:free  11.8s  3,910 chars
      ┌ Reasoning (optional, collapsed)
      └ The actual output, with syntax-highlighted code blocks
        [Copy] [Download]                    [Download step]
▸ 3. Reviewer    [QA]       qwen3.8-flash:free        6.5s   2,050 chars
```

- The **first step auto-expands**; the rest are collapsed.
- A **streaming step auto-expands** and shows a spinner.
- Each header shows model, role, elapsed time and output size.
- Click any header to collapse or expand it.

Below the steps is the **Final synthesis** block, highlighted in the brand colour,
containing the merged deliverable.

A status strip above the steps reads `N/M steps complete` and shows a
`running pipeline` chip while in flight.

#### Editing the pipeline (workspace panel)

**Adding an agent** — click **+ Agent**. A new Developer agent is appended.

**Configuring an agent:**

| Control | Purpose |
|---|---|
| Name | Display name, e.g. `Architect` |
| Role | Short label shown as a chip, e.g. `Planner` |
| Checkbox | Include/exclude this agent without deleting it |
| Trash | Remove the agent |
| Model | Any model from `models.json` — **mix models freely** |
| Preset | Architect / Developer / Reviewer / Custom — loads a tuned prompt |
| Temp slider | Per-agent temperature |
| System prompt | Full instruction text for this agent only |

**Reset** — the circular-arrow button restores the default
Architect / Developer / Reviewer trio.

**Final synthesis** — toggle **Enabled** off to skip the merge pass (useful when you
want to see each agent's raw output separately). Set its model and prompt
independently.

> **Excluded agents** are skipped entirely and produce no step. If every agent is
> disabled, sending shows a warning instead of running.

#### Choosing models per role

A good default split, using the bundled registry:

| Role | Model | Why |
|---|---|---|
| Architect | `qwen3.8-flash:free` | Strong reasoning, fast, handles structure |
| Developer | `deepseek-v4.1-flash:free` | Strong at code generation |
| Reviewer | `qwen3.8-flash:free` | Good analytical pass |
| Synthesis | `qwen3.8-flash:free` | Needs to blend and summarise |

Using a **different model for the reviewer than the coder** is genuinely useful — it
gives you an independent critique rather than the same model agreeing with itself.

---

### 6. Working with code

Every fenced code block in a response renders as an interactive component:

```
┌────────────────────────────────────────────────────────────┐
│ PYTHON   12 lines · 318 B          [Copy] [Download]       │
├────────────────────────────────────────────────────────────┤
│  1  import json                                            │
│  2  def main():                                            │
│  3      print("hello")                                     │
└────────────────────────────────────────────────────────────┘
```

- **Copy** — puts the raw code (without line numbers) on your clipboard, then shows
  "Copied!" for a moment.
- **Download** — saves the code as a real file.

**Filename inference.** If the model tags its fence with a filename, that name is
used. In the system prompt we ask for the pattern ```` ```python:app.py ````, so you
get `app.py` rather than `snippet-1.py`.

If no name is given, the extension is derived from the language tag:

| Language tag | File |
|---|---|
| `python`, `py` | `.py` |
| `javascript`, `js` | `.js` |
| `typescript`, `ts` | `.ts` |
| `jsx` / `tsx` | `.jsx` / `.tsx` |
| `bash`, `sh`, `shell` | `.sh` |
| `json`, `html`, `css`, `sql`, `yaml`, `toml` | `.json`, `.html`, `.css`, `.sql`, `.yaml`, `.toml` |
| `go`, `rust`, `java`, `kotlin`, `swift` | `.go`, `.rs`, `.java`, `.kt`, `.swift` |
| `c`, `cpp`, `csharp`, `php`, `ruby` | `.c`, `.cpp`, `.cs`, `.php`, `.rb` |
| unknown / untagged | `.txt` |

Roughly 40 languages are mapped. A bare filename is slugified (`My Script` →
`my-script`).

#### File-card mode

Turn on **Workspace panel → Output → Output as downloadable file**.

Code blocks then render **collapsed** into a compact file card:

```
📄 app.py                     [Show] [Copy] [Download]
```

Click **Show** to expand the full source. This is the mode to use when a response is
mostly code and you want the overall structure readable — you see a list of file
cards, not a wall of syntax.

---

### 7. Downloading and exporting

Three levels of export:

| Level | Where | Result |
|---|---|---|
| **Single message** | `.md` button on any message | That one message as Markdown |
| **Single step** | `Download step` inside a team step | That agent's output as Markdown |
| **Full run** | `Download full run (.md)` in team mode | Task + every step + synthesis |
| **Whole conversation** | `Export chat` in the header | Everything, with metadata header |

**What's in a Markdown export:**

- A header with the export timestamp, mode, model and endpoint.
- Each message as `## User` / `## Assistant · <model>` with its timestamp.
- Attached files are embedded as fenced blocks, so the export is self-contained.
- Team runs become `## Step N — Name (Role)` sections with model, duration and output.
- Reasoning traces are included inside `<details>` blocks, so they stay collapsed in
  GitHub rendering but are there if you need them.
- Messages are separated by `---`.

Exports are named with a timestamp (`chat-20260928-063012.md`) so repeated downloads
never silently overwrite each other.

---

### 8. Long input, paste and file upload

**Pasting long text.** Paste anything over **2,000 characters** and it does not flood
the input box. Instead it is converted into an attachment card:

```
▸ 📄 pasted-snippet-1.txt   8,432 chars                    [×]
```

A short marker is left in the text box. Click the card's arrow to preview the first
lines, or the `×` to remove it. Your message sends with the full content attached.

**Uploading files.** Use the **paperclip** button, or just **drag and drop** files
onto the composer.

- Multiple files at once are supported.
- Accepted types include `.txt`, `.md`, `.json`, `.js`, `.jsx`, `.ts`, `.tsx`, `.py`,
  `.html`, `.css`, `.yaml`, `.yml`, `.toml`, `.csv`, `.sql`, `.sh`, `.ini`, `.env`,
  `.java`, `.go`, `.rs`, `.c`, `.cpp`, `.cs`, `.php`, `.rb`, `.xml`.
- Files up to 2 MB are read in full; larger ones are truncated to the first 2 MB with
  a warning.

**How attachments reach the model.** Each file is wrapped as a fenced code block in
the outgoing message:

````
Attached file `main.py` (1,204 chars):
```python:main.py
<contents>
```
````

This means the model sees the exact filename and language, which makes it much better
at producing edits to the right file.

**In the conversation**, attachments render as their own collapsible preview cards
under the user message, so long pastes do not dominate the scrollback.

---

### 9. Settings reference

Open with the **gear icon**.

#### API credentials
| Field | Notes |
|---|---|
| Token Harbor API key | Stored in `localStorage`; masked with an eye toggle |
| Chat completions endpoint | Full URL or base URL; path is auto-completed |
| **Test** | Runs the 5-token probe and shows the diagnostic badge |

#### Model registry
| Control | Purpose |
|---|---|
| **Upload models.json** | Replace the registry from a local file (saved to `localStorage`) |
| **Reload** | Re-fetch from the current source |
| **Reset source** | Go back to the bundled `/models.json` |
| URL field + **Load URL** | Fetch a registry from a remote URL, via the server proxy |

Loaded models are listed as chips with their ID, and `(disabled)` is shown for
entries with `"enabled": false`.

#### Generation
| Control | Notes |
|---|---|
| Temperature slider | `0.00`–`1.50`, applied to single chat |
| Max tokens | `16`–`32000` |
| Stream responses | On = live token streaming; off = one buffered reply |
| Output as downloadable file | Renders code blocks as collapsed file cards |

#### Session
| Button | Effect |
|---|---|
| **Clear conversation** | Empties the message list |
| **Forget API key** | Removes the key from `localStorage` |

Settings and the team definition persist automatically across reloads.

---

## Configuration reference (`models.json`)

The registry lives at `public/models.json` and is fetched at runtime, so you can edit
it and just refresh the page — **no rebuild required**.

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
      "input_types": ["text", "image", "video"],
      "use_for": ["general_text", "image_understanding", "video_understanding"]
    },
    "deepseek": {
      "id": "deepseek-v4.1-flash:free",
      "enabled": true,
      "modalities": ["text", "image"],
      "use_for": ["general_text", "image_understanding"]
    },
    "mimo": {
      "id": "mimo-v2.6-flash:free",
      "enabled": true,
      "modalities": ["text"],
      "use_for": ["general_text"]
    }
  },

  "routing": {
    "text":  ["qwen", "deepseek", "mimo"],
    "image": ["qwen", "deepseek"],
    "video": ["qwen"]
  },

  "defaults": {
    "text":  "qwen",
    "image": "qwen",
    "video": "qwen"
  }
}
```

### Field reference

| Field | Required | Meaning |
|---|---|---|
| `provider.base_url` | no | Base of the API. Default `https://tokenharbor.ai/v1` |
| `provider.chat_endpoint` | no | Path appended to `base_url`. Default `/chat/completions` |
| `models` | **yes** | The model registry |
| `models.<alias>.id` | **yes** | The exact model string sent to the API |
| `models.<alias>.enabled` | no | `false` hides it from all pickers (default `true`) |
| `models.<alias>.label` | no | Display name. Auto-generated from the alias if omitted |
| `models.<alias>.modalities` | no | Informational tags shown on the model card |
| `models.<alias>.input_types` | no | Falls back to `modalities` |
| `models.<alias>.use_for` | no | Informational "suited for" tags |
| `models.<alias>.context` | no | Context window, informational |
| `routing.text` | no | **Also sets picker display order** |
| `defaults.text` | no | Which model is selected initially |

Entries with `"enabled": false` remain in the file but are hidden everywhere.

### Adding a model

```json
"llama": {
  "id": "llama-3.3-70b:free",
  "enabled": true,
  "modalities": ["text"],
  "use_for": ["general_text", "long_context"]
}
```

Add `"llama"` to `routing.text` to control where it appears in the picker order.

### Pointing at a different provider

```json
"provider": {
  "name": "my-provider",
  "base_url": "https://api.example.com/v1",
  "chat_endpoint": "/chat/completions"
}
```

Any OpenAI-compatible API works. For a local Ollama or LM Studio instance, use the
loopback URL plus the chat completions path — and note it must be reachable from the
**server** running this app, not just your browser.

### Escaping the bundled file

If you would rather not edit the repo, use **Settings → Model registry → Upload
models.json** or **Load URL**. Both override the bundled file.

---

## Customisation recipes

### A coding-focused single agent

```
Model:       deepseek-v4.1-flash:free
Temperature: 0.35
Max tokens:  8192
System prompt:
  You are a senior software engineer. Always output complete, runnable files —
  never fragments or "..." placeholders. Tag every fenced block with the language
  and a filename, like ```python:app/main.py. State assumptions in one line before
  the code. Point out security or performance risks you notice.
```

### A document-review team

| # | Name | Role | Temperature | System prompt (short) |
|---|---|---|---|---|
| 1 | Extractor | Analyst | 0.2 | Pull out every requirement and constraint as a numbered list. Invent nothing. |
| 2 | Gap finder | Critic | 0.3 | List ambiguities, contradictions and missing information. Ask sharp questions. |
| 3 | Writer | Author | 0.6 | Produce the final polished document resolving all gaps using stated assumptions. |

Turn the final synthesis **off** if you want the three outputs kept separate.

### A research-and-summarise team

1. **Searcher** (temp 0.6) — enumerate angles, subtopics and open questions.
2. **Analyst** (temp 0.3) — reason through each angle, note where evidence is thin.
3. **Editor** (temp 0.5) — produce the final structured briefing.

### Reducing cost

- Use `:free` tier models for the planner and reviewer; reserve a stronger model for
  the coder.
- Lower **Max tokens** for agents that only plan.
- Disable the **final synthesis** when the last agent's output is already what you want.
- Remove agents you are not actually using — each one is a full API call.

---

## Architecture

```
Browser                     Next.js server              Provider
───────                     ──────────────              ────────
Settings drawer
  └─ key in localStorage
Composer
  └─ POST /api/chat ───────► app/api/chat/route.js
                                └─ normalize endpoint
                                └─ POST + Bearer key ──► /chat/completions
                                ◄──── SSE stream ──────
  ◄──── SSE passthrough ──────
lib/client.js
  └─ parse SSE, emit deltas
      ├─ onDelta     → answer text
      └─ onReasoning → reasoning_content
page.jsx
  └─ append to message state
```

**Why the proxy?** Browsers cannot call most provider APIs directly due to CORS. The
app's own server route makes the upstream request, so CORS never applies and the key
is never sent to a third-party origin from the page. Streaming is passed through
untouched, so token-by-token rendering is preserved.

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Proxies chat completions; streams SSE back |
| `/api/test` | POST | Minimal 5-token probe, returns a diagnostic report |
| `/api/models` | GET | Fetches a remote `models.json` server-side (avoids CORS) |

Both `/api/chat` and `/api/test` accept a full URL or a base URL and normalise the
path. Errors are returned as JSON with a `detail` field carrying the upstream body.

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
  defaults.js             Default settings and agent presets
public/
  models.json             Model registry
```

### Where to change things

| I want to… | Edit |
|---|---|
| Add or remove models | `public/models.json` |
| Change the default system prompt | `lib/defaults.js` → `DEFAULT_SETTINGS.systemPrompt` |
| Change the agent presets | `lib/defaults.js` → `AGENT_PRESETS` |
| Change the default endpoint | `lib/defaults.js` → `DEFAULT_SETTINGS.endpoint` |
| Change the long-paste threshold (2,000) | `components/Composer.jsx` → `LONG_PASTE_THRESHOLD` |
| Change the attachment size cap (2 MB) | `components/Composer.jsx` → `MAX_FILE_BYTES` |
| Add a language → extension mapping | `lib/download.js` → `EXT_BY_LANG` |
| Change colours or theme | `app/globals.css` → `:root` and `.dark` token blocks |
| Change the SSE parsing logic | `lib/client.js` → `streamChat` |

### Persistence keys

All app state is namespaced under `th-studio:` in `localStorage`:

| Key | Contents |
|---|---|
| `th-studio:apiKey` | Your API key |
| `th-studio:settings` | Temperature, max tokens, endpoint, output flags, theme |
| `th-studio:team` | The full agent pipeline definition |
| `th-studio:history` | Last 40 messages |
| `th-studio:modelsJson` | A custom uploaded registry, if any |

Clearing site data resets the app to defaults.

---

## Security notes

- **The API key is never committed to the repo.** `.gitignore` excludes `.env*`; the
  key lives only in your browser's `localStorage` under `th-studio:`.
- **Never put a key in `public/models.json`.** That file is served to every visitor.
  An earlier revision of this repository had a live key in that file; it was removed
  before the first commit. If you ever see an `api_key` or `api_key_env` value in
  there, delete it and rotate the key immediately.
- **Model output is HTML-escaped before Markdown rendering**, so a model cannot inject
  scripts or markup into the page. Link URLs are scheme-checked; anything that is not
  `http`, `https`, `mailto`, or a relative path is neutralised.
- **PDF-style risks do not apply here** — there is no file execution. Uploaded files
  are read as text and embedded into the prompt.
- **If you deploy this publicly**, anyone who reaches the URL can use their own key,
  but your key is never baked into the build. Consider putting it behind
  authentication if you plan to expose it.
- **Treat prompts and files as data sent to your provider.** Do not paste secrets you
  would not share with that API.

---

## Troubleshooting

### "Connection failed: invalid or unauthorized API key"

- Re-paste the key — trailing whitespace is a common cause.
- Check the key has not been revoked or rotated at your provider's dashboard.
- Confirm the endpoint matches the provider the key belongs to.

### "Connection failed" with a network error

- The **server** cannot reach the provider. Test from that machine:
  `curl -I https://tokenharbor.ai/v1`
- Corporate proxy, VPN or firewall blocking outbound HTTPS is the usual cause.
- DNS failures show up here too.

### `404` on the test

The endpoint path is wrong. OpenAI-compatible APIs almost always need the `/v1`
segment:

```
✓ https://tokenharbor.ai/v1/chat/completions
✗ https://tokenharbor.ai/chat/completions
```

### Answers are empty but the Reasoning panel fills up

The model is a thinking model that spent its entire token budget on the chain of
thought before writing an answer. **Raise Max tokens** — 2048 is often not enough for
reasoning models; 4096–8192 works better.

### "No models loaded" in the picker

- Confirm `public/models.json` exists and is valid JSON.
- Open the browser console — a failed fetch logs there.
- Settings → Model registry → **Reset source**, then **Reload**.
- If you uploaded a custom file and it is malformed, clear site data to reset.

### The Send button is disabled

Check the tooltip. It means one of:
- No API key set → open Settings.
- No models loaded → fix `models.json`.
- The composer is empty and has no attachments.

### Nothing streams; the reply appears all at once

- **Settings → Stream responses** may be off.
- Some proxies buffer SSE and break streaming. Leave streaming on and check the
  server logs, or turn streaming off for a consistent (slower) experience.

### A team step failed but later steps continued

By design — a failing agent's error is recorded in its accordion and the pipeline
carries on with the remaining agents. The failed agent's contribution is marked in
the transcript passed downstream, so later agents can see the gap.

### The workspace panel disappeared

Your window is narrower than 1280px. Click the **panel icon** in the header.

### Changes to `models.json` are not showing

The browser caches it. Hard-refresh with **Ctrl+Shift+R** (or Cmd+Shift+R), or use
**Settings → Reload**.

### Downloads do not start

Some browsers block downloads triggered without a direct user gesture. Click the
button again; if it persists, check the download-blocked icon in the address bar.

---

## FAQ

**Do I need a paid key?**
No. The bundled registry uses `:free` tier models and the app is provider-agnostic.

**Can I use OpenAI, Anthropic-compatible gateways, Groq, Together, or a local LLM?**
Yes — anything exposing an OpenAI-compatible `/chat/completions`. Set the endpoint in
Settings or change `base_url` in `models.json`.

**Is my conversation stored on a server?**
No. Messages live in `localStorage` — last 40 messages. Only the prompt text is sent
upstream to the model provider you configured.

**How many agents can a team have?**
No hard limit, but each one is a sequential API call, so a 6-agent pipeline is
noticeably slow and expensive. Three to four is the sweet spot.

**Can agents run in parallel?**
Not currently — execution is deliberately sequential so each agent can build on the
previous output. Parallel fan-out is on the roadmap.

**Can I save and reload named teams?**
Not yet. The current pipeline persists automatically, but there is no multi-preset
library.

**Does it support images or video?**
`models.json` carries `modalities` tags including `image` and `video`, and the UI
displays them. Actual image input is not wired into the composer yet.

**Will my key survive a restart?**
Yes, until you clear site data, use a different origin/port, or click **Forget API
key**.

---

## Roadmap / known limits

Not implemented yet, listed honestly:

- **Parallel agent execution** — independent agents could run concurrently.
- **Named team presets** — save/load multiple pipelines.
- **Image and video input** — modalities are displayed but not accepted as input.
- **Server-side conversation persistence** — history is browser-local only.
- **Conversation branching** — no forking from a mid-thread message.
- **Token/cost accounting** — usage is captured per response but not summed.
- **Editing a user message** — you can regenerate and delete, but not edit in place.
- **Streaming for the non-stream path** — the buffered fallback waits for the full body.

---

## License

MIT — see [LICENSE](LICENSE).
