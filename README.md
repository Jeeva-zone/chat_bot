# Token Harbor · AI Team Studio

A modern, developer-centric AI chat workspace with **single-agent** and **multi-agent
team** workflows, running on **any OpenAI-compatible provider** — Token Harbor, Groq,
OpenRouter, Google Gemini, or your own endpoint.

Built with Next.js 14 (App Router), Tailwind CSS, Lucide Icons and highlight.js.

**Live repo:** https://github.com/Jeeva-zone/chat_bot

---

## Table of contents

- [What this app does](#what-this-app-does)
- [Quick start (5 minutes)](#quick-start-5-minutes)
- [Full user guide](#full-user-guide)
  - [1. The interface at a glance](#1-the-interface-at-a-glance)
  - [2. Connecting providers](#2-connecting-providers)
  - [3. Testing the connection](#3-testing-the-connection)
  - [4. Single Chat mode](#4-single-chat-mode)
  - [5. AI Team mode](#5-ai-team-mode)
  - [6. Working with code](#6-working-with-code)
  - [7. Downloading and exporting](#7-downloading-and-exporting)
  - [8. Long input, paste and file upload](#8-long-input-paste-and-file-upload)
  - [9. Settings reference](#9-settings-reference)
- [Supported providers](#supported-providers)
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
OpenAI-compatible API**. It adds four things a plain chat window does not have:

1. **Multiple providers side by side.** Keep a Groq key, an OpenRouter key and a
   Gemini key at the same time. Every connected provider's models appear together in
   one picker, grouped by provider.
2. **A connection tester** that proves a key and endpoint work before you waste time
   debugging a prompt.
3. **An AI Team mode** where several models work a task in sequence — a planner, a
   coder, a reviewer — each with its own model, temperature and system prompt, ending
   in one merged deliverable. **Agents can use different providers**, so a Groq model
   can plan while a Gemini model reviews.
4. **Real file output.** Every response can be exported as Markdown, and every code
   block can be copied or saved as an actual file with the right extension.

Everything runs locally or on your own server. Your API keys never leave your browser
except to reach the provider you configured.

---

## Quick start (5 minutes)

### Prerequisites

- **Node.js 18.17 or newer** (Node 22 recommended). Check with `node -v`.
- npm (ships with Node) or pnpm/yarn if you prefer.
- An API key from at least one supported provider. Groq and Google AI Studio both
  have free tiers; OpenRouter has free models.

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

### 3. Connect a provider

1. Go to **http://localhost:3000**.
2. Click the **gear icon** (top right) to open Settings.
3. Under **API providers**, click the **›** arrow next to a provider to expand it.
4. Paste that provider's API key.
5. Click **Test** — you want a green **"Connected successfully! Status: 200 OK"**.

The provider's dot turns green, the header chip changes from `no key` to
`<Provider> ready`, and its models become available in every model picker.

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
│  logo · [Single Chat | AI Team] · provider status · actions  │
├────────────────────────────────────────┬─────────────────────┤
│                                        │                     │
│   CONVERSATION                         │   WORKSPACE PANEL   │
│   messages stream in here,             │   model picker      │
│   newest at the bottom                 │   system prompt     │
│                                        │   team builder      │
│                                        │   output options    │
│                                        │   provider summary  │
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
| Provider status chip | In Single Chat: `<Provider> ready` or `no key` for the selected model. In AI Team: `N/M providers` connected |
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

### 2. Connecting providers

Open **Settings** (gear icon) → **API providers**.

Each provider is a collapsible card:

```
▾  ● Token Harbor        3 models                  Get key ↗
     API KEY
     [ •••••••••••••••••••••••••••••• ]  [eye]  [trash]
     [⚡ Test]  [⟳ Refresh models]   https://tokenharbor.ai/v1/chat/completions
     ✓ Connected successfully! Status: 200 OK
       endpoint: https://tokenharbor.ai/v1/chat/completions
       status:   200 OK
       latency:  1418 ms
       reply:    "OK"
```

**The dot** on the left of each card is grey when no key is saved and green once one
is. The header shows a running total, e.g. `Providers 2/5 connected`.

**Each provider keeps its own key.** A Groq key and an OpenRouter key live side by
side and are never mixed up — when you pick a Groq model, the Groq key and Groq
endpoint are used.

**Where keys live:** `localStorage` under `th-studio:providerKeys`, as a map of
provider → key. They survive reloads and browser restarts, but are scoped to the
origin (`localhost:3000`), so a different port or domain needs them entered again.

**To remove one key:** the **trash** icon inside that provider's card.
**To remove all:** Settings → Session → **Forget all keys**.

#### Refreshing the model list

Providers add and retire models constantly — Groq especially. The bundled
`models.json` is a **curated seed**, so each card has a **Refresh models** button:

1. Save a key.
2. Click **Refresh models**.
3. The app calls that provider's `/models` endpoint server-side and merges the result
   with the curated list.

The note under the button tells you what happened, e.g.
`Loaded 17 chat models (3 non-chat hidden)`. Non-chat entries (Whisper, embeddings,
image generators, moderation and guard models) are filtered out automatically.

Curated entries you added by hand are **never** dropped by a refresh — only added to.

#### The custom provider

The last card is **Custom provider**, for anything not in the built-in list:
LM Studio, Ollama, vLLM, llama.cpp, a company gateway, or your own proxy. Expand it
and fill in:

| Field | Example |
|---|---|
| **Display name** | `My Local LLM` |
| **Base URL** | `http://localhost:1234/v1` |
| **Chat completions path** | `/chat/completions` |
| **Model IDs** (one per line) | `llama-3.1-8b-instruct`<br>`qwen2.5-coder-7b` |
| **API key** | optional for local servers |

The display name becomes the group heading in the model picker, so you can rename it
to anything meaningful.

> **Local server gotcha:** the base URL must be reachable from the **machine running
> this app**, not just your browser. If the app runs in Docker, `localhost` points at
> the container, not your host — use `host.docker.internal` instead.

#### Adding a provider that isn't listed

Any OpenAI-compatible service works. Either use the **Custom provider** card, or add
an entry to `public/models.json` (see
[Configuration reference](#configuration-reference-modelsjson)).

---

### 3. Testing the connection

Each provider card has its own **Test** button. Click it and one of these appears
inside that card:

**Success:**

```
✓ Connected successfully! Status: 200 OK
  endpoint: https://api.groq.com/openai/v1/chat/completions
  status:   200 OK
  latency:  412 ms
  reply:    "OK"
```

**Failure:**

```
⚠ Groq: connection failed — invalid or unauthorized API key.
  endpoint: https://api.groq.com/openai/v1/chat/completions
  status:   401 Unauthorized
  latency:  238 ms
  detail:   Invalid API Key
```

The test sends the smallest possible request — a single message, `max_tokens: 5` —
so it costs almost nothing and returns in seconds. What it proves:

| Observation | Meaning |
|---|---|
| `200 OK` + a reply string | Key, endpoint, model name and network path all work |
| `401` / `403` | Key is wrong, expired or revoked |
| `404` | Endpoint path is wrong (check for `/v1` in the URL) |
| `400` on Gemini | Key rejected — Google returns 400 for a bad key, not 401 |
| `429` | Rate limited — wait and retry |
| Timeout or "network unreachable" | The server cannot reach the provider (firewall, DNS, offline) |

> Because requests are proxied by the app's own server, a successful test also proves
> the **server** has network access — not just your browser.

---

### 4. Single Chat mode

This is the default mode: one model, one system prompt, a normal back-and-forth.

**Setup (workspace panel → Agent):**

| Field | Purpose |
|---|---|
| **Model** | Grouped by provider. Each group shows `· no key` until connected. Model chips below show the provider, ID, free tier, context size, modalities and suited-for tags |
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

If the selected model's provider has no key, a warning appears under the picker and
the Send button stays disabled with an explanatory tooltip.

**While it is generating:**

- Text streams in token by token.
- The Send button becomes **Stop** — click it to abort mid-generation.
- If the model is a "thinking" model (Qwen / DeepSeek / Gemini thinking variants), a
  **Reasoning** panel appears above the answer showing the chain of thought. It is
  collapsed by default; click it to read, and note the char count so you know
  something is happening.
- The message header shows a `streaming…` chip while in flight.

**Per-message actions** (top-right of every reply):

| Button | Action |
|---|---|
| **Copy** | Copies the raw Markdown to your clipboard; flips to "Copied!" |
| **.md** | Downloads that single message as a Markdown file |
| **Refresh** | Regenerates the reply using the same prompt, history **and provider** |
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
        │  Step 1 — Architect   Groq / GPT-OSS 120B   temp .4 │
        │  Plans: requirements, file layout, risks            │
        └───────────────────────┬─────────────────────────────┘
                                ▼  task + step 1 output
        ┌─────────────────────────────────────────────────────┐
        │  Step 2 — Developer   Gemini / 3.1 Pro      temp .5 │
        │  Implements the plan as complete code               │
        └───────────────────────┬─────────────────────────────┘
                                ▼  task + steps 1–2 output
        ┌─────────────────────────────────────────────────────┐
        │  Step 3 — Reviewer    OpenRouter / Claude   temp .3 │
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

**Each agent can use a different provider.** The model picker in each agent card is
grouped by provider, so you can mix Groq, Gemini, OpenRouter and local models freely
in one pipeline. Provider names are carried into the transcript so downstream agents
know who produced what.

#### Running a team task

1. Switch to **AI Team**.
2. (Optional) adjust the pipeline — see below.
3. Type your task in the composer. Be specific:
   > *"Build a FastAPI service with JWT auth, a `/users` CRUD endpoint, and pytest
   > tests. Target Python 3.12."*
4. Press **Enter**.

If any agent's provider is missing a key, a warning names the providers and opens
Settings instead of silently failing mid-pipeline.

#### Reading the results

Steps appear as **collapsible accordions**, one per agent:

```
▸ 1. Architect   [Planner]  groq / openai/gpt-oss-120b     4.2s   1,240 chars
▾ 2. Developer   [Coder]    gemini / gemini-3.1-pro       11.8s   3,910 chars
      ┌ Reasoning (optional, collapsed)
      └ The actual output, with syntax-highlighted code blocks
        [Copy] [Download]                    [Download step]
▸ 3. Reviewer    [QA]       openrouter / claude-opus-5.5   6.5s   2,050 chars
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
| Model | Any model from **any connected provider** — mix freely |
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

A good default split:

| Role | Suggested provider / model | Why |
|---|---|---|
| Architect | Groq · `openai/gpt-oss-120b` | Fast, strong reasoning, generous free tier |
| Developer | Gemini · `gemini-3.1-pro` | Strong code generation, large context |
| Reviewer | OpenRouter · any strong model | Independent critique from a different vendor |
| Synthesis | Token Harbor · `qwen3.8-flash:free` | Blends and summarises well |

Using a **different provider for the reviewer than the coder** is genuinely useful —
it gives you an independent critique rather than the same model agreeing with itself.

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

#### API providers
| Control | Purpose |
|---|---|
| Provider card **›** | Expand to reveal that provider's key field and actions |
| **API key** | Stored in `localStorage`; masked with an eye toggle and a clear button |
| **Test** | Runs the 5-token probe and shows the diagnostic badge in-card |
| **Refresh models** | Fetches the provider's live `/models` list server-side |
| **Get key ↗** | Opens the provider's key page in a new tab |
| **Display name / Base URL / Chat path / Model IDs** | Custom provider only |
| Header counter | `N/M connected` across all providers |

#### Model registry source
| Control | Purpose |
|---|---|
| **Upload models.json** | Replace the registry from a local file (saved to `localStorage`) |
| **Reload** | Re-fetch from the current source |
| **Reset source** | Go back to the bundled `/models.json` |
| URL field + **Load URL** | Fetch a registry from a remote URL, via the server proxy |

The loaded providers are listed below with their model counts.

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
| **Forget all keys** | Removes every provider key from `localStorage` |

Settings, keys, the team definition and cached model lists all persist across reloads.

---

## Supported providers

Built into `public/models.json` out of the box:

| Provider | Base URL | Free tier | Key from |
|---|---|---|---|
| **Token Harbor** | `https://tokenharbor.ai/v1` | Yes (`:free` models) | [dashboard](https://tokenharbor.ai/dashboard) |
| **Groq** | `https://api.groq.com/openai/v1` | Yes | [console.groq.com/keys](https://console.groq.com/keys) |
| **OpenRouter** | `https://openrouter.ai/api/v1` | Yes (17+ `:free` models) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Google Gemini** | `https://generativelanguage.googleapis.com/v1beta/openai` | Yes | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Custom** | you define it | — | — |

All five use **Bearer token** auth against an OpenAI-compatible
`/chat/completions` endpoint. Gemini is reached through Google's official
OpenAI-compatibility layer, so the same code path works.

### Seeded models

| Provider | Seeded models |
|---|---|
| Token Harbor | `qwen3.8-flash:free`, `deepseek-v4.1-flash:free`, `mimo-v2.6-flash:free` |
| Groq | `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `qwen/qwen3.8-27b`, `minimaxai/minimax-m2.7` |
| OpenRouter | `qwen/qwen3.8-27b:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `google/gemma-4-31b-it:free`, `deepseek/deepseek-v4.1-flash`, `openai/gpt-6-luna`, `anthropic/claude-opus-5.5`, `x-ai/grok-4.7` |
| Google Gemini | `gemini-3.8-flash`, `gemini-3.1-pro`, `gemini-3.1-flash-lite`, `gemini-3-flash`, `gemini-2.5-pro` |

These are a **starting point, not a fixed list** — model IDs change frequently, which
is exactly why each card has **Refresh models** to pull the live catalogue.

### Adding another provider

Anything exposing an OpenAI-compatible `/chat/completions` works. Add a block to
`public/models.json`:

```json
"mistral": {
  "label": "Mistral",
  "base_url": "https://api.mistral.ai/v1",
  "chat_endpoint": "/chat/completions",
  "models_endpoint": "/models",
  "key_url": "https://console.mistral.ai/api-keys",
  "enabled": true,
  "models": {
    "large": { "id": "mistral-large-latest", "label": "Mistral Large", "default": true }
  }
}
```

Then add `"mistral"` to `routing.text` to control its position in the pickers.

---

## Configuration reference (`models.json`)

The registry lives at `public/models.json` and is fetched at runtime, so you can edit
it and just refresh the page — **no rebuild required**.

```json
{
  "providers": {
    "tokenharbor": {
      "label": "Token Harbor",
      "base_url": "https://tokenharbor.ai/v1",
      "chat_endpoint": "/chat/completions",
      "models_endpoint": "/models",
      "api_style": "openai-compatible",
      "key_url": "https://tokenharbor.ai/dashboard",
      "enabled": true,
      "models": {
        "qwen": {
          "id": "qwen3.8-flash:free",
          "label": "Qwen 3.8 Flash",
          "enabled": true,
          "default": true,
          "modalities": ["text", "image", "video"],
          "use_for": ["general_text", "image_understanding"]
        }
      }
    },

    "openrouter": {
      "label": "OpenRouter",
      "base_url": "https://openrouter.ai/api/v1",
      "headers": {
        "HTTP-Referer": "https://github.com/Jeeva-zone/chat_bot",
        "X-Title": "Token Harbor AI Team Studio"
      },
      "models": { }
    },

    "custom": {
      "label": "Custom provider",
      "base_url": "",
      "custom": true,
      "models": { }
    }
  },

  "routing": { "text": ["tokenharbor", "groq", "openrouter", "gemini", "custom"] },
  "defaults": { "provider": "tokenharbor", "text": "tokenharbor" }
}
```

### Provider fields

| Field | Required | Meaning |
|---|---|---|
| `label` | no | Display name in cards and picker groups. Auto-generated from the key if omitted |
| `base_url` | yes | API base. `/chat/completions` is appended automatically |
| `chat_endpoint` | no | Override the chat path. Default `/chat/completions` |
| `models_endpoint` | no | Path used by **Refresh models**. Default `/models` |
| `api_style` | no | Informational. Default `openai-compatible` |
| `key_url` | no | Renders the **Get key ↗** link |
| `docs_url` | no | Renders a **Provider docs** link |
| `note` | no | One-line description shown on the collapsed card |
| `headers` | no | Extra request headers, e.g. OpenRouter attribution |
| `custom` | no | `true` marks the user-editable provider |
| `enabled` | no | `false` hides the whole provider (default `true`) |
| `models` | yes | The model registry for this provider |

### Model fields

| Field | Required | Meaning |
|---|---|---|
| `id` | **yes** | The exact model string sent to the API |
| `label` | no | Display name. Auto-generated from the key if omitted |
| `enabled` | no | `false` hides it from pickers (default `true`) |
| `default` | no | Pre-selects this model for its provider |
| `modalities` | no | Tags shown on the model card, e.g. `["text","image"]` |
| `use_for` | no | Informational "suited for" tags |
| `context` | no | Context window; shown as `128K ctx` on the card |

### Routing and defaults

| Key | Effect |
|---|---|
| `routing.text` | **Sets the display order** of providers in the picker and cards |
| `defaults.provider` | Which provider's default model is selected on first load |

### Legacy format still works

Older single-provider files are detected and upgraded automatically:

```json
{
  "provider": { "name": "tokenharbor", "base_url": "https://tokenharbor.ai/v1" },
  "models": { "qwen": { "id": "qwen3.8-flash:free", "default": true } },
  "routing": { "text": ["qwen"] },
  "defaults": { "text": "qwen" }
}
```

This is treated as one provider named after `provider.name`, with `routing.text`
interpreted as model order. No migration needed.

---

## Customisation recipes

### A coding-focused single agent

```
Model:       groq / openai/gpt-oss-120b
Temperature: 0.35
Max tokens:  8192
System prompt:
  You are a senior software engineer. Always output complete, runnable files —
  never fragments or "..." placeholders. Tag every fenced block with the language
  and a filename, like ```python:app/main.py. State assumptions in one line before
  the code. Point out security or performance risks you notice.
```

### A cross-provider coding team

| # | Name | Role | Provider / model | Temp |
|---|---|---|---|---|
| 1 | Architect | Planner | Groq · `openai/gpt-oss-120b` | 0.4 |
| 2 | Developer | Coder | Gemini · `gemini-3.1-pro` | 0.5 |
| 3 | Reviewer | QA | OpenRouter · `anthropic/claude-opus-5.5` | 0.3 |

Three vendors, three independent perspectives on the same problem.

### A document-review team

| # | Name | Role | Temperature | System prompt (short) |
|---|---|---|---|---|
| 1 | Extractor | Analyst | 0.2 | Pull out every requirement and constraint as a numbered list. Invent nothing. |
| 2 | Gap finder | Critic | 0.3 | List ambiguities, contradictions and missing information. Ask sharp questions. |
| 3 | Writer | Author | 0.6 | Produce the final polished document resolving all gaps using stated assumptions. |

Turn the final synthesis **off** if you want the three outputs kept separate.

### A fully free pipeline

Use only `:free` models so a team run costs nothing:

| Role | Model |
|---|---|
| Architect | Token Harbor · `qwen3.8-flash:free` |
| Developer | Token Harbor · `deepseek-v4.1-flash:free` |
| Reviewer | OpenRouter · `qwen/qwen3.8-27b:free` |
| Synthesis | OpenRouter · `nvidia/nemotron-3-super-120b-a12b:free` |

### Reducing cost

- Use `:free` tier models for the planner and reviewer; reserve a paid model for the
  coder.
- Lower **Max tokens** for agents that only plan.
- Disable the **final synthesis** when the last agent's output is already what you want.
- Remove agents you are not actually using — each one is a full API call.
- A local model through the **Custom provider** is free and private.

---

## Architecture

```
Browser                     Next.js server              Provider
───────                     ──────────────              ────────
Settings drawer
  └─ keys in localStorage
     (one per provider)
Model picker
  └─ "groq::openai/gpt-oss-120b"
       │
       ├─ resolve provider → base URL + key + headers
       │
Composer
  └─ POST /api/chat ───────► app/api/chat/route.js
                                └─ normalize endpoint
                                └─ merge provider headers
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
app's own server routes make the upstream request, so CORS never applies and keys are
never sent to a third-party origin from the page. Streaming is passed through
untouched, so token-by-token rendering is preserved.

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Proxies chat completions; streams SSE back. Accepts `headers` for provider-specific extras |
| `/api/test` | POST | Minimal 5-token probe, returns a diagnostic report |
| `/api/models` | GET | Fetches a remote `models.json` server-side (avoids CORS) |
| `/api/models` | POST | Lists a provider's **live** models, filtering out non-chat entries |

`/api/chat` and `/api/test` accept a full URL or a base URL and normalise the path.
Errors come back as JSON with a `detail` field carrying the upstream message.

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
    models/route.js       Remote models.json + live provider model lists
components/
  Header.jsx              Top bar, mode toggle, provider status
  SidePanel.jsx           Workspace panel (model, prompt, output options)
  SettingsDrawer.jsx      Providers, registry source, generation, session
  ProvidersPanel.jsx      Per-provider key cards, test, refresh, custom editor
  ModelSelect.jsx         Provider-grouped model picker
  TeamBuilder.jsx         Agent pipeline editor
  Composer.jsx            Input, attachments, long-paste collapsing
  MessageItem.jsx         Message shell + per-message actions
  TeamRun.jsx             Step accordions + final synthesis
  Markdown.jsx            Markdown renderer
  CodeBlock.jsx           Highlighted code + copy/download
  ReasoningBlock.jsx      Collapsible chain-of-thought panel
lib/
  models.js               Provider/model normalisation, resolution, live merge
  server.js               Server-side URL/header/model-list helpers
  client.js               SSE stream reader + provider test/list calls
  markdown.js             Dependency-free Markdown → HTML (XSS-safe)
  download.js             Blob downloads + filename inference
  export.js               Markdown serialisation
  storage.js              Namespaced localStorage + per-provider keys
  defaults.js             Default settings, agent presets, custom provider shape
public/
  models.json             Provider and model registry
```

### Where to change things

| I want to… | Edit |
|---|---|
| Add or remove a provider | `public/models.json` → `providers` |
| Add or remove models | `public/models.json` → that provider's `models` |
| Change provider order in pickers | `public/models.json` → `routing.text` |
| Change the default provider | `public/models.json` → `defaults.provider` |
| Change the default system prompt | `lib/defaults.js` → `DEFAULT_SETTINGS.systemPrompt` |
| Change the agent presets | `lib/defaults.js` → `AGENT_PRESETS` |
| Change the custom provider defaults | `lib/defaults.js` → `DEFAULT_CUSTOM_PROVIDER` |
| Change the long-paste threshold (2,000) | `components/Composer.jsx` → `LONG_PASTE_THRESHOLD` |
| Change the attachment size cap (2 MB) | `components/Composer.jsx` → `MAX_FILE_BYTES` |
| Add a language → extension mapping | `lib/download.js` → `EXT_BY_LANG` |
| Change which models are filtered as non-chat | `lib/server.js` → `NON_CHAT` |
| Change colours or theme | `app/globals.css` → `:root` and `.dark` token blocks |
| Change the SSE parsing logic | `lib/client.js` → `streamChat` |

### Persistence keys

All app state is namespaced under `th-studio:` in `localStorage`:

| Key | Contents |
|---|---|
| `th-studio:providerKeys` | `{ providerKey: apiKey }` — one key per provider |
| `th-studio:settings` | Temperature, max tokens, theme, output flags, custom provider |
| `th-studio:team` | The full agent pipeline definition |
| `th-studio:history` | Last 40 messages |
| `th-studio:modelsJson` | A custom uploaded registry, if any |
| `th-studio:liveModels` | Model lists cached from **Refresh models** |
| `th-studio:apiKey` | Legacy single-key slot, auto-migrated on first load |

Clearing site data resets the app to defaults.

---

## Security notes

- **API keys are never committed to the repo.** `.gitignore` excludes `.env*`; keys
  live only in your browser's `localStorage` under `th-studio:providerKeys`.
- **Never put a key in `public/models.json`.** That file is served to every visitor.
  An earlier revision of this repository had a live key in that file; it was removed
  before the first commit. If you ever see an `api_key` or `api_key_env` value in
  there, delete it and rotate the key immediately.
- **Model output is HTML-escaped before Markdown rendering**, so a model cannot inject
  scripts or markup into the page. Link URLs are scheme-checked; anything that is not
  `http`, `https`, `mailto`, or a relative path is neutralised.
- **Provider headers are whitelisted by shape** — only string keys with non-null
  values are forwarded, so a malformed `models.json` cannot inject arbitrary headers.
- **PDF-style risks do not apply here** — there is no file execution. Uploaded files
  are read as text and embedded into the prompt.
- **If you deploy this publicly**, anyone who reaches the URL can use their own keys,
  but yours are never baked into the build. Consider putting it behind authentication
  if you plan to expose it.
- **Treat prompts and files as data sent to your chosen provider.** Do not paste
  secrets you would not share with that API.

---

## Troubleshooting

### A provider shows `no key` in the picker

Its key is missing or was cleared. Open Settings → API providers, expand that card and
paste the key. The group heading drops the `· no key` suffix as soon as a key is saved.

### "Connection failed: invalid or unauthorized API key"

- Re-paste the key — trailing whitespace is a common cause.
- Check the key has not been revoked or rotated at the provider's dashboard.
- Confirm you are pasting it into the **matching provider's card**. A Groq key in the
  OpenRouter card will always fail.

### Google Gemini returns `400` instead of `401`

That is Google's normal behaviour for a bad key. The tester surfaces the message
(`Please pass a valid API key`). Get a fresh key from
[aistudio.google.com/apikey](https://aistudio.google.com/apikey).

### OpenRouter says "Missing Authentication header"

Counter-intuitively, OpenRouter returns this for a **malformed** key, not a missing
header — the app always sends `Authorization: Bearer …`. A key shaped like
`sk-or-v1-<64 hex>` is expected. A short placeholder like `sk-or-fake` produces this
exact message.

### "Refresh models" fails

- Confirm a key is saved for that provider.
- The endpoint may differ — check `models_endpoint` in `models.json`.
- Some providers rate-limit `/models`. Wait a moment and retry.
- If it keeps failing, the curated seed list still works; you only lose the live
  catalogue.

### Custom provider: nothing happens when I send

- The base URL must be reachable from the **app server**, not your browser. From the
  app machine, `curl http://localhost:1234/v1/models` should respond.
- If the app runs in Docker, use `host.docker.internal` instead of `localhost`.
- Confirm you added at least one model ID — a provider with no models is hidden from
  the picker.
- The chat path must be exact (`/chat/completions` for most servers).

### "Connection failed" with a network error

- The **server** cannot reach the provider. Test from that machine:
  `curl -I https://api.groq.com/openai/v1`
- Corporate proxy, VPN or firewall blocking outbound HTTPS is the usual cause.
- DNS failures show up here too.

### `404` on the test

The endpoint path is wrong. OpenAI-compatible APIs almost always need the `/v1`
segment:

```
✓ https://api.groq.com/openai/v1/chat/completions
✗ https://api.groq.com/chat/completions
```

### Answers are empty but the Reasoning panel fills up

The model is a thinking model that spent its entire token budget on the chain of
thought before writing an answer. **Raise Max tokens** — 2048 is often not enough for
reasoning models; 4096–8192 works better.

### "No models loaded" in the picker

- Confirm `public/models.json` is valid JSON.
- Open the browser console — a failed fetch logs there.
- Settings → Model registry source → **Reset source**, then **Reload**.
- If you uploaded a custom file and it is malformed, clear site data to reset.

### The Send button is disabled

Check the tooltip. It means one of:
- The selected model's provider has no key → open Settings.
- No models loaded → fix `models.json`.
- No model selected yet.
- The composer is empty and has no attachments.

### Nothing streams; the reply appears all at once

- **Settings → Stream responses** may be off.
- Some proxies buffer SSE and break streaming. Leave streaming on and check the server
  logs, or turn streaming off for a consistent (slower) experience.

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
No. Groq, Google AI Studio and OpenRouter all have free tiers, and the seeded Token
Harbor models are `:free`. A local model through the Custom provider costs nothing.

**Can I use several providers at once?**
Yes — that is the point. Each provider keeps its own key, and all connected providers'
models appear in one grouped picker. In AI Team mode you can assign a different
provider to every agent.

**Which providers are supported?**
Anything exposing an OpenAI-compatible `/chat/completions` with Bearer auth. Four are
built in plus a fully editable custom provider.

**How do I keep the model list current?**
Click **Refresh models** on a provider card. It pulls the live catalogue from the
provider and merges it with the curated seed, filtering out non-chat models.

**Is my conversation stored on a server?**
No. Messages live in `localStorage` — last 40 messages. Only the prompt text is sent
upstream to the model provider you selected.

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

**Will my keys survive a restart?**
Yes, until you clear site data, use a different origin/port, or click **Forget all
keys**.

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
- **Per-provider model enable/disable UI** — hide unwanted models without editing JSON.

---

## License

MIT — see [LICENSE](LICENSE).
