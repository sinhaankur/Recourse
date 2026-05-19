# Recourse MCP server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes Recourse's policy decoder and denial-letter reader as tools any MCP-compatible client (Claude Desktop, Claude Code, any future agent) can call against your insurance documents.

Same Ollama backend as the [Recourse web app](https://sinhaankur.github.io/Recourse/) — local-only, no cloud, no API keys, no data leaving your machine.

---

## Why this exists

Phase 1 of Recourse (the web app) lets *you* drop a document into a browser and see what the AI finds. The MCP server moves that capability into the AI workflow you already use. Now any agent — Claude Desktop reading your morning email, Claude Code finishing a Slack reply, any other MCP client — can ask:

- *"Is mental-health coverage on this plan capped?"*
- *"What does this denial letter say I missed?"*
- *"Find the procedural gotchas the insurer can use against this claim."*

The agent calls the appropriate tool, the tool runs locally on your machine against your local files, and the result comes back into whatever AI workflow you were already in. The insurer's asymmetry (their adjusters have the policy memorized, you don't) gets closed inside whatever AI you already trust.

---

## What it exposes

Three tools. All stateless — each call reads one file, runs one Ollama call, returns the result.

| Tool | Purpose |
|---|---|
| `list_vision_models` | Check that Ollama is reachable and list installed vision-capable models. Call this first to verify setup. |
| `extract_denial_letter` | Read a single-page image of a denial letter / EOB / hospital bill. Returns structured fields (insurer, claim ID, deadlines, denial code, plan type, amount, network status), each labeled `settled` / `verify` / `lawyer`. |
| `decode_policy_page` | Read one page of a policy document (SPD / EOC / Certificate of Insurance). Returns annotations: `covered` / `excluded` / `limit` / **`vague` (loophole)** / **`silent` (gap)** / `procedure` — each with the policy excerpt, impact band, and a plain-English note. |

---

## Setup

### 1. Install Ollama (one-time)

```bash
brew install ollama                              # macOS
# or download from https://ollama.com
```

```bash
ollama pull llava                                # 7B, ~5 GB
# or `ollama pull llama3.2-vision` for better quality
```

```bash
OLLAMA_ORIGINS="*" ollama serve                  # start the daemon
```

Leave that terminal running.

### 2. Install this MCP server

From the Recourse repo:

```bash
cd mcp
npm install
npm run build
```

That produces `dist/server.js` — an executable Node script.

### 3. Wire it into Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your OS, adding the `recourse` entry to `mcpServers`:

```json
{
  "mcpServers": {
    "recourse": {
      "command": "node",
      "args": ["/absolute/path/to/Recourse/mcp/dist/server.js"]
    }
  }
}
```

Replace the path with where you cloned the repo. Then restart Claude Desktop. You should see "recourse" appear in the MCP servers panel.

### 4. Verify

In a Claude Desktop conversation, ask: *"Use the recourse list_vision_models tool to check that Ollama is set up."* Claude will call the tool and tell you what vision models are installed.

---

## PDF handling — important note

The MCP server v1 accepts **image files only** (PNG / JPG / WebP). PDFs must be converted to images first.

One-liner on macOS (uses built-in `sips`):

```bash
sips -s format png input.pdf --out page-1.png
```

Or with `pdftoppm` (poppler — install via `brew install poppler`):

```bash
pdftoppm -png -r 150 input.pdf out                # produces out-1.png, out-2.png, ...
```

PDF support in the MCP server itself is a v2 goal — it needs native canvas deps which complicate installation. For now the conversion is one shell command.

---

## Example agent flow

Once installed, you can have a conversation like this in Claude Desktop:

> **You**: I just got a denial letter and a copy of my SPD. Can you tell me what to fight?
>
> **Claude**: I'll check both with the Recourse tools. First, the denial letter — what's the path?
>
> **You**: `/Users/you/Documents/denial.png`
>
> **Claude**: *[calls `extract_denial_letter`]* This is an EOB from BlueCross. The denial code is CO-50 (medical necessity), the appeal deadline is 90 days, you owe $3,876. Where's the policy?
>
> **You**: `/Users/you/Documents/spd-page-1.png` through `spd-page-15.png`
>
> **Claude**: *[calls `decode_policy_page` 15 times]* On page 4 of your policy, mental-health coverage uses the phrase "medically necessary" without defining it — that's the loophole they used. Page 7 is silent on telehealth, which usually means they reserve the right to deny it. Here's what to put in your appeal letter…

The whole flow runs locally on your machine. The insurer's name, your claim ID, your bill amount — none of it touches a cloud.

---

## Architecture notes

- **Stateless.** Each tool call is independent. The server holds no session state, no cached extractions, no user data.
- **Stdio transport.** Claude Desktop spawns the server as a subprocess and pipes JSON-RPC over stdin/stdout. No network listener, no port to open.
- **Same prompts as the web app.** The MCP and web paths use the exact same extraction and decoder prompts. If you iterate one, iterate the other.
- **Errors return readable text.** When Ollama isn't running, when no vision model is installed, when the model returns malformed JSON — each path returns a `text` content with the diagnostic + the fix command. Designed so the calling agent can read and forward the error to the user.

---

## Where this could go (v2 and beyond)

- **PDF support in the server itself**: needs `@napi-rs/canvas` + `pdfjs-dist` legacy build. Hidden complexity but doable.
- **State-mandate cross-reference**: a second tool that, given a `decode_policy_page` annotation, checks whether the user's state has a statutory floor that overrides the policy's fine print.
- **Appeal-letter drafter**: a tool that takes a denial-extraction result + relevant policy annotations and drafts a procedural appeal. Currently this stays on the playbook side because 7B local models can't reliably cite statute; would need either a larger model or a retrieval layer over a vetted statute corpus.
- **A separate Tauri/Electron host**: package the web app and the MCP server together as one downloadable application. Phase 3 of the broader plan.

---

## Where this fits in the trilogy

| Project | Role | Live |
|---|---|---|
| [Sentinel](https://github.com/sinhaankur/Human-in-the-Loop) | Inline AI-output oversight (expert reviews AI claims) | [demo](https://sinhaankur.github.io/Human-in-the-Loop/) |
| [Recourse](https://github.com/sinhaankur/Recourse) | Consumer-side AI vs. institutions (this repo) | [demo](https://sinhaankur.github.io/Recourse/) |
| [Helm](https://github.com/sinhaankur/Helm) | Real-time agent oversight (operator gates tool calls) | [demo](https://sinhaankur.github.io/Helm/) |

Recourse is the only one with an MCP server so far — because it's the one whose value is "your local documents made queryable by any AI." Helm could grow an MCP server too (expose agent runs as tools) but the path there is less obvious.
