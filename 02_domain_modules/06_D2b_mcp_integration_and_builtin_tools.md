# 6. D2b - MCP Integration and Built-in Tools

> **Domain 2: Tool Design & MCP Integration (18%)** | Task statements: 2.4, 2.5 | Priority: MUST | Read time: ~16 min
> Companion chapter: 05_D2a (2.1-2.3 tool design, errors, distribution).

## The 60-second version

- Project-shared MCP servers go in **`.mcp.json`** (repo root, committed). Personal/experimental servers go in **`~/.claude.json`** (user scope).
- Never commit secrets: use **`${VAR}`** expansion in `.mcp.json` (e.g. `Bearer ${GITHUB_TOKEN}`); `${VAR:-default}` supplies a default.
- Tools from ALL configured servers are discovered at connection time and are available simultaneously (Claude Code names them `mcp__<server>__<tool>`).
- MCP **resources** expose content catalogs (issue summaries, doc hierarchies, DB schemas) so the agent sees what exists without exploratory tool calls.
- Prefer a **community** MCP server for standard integrations (Jira, GitHub); build **custom** only for team-specific workflows.
- If the agent prefers built-in Grep over a more capable MCP tool, **improve the MCP tool description** (capabilities and outputs in detail).
- Built-ins: **Grep** = content search, **Glob** = filename patterns, **Read/Write** = whole file, **Edit** = unique-text targeted change; Edit fails on non-unique anchor -> **Read + Write**.
- Build codebase understanding incrementally: Grep entry points, Read to follow imports; for wrapper modules, list exported names, then grep each name.

---

## Chapter 2.4 - Integrate MCP servers into Claude Code and agent workflows

**Why the exam cares:** Scoping (project vs user), secret handling, and "why is the agent ignoring my MCP tool" are classic developer-productivity scenario questions.

### Core concepts

- **MCP primitives (server side):**

| Primitive | Controlled by | Purpose |
|---|---|---|
| Tools | model | actions/queries the model invokes |
| Resources | app/user | readable context, e.g. catalogs, schemas, docs |
| Prompts | user | reusable prompt templates |

- **Transports:** `stdio` (local subprocess) and **Streamable HTTP** (remote; supersedes the deprecated HTTP+SSE). Claude Code lists `http` as the preferred remote type, `stdio` for local, SSE legacy.
- **Deploying / hosting MCP servers: out of scope - awareness only.** The exam covers consuming and configuring them, not running them in production. Same for MCP auth flows (OAuth) - awareness only.
- **Scopes in Claude Code:**

| Scope | Location | Shared? | Use for |
|---|---|---|---|
| project | `.mcp.json` at repo root | committed; team approval prompt on first use | shared team tooling (Jira, GitHub, DB) |
| user | `~/.claude.json` | personal, all projects | personal/experimental servers |
| local (default of `claude mcp add`) | `~/.claude.json`, per-project path | private | personal per-project |

  Guide tests project (`.mcp.json`) vs user (`~/.claude.json`). Precedence between scopes (local > project > user) and the `local` scope come from notes_D/E, marked [M]; **Verify** but it is beyond the guide's stated knowledge.
- **Env var expansion:** `${VAR}` and `${VAR:-default}` work in command, args, env, url, headers. Unset variable without default = warning and literal text. This lets `.mcp.json` be committed while each developer supplies their own token.
- **All servers' tools at once:** at connection, tools from every configured server are discovered and available simultaneously. Implication: many servers = many tools = the 2.3 selection-degradation problem; scope subagents via their own MCP config where possible.
- **Resources for catalogs:** if the agent burns calls on `list_issues`, `list_tables`, "what docs exist?", publish an issue-summary, docs-hierarchy or schema resource. The agent sees the map up front.
- **Community vs custom:** Jira, GitHub, Slack, Postgres etc. already have community/vendor servers. Use them. Custom only for proprietary workflows (e.g. internal claims-routing).
- **Tool descriptions vs built-ins:** an agent facing built-in Grep and an MCP `search_code_index` with description "Searches code" will pick Grep, which it understands. Fix by describing what the MCP tool uniquely does: semantic search, cross-repo, returns symbol definitions with call graph, input formats, when to prefer it over Grep.

### Worked example: .mcp.json (project scope) and user config

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    },
    "jira": {
      "command": "npx",
      "args": ["-y", "@example/community-jira-mcp"],
      "env": {
        "JIRA_URL": "${JIRA_URL:-https://acme.atlassian.net}",
        "JIRA_TOKEN": "${JIRA_TOKEN}"
      }
    }
  }
}
```

Personal experimental server (not committed):

```bash
claude mcp add --scope user --transport stdio scratch-db -- npx -y some-experimental-mcp
```

The package names above are illustrative placeholders, not real recommendations. The GitHub URL and `claude mcp add` flags follow the briefs in notes_D/E; **Verify** exact URL before use.

Enhanced description to beat built-in Grep:

```json
{
  "name": "search_code_index",
  "description": "Semantic + symbol search over the indexed monorepo (all 14 services). Returns ranked matches with file path, symbol name, definition line and callers. Input: natural-language query or symbol name, e.g. 'where do we validate refund limits' or 'RefundPolicy.check'. Prefer this over Grep when you do not know the exact string, or need callers/definitions. Use Grep for exact literal/regex matches in files not yet indexed (index refreshes hourly).",
  "inputSchema": {"type":"object","properties":{"query":{"type":"string"},"limit":{"type":"integer","default":10}},"required":["query"]}
}
```

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Team servers in `.mcp.json`, committed | Ask each dev to hand-configure shared servers | Consistency and onboarding |
| `${GITHUB_TOKEN}` in config | Hardcode tokens in `.mcp.json` | Committed secrets leak |
| Personal experiments in `~/.claude.json` | Commit experimental servers to the repo | Would burden the whole team |
| Community server for Jira | Build a custom Jira MCP | Unnecessary maintenance |
| Custom server for team-specific workflows | Force those through generic tools | Fit-for-purpose |
| Resource for issue/schema catalog | Let the agent probe with exploratory calls | Fewer wasted calls |
| Rewrite MCP tool description | Remove Grep from the agent or add prompt "never use Grep" | Root cause is the vague description |

### Exam traps

- "Put the API token in `.mcp.json` and add the file to .gitignore": defeats sharing; use env expansion.
- "Put shared team server in `~/.claude.json`": personal scope, not shared.
- "The agent only sees the first server's tools": wrong; all are available simultaneously.
- "Write a custom MCP server for GitHub/Jira": choose community first.
- "Agent ignores MCP tool -> disable built-ins / add a system prompt mandate": fix the description first (simplest root cause).
- Option about "deploying/scaling the MCP server" is out-of-scope noise.

### Quick check

- Where does a shared Jira server config live? -> Project `.mcp.json`, token via `${JIRA_TOKEN}`.
- Agent keeps using Grep instead of your MCP search tool? -> Enrich the MCP tool description (capabilities, outputs, when to prefer).
- How to cut exploratory "what exists?" calls? -> Expose a catalog as an MCP resource.

---

## Chapter 2.5 - Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob)

**Why the exam cares:** Straightforward tool-selection questions, plus the Edit-failure fallback and incremental exploration patterns.

### Core concepts

| Tool | Best for | Example |
|---|---|---|
| **Grep** | search file CONTENTS | all callers of `process_refund`; where an error message is raised; import statements |
| **Glob** | match file PATHS/names | `**/*.test.tsx`, `src/**/config.*` |
| **Read** | load full file contents | understanding a module; prerequisite for Write/Edit |
| **Write** | create or fully replace a file | new file; reliable rewrite |
| **Edit** | targeted change via unique text match | change one function signature |
| **Bash** | run commands: tests, git, builds, scripts | `pytest -q`, `git diff --stat` |

- **Edit requires unique anchor text.** If the `old_string` matches multiple places (or the file was not read), Edit fails. Fallbacks: include more surrounding context to make it unique; if that is impractical, **Read the whole file, then Write the modified version**. (Claude Code also has `replace_all`; the guide's stated fallback is Read + Write.)
- **Incremental understanding:** do not Read every file up front (wastes context). Grep for an entry point (route name, error string, function), Read the hit, follow imports, Grep again. Each step narrows.
- **Wrapper modules:** if callers use `from payments import charge` while the real function is `_stripe_charge` in `payments/_impl.py`, grepping the underlying name misses usage. Procedure: (1) Read the wrapper and list its exported names; (2) Grep each exported name across the codebase; (3) then follow into the implementation.
- Grep vs Glob mixup is the simplest exam distinction: content -> Grep, filename -> Glob.

### Worked example: tracing usage through a wrapper

```bash
# 1. find the entry point by error message (content search -> Grep)
grep -rn "REFUND_EXCEEDS_LIMIT" src/
# 2. Read src/billing/refunds.py to see it re-exports via billing/__init__.py
# 3. list exported names of the wrapper
grep -n "^from\|^__all__\|^def \|^    \"" src/billing/__init__.py
#    -> exports: issue_refund, check_refund_limit
# 4. search each exported name across the codebase
grep -rn "issue_refund\|check_refund_limit" --include="*.py" .
# 5. find the related tests by filename (Glob)
#    Glob: **/test_refund*.py
```

Edit fallback flow:

```
Edit(old_string="return None") -> ERROR: 4 matches, not unique
  option A: widen anchor: "    if not order:\n        return None"
  option B: Read(file) -> modify in memory -> Write(file, full new content)
```

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Grep to find function callers / error strings | Glob for content | Glob matches names only |
| Glob for `**/*.test.tsx` | Grep every file's text for ".test.tsx" | Right tool, less noise |
| Read then Write when Edit is non-unique | Retry the same Edit repeatedly | Deterministic failure |
| Grep entry point, Read, follow imports | Read all 200 files first | Context waste |
| List wrapper exports, grep each | Grep only the internal function name | Misses aliased/re-exported usage |
| Bash for tests/git/build | Bash `sed`/`cat` when Read/Edit fit | Dedicated tools are safer and clearer |

### Exam traps

- "Use Glob to find all files that import `requests`": Glob is path-only; that is Grep.
- "Use Edit with the same string again" after a non-unique failure.
- "Read the entire repo first, then answer": not incremental.
- "Grep the wrapped function's original name to find all consumers": misses the wrapper's exported names.
- "Use Bash `find` instead of Glob": works, but the dedicated built-in is the expected choice.

### Quick check

- Find every test file? -> Glob `**/*.test.tsx` (pattern on path).
- Find where an error message is raised? -> Grep.
- Edit reports multiple matches and you cannot make a unique anchor? -> Read the file, Write the full updated content.

---

## Chapter recap

- I can put shared servers in `.mcp.json` with `${VAR}` secrets and personal ones in `~/.claude.json`.
- I know all servers' tools are available at once and what that costs.
- I can use MCP resources to expose catalogs and cut exploratory calls.
- I can choose community vs custom servers, and I know MCP tools/resources/prompts and stdio vs Streamable HTTP; hosting servers is out of scope.
- I can fix an agent preferring Grep by improving the MCP tool description.
- I can pick Grep/Glob/Read/Write/Edit/Bash, use Read+Write when Edit is non-unique, and trace wrapper usage by exported names.

## Mnemonics

- **"Project = .mcp.json = Pack (team); User = ~/.claude.json = Personal."**
- **"Secrets by reference: ${VAR}, never by value."**
- **"Grep = Guts (contents); Glob = Grab by name."**
- **"Edit needs One; else Read then Write."**
- **"Wrapper: list exports, then grep each."**
- **"Resources = the menu; Tools = the kitchen; Prompts = the specials."**
