# 14. What's New in 2026: API, Models, Claude Code, Cowork

> **Domain + weight:** cross-cutting awareness (feeds D1-D5). **Task statements touched:** 1.1, 1.3, 1.5, 2.4, 3.1-3.3, 3.6, 4.3, 4.5, 5.1. **Priority:** SHOULD (awareness), with a few MUST-know exam-adjacent items. **Read time:** ~15 min. **Landscape as of September 2026** (Claude Code ~v2.1.278).

> ### How much of this is on the exam?
> **Very little, directly.** Read this chapter to avoid being confused by real-world changes, not to memorize them.
> - The exam guide is **Version 1.0, effective July 2026**. It is framed around classic building blocks: `tool_use` / `tool_choice`, `stop_reason`, the **Task** tool and `allowedTools`, `CLAUDE.md`, `.claude/commands/`, `.claude/rules/`, `.mcp.json`, `claude -p`, Message Batches (50%, 24h), JSON schemas and validation-retry.
> - The guide's **explicit out-of-scope list** says these will NOT appear: fine-tuning; API authentication, billing, account management; specific languages/frameworks; deploying/hosting MCP servers; model internals/training; Constitutional AI/RLHF; embeddings/vector DBs; **computer use**; **vision**; **streaming/SSE**; **rate limits, quotas, pricing calculations**; OAuth/key rotation; cloud-provider configs; **benchmarks/model comparisons**; prompt caching internals (only "knows it exists"); token counting/tokenization. **Model prices, context sizes and model-vs-model comparisons in this chapter are out of scope - awareness only.**
> - **Likely exam-relevant:** the concepts (deterministic vs probabilistic, structured output, hooks, subagent isolation, CLAUDE.md hierarchy, CI flags, Batch tradeoffs). If a new feature and a classic feature both solve the stem, the guide's vocabulary wins.
> - **Possibly exam-adjacent (learn the one-liner):** structured outputs / strict tools (Domain 4), `stop_reason` values including `refusal` and `pause_turn` (Domain 1), context editing/compaction/memory (Domain 5), Skills (Domain 3), AGENTS.md and hooks (Domain 3), MCP basics (Domain 2).
> - **Not on the exam (awareness only):** Fable/Opus/Sonnet ID strings, Managed Agents details, Cowork, agent teams, MCP 2026-07-28 spec details, fast mode, task budgets.

Provenance: Model/API items come from notes_D and Claude Code/Cowork items from notes_E. Items tagged **[M]** were not re-verified and appear in the Verify list at the end.

## The 60-second version

- **Lineup:** Fable 5.1 (top tier), Opus 5, Sonnet 5, Haiku 4.5 (still 4.5, not 5). None of this matters for exam answers; "pick a model" questions are about role fit (cheap model for simple steps, strong model for hard reasoning), not IDs.
- **Adaptive thinking replaced `budget_tokens`; sampling params (temperature/top_p/top_k) and assistant prefill are removed (HTTP 400) on the newest models.** So "force JSON with prefill" is dead; use structured outputs / strict tools.
- **Fable 5.1 rejects forced `tool_choice` (`any` / named tool) with 400.** The exam guide still describes forced `tool_choice` for structured extraction. Know both: classic behavior for the exam, newer behavior for the real world.
- **`output_config.format` (JSON schema) and `strict: true` tools** guarantee schema-valid output. Schema-valid is not semantically correct: validation-retry still matters.
- **`stop_reason`** now includes `refusal` and `pause_turn`. Always branch on `stop_reason`, never on text.
- **Context tools:** context editing (delete old tool results), compaction (server-side summary), memory tool (client-side files), tool search (defer tool definitions), programmatic tool calling (call tools from code).
- **Claude Code:** AGENTS.md fallback, experimental agent teams, five hook types, `--bare` for CI, `auto` permission mode, plugins. **Cowork** is the non-developer desktop agent that shares plugins/skills/connectors with Claude Code.

---

## Section 1. Model lineup and IDs

| Model | API ID | Context / max out | Thinking | Exam relevance |
|---|---|---|---|---|
| Claude Fable 5.1 (most capable) | `claude-fable-5-1` | 1M / 128K | adaptive, always on | Awareness only |
| Claude Opus 5 | `claude-opus-5` | 1M / 128K | adaptive (default on) | Awareness; typical "lead/coordinator" tier |
| Claude Sonnet 5 | `claude-sonnet-5` | 1M / 128K | adaptive | Awareness; typical default workhorse, subagents, CI |
| Claude Haiku 4.5 | `claude-haiku-4-5` (pinned `claude-haiku-4-5-20251001`) | 200K / 64K | extended (`budget_tokens`) | Awareness; cheap/simple steps |

- Prices (per MTok in/out, from notes_D): Fable 5.1 $10/$50, Opus 5 $5/$25, Sonnet 5 $2/$10, Haiku 4.5 $1/$5. **Pricing is explicitly out of scope on the exam.**
- Fable is a tier above Opus. Mythos 5.1 (`claude-mythos-5-1`) is restricted (Project Glasswing only). Legacy models (Fable 5, Opus 4.5-4.8, Sonnet 4.5/4.6) remain available.
- ID conventions: generation 4.6 and later IDs are dateless but pinned. Do not append date suffixes. Bedrock: `anthropic.claude-opus-5`; Vertex: bare ID.
- Haiku 4.5's retirement floor is **not before 2026-10-15** (imminent). Others: Sonnet 5 not before 2027-06-30, Opus 5 2027-07-24, Fable 5.1 2027-09-01.
- What to carry into exam reasoning: choosing between models is a **cost/latency/capability role decision**, and "use a bigger model / bigger context" is a standard distractor when the root cause is design (attention dilution, missing criteria, wrong tool description).
- Model-tier pattern from Anthropic's research-system write-up [M]: stronger model as lead/coordinator, cheaper models for parallel subagents.

## Section 2. API changes

### 2.1 Thinking and sampling

| Change | Detail |
|---|---|
| Adaptive thinking | `thinking: {"type": "adaptive"}`. Recommended on new models. Always on for Fable 5.1 (`disabled` or `budget_tokens` returns 400). |
| `budget_tokens` | Deprecated on 4.6, **400 on Fable/Opus 5/4.7/4.8/Sonnet 5**. Still used on Haiku 4.5. |
| Effort | `output_config.effort`: low / medium / high / xhigh / max (default high). Unsupported on Haiku 4.5. |
| Sampling params | `temperature`, `top_p`, `top_k` **removed** (400) on Fable, Opus 5, 4.7+, Sonnet 5. |
| Assistant prefill | **Removed** (400) on Fable 5/5.1, Opus 4.6+/5, Sonnet 4.6/5. |
| Thinking blocks | Must be passed back unchanged with tool results on the same model. Keep harness history append-only. |
| `display` | `summarized` / `omitted` (default on new models) / `updates` (Fable 5.1, beta). |
| Task budgets (beta) | `output_config.task_budget`: advisory token ceiling for an agent loop, differs from enforced `max_tokens`. Awareness. |
| Fast mode | Opus 5 / 4.8 only, beta. Awareness. |

Exam translation: "how do I make Claude output strict JSON?" -> **structured outputs or a tool with a JSON schema**, not prefill and not "please return only JSON".

### 2.2 Forced `tool_choice` on Fable 5.1

- `tool_choice` modes: `auto` (default), `any` (must call some tool), `tool` (named tool), `none`.
- **On Fable 5.1, `any` and `tool` return 400.** Use `auto` plus an instruction, `strict` tools, or structured outputs.
- The exam guide (v1.0) frames structured extraction with `tool_use` and `tool_choice` (forced when output must be structured). Answer in the guide's vocabulary unless the stem states the model/version issue. **Verify** whether any exam item tests this; unconfirmed.
- Programmatic tool calling and strict mode are incompatible with forced `tool_choice`.

### 2.3 Structured outputs and strict tools

```python
resp = client.messages.create(
    model="claude-sonnet-5", max_tokens=2048,
    messages=[{"role": "user", "content": doc_text}],
    output_config={"format": {"type": "json_schema", "schema": invoice_schema}},
)
# tools: strict tool use
tools = [{"name": "record_invoice", "description": "...",
          "input_schema": {...,"additionalProperties": False, "required": [...]},
          "strict": True}]
```

- `output_config.format` replaces the older `output_format`. `client.messages.parse()` with Pydantic/Zod validates. Incompatible with citations (400).
- `strict: true` guarantees the tool input matches the schema (top-level on tool def; needs `additionalProperties: false` and `required`). Not compatible with programmatic tool calling.
- **Guarantee scope:** syntax and schema conformance. It does **not** guarantee that values are right, so business-rule validation and validation-retry (Task 4.4) stay necessary. Nullable fields still prevent fabrication (Task 4.3).

### 2.4 `stop_reason` values

| Value | Meaning | What to do |
|---|---|---|
| `end_turn` | Natural finish | Stop loop |
| `tool_use` | Client tool call | Run tool, append `tool_result`, continue |
| `max_tokens` | Truncated (tool_use input may be partial) | Do not execute partial tool calls; raise limit / continue |
| `stop_sequence` | Custom stop hit | Application logic |
| `pause_turn` | Server-tool loop paused (e.g. web search) | Re-send the conversation including the assistant turn to continue |
| `refusal` | Safety classifier refused (HTTP 200) | Check `stop_details` (type/category/explanation); do not retry blindly; optional server-side `fallbacks` beta on Fable 5.1 |
| `model_context_window_exceeded` [M] | Context limit hit | Compact/trim |

Exam link (Task 1.1): loop control uses `stop_reason`, not parsing assistant text and not arbitrary iteration caps as the primary mechanism. `pause_turn` and `refusal` are extensions of the same rule: always check `stop_reason` before reading content.

### 2.5 Tool loop details worth knowing
- Return **all** `tool_result` blocks from parallel calls in **one** user message, `tool_result` blocks before any text.
- `is_error: true` on a tool result lets Claude see failure and adapt. Return structured error info (category, retryable flag) in the content (Task 2.2).
- `disable_parallel_tool_use: true` limits to one call per turn.
- Tool Runner (`client.beta.messages.tool_runner`) is an SDK helper for the tool loop, **not** the Claude Agent SDK.

### 2.6 Prompt caching and Batch API (mostly out of scope)
- Caching: TTL 5 minutes (default) or 1 hour; prefix match in order tools -> system -> messages; up to 4 explicit breakpoints; changes to tool definitions, `tool_choice` or thinking parameters invalidate. Exam requires only knowing it exists.
- Message Batches: 50% off input and output, most finish under an hour, **24h maximum**, `custom_id` per request, results in any order, no multi-turn tool loops, not for blocking flows. Discounts stack with caching. This **is** on the exam (Task 4.5) in the guide's framing.

## Section 3. Context management tools

| Tool | What it does | Where it is |
|---|---|---|
| **Context editing** | Deletes stale tool results (`clear_tool_uses_20250919`) and thinking blocks (`clear_thinking_20251015`). Not summarization. Beta `context-management-2025-06-27`. | API |
| **Compaction** | Server-side summarization when a trigger is hit (default 150K tokens); you must append the full `response.content` including the compaction block. Beta `compact-2026-01-12`. | API |
| **Memory tool** (`memory_20250818`) | Client-side file-based `/memories` directory (view/create/str_replace/insert/delete/rename); **you implement the backend**; persists across sessions. | API |
| **Tool search** | `tool_search_tool_regex/bm25` plus `defer_loading: true` on tools (never defer all). Cuts tool-definition bloat while preserving cache. | API |
| **Programmatic tool calling** | Tool has `allowed_callers: ["code_execution_20260120"]`; Claude calls tools from within code; only results return to context. Incompatible with strict, forced `tool_choice`, MCP tools. | API |
| **Files API** | GA; upload once, reference by `file_id`. | API |
| **Citations** | `citations: {enabled: true}` on document blocks; `char_location` / `page_location` / `content_block_location`. Incompatible with `output_config.format`. | API |

Exam link (Domain 5): these are productized answers to problems the exam already asks you to solve by design: trim verbose tool output, persistent case-facts, scratchpad files, position-aware ordering, progressive summarization, claim-source provenance. Design principle stays: **smallest high-signal context**, key facts at start/end (lost-in-the-middle), do not assume a bigger window fixes attention.

Related Anthropic engineering post [M]: "Code execution with MCP" presents MCP tools as code APIs so the agent writes code and data stays in the sandbox (large token reduction claimed; do not quote numbers).

## Section 4. Agent Skills

- A **skill** is a folder with `SKILL.md` (YAML frontmatter `name` + `description`) plus scripts/resources. **Progressive disclosure:** metadata always loaded; body loads when triggered; supporting files on demand.
- Where: Claude Code (`.claude/skills/<name>/SKILL.md` project, `~/.claude/skills/` personal), API (Skills API GA via `container={"skills": [...]}` with code execution), claude.ai, Agent SDK.
- Claude Code frontmatter (notes_E): `disable-model-invocation: true` (user-only, for side-effecting commands), `user-invocable: false`, `allowed-tools`, `context: fork` (run in isolated subagent), `agent`, `arguments`. Keep under ~500 lines.
- **Slash commands merged into skills:** `.claude/commands/x.md` still works; skills are a superset. The exam guide's own sample answer for shared commands is `.claude/commands/`. Skills over MCP is a proposed MCP extension.
- Decision rule: skill = on-demand procedure/knowledge; CLAUDE.md = always-true project facts; `.claude/rules` = path-conditional conventions (automatic); hook = must-happen; MCP = external tools/data.
- Skills are not Managed Agents.

## Section 5. Claude Agent SDK

- Python `claude-agent-sdk`, TypeScript `@anthropic-ai/claude-agent-sdk` (renamed from Claude Code SDK). Same loop, tools and context handling as Claude Code, self-hosted.
- `query(prompt, options)` returns an async iterator of messages ending with a `result` message. Built-in tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, and the subagent tool (**`Task` in the exam guide; `Agent` in newer docs**).
- **Subagents:** own fresh context window, restricted tools, `description` drives delegation, parent receives only the final message. They do **not** inherit conversation history: pass needed context in the prompt. Subagents spawning subagents is reported as recent [M].
- **Hooks:** `PreToolUse` (allow/deny/modify), `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `PreCompact`, session start/end. Use for guaranteed rules (block refunds above a limit, normalize tool output) - Task 1.5.
- **Permissions:** modes default / acceptEdits / plan / bypassPermissions (plus `auto`, `dontAsk` in Claude Code); `allowed_tools` / `disallowed_tools`; evaluation order [M]: hooks, deny, allow, mode, callback.
- **Sessions:** `session_id`, `resume`, fork (`fork_session`), continue most recent (Task 1.7).

## Section 6. Managed Agents (beta, awareness only)

- Hosted REST product (beta header `managed-agents-2026-04-01`): define an **Agent** (versioned model/system/tools/skills/MCP), an **Environment** (container/networking), then run **Sessions**; Anthropic runs the loop and the sandbox. SSE event stream.
- Features: vault credentials, **outcomes** (rubric-graded, separate grader iterates), multi-agent sessions, memory stores, scheduled deployments, permission policies (`always_allow` / `always_ask` / `auto`), hard session budgets. Not on Bedrock/Vertex/Foundry.
- **Hosting decision ladder:** raw Messages API tool loop (you own everything) < Tool Runner (SDK harness) < Claude Agent SDK (Claude Code harness, self-hosted) < Managed Agents (harness plus hosting).
- The exam scenarios use the Agent SDK and Claude Code; Managed Agents is not named in the guide. Hosting/deployment infrastructure topics are out of scope.

## Section 7. MCP: spec 2026-07-28

- Latest spec dated **2026-07-28** [V for version; details M]. Direction: **stateless, self-contained requests, per-request capability negotiation**. Official extensions: **Tasks** (async long-running operations), **Skills over MCP**, **MCP Apps** (interactive UI).
- Primitives (stable, exam relevant): **Tools** (model-controlled), **Resources** (application/user-controlled context, catalogs), **Prompts** (user-controlled templates); client side: elicitation (sampling/roots in earlier versions [M]).
- Transports: stdio (local), Streamable HTTP (remote; supersedes HTTP+SSE). Auth on HTTP: OAuth 2.1 with resource indicators; details are out of scope. **Building or hosting MCP servers is out of scope**; configuring them in Claude Code is in scope.
- Claude Code config (Task 2.4): scopes **local** (default, per-user per-project), **project** (`.mcp.json` at repo root, committed, approval prompt), **user** (`~/.claude.json`). Precedence local > project > user (entries not merged) [M]. Secrets via `${VAR}` and `${VAR:-default}` in `.mcp.json`. Tool naming `mcp__<server>__<tool>`. `claude mcp add --transport http|stdio --scope local|project|user`.
- Error handling: tool-level failures return `isError` results with structured content; protocol failures use JSON-RPC errors. Tool annotations are untrusted; tool results can carry prompt injection.
- API-side MCP connector: `mcp_servers=[...]` plus `mcp_toolset` tool entries (beta) [M].

## Section 8. Claude Code (~v2.1.278) features

Docs moved: `docs.claude.com/en/docs/claude-code/*` now redirects to `code.claude.com/docs/en/*`.

### 8.1 Memory: CLAUDE.md and AGENTS.md
- Loaded as context each session, not enforcement. Locations: managed policy, user `~/.claude/CLAUDE.md`, project `./CLAUDE.md` or `./.claude/CLAUDE.md` (commit), local `./CLAUDE.local.md` (gitignore), subdirectory files loaded on demand. All concatenated; closer to cwd read last.
- `@path` imports (expanded at launch, still cost context). Target under ~200 lines per file. `claudeMdExcludes` for monorepos.
- **NEW (2.1.278, Sept 19):** reads **AGENTS.md** if no CLAUDE.md exists; if both exist CLAUDE.md wins; CLAUDE.md can `@AGENTS.md` to share it. Exam framing still says CLAUDE.md.
- `.claude/rules/*.md`: with `paths:` frontmatter they load only when matching files are touched (Task 3.3). Auto memory: notes Claude writes itself (first 200 lines / 25KB loaded).

### 8.2 Hooks
- Events include SessionStart, SessionEnd, UserPromptSubmit, Stop, PreToolUse, PostToolUse, PermissionRequest, ConfigChange, plus Notification, SubagentStop, PreCompact and (agent teams) TeammateIdle, TaskCreated, TaskCompleted.
- **Five hook types:** `command`, `http`, `mcp_tool` (new), `prompt`, `agent`.
- Exit codes: 0 success; **2 = blocking** (stderr fed back to Claude); other = non-blocking error. JSON alternative: `permissionDecision: deny|allow|ask`.
- Matchers (`Edit|Write`, `mcp__memory__.*`) plus an `if` argument filter. Typical: PostToolUse formatter/linter, PreToolUse protected-file block, Stop hook verifying tests.

### 8.3 Subagents and agent teams
- Subagent files: `.claude/agents/<name>.md` (frontmatter: `description`, `tools`, `model`, `isolation: worktree`, `maxTurns`, `mcpServers`...). Built-ins: Explore (read-only), Plan, general-purpose.
- **Agent teams (experimental):** enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Lead plus teammates, each a full session with shared task list and mailbox; teammates message each other directly (subagents only report to their caller). Higher token cost, not in `-p` mode, no nested teams. Decision: subagent = focused task where only the result matters; team = parallel work needing discussion.
- Note the exam's multi-agent pattern is **hub-and-spoke through a coordinator**; agent teams are peer messaging and are not the exam's model.

### 8.4 Headless and CI
- `claude -p "prompt"`; `--output-format text|json|stream-json`; `--json-schema` (result in `structured_output`); `--allowedTools`; `--permission-mode acceptEdits|auto|dontAsk`; `--max-turns`; `--resume <session_id>`; `--append-system-prompt`; `--permission-prompts none`.
- **`--bare`:** skips hooks, skills, plugins, MCP, auto memory and CLAUDE.md for reproducibility; needs `ANTHROPIC_API_KEY`; recommended for CI and planned to become the default. Note tension with the exam scenario, where CLAUDE.md in the repo supplies review criteria: without `--bare`, `-p` loads project hooks/CLAUDE.md. Exam answer stays `-p`.
- GitHub Actions: `anthropics/claude-code-action@v1` (GA; `@beta` deprecated), `claude_args`, secrets `ANTHROPIC_API_KEY` or OAuth token, `/install-github-app`.

### 8.5 Permissions, modes, plugins
- Modes: default, acceptEdits, plan, **auto** (classifier reviews actions; new), dontAsk (deny anything not pre-approved; CI lockdown), bypass. Settings precedence: managed > CLI > `settings.local.json` > `settings.json` > user; list keys merge; **deny always wins**.
- **Plugins:** bundles of skills, agents, hooks, MCP servers, commands (`.claude-plugin/plugin.json`, marketplaces). Same mechanism in Claude Code and Cowork. `claude plugin eval` scores plugins (Sept 2026). Skills/plugins can sync from a claude.ai account into the terminal.
- Also: checkpoints/rewind, worktrees (`--worktree`), `/compact`, `/clear`, `/context`, plan mode (lower confidence, not separately fetched).

## Section 9. Claude Cowork

- **What it is:** an agent in the Claude desktop app for **non-coding knowledge work**. You describe an outcome; Claude plans, splits subtasks, runs code in an isolated environment, works in parallel workstreams, and delivers files/documents. Sessions run in Anthropic's cloud, continue offline, and are reachable across devices; local files/browser via Claude Desktop.
- **Availability (paid only):** Desktop on Mac/Windows for all paid plans; web/mobile Pro/Max/Team; Chrome side panel Max/Team; Enterprise needs admin enablement. Limits: no session sharing (artifacts shareable), high token usage.
- **Plugins and connectors:** same plugin format as Claude Code (skills, connectors, hooks, sub-agents); role plugins (finance, engineering, HR, legal). Connectors (e.g. Google Drive, Gmail, DocuSign, FactSet) run via Anthropic's cloud; because Cowork uses them unattended, the permission layer matters. Skills/plugins sync from the claude.ai account.

| | Claude Code | Claude Cowork |
|---|---|---|
| Audience | Developers | Business/knowledge workers |
| Surface | Terminal, IDE, CI, web | Desktop app GUI, web/mobile |
| Work object | Repos, code, git | Files, docs, spreadsheets, connectors |
| Config | Files: CLAUDE.md, settings, hooks, `.mcp.json` | Plugins, connectors, skills via UI |
| Automation | Headless `-p`, GitHub Actions | Cloud sessions, parallel workstreams |
| Shared | Plugins, skills, MCP connectors | Plugins, skills, MCP connectors |

Exam relevance: **none expected.** Cowork is not among the six scenarios or the guide's task statements.

## Know-the-name glossary

| Name | One-line meaning | Exam status |
|---|---|---|
| Fable 5.1 / Opus 5 / Sonnet 5 / Haiku 4.5 | Model tiers, top to cheapest | Out of scope (benchmarks/pricing) |
| Adaptive thinking | Model decides thinking depth; replaces `budget_tokens` | Awareness |
| `output_config.effort` | Reasoning effort dial low..max | Awareness |
| `output_config.format` | JSON-schema structured output | Adjacent (Task 4.3) |
| `strict: true` | Schema-guaranteed tool inputs | Adjacent (Task 4.3) |
| Prefill | Pre-filled assistant turn; removed on new models | Awareness |
| `tool_choice` | auto / any / tool / none; forced modes 400 on Fable 5.1 | In scope (classic behavior) |
| `stop_reason` | end_turn, tool_use, max_tokens, pause_turn, refusal | In scope (Task 1.1) |
| `pause_turn` | Server-tool loop paused; resend to continue | Awareness |
| `refusal` | Safety refusal, HTTP 200 with `stop_details` | Awareness |
| Message Batches | 50% off, up to 24h, `custom_id` | In scope (Task 4.5) |
| Context editing | Delete old tool results/thinking | Awareness |
| Compaction | Server-side summarization at trigger | Awareness |
| Memory tool | Client-side `/memories` files | Awareness |
| Tool search / `defer_loading` | Load tool definitions on demand | Awareness |
| Programmatic tool calling | Tools called from code execution | Awareness |
| Agent Skill | SKILL.md folder with progressive disclosure | In scope (Task 3.2) |
| Claude Agent SDK | Claude Code's loop as a library; `Task`/`Agent` tool | In scope |
| Managed Agents | Hosted agent loop plus sandbox (beta) | Out of scope-ish |
| MCP 2026-07-28 | Latest spec: stateless, Tasks/Skills/Apps extensions | Awareness |
| Streamable HTTP | Remote MCP transport replacing HTTP+SSE | Out of scope (hosting) |
| AGENTS.md | Cross-tool instruction file; CLAUDE.md wins if both | Awareness |
| Agent teams | Experimental peer-messaging multi-session teams | Awareness |
| Hook types | command, http, mcp_tool, prompt, agent | Adjacent (Task 1.5) |
| `--bare` | CI mode that skips ambient config | Awareness |
| `-p` / `--print` | Non-interactive Claude Code | In scope (Task 3.6) |
| Auto mode | Permission mode with classifier review | Awareness |
| Plugin | Bundle of skills/agents/hooks/MCP | Awareness |
| Cowork | Desktop agent for non-coding work | Not on exam |

## Chapter recap

- I can say what fraction of this chapter is on the exam (little) and which parts to prefer the guide's vocabulary for.
- I can name the four current models and say which changes (prefill, sampling params, forced tool_choice on Fable 5.1) alter how structured output is enforced.
- I can explain why `output_config.format` / strict tools do not remove the need for validation-retry.
- I can list the `stop_reason` values and the action for each.
- I can place context editing, compaction, memory tool and tool search on the Domain 5 map.
- I can describe Skills, Agent SDK subagents, hooks and where each lives.
- I can state how Cowork differs from Claude Code.

## Mnemonics

- **"Removed, not renamed":** prefill, temperature/top_p/top_k, `budget_tokens` on new models all return 400.
- **"Edit, Compact, Remember, Search":** context editing deletes, compaction summarizes, memory persists, tool search defers.
- **"Code is for coders, Cowork is for colleagues."**
- **"Guide vocabulary wins":** Task, CLAUDE.md, `.claude/commands`, `-p`, `tool_choice`.

## Verify list (unconfirmed or lower confidence)

1. Whether any exam item references forced `tool_choice` failing on Fable 5.1 (guide v1.0 predates or ignores this). Unconfirmed.
2. Subagents spawning subagents: notes_D says cannot [M]; notes_E says recent versions can. Conflict; check current docs.
3. MCP 2026-07-28 details (auth/transport changes, exact Tasks semantics): only the version and direction verified.
4. `.mcp.json` precedence (local > project > user > plugin > claude.ai connectors) and hook event list: partly from prior knowledge.
5. Batch API limits (100k requests / 256MB): [M]. The 50%/24h/custom_id facts are guide-backed.
6. Plan mode, checkpoints, worktrees, `/compact` details in Claude Code: not separately fetched.
7. Cowork plugin behavior (hooks/sub-agents only in Cowork) comes from a secondary source; plan-availability details may change.
8. "Code execution with MCP" token-reduction figure and research-system numbers (90%, 15x): [M]; do not quote.
9. `--bare` becoming default and the exact `--json-schema` behavior: from notes_E only; guide only tests `-p`.
10. Whether the exam-code naming (CCAR-F vs CCA-F) and four-tier certification family claims are accurate: secondary sources only.
