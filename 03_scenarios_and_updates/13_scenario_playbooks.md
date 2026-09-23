# 13. Scenario Playbooks: the 6 official exam scenarios

> **Domain + weight:** cross-domain (D1 27%, D2 18%, D3 20%, D4 20%, D5 15%). **Task statements covered:** all 30, re-indexed by scenario. **Priority:** MUST. **Read time:** ~25 min (do not skim any scenario).

The exam draws 4 of these 6 scenarios at random, roughly 15 questions each (60 total). One candidate who skimmed two scenarios regretted it because one of them appeared. Each scenario below is a self-contained playbook: setup, domains, reference architecture, the decisions likely probed (with task statement numbers), wrong-answer temptations, and an "if you see X, think Y" table.

Sample-question anchors quoted below (12% skipped get_customer, 55% vs 80% resolution, 14 files PR, $500-style hooks, 50% batch and 24h) come from the official guide unless flagged as third-party.

## The 60-second version

- **MUST happen -> code (hook, prerequisite gate, schema, permission). SHOULD happen -> prompt.** This one rule decides perhaps a third of the questions.
- **Root cause, smallest proportionate fix.** "Most effective first step" nearly always means: better tool descriptions, explicit criteria, a schema change, or a decomposition fix, not a new classifier, bigger model, or bigger context.
- **Multi-agent failures are usually upstream.** If subagents each did their job and the output is wrong, look at the coordinator's decomposition or what it passed down (they inherit nothing).
- **Claude Code questions are location questions.** Shared and version-controlled = project scope (`.claude/`, `CLAUDE.md`, `.mcp.json`). Personal = `~/.claude/`. Conditional-by-path = `.claude/rules/` with `paths:` globs.
- **CI = `-p`, structured output, independent session, focused passes, and Batch API only for non-blocking work.**
- **Extraction = schema (tool use / structured outputs) for syntax, validation-retry for semantics, few-shot for ambiguity, nullable fields against fabrication, human review by stratified confidence.**
- **Distractors to reject on sight:** sentiment or self-reported-confidence escalation, arbitrary iteration caps, parsing assistant text to end the loop, more tools / bigger model / bigger context, self-review, batch for blocking flows, consensus voting that hides real bugs.
- **Tool name:** the guide says the subagent tool is `Task` (`allowedTools` must include `"Task"`); newer SDK docs call it the `Agent` tool. Same thing for exam purposes.

---

## Scenario 1: Customer Support Resolution Agent

### Setup
Claude Agent SDK agent handling high-ambiguity requests: returns, billing disputes, account issues. Custom MCP tools: `get_customer`, `lookup_order`, `process_refund`, `escalate_to_human`. Target: 80%+ first-contact resolution while knowing when to escalate.

**Primary domains:** D1 Agentic Architecture, D2 Tool Design and MCP, D5 Context Management and Reliability.

### Reference architecture

```
 Customer message
        |
        v
 +--------------------------------------------------------------+
 | Agent loop (SDK): send -> check stop_reason -> run tools -> loop |
 |   stop_reason == "tool_use"  -> execute, append tool_result   |
 |   stop_reason == "end_turn"  -> finish                         |
 +--------------------------------------------------------------+
        | tool calls                                  ^
        v                                             |
 +--------------------+   PreToolUse / PostToolUse hooks (deterministic)
 | PROGRAMMATIC GATE  |   - block lookup_order/process_refund until
 | (prerequisite)     |     get_customer returned a verified customer_id
 +--------------------+   - block process_refund > $ threshold -> escalate
        |                 - normalize dates/status codes in tool results
        v
 +-----------+ +-------------+ +---------------+ +-------------------+
 |get_customer| |lookup_order | |process_refund | |escalate_to_human  |
 | (MCP)     | | (MCP)       | | (MCP)         | | (MCP, case summary)|
 +-----------+ +-------------+ +---------------+ +-------------------+
        |  structured errors: {errorCategory, isRetryable, message}
        v
 Persistent "case facts" block (IDs, amounts, dates, status) kept OUT
 of summarized history; system prompt has escalation criteria + few-shot
```

### Decisions the exam is likely to probe

| # | Stem pattern | Right answer | Task stmt |
|---|---|---|---|
| 1 | Agent skips `get_customer` in 12% of cases and calls `lookup_order` with a stated name, causing wrong refunds | **Programmatic prerequisite** blocking `lookup_order`/`process_refund` until a verified ID exists. Not prompt wording, not few-shot, not a routing classifier | 1.4 |
| 2 | Agent picks `get_customer` when user says "check my order #12345"; both descriptions are one line | **Expand tool descriptions** (input formats, examples, edge cases, boundaries vs similar tools). First step; not few-shot, not routing layer, not consolidation | 2.1 |
| 3 | 55% resolution vs 80% target: escalates easy photo-evidence damage cases, handles policy exceptions alone | **Explicit escalation criteria + few-shot** examples. Not self-reported confidence 1-10, not a trained classifier, not sentiment | 5.2 |
| 4 | Refunds above a limit must never run without approval | **Hook** (PreToolUse interception) that blocks and redirects to escalation; not a system-prompt instruction | 1.5 |
| 5 | Different MCP tools return dates as Unix timestamps, ISO strings, and status as ints vs strings | **PostToolUse hook** normalizing tool results before the model sees them | 1.5 |
| 6 | `lookup_order` times out | Return **structured error** (category, `isRetryable`, description) so the agent retries only transient failures; distinguish a valid empty result ("no orders") from an access failure | 2.2, 5.3 |
| 7 | Customer explicitly says "get me a human" | **Escalate immediately**; do not first attempt to resolve | 5.2 |
| 8 | Customer mentions an order ID but the name matches two accounts | **Ask for another identifier**; never pick by heuristic | 5.2 |
| 9 | Long multi-issue conversation loses the refund amount and order ID after summarization | Persistent **case facts block** outside summarized history; trim verbose tool output to relevant fields | 5.1 |
| 10 | Escalating to a human: what does the handoff contain? | Structured summary: customer ID, root cause, what was tried, refund amount, recommended action (human has no transcript access) | 1.4, 5.2 |
| 11 | Loop termination | Continue while `stop_reason == "tool_use"`; stop on `end_turn`. Not text parsing, not a fixed iteration cap as primary control | 1.1 |
| 12 | One message has 3 issues (return, billing, address) | Decompose, investigate in parallel sharing customer context, synthesize one response | 1.6 |
| 13 | 18 tools on one agent, selection degrading | Scope tools per agent role (4-5 each); the support agent needs only its four | 2.3 |

### Wrong-answer temptations
- **"Strengthen the system prompt: verification is MANDATORY."** Probabilistic compliance where the error has financial consequences. The guide explicitly rejects this.
- **Routing classifier that enables tool subsets.** Solves tool availability, not tool ordering (Q1), and is over-engineered for description problems (Q2).
- **Sentiment threshold escalation.** Sentiment does not correlate with case complexity or policy exceptions.
- **Self-reported confidence score.** Poorly calibrated, and the agent is already wrong-but-confident on hard cases.
- **Separate ML classifier for escalation** before trying prompt criteria: infrastructure before the proportionate fix.
- **Consolidating tools into `lookup_entity`.** Valid but bigger effort than a "first step".
- **Auto-escalate on first tool error.** Wastes human time; retry transient errors, escalate on policy gaps or exhausted recovery.

### If you see X, think Y

| Stem contains | Think |
|---|---|
| "X% of cases skips step A" / "must always verify before" | Programmatic prerequisite / hook, not prompt |
| "minimal descriptions", "similar inputs", wrong tool chosen | Rewrite tool descriptions first |
| "escalates simple cases, handles complex ones" | Explicit criteria + few-shot (decision boundary problem) |
| "customer frustrated / angry" | Acknowledge and resolve if within capability; escalate only on explicit request or policy gap |
| "customer asks for a human" | Escalate now |
| "multiple matches" | Clarify with more identifiers, do not guess |
| "refund over $N" | Hook with threshold |
| "timeout / service unavailable" | Structured error with retryable flag; local recovery before propagating |
| "agent forgets amount/order after long chat" | Case facts block, not bigger context |
| "first-contact resolution below target" | Diagnose whether escalation criteria or tool clarity is the cause |

---

## Scenario 2: Code Generation with Claude Code

### Setup
A team uses Claude Code for generation, refactoring, debugging and documentation. Needs integration into the workflow via custom slash commands, `CLAUDE.md` configuration, and knowing when to use plan mode vs direct execution.

**Primary domains:** D3 Claude Code Configuration and Workflows, D5 Context Management and Reliability.

### Reference architecture

```
 repo/
 +-- CLAUDE.md                     # project-wide facts, shared via git
 |     @imports -> standards/testing.md, standards/api.md
 +-- .claude/
 |   +-- CLAUDE.md (alt location)
 |   +-- commands/review.md        # project slash command (legacy path, works)
 |   +-- skills/<name>/SKILL.md    # on-demand workflow; frontmatter:
 |   |       context: fork | allowed-tools | argument-hint
 |   +-- rules/*.md                # frontmatter  paths: ["**/*.test.tsx"]
 |   +-- settings.json (shared) / settings.local.json (personal)
 |   +-- agents/*.md               # subagents
 +-- .mcp.json                     # team MCP servers, ${ENV} secrets
 +-- packages/web/CLAUDE.md        # directory-level, loads when files there are read

 ~/.claude/CLAUDE.md, ~/.claude/commands, ~/.claude/skills  # personal, NOT shared

 Task arrives -> [complex/architectural/multi-file?]
     yes -> PLAN MODE (explore, design, approve) -> direct execution
     no  -> DIRECT EXECUTION (small, clear-scope fix)
 Long session -> /compact (focused) ; unrelated task -> /clear ; noisy
 exploration -> Explore subagent
```

### Decisions the exam is likely to probe

| # | Stem pattern | Right answer | Task stmt |
|---|---|---|---|
| 1 | `/review` command available to every developer on clone | `.claude/commands/` in the repo (or a project skill). `~/.claude/commands` is personal | 3.2 |
| 2 | New teammate does not get the team's instructions | Instructions were in `~/.claude/CLAUDE.md` (user scope, not shared); move to project `CLAUDE.md`. Diagnose hierarchy | 3.1 |
| 3 | Conventions differ by area; test files sit next to source across many directories | `.claude/rules/` with `paths:` globs (`**/*.test.tsx`). Not root CLAUDE.md inference, not skills (need invocation), not per-directory CLAUDE.md (directory-bound) | 3.3 |
| 4 | Monolith to microservices, dozens of files, boundary decisions | **Plan mode** | 3.4 |
| 5 | Fix a single-file null check with a clear stack trace | **Direct execution**; plan mode is overkill | 3.4 |
| 6 | Large task with unknown scope: explore first without polluting main context | Plan mode plus **Explore subagent** to isolate verbose discovery | 3.4, 5.4 |
| 7 | Verbose skill produces lots of output; keep the main session clean | Skill with `context: fork` | 3.2 |
| 8 | Restrict which tools a skill may use | `allowed-tools` frontmatter (pre-approval; not a hard boundary) | 3.2 |
| 9 | Ambiguous request; results vary; how to communicate intent | Concrete **input/output examples**; test-driven iteration (write tests, share failures); interview pattern (have Claude ask questions) for unfamiliar domains | 3.5 |
| 10 | Multiple interacting issues | One detailed message with all issues when they interact; sequential iteration when independent | 3.5 |
| 11 | CLAUDE.md is huge and instructions are ignored | Split into `@imports` and `.claude/rules/`, keep concise; use `/memory` to see which files loaded | 3.1 |
| 12 | Monorepo, wrong CLAUDE.md files loading | Understand ancestor vs subdirectory loading; `claudeMdExcludes`; verify with `/memory` | 3.1 |
| 13 | Team wants formatter after every edit | **Hook** (PostToolUse on Edit/Write), not a CLAUDE.md line. Deterministic beats advisory | 1.5 / 3.x (settings) |

### Wrong-answer temptations
- **Central "everything" root CLAUDE.md** where Claude "infers" which section applies: unreliable.
- **Skills for automatic convention loading:** skills are on-demand; rules with globs are automatic.
- **`.claude/config.json` with a commands array:** does not exist (guide names it as a fabricated option).
- **Start direct and switch to plan mode only if complexity appears:** the stem already states the complexity.
- **"Comprehensive upfront instructions" instead of exploration:** assumes you know the structure.
- **Treating CLAUDE.md as enforcement.** It is context. Guaranteed behavior needs hooks or permissions.
- **User-level config for team behavior.** If teammates must have it, it must be in the repo.

### If you see X, think Y

| Stem contains | Think |
|---|---|
| "every developer ... clone or pull" | Project scope, version-controlled (`.claude/`) |
| "personal", "only for me" | `~/.claude/` or `CLAUDE.local.md` |
| "conventions by file type/location across dirs" | `.claude/rules/` with `paths` globs |
| "dozens of files", "architectural", "multiple valid approaches" | Plan mode |
| "one-line fix", "clear stack trace" | Direct execution |
| "verbose output pollutes context" | `context: fork` skill or subagent |
| "must run every time", "guarantee" | Hook, not CLAUDE.md |
| "instructions inconsistently followed, CLAUDE.md huge" | Trim, `@import`, rules |
| "keeps producing wrong format" | Add 2-3 concrete input/output examples |

---

## Scenario 3: Multi-Agent Research System

### Setup
Claude Agent SDK. A coordinator delegates to specialized subagents: web search, document analysis, synthesis, report generation. The system researches topics and produces comprehensive, cited reports.

**Primary domains:** D1 Agentic Architecture, D2 Tool Design and MCP, D5 Context Management and Reliability.

### Reference architecture

```
                    +----------------------------+
   topic  --------> |   COORDINATOR (hub)        |  allowedTools includes "Task"
                    | - decompose (cover ALL     |  (called "Agent" in newer docs)
                    |   domains of the topic)    |
                    | - spawn subagents IN       |
                    |   PARALLEL (multiple Task  |
                    |   calls in one response)   |
                    | - explicit context in each |
                    |   prompt (no inheritance)  |
                    | - evaluate coverage, re-   |
                    |   delegate gaps            |
                    +--+---------+---------+-----+
        structured task|         |         |
                       v         v         v
              +----------+ +-----------+ +-----------+     +----------+
              |web search| |doc analysis| | synthesis |---->| report   |
              | tools:   | | tools:     | | scoped    |     | generator|
              | search,  | | read doc,  | | verify_   |     +----------+
              | fetch    | | extract    | | fact only |
              +----+-----+ +-----+------+ +-----+-----+
                   |             |              |
   returns structured findings: {claim, evidence excerpt, source URL,
   doc name, page, publication date, confidence?} OR structured error
   {failureType, attemptedQuery, partialResults, alternatives}
                   \             |             /
                    +--> coordinator merges, keeps claim->source mapping,
                         annotates conflicts, reports coverage gaps
```

### Decisions the exam is likely to probe

| # | Stem pattern | Right answer | Task stmt |
|---|---|---|---|
| 1 | Report on "AI in creative industries" covers only visual arts; each subagent worked correctly; coordinator logs show three visual-art subtasks | **Coordinator's decomposition too narrow.** Not synthesis, search, or doc agent | 1.6, 1.2 |
| 2 | Synthesis agent output misses findings from earlier agents | Coordinator did not pass prior results in the synthesis prompt; subagents have **isolated context** and see only their prompt | 1.3 |
| 3 | Web search subagent times out | Return **structured error context** (failure type, query, partial results, alternatives) so coordinator recovers. Not generic "unavailable", not empty-success, not kill the workflow | 5.3 |
| 4 | Synthesis needs frequent simple fact checks: 2-3 round trips, +40% latency; 85% simple, 15% deep | Scoped **`verify_fact` tool** for synthesis; complex verification still goes through coordinator. Least privilege; not all search tools, not batching | 2.3 |
| 5 | Independent subtasks, want speed | Emit multiple `Task` tool calls in a single coordinator response (parallel spawn) | 1.3 |
| 6 | Sources conflict (two statistics for the same metric) | Preserve **both with attribution** and dates; do not silently pick; separate well-established from contested findings in the report | 5.6 |
| 7 | Final report lost citations | Subagent outputs must use structured claim-source mappings that survive synthesis | 5.6 |
| 8 | Findings from different dates look contradictory | Require publication/collection dates in structured output so temporal differences are not read as contradictions | 5.6 |
| 9 | Verbose subagent output exhausting coordinator context | Subagents return concise structured findings plus metadata; keep raw content inside the subagent | 5.1, 5.4 |
| 10 | Long-running research interrupted | Persist state (scratchpad/manifest), resume with `--resume`/session; or fresh session with injected structured summary if tool results are stale | 1.7 |
| 11 | Explore two alternative approaches from one baseline | `fork_session` | 1.7 |
| 12 | Hand-off between phases must be reliable | Hooks / programmatic gates for required steps; structured handoff data, not free-form prose | 1.4 |
| 13 | Subagent instructions | Goals and quality criteria, not step-by-step procedure, so the subagent can adapt | 1.3 |

### Wrong-answer temptations
- **Blame the downstream agent** when the logs prove the assignment was narrow (Q7 style). Read the coordinator log line first.
- **Automatic retry with generic status** inside the subagent: hides context needed for intelligent recovery.
- **Suppress the error as success** (empty result): the worst option; silent failure produces incomplete reports that look complete.
- **Terminate the whole pipeline** on one failure.
- **Give the synthesis agent all web tools** (over-provisioning), or **speculative caching** of extra context (cannot predict needs).
- **Full-mesh agent-to-agent communication:** the pattern is hub-and-spoke through the coordinator (observability, consistent error handling).
- **Assume subagents inherit history.** They do not; if it matters, it must be in the prompt.
- **Run agents sequentially by default** when subtasks are independent.

### If you see X, think Y

| Stem contains | Think |
|---|---|
| "each subagent succeeded but output incomplete/narrow" | Coordinator decomposition |
| "subagent lacks information the other found" | Explicit context passing in prompt |
| "timeout / failure of one subagent" | Structured error to coordinator; partial results; continue with annotation |
| "round trips add latency, mostly simple lookups" | Scoped tool on the agent that needs it |
| "citations missing in final report" | Claim-source mapping preserved through handoffs |
| "conflicting figures" | Keep both, attribute, date; do not choose arbitrarily |
| "speed up independent subtasks" | Parallel `Task` calls in one turn |
| "context window filling up in coordinator" | Concise structured returns, trimmed outputs, scratchpad |
| "subagent should only read" | Restrict `tools`/`allowedTools` on its definition |

---

## Scenario 4: Developer Productivity with Claude

### Setup
Claude Agent SDK tools that help engineers explore unfamiliar codebases, understand legacy systems, generate boilerplate, and automate repetitive tasks. Uses built-in tools (Read, Write, Bash, Grep, Glob) and integrates with MCP servers.

**Primary domains:** D2 Tool Design and MCP, D3 Claude Code Configuration, D1 Agentic Architecture.

### Reference architecture

```
 Engineer question: "how does billing work in this legacy monolith?"
        |
        v
 +-------------------------------------------------+
 | Main agent (keeps high-level picture only)       |
 |  1. Grep  -> find entry points / usages          |
 |  2. Glob  -> locate files by pattern             |
 |  3. Read  -> targeted files (not whole tree)     |
 |  4. Edit  -> anchored change; fallback Read+Write|
 |  5. Bash  -> run tests, git, scripts             |
 +-----+------------------------------+------------+
       | verbose discovery            | external systems
       v                              v
 +--------------+             +---------------------------+
 | Explore      |             | MCP servers               |
 | subagent     |             | .mcp.json (team, project) |
 | (own context,|             | ~/.claude.json (personal) |
 | returns      |             | secrets via ${ENV_VAR}    |
 | summary)     |             | tools: mcp__server__tool  |
 +--------------+             | + MCP resources (catalog) |
                              +---------------------------+
 Context hygiene: scratchpad file of findings, /compact, summaries of
 phase 1 injected into phase 2, crash recovery via saved manifest
```

### Decisions the exam is likely to probe

| # | Stem pattern | Right answer | Task stmt |
|---|---|---|---|
| 1 | Find all callers of a function across the repo | **Grep** (content search). Files by name/pattern: **Glob** | 2.5 |
| 2 | Edit fails because anchor text is not unique | Fall back to **Read + Write** (full rewrite) or make the anchor unique | 2.5 |
| 3 | Trace a function's usage through wrappers/re-exports | Grep for the function name, then follow imports incrementally; do not read everything up front | 2.5, 5.4 |
| 4 | Team wants a shared MCP server for everyone; another for personal use | Shared: project `.mcp.json` (committed, `${VAR}` expansion for secrets). Personal: user scope | 2.4 |
| 5 | Credentials in `.mcp.json` | Environment variable expansion `${TOKEN}`; never hardcode or commit | 2.4 |
| 6 | Agent has 18 tools and picks poorly | Distribute: scope each agent to the 4-5 relevant tools; replace generic tools with constrained ones (e.g. `fetch_url` restricted to validated domains) | 2.3 |
| 7 | Agent ignores your MCP tool in favor of built-in Grep | Rich MCP tool description explaining capabilities and when to prefer it | 2.1, 2.4 |
| 8 | Agent must discover available data without exploratory calls | Expose **MCP resources** as a content catalog (issue summaries, schema, hierarchy) | 2.4 |
| 9 | Exploration of a huge codebase degrades: agent references "typical patterns" instead of specifics | Context degradation: use **subagents** for exploration, scratchpad files for findings, summarize phase results, `/compact` | 5.4 |
| 10 | Session crashes mid-analysis | Structured **state manifest** exported per phase; on resume, load manifest and inject it | 5.4, 1.7 |
| 11 | Explore then implement | Explore subagent for discovery; main context reserved for decisions and edits | 1.3, 3.4 |
| 12 | Migrate a library across many files, same mechanical change | Sequential/parallel simple edits; plan mode if boundaries unclear; hooks for lint after edit | 3.4 |
| 13 | Resume a previous investigation after code changed | Resume with named session but tell the agent which files changed for targeted re-analysis; if tool results are stale, start fresh with a summary | 1.7 |

### Wrong-answer temptations
- **Read every file upfront** "to understand the system": burns context and triggers lost-in-the-middle. Strategy is targeted search then read.
- **Bash `grep`/`find` when Grep/Glob exist.** The built-ins are the intended answer for the given job.
- **Add more tools to the one agent** to make it more capable: tool overload.
- **Hardcode secrets in `.mcp.json`** or put team servers in user scope.
- **Use a huge model or bigger context** to deal with a large codebase instead of decomposition.
- **Treat MCP resources like tools.** Resources expose data for context; tools perform actions.
- **Assume a Write can edit a file in place.** Edit does targeted change; Write replaces the file.

### If you see X, think Y

| Stem contains | Think |
|---|---|
| "find where X is used / called" | Grep |
| "find files named / matching **/*.test.*" | Glob |
| "Edit fails, non-unique match" | Read + Write fallback |
| "shared with the whole team" (MCP) | `.mcp.json` project scope |
| "token / API key in config" | `${ENV_VAR}` expansion |
| "agent has too many tools / misuses tools" | Scope per agent (4-5), constrain generic tools |
| "verbose exploration output fills context" | Explore subagent |
| "agent starts giving generic answers late in session" | Context degradation: scratchpad, `/compact`, fresh subagent |
| "agent prefers built-in over MCP tool" | Improve MCP tool description |
| "session interrupted" | Manifest plus resume with state injection |

---

## Scenario 5: Claude Code for Continuous Integration

### Setup
Claude Code in a CI/CD pipeline: automated code review, test generation, PR feedback. Requires prompts that give actionable feedback and minimize false positives.

**Primary domains:** D3 Claude Code Configuration, D4 Prompt Engineering and Structured Output.

(Candidates reported more git/CI command questions than the practice exam. Know the flags.)

### Reference architecture

```
 PR opened / pushed
       |
       v
 CI job:  claude -p "<prompt>" --output-format json --json-schema '{...}'
          (-p = non-interactive; result to stdout; exits)
          --allowedTools minimal; --max-turns / job timeout for cost control
          CLAUDE.md in repo = review criteria, test standards, fixtures
       |
       |-- PASS 1 (per file, parallel): local issues, consistent depth
       |-- PASS 2 (integration): cross-file data flow, contracts
       |-- prior findings passed in -> report only NEW/unresolved
       |-- existing test files in context -> no duplicate test cases
       v
 Structured findings [{file, line, severity, category, issue,
                        suggested_fix, detected_pattern}]
       |
       v
 Post as inline PR comments (API)          Session A (generated code)
 Blocking pre-merge check  -> real-time    Session B (independent reviewer,
 Overnight debt report     -> Message Batches (50% off, up to 24h,      no generator reasoning)
                              custom_id to correlate, no SLA)
```

### Decisions the exam is likely to probe

| # | Stem pattern | Right answer | Task stmt |
|---|---|---|---|
| 1 | `claude "Analyze this PR"` hangs waiting for input | **`-p` / `--print`**. `CLAUDE_HEADLESS` and `--batch` do not exist (guide flags them as fabricated); `< /dev/null` is a workaround | 3.6 |
| 2 | Need machine-parseable review output for inline comments | `--output-format json` with `--json-schema` | 3.6, 4.3 |
| 3 | Team's review standards must apply in CI automatically | Put them in the project `CLAUDE.md` (criteria, test standards, available fixtures) | 3.6, 3.1 |
| 4 | Blocking pre-merge check plus overnight technical-debt report; manager proposes Batch API for both | **Batch only for the overnight report**; real-time for blocking. Batch has 50% savings but up to 24h with no latency SLA | 4.5 |
| 5 | 14-file PR: inconsistent depth, contradictory feedback, missed bugs | **Split into per-file passes plus a separate integration pass** (attention dilution). Not asking devs for smaller PRs, not bigger model/context, not run-3-times consensus | 4.6 |
| 6 | Reviewer flags style trivia and developers ignore it | **Explicit criteria**: report bugs and security; skip minor style and local patterns. Define severity levels with concrete code examples | 4.1 |
| 7 | One category has high false positives | **Temporarily disable that category** to restore trust while you fix the prompt | 4.1 |
| 8 | "Be conservative" / "only high confidence" did not help | Vague instructions do not improve precision; use specific categorical criteria | 4.1 |
| 9 | Same review model that wrote the code reviews it and misses its own issues | **Independent session/instance** without the generator's reasoning context; self-review is biased | 4.6 |
| 10 | Rerun after new commits duplicates comments | Include prior review findings in context; report only new or still-unaddressed issues | 3.6 |
| 11 | Test generation suggests duplicates | Provide existing test files in context; document what fixtures exist in CLAUDE.md | 3.6 |
| 12 | Ambiguous review judgment cases | 2-4 few-shot examples showing why one action was chosen over alternatives, to generalize | 4.2 |
| 13 | Tune Batch API for a nightly job | Batch with `custom_id`, refine prompt on a small sample first, handle failed items by resubmitting only failures, size batches for SLA (24h window) | 4.5 |

### Wrong-answer temptations
- **Batch everything for 50% savings.** Unsafe for blocking flows; "often faster" is not a guarantee.
- **Larger model / larger context window** for the 14-file inconsistency. Context size does not fix attention quality.
- **Consensus of 3 full-PR runs** ("only issues that appear twice"): suppresses real intermittently-detected bugs and triples cost.
- **Shifting burden to developers** (split your PRs): not a system improvement.
- **Made-up flags** (`--batch`, `CLAUDE_HEADLESS`) and stdin redirects.
- **Confidence-threshold filtering** as the fix for false positives, when the real issue is missing criteria.
- **Same session reviews its own generation.** Retains reasoning; less likely to challenge itself.
- **Timeout fallback from batch to real-time:** unnecessary complexity vs. simply matching API to use case.

### If you see X, think Y

| Stem contains | Think |
|---|---|
| "job hangs", "waiting for input" | `-p` |
| "parse the output", "post inline comments" | `--output-format json` + `--json-schema` |
| "blocking", "developers wait" | Real-time API, not batch |
| "overnight", "weekly", "not urgent" | Message Batches API (50%, <=24h) |
| "N files, inconsistent, contradictory" | Per-file passes + integration pass |
| "developers ignore comments", "too many false positives" | Explicit criteria, severity examples, disable noisy category |
| "duplicate comments on re-run" | Provide prior findings, report only new |
| "same model reviews its own code" | Independent instance |
| "duplicate generated tests" | Provide existing tests, document fixtures |

---

## Scenario 6: Structured Data Extraction

### Setup
A system extracts information from unstructured documents, validates output with JSON schemas, maintains high accuracy, handles edge cases gracefully and integrates with downstream systems.

**Primary domains:** D4 Prompt Engineering and Structured Output, D5 Context Management and Reliability.

### Reference architecture

```
 Document (invoice / contract / report, formats vary)
      |
      v
 Extraction call: tool_use with JSON schema  (or structured outputs / strict)
   - required vs optional fields; NULLABLE where source may lack data
   - enums with "other" + detail string; "unclear" value
   - few-shot examples for varied formats / ambiguous cases
   - forced tool_choice {"type":"tool"} when output must be structured
      |
      v
 Syntax guaranteed valid by schema  -- but NOT semantically correct
      |
      v
 VALIDATION: schema check + semantic checks (line items sum to total;
             dates coherent; stated vs computed total)
      | fail
      v
 RETRY with: original doc + failed extraction + specific error
   (works for format/structure errors; useless if info is absent from doc)
      | pass
      v
 confidence per field (calibrated on labeled set) + detected_pattern
      |
      +--> high confidence, low-risk -> automated
      +--> low confidence / ambiguous / contradictory -> human review queue
           (stratified sampling by document type and field to catch
            silent error segments)
 Bulk backfill / non-urgent -> Message Batches API (50%, custom_id)
```

### Decisions the exam is likely to probe

| # | Stem pattern | Right answer | Task stmt |
|---|---|---|---|
| 1 | Model returns malformed JSON / prose around JSON | **Tool use with JSON schema** (or structured outputs / strict tools). Eliminates syntax errors; do not parse free text | 4.3 |
| 2 | Model invents values for fields not in the document | Make those fields **nullable/optional** so absence can be represented; required fields force fabrication | 4.3 |
| 3 | Extraction guaranteed valid JSON yet line items do not sum to total | Schema does not catch **semantic errors**; add validation (sum check; extract both `stated_total` and `calculated_total` and flag mismatch) | 4.3, 4.4 |
| 4 | Validation failed | **Retry with the error**: send original document, failed extraction, and specific validation error | 4.4 |
| 5 | Retries keep failing on a field | Retry cannot fix **absent** information (e.g. the document references an external attachment); mark null/unavailable instead of retrying | 4.4 |
| 6 | Category values do not fit some documents | Enum with `"other"` + free-text detail; `"unclear"` value for ambiguous | 4.3 |
| 7 | Inconsistent output across varied formats (inline citations vs bibliography, tables vs prose) | **Few-shot examples** (2-4) showing format and the reasoning for chosen output | 4.2 |
| 8 | Tracking which findings developers dismiss | Add `detected_pattern` field so dismissals can be analyzed | 4.4 |
| 9 | Nightly extraction of 100k docs, no rush | **Message Batches API**: 50% saving, up to 24h, `custom_id` to correlate, resubmit only failures. Never for blocking flows | 4.5 |
| 10 | 97% overall accuracy; auditors want to automate | Aggregate hides weak segments: **segment accuracy by document type and field** before reducing human review | 5.5 |
| 11 | Deciding which extractions get human review | Field-level **confidence scores calibrated** with labeled validation set; route low-confidence/ambiguous to humans; stratified random sampling of high-confidence to measure ongoing error | 5.5 |
| 12 | Long documents; details in the middle missed | Put key content at start/end, section headers, extract facts first; split per-section passes | 5.1 |
| 13 | Two documents give different values | Preserve both with source attribution; flag conflict; do not silently pick | 5.6 |

### Wrong-answer temptations
- **Prompt "Return only valid JSON"** or **prefill** to enforce format. Prompting is probabilistic; schema-enforced output is the answer. (Prefill is also removed on newer models; see file 14.)
- **Make every field required** for "completeness": causes fabricated values.
- **Retry loops forever** on missing data instead of allowing null.
- **Trust aggregate accuracy** (97%) to remove human review.
- **Trust model-reported confidence uncalibrated.** Calibrate against labeled data first.
- **Use batch for anything users wait on**, or assume batch supports multi-turn tool loops.
- **Larger model to "fix" schema violations** instead of schema design and validation.
- **Extract into free-text fields** ("notes") where explicit IDs/enums are needed.
- **Switching to `tool_choice: "auto"`** and hoping. If structured output is mandatory, force the tool (`"any"` when multiple schemas and document type unknown; named tool when one specific extraction must run first). Note on newest models see file 14.

### If you see X, think Y

| Stem contains | Think |
|---|---|
| "invalid JSON", "parse errors" | Tool use + schema / structured outputs |
| "fabricated / hallucinated values" | Nullable fields, "unclear"/"other" enums |
| "valid JSON but wrong numbers" | Semantic validation; stated vs calculated fields |
| "validation failed, how to recover" | Retry with document + failed output + error |
| "information not present in source" | Retry will not help; return null |
| "format varies across documents" | Few-shot with varied examples |
| "overnight / backfill / cost reduction" | Message Batches API |
| "97% accuracy overall" | Segment by document type and field |
| "which outputs to send to humans" | Calibrated field confidence + stratified sampling |
| "must call an extraction tool but model answers in text" | `tool_choice` any/named tool (verify model support) |

---

## Cross-scenario patterns (the exam re-uses these)

| Pattern | Appears in |
|---|---|
| Deterministic gate/hook beats prompt for MUST rules | 1, 2 (formatter hook), 3 (handoff gates), 4 |
| Tool descriptions are the primary selection mechanism | 1, 4, 3 |
| Scoped tools, least privilege, 4-5 tools per agent | 1, 3, 4 |
| Structured errors and provenance across handoffs | 1, 3, 4, 6 |
| Explicit criteria plus few-shot beats vague "be careful" | 1, 5, 6 |
| Independent review instance beats self-review | 5, 6 |
| Batch API only for non-blocking work | 5, 6 |
| Context hygiene: case facts, scratchpad, subagents, `/compact` | 1, 2, 3, 4, 6 |
| Project scope (shared) vs user scope (personal) | 2, 4, 5 |

## Chapter recap

- I can name the four MCP tools in Scenario 1 and defend a programmatic prerequisite over prompt wording.
- I can choose between escalation calibration approaches and reject sentiment and self-confidence routing.
- I can place a slash command, rule, skill or MCP server in the correct scope for team sharing.
- I can decide plan mode vs direct execution from the stem's stated complexity.
- I can trace a multi-agent failure to coordinator decomposition, context passing, or error propagation.
- I can design structured subagent output with claim-source mapping and dates.
- I can name the right built-in tool (Grep, Glob, Read, Edit, Write, Bash) for a codebase task.
- I can write a CI invocation (`-p`, `--output-format json`, `--json-schema`) and assign real-time vs Batch.
- I can restructure a 14-file review into per-file plus integration passes.
- I can design an extraction pipeline: schema, nullable fields, validation-retry, few-shot, batch, human review by stratified confidence.

## Mnemonics

- **G-E-M-S** for Scenario 1: Gate (prerequisite), Escalation criteria, MCP descriptions, State (case facts).
- **"Log line one"** for Scenario 3: read the coordinator's decomposition first; downstream agents get blamed by distractors.
- **"Project shares, user hides"** for Scenarios 2 and 4: anything teammates need lives in the repo.
- **"P-J-B-P"** for Scenario 5: `-p`, JSON schema, Batch only when nobody waits, Passes per file plus integration.
- **"N-V-R-H"** for Scenario 6: Nullable, Validate, Retry-with-error, Human review stratified.

## Verify

- The guide's Q10 confirms `-p`; newer CLI flags (`--bare`, `--json-schema`) come from notes_E, not the exam guide. Treat as likely-but-optional.
- The `Task` vs `Agent` tool naming: the guide uses `Task`; SDK docs now say `Agent`.
- Slash commands vs skills: the guide's answer for shared commands is `.claude/commands/`; notes_E says commands merged into skills (both paths work). If both appear, choose the one that fits the option wording.
- Third-party archetypes (notes_C) informed only the sample stems marked as patterns, not the guide's answers.
