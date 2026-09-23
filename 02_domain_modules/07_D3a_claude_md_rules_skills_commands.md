# 7. Claude Code Configuration: CLAUDE.md, Rules, Commands and Skills (D3a)

> **Domain 3: Claude Code Configuration & Workflows (20%)** | Task statements: 3.1, 3.2, 3.3 | Priority: **MUST** (Domain 3 was the weakest domain in candidate reports, even for daily Claude Code users) | Read time: ~20 min

## The 60-second version

- CLAUDE.md is **context, not enforcement**. It is loaded every session and Claude usually follows it, but nothing guarantees it. If it MUST happen, use a hook or `permissions.deny`; if it SHOULD happen, CLAUDE.md is fine.
- Three levels: user `~/.claude/CLAUDE.md` (only you, never in git), project `./CLAUDE.md` or `.claude/CLAUDE.md` (committed, whole team), directory `subdir/CLAUDE.md` (loads on demand when Claude works in that subtree).
- "New teammate is not getting the instructions" = the instructions live in `~/.claude/` (user level). Move them to the project level and commit. Verify with `/memory`.
- `@path/to/file` inside CLAUDE.md imports a file (modularity, e.g. per-package standards). `.claude/rules/*.md` splits a monolithic CLAUDE.md into topic files.
- Rules with `paths:` frontmatter globs load **only when matching files are touched**. Best for conventions that cut across directories (e.g. `**/*.test.tsx`). A subdirectory CLAUDE.md cannot do that.
- Commands/skills: `.claude/commands/` and `.claude/skills/` = shared via git; `~/.claude/commands/` and `~/.claude/skills/` = personal. Personal variant of a team skill: **use a different name**.
- Skill frontmatter to know: `context: fork` (isolated subagent, verbose output stays out of main chat), `allowed-tools`, `argument-hint`.
- Skill = on-demand task workflow. CLAUDE.md = always-loaded universal standards.

## Chapter 3.1 - Configure CLAUDE.md files with appropriate hierarchy, scoping and modular organization

**Why the exam cares:** Scenario "Claude Code for team config" asks you to diagnose why behavior differs between developers and to pick the correct scope. Wrong-level answers are the classic trap.

**Core concepts**

| Level | Path | Who gets it | In git? |
|---|---|---|---|
| Managed policy | macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`; Linux `/etc/claude-code/CLAUDE.md` | Everyone on the machine (cannot be excluded) | No (IT-deployed) |
| User | `~/.claude/CLAUDE.md` | Only you, all your projects | No |
| Project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Whole team | Yes |
| Project-local | `./CLAUDE.local.md` | Only you, this repo | No (gitignore it) |
| Directory | `packages/api/CLAUDE.md` | Anyone working in that subtree | Yes |

- Files are **concatenated, not overridden**. Order runs root to cwd, so the closest file is read last. Ancestor CLAUDE.md files load at launch; subdirectory files load on demand when Claude reads files there.
- **Why user level is a trap:** instructions in `~/.claude/CLAUDE.md` exist only on your laptop. A teammate who clones the repo never sees them. Project level is shared through version control.
- **@import**: a line like `@docs/standards/testing.md` (or `@~/.claude/my-notes.md`) inside CLAUDE.md pulls that file in. Imports expand at launch, so they still consume context; they help organization, not token savings. Not expanded inside code spans or fences. Imports outside the cwd need a one-time approval. In a monorepo, each package CLAUDE.md imports only the standards that package's maintainers care about.
- **.claude/rules/**: topic files (`testing.md`, `api-conventions.md`, `deployment.md`) as an alternative to one giant CLAUDE.md. Rules without `paths:` load at launch like CLAUDE.md; rules with `paths:` are conditional (Chapter 3.3). User-level rules: `~/.claude/rules/`.
- **/memory**: lists which memory files (CLAUDE.md, rules, auto memory) are loaded in the current session and lets you open/edit them. First tool for "inconsistent behavior across sessions".
- Keep each file under about 200 lines; adherence drops for long, vague files.
- Extra (awareness): `claudeMdExcludes` skips irrelevant CLAUDE.md files in monorepos; `--add-dir` does not load that directory's CLAUDE.md unless `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`; newer versions read `AGENTS.md` if no CLAUDE.md exists (CLAUDE.md wins if both; `@AGENTS.md` imports it). **Verify:** AGENTS.md support is a very recent (Sept 2026) note in notes_E; not in the exam guide.

**Do / Don't**

| Do | Don't | Why |
|---|---|---|
| Put team conventions in project CLAUDE.md, commit it | Put them in `~/.claude/CLAUDE.md` | User level is not shared |
| Split a 600-line CLAUDE.md into `.claude/rules/testing.md` etc. | Keep growing one file | Focused files are easier to maintain and follow |
| `@import` per-package standards in each package's CLAUDE.md | Copy-paste the same text into every package | Single source of truth |
| Run `/memory` to see what loaded | Guess or re-run prompts | It shows the actual loaded set |
| Use a hook for "never edit `prod/`" | Write "NEVER edit prod/" in CLAUDE.md | CLAUDE.md is advisory |

**Worked example: "new teammate is not getting instructions"**

```text
Symptom: Dana's Claude Code follows the "use pytest fixtures from tests/conftest.py"
convention; new hire Sam's does not.
Diagnosis steps:
1. Sam runs /memory -> the project CLAUDE.md lists no testing rule.
2. Dana's rule is in ~/.claude/CLAUDE.md (user level) -> never committed.
Fix: move it into ./CLAUDE.md (or .claude/rules/testing.md), commit, Sam pulls.
```

```markdown
# ./CLAUDE.md  (committed)
## Build & test
- Run tests: `npm run test`
## Standards
@docs/standards/api-conventions.md
@docs/standards/error-handling.md
```

**Exam traps**
- Option says "ask the teammate to copy your `~/.claude/CLAUDE.md`": works once, does not scale. Root cause is the wrong scope.
- Option says "add stronger wording (IMPORTANT, NEVER)": does not fix a file that is not loaded.
- Option says "CLAUDE.md files override each other, lowest wins": they concatenate.
- "Use @import to save tokens": imports are still loaded; path-scoped rules save tokens.

**Quick check**
- Where do shared team standards go? -> Project CLAUDE.md or `.claude/rules/`, committed.
- How do you see what memory loaded? -> `/memory`.
- Do imports reduce context usage? -> No, they expand at launch.

## Chapter 3.2 - Create and configure custom slash commands and skills

**Why the exam cares:** Questions test scope (project vs personal), the `context: fork` fix for context pollution, and skill-vs-CLAUDE.md placement.

**Core concepts**
- **Commands:** `.claude/commands/review.md` is available to everyone who clones the repo (`/review`). `~/.claude/commands/` is personal.
- **Skills:** a folder with a `SKILL.md`: `.claude/skills/<name>/SKILL.md` (project, shared) or `~/.claude/skills/<name>/SKILL.md` (personal). The `description` is always in context; the body loads only when the skill is invoked (progressive disclosure). Supporting files can sit beside SKILL.md.
- **Relationship (from the newer docs):** slash commands were merged into skills. `.claude/commands/x.md` still works; skills are the superset (frontmatter, supporting files). The exam guide still lists both, so know both paths.
- **Frontmatter the guide names:**
  - `context: fork` runs the skill in an isolated subagent. Verbose output (codebase analysis) or exploratory content (brainstorming alternatives) does not pollute the main conversation; the main session gets a summary.
  - `allowed-tools` limits/pre-approves tools while the skill runs (guide example: restrict to file writes to prevent destructive actions). **Verify:** newer docs (notes_E) describe it as pre-approving tools for that turn rather than a hard restriction; for hard limits use `permissions.deny`. On the exam, pick "allowed-tools" for "restrict tool access during skill execution".
  - `argument-hint` shows expected parameters when the user types the skill name with no arguments (e.g. `[branch-name]`).
- Other frontmatter (awareness, from newer docs): `name`, `description`, `disable-model-invocation: true` (user-only, good for deploy/commit), `user-invocable: false`, `agent`. Body substitutions: `$ARGUMENTS`.
- **Personal variants:** to tweak a team skill for yourself, create `~/.claude/skills/my-review/` with a **different name**. Same name risks shadowing or conflicts (in notes_E, precedence is enterprise > personal > project). Editing the project copy changes everyone's behavior.
- **Skill vs CLAUDE.md:** CLAUDE.md = universal, always-loaded standards. Skill = task-specific workflow invoked on demand (or auto-selected by description). Putting a rarely used 300-line procedure in CLAUDE.md taxes every session.

```markdown
<!-- .claude/skills/analyze-codebase/SKILL.md -->
---
name: analyze-codebase
description: Deep read-only analysis of module structure and dependencies
context: fork
allowed-tools: Read, Grep, Glob
argument-hint: [module-path]
---
Analyze $ARGUMENTS. Return a summary under 300 words: entry points,
dependencies, risks. Do not modify files.
```

**Do / Don't**

| Do | Don't | Why |
|---|---|---|
| `context: fork` for verbose analysis/brainstorm skills | Ask Claude to "summarize more" or run `/compact` after each use | Fork prevents the pollution at the source |
| Commit team commands/skills in `.claude/` | Put them in `~/.claude/` | Team availability via git |
| Personal tweak under a new name in `~/.claude/skills/` | Edit the shared skill | Would change teammates' behavior |
| Universal rules in CLAUDE.md, workflows in skills | Everything in CLAUDE.md | Always-loaded vs on-demand |
| `argument-hint` for required params | Prose in the body that hopes the user guesses | Prompts the developer at invocation |

**Exam traps**
- "Skill output is verbose and context degrades by the 3rd invocation": answer is `context: fork`, not moving the skill to `~/.claude/skills` or compacting.
- "`allowed-tools` in CLAUDE.md": wrong file; it is skill frontmatter.
- "Personal skill with the same name so it overrides": the guide says different name.
- Choosing a skill for something that must run 100% of the time: that is a hook.

**Quick check**
- Team-wide slash command location? -> `.claude/commands/` (or `.claude/skills/`), committed.
- Keep a noisy skill from bloating the chat? -> `context: fork`.
- Personal version of a shared skill? -> `~/.claude/skills/` under a different name.

## Chapter 3.3 - Apply path-specific rules for conditional convention loading

**Why the exam cares:** It tests recognizing that glob-based rules beat directory CLAUDE.md files when a convention follows a file type, not a folder.

**Core concepts**
- A rule file in `.claude/rules/` with YAML frontmatter:

```markdown
---
paths:
  - "**/*.test.tsx"
  - "**/*.test.ts"
---
Use React Testing Library; query by role, not test id. Mock network with msw.
```

- It loads **only when Claude edits/reads a matching file**, saving tokens and keeping irrelevant conventions out of context.
- **Why not subdirectory CLAUDE.md?** A directory CLAUDE.md is tied to one location. Tests scattered across `src/a/`, `src/b/`, `packages/*/__tests__/` would need a CLAUDE.md in every folder (and new folders would be missed). One glob rule covers them all.
- Use a subdirectory CLAUDE.md when the convention belongs to a **place** (a package with its own build commands). Use a `paths:` rule when it belongs to a **file pattern**. Rules without `paths:` are unconditional (loaded at launch).
- Other examples: `paths: ["terraform/**/*"]`, `["src/api/**/*.ts"]`.

**Do / Don't**

| Do | Don't | Why |
|---|---|---|
| `paths: ["**/*.test.tsx"]` for all test files | A CLAUDE.md in every folder with tests | Glob works regardless of directory |
| Path-scope terraform/API rules | Put them in root CLAUDE.md | Loaded for every task, wastes tokens |
| Subdirectory CLAUDE.md for a self-contained package | Glob rules for one folder | Simpler, matches location |
| Rely on `/memory` to confirm what loaded | Assume it matched | Verify globs |

**Exam traps**
- Option "put conventions in root CLAUDE.md and tell Claude to apply them only to test files": always loaded, inferred by prompt, not conditional.
- Option "skill": skills are chosen by task/description, not by file path activation.
- Confusing `paths:` (rules) with `allowed-tools` (skills).

**Quick check**
- Test files in many folders, one convention set? -> `.claude/rules/x.md` with `paths: ["**/*.test.*"]`.
- When does a path rule load? -> When a matching file is touched.
- Rule with no `paths`? -> Loads at launch.

## Master table: where does this config live?

| Config | File path | Scope | Shared via git? | Loading behavior |
|---|---|---|---|---|
| Managed CLAUDE.md | `/Library/Application Support/ClaudeCode/CLAUDE.md`, `/etc/claude-code/CLAUDE.md` | Org machines | No (IT) | Always loaded, advisory |
| User CLAUDE.md | `~/.claude/CLAUDE.md` | You, all projects | No | Always loaded, advisory |
| Project CLAUDE.md | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Team | Yes | Always loaded, advisory |
| Local CLAUDE.md | `./CLAUDE.local.md` | You, this repo | No (gitignore) | Always loaded, advisory |
| Directory CLAUDE.md | `<subdir>/CLAUDE.md` | Team, that subtree | Yes | On demand (when files there are read) |
| Rules (unconditional) | `.claude/rules/*.md` (user: `~/.claude/rules/`) | Team / you | Yes / No | Always loaded at launch |
| Rules (path-scoped) | `.claude/rules/*.md` with `paths:` | Team | Yes | On demand (matching files) |
| Project commands | `.claude/commands/*.md` | Team | Yes | On demand (user types `/name`) |
| Personal commands | `~/.claude/commands/*.md` | You | No | On demand |
| Project skills | `.claude/skills/<n>/SKILL.md` | Team | Yes | Description always; body on demand |
| Personal skills | `~/.claude/skills/<n>/SKILL.md` | You | No | Same |
| Subagents | `.claude/agents/<n>.md`, `~/.claude/agents/` | Team / you | Yes / No | On delegation |
| Project settings | `.claude/settings.json` | Team | Yes | Deterministic (permissions, hooks, env) |
| Local settings | `.claude/settings.local.json` | You, this repo | No | Deterministic |
| User settings | `~/.claude/settings.json` | You | No | Deterministic |
| Managed settings | `managed-settings.json` / MDM / server | Org | No (IT) | Deterministic, highest precedence |
| MCP (project) | `.mcp.json` at repo root | Team | Yes | Tools available; needs approval |
| MCP (user/local) | `~/.claude.json` | You | No | Tools available |
| Hooks | `hooks` key in any settings file (also plugins, skill frontmatter) | By file | By file | **Deterministic** (always fires on event) |

## settings.json precedence

Highest to lowest: **Managed** > CLI `--settings` > `.claude/settings.local.json` > `.claude/settings.json` > `~/.claude/settings.json`.
- Scalar keys: the higher layer wins. List keys (e.g. `permissions.allow`) **merge** across files.
- **`deny` always wins over `allow`.**
- `~/.claude.json` is Claude-written state (OAuth, local/user MCP servers, trust decisions), not for hand editing.
- Guide-related trap: "allow `npm test` for everyone without prompts" -> committed `.claude/settings.json`, not CLAUDE.md (unenforced), not `settings.local.json` (personal), not `~/.claude` (one user).
- **Verify:** the exact precedence order comes from notes_E (docs brief), not the exam guide.

## Hooks vs CLAUDE.md

| | CLAUDE.md | Hook |
|---|---|---|
| Nature | Guidance in context | Code run by the harness on an event |
| Reliability | Probabilistic | Deterministic, every time |
| Good for | Style, conventions, build commands | Format after edit, block protected paths/commands, run tests before stop |
| Example | "Prefer small functions" | PreToolUse hook exits 2 on writes to `prod/` |
| Config | Markdown | `hooks` in settings.json (`PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit`...) |

Exit code 2 from a hook = blocking (stderr goes back to Claude). This is the same "MUST = code, SHOULD = prompt" rule as Domain 1.

```json
{"hooks":{"PostToolUse":[{"matcher":"Edit|Write",
  "hooks":[{"type":"command","command":"npx prettier --write \"$CLAUDE_FILE\""}]}]}}
```
**Verify:** the exact env variable/stdin field for the edited file path is not confirmed in notes; hooks receive JSON on stdin including `tool_name` and `tool_input`. Treat the snippet as illustrative.

## Decision tree: CLAUDE.md vs skill vs rule vs hook vs permission

```text
Must it happen (or be prevented) 100% of the time?
 |- YES, security/safety boundary (never read .env, never run rm -rf)
 |     -> permissions.deny (or managed settings)
 |- YES, automatic action on an event (format after edit, tests before stop, audit log)
 |     -> hook
 |- NO (guidance is fine)
      Does it apply to every task in the repo?
       |- YES -> CLAUDE.md (project level, <200 lines, @import to organize)
       |- NO, only for certain file types/paths
       |     -> .claude/rules/*.md with paths: glob
       |        (single self-contained folder -> subdirectory CLAUDE.md)
       |- NO, a task workflow the user or Claude starts on demand
             -> skill (heavy/noisy? add context: fork; side effects? disable-model-invocation)
Only for me, not the team? -> same choice but in ~/.claude/ or CLAUDE.local.md
Pre-approving a routine command without prompts for all? -> permissions.allow in .claude/settings.json
```

## Chapter recap

- I can explain the user/project/directory CLAUDE.md levels and which are shared via git.
- I can diagnose "new teammate not getting instructions" and fix it by moving to project level.
- I can use `@import`, `.claude/rules/`, and `/memory`.
- I can distinguish `.claude/commands` from `~/.claude/commands` and write SKILL.md with `context: fork`, `allowed-tools`, `argument-hint`.
- I can create a personal skill variant without affecting teammates (different name).
- I can write a `paths:` glob rule and explain why it beats subdirectory CLAUDE.md for cross-directory conventions.
- I can pick the right mechanism with the decision tree and state settings precedence.

## Mnemonics

- **"User = Just Me"**: `~/.claude` never reaches teammates.
- **"Fork the noise"**: verbose skill -> `context: fork`.
- **"Glob for type, folder for place"**: `paths:` rule vs directory CLAUDE.md.
- **"Ask nicely vs make it so"**: CLAUDE.md asks, hooks/deny make it so.
- **"Deny beats allow"**: in permissions, always.
