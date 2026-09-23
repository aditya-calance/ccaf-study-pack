# 23. Cheat Sheet: Last-Hour Review

> Read the night before / an hour before the exam. Everything here is expanded in files 03–12. Scope is the official guide v1.0 (July 2026).

---

## A. The 8 reflexes
1. MUST → code (hooks, gates, schemas, permissions). SHOULD → prompt.
2. Root cause first (read the logs in the stem).
3. Cheapest proportionate first step (descriptions → criteria/few-shot → structure → infra).
4. Loop on `stop_reason`.
5. Subagents know only what's in their prompt; coordinator owns routing/errors/gaps.
6. 4–5 scoped tools per agent; narrow cross-role tools.
7. Batch = non-blocking only; sync = blocking.
8. Independent reviewer; per-file + integration passes.

## B. Domain 1: Agentic Architecture & Orchestration (27%)
| Topic | Remember |
|---|---|
| Loop | send → `stop_reason=="tool_use"` → run tools → append `tool_result`s → repeat; `end_turn` → stop. Not text parsing, not iteration caps as primary |
| Model-driven vs fixed | Claude picks next tool from context; decision trees only when order is truly fixed |
| Hub-and-spoke | Coordinator handles decomposition, delegation, aggregation, error handling, routing; dynamic subagent selection by query complexity |
| Subagents | Isolated context; `Task` tool (`allowedTools` must include `"Task"`; newer SDK docs call it the `Agent` tool); `AgentDefinition` = description + system prompt + tool restrictions |
| Context passing | Put complete prior findings in the subagent prompt; separate content from metadata (URL, doc, page) |
| Parallelism | Multiple `Task` calls in **one** coordinator response |
| Coordinator prompts | State goals + quality criteria, not step-by-step procedures |
| Narrow decomposition | Symptom: incomplete coverage though every subagent "worked" → fix coordinator |
| Refinement loop | Coordinator checks synthesis for gaps → re-delegate targeted queries → re-synthesise |
| Enforcement | Prerequisite gates/hooks for critical ordering; prompts have non-zero failure rate |
| Hooks | PostToolUse normalises tool output (timestamps, status codes); pre-call interception blocks policy violations (refund > $500 → escalate) |
| Handoff summary | customer ID, root cause, refund amount, recommended action (human has no transcript) |
| Decomposition | Chaining for predictable multi-aspect work; dynamic/adaptive for open-ended; per-file + cross-file pass |
| Sessions | `--resume <name>`; `fork_session` for divergent branches; stale tool results → new session + structured summary; tell resumed session which files changed |

## C. Domain 2: Tool Design & MCP (18%)
| Topic | Remember |
|---|---|
| Descriptions | Primary tool-selection mechanism: inputs, examples, edge cases, boundaries vs similar tools |
| Overlap | Rename/split (`analyze_document` → `extract_data_points`, `summarize_content`, `verify_claim_against_source`); check system-prompt keywords that bias selection |
| Errors | MCP `isError`; `errorCategory` (transient/validation/permission/business), `isRetryable`, human-readable message; business errors get customer-friendly text and non-retryable flag |
| Empty vs failed | Valid empty result ≠ access failure |
| Local recovery | Subagent retries transient errors; propagates only unresolved ones with partial results + what was tried |
| Tool count | 18 tools degrades selection; 4–5 per agent |
| `tool_choice` | `auto` (may return text), `any` (must call some tool), forced `{"type":"tool","name":…}` (specific tool first) |
| MCP scope | `.mcp.json` = project/team-shared (commit; `${GITHUB_TOKEN}` expansion); `~/.claude.json` = user/personal. All servers' tools available simultaneously |
| MCP resources | Expose catalogs (issues, docs hierarchy, DB schema) to cut exploratory calls |
| Prefer | Community MCP servers for standard integrations (Jira); custom for team-specific |
| MCP tool descriptions | Make them rich or the agent prefers built-in Grep |
| Built-ins | Grep = content; Glob = paths; Read/Write = whole file; Edit = unique-anchor change → fallback Read+Write; explore incrementally (Grep entry points → Read → follow imports) |

## D. Domain 3: Claude Code (20%)
| Need | Answer |
|---|---|
| CLAUDE.md levels | user `~/.claude/CLAUDE.md` (personal, not shared) · project `./CLAUDE.md` or `.claude/CLAUDE.md` (shared) · directory-level (subfolders) |
| Modularise | `@import`; `.claude/rules/*.md`; `/memory` to see what loaded |
| Rules by file type | `.claude/rules/x.md` with `paths: ["**/*.test.tsx"]` (loads only when editing matching files) |
| Shared command | `.claude/commands/` (repo) vs `~/.claude/commands/` (personal) |
| Skills | `.claude/skills/<n>/SKILL.md`; frontmatter `context: fork`, `allowed-tools`, `argument-hint`; personal variants in `~/.claude/skills/` with different names |
| Skill vs CLAUDE.md | Skill = on-demand task workflow; CLAUDE.md = always-loaded universal |
| Plan mode | Complex, multi-file, architectural, multiple approaches (45-file migration, microservices) |
| Direct | Well-scoped (single-file fix with clear stack trace) |
| Combined | Plan to investigate → direct to implement; Explore subagent isolates verbose discovery |
| Refinement | 2–3 input/output examples; tests first, iterate on failures; interview pattern; one message for interacting issues, sequential for independent |
| CI | `claude -p "..."`; `--output-format json` + `--json-schema` for machine-parseable; CLAUDE.md gives CI context; independent reviewer; pass prior findings so only new/unaddressed are reported; include existing tests to avoid duplicates |
| Context | `/compact` to shrink; `/memory` to inspect |

Fakes seen in distractors: `CLAUDE_HEADLESS`, `--batch`, `.claude/config.json` with commands array.

## E. Domain 4: Prompting & Structured Output (20%)
| Topic | Remember |
|---|---|
| Precision | Explicit categorical criteria > "be conservative"/"high-confidence only"; define severity with code examples; disable noisy category temporarily to rebuild trust |
| Few-shot | 2–4 targeted examples for ambiguous cases with reasoning; show output format (location, issue, severity, fix); show acceptable vs genuine issue; varied doc structures |
| Structured output | `tool_use` + JSON schema = syntactically valid; **not** semantically valid |
| Schema design | Optional/nullable when source may lack info (stops fabrication); enum + `"unclear"`; `"other"` + detail string; normalisation rules in prompt |
| Retry | Resend doc + failed output + specific error; futile if info absent from source; format/structure errors fixable |
| Self-check fields | `calculated_total` vs `stated_total`; `conflict_detected`; `detected_pattern` for dismissal analysis |
| Batches API | 50% off, ≤24 h, no SLA, no multi-turn tool calls, `custom_id`; resubmit only failures (chunk oversize docs); tune prompt on a sample first |
| SLA math | worst case = submission window + 24 h → for 30 h SLA use ≤ 6 h windows (guide's 4 h windows → 28 h worst case) |
| Review | Self-review is weak (retained reasoning); independent instance; per-file + integration; confidence alongside findings for routing |

## F. Domain 5: Context & Reliability (15%)
| Topic | Remember |
|---|---|
| Summarisation | Loses numbers/dates/expectations → keep "case facts" block outside summaries |
| Lost in the middle | Key findings first (and last); headers for detailed sections |
| Tool output | Trim 40 fields → 5 relevant before they accumulate |
| Subagent output | Structured (facts, citations, relevance) not verbose reasoning |
| Escalate when | Customer asks for human (immediately) · policy gap/silent · no meaningful progress |
| Don't use | Sentiment, self-reported confidence |
| Frustration but solvable | Acknowledge, offer resolution; escalate only if they insist |
| Multiple matches | Ask for another identifier; don't guess |
| Long sessions | Scratchpad files; subagents for exploration; summaries between phases; manifests for crash recovery; `/compact` |
| Error propagation | Type, attempted query, partial results, alternatives; no silent suppression; no total abort; coverage annotations |
| Human review | 97% overall can hide bad segments → stratified sampling; field-level confidence calibrated on labelled set; validate per doc type/field before automating |
| Provenance | Claim-source mappings survive synthesis; conflicts annotated with both sources; dates prevent false contradictions; tables for financials, prose for news |

## G. Anti-pattern blacklist (usually wrong)
Text-parsing for loop end · iteration cap as primary stop · prompt-only compliance for money/identity · sentiment/self-confidence routing · giving agents 18 tools · full web search for synthesis agent · generic "Operation failed" · empty-success on failure · abort whole workflow · required fields for absent data · retrying absent info · batch for pre-merge · self-review in same session · consensus-of-3 to filter bugs · bigger model for attention dilution · asking devs to split PRs · user-level config for team rules · subdirectory CLAUDE.md for scattered file types · plan mode for a one-line fix · direct execution for a monolith split.

## H. Numbers to remember
60 Qs · 120 min · 720/1000 · 4 of 6 scenarios · 27/20/20/18/15 · 30 task statements · 50% batch · 24 h · 4–5 tools ideal vs 18 · $500 refund example · 12% skipped verification · 55% vs 80% resolution · 14-file PR · 45+ file migration · 2–4 few-shot examples (2–3 I/O examples for refinement) · 40 → 5 fields.

## I. Exam-day checklist
- ID matches registration exactly; workspace clear; online proctor rules (no phone/notes).
- 2 min/question; flag and return; read stems twice for the qualifier.
- Scenario starts: re-read the setup; tie every option to the setup's constraints.
- Multi-response: the stem tells you how many; verify each pick independently.
