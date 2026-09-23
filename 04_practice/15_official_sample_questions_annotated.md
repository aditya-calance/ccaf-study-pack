# 15. The 12 Official Sample Questions, Annotated

> Read time: ~30 min. Priority: **MUST**. These 12 questions appear in Section 9 of the official Exam Guide v1.0 (they are the only officially published items). They set the *difficulty and logic* of the real exam. Stems below are condensed; the reasoning is what matters. Try to answer each from the stem alone **before** reading the answer.

---

## How to use
1. Cover the "Answer" line, choose an option, then read the analysis.
2. For each question, name the **principle** and the **trap** it demonstrates. The same principles are reused with different scenery on the real exam.

## Summary table

| Q | Scenario | Task stmt | Answer | Principle |
|---|---|---|---|---|
| 1 | Customer Support | 1.4 | **A** | Critical ordering → programmatic prerequisite, not prompts |
| 2 | Customer Support | 2.1 | **B** | Tool descriptions are the primary selector; cheapest root-cause fix |
| 3 | Customer Support | 5.2 | **A** | Explicit escalation criteria + few-shot; self-confidence/sentiment fail |
| 4 | Code Generation | 3.2 | **A** | Project commands live in `.claude/commands/` (version-controlled) |
| 5 | Code Generation | 3.4 | **A** | Architectural multi-file change → plan mode |
| 6 | Code Generation | 3.3 | **A** | `.claude/rules/` with glob `paths:` for conventions spread across dirs |
| 7 | Multi-Agent Research | 1.2 | **B** | Coverage gap → coordinator decomposition too narrow |
| 8 | Multi-Agent Research | 5.3/2.2 | **A** | Structured error context to the coordinator |
| 9 | Multi-Agent Research | 2.3 | **A** | Scoped cross-role tool (`verify_fact`) for the 85% case |
| 10 | Claude Code CI | 3.6 | **A** | `-p` / `--print` for non-interactive runs |
| 11 | Claude Code CI | 4.5 | **A** | Batch only for latency-tolerant work; blocking checks stay synchronous |
| 12 | Claude Code CI | 4.6/1.6 | **A** | Per-file passes + a cross-file integration pass |

Notice: **the correct answer was option A in all 12**. Do not exploit that on the real exam (the real exam randomises), but note the *style*: the right answer is a specific, direct, low-drama change; wrong answers are either probabilistic, over-engineered, or aimed at a different problem.

---

## Q1: Skipped `get_customer` (12% of cases)
**Stem:** In 12% of cases the support agent skips `get_customer` and calls `lookup_order` using only the customer's stated name, causing misidentified accounts and wrong refunds. Most effective change?
- A. Programmatic prerequisite blocking `lookup_order`/`process_refund` until `get_customer` returned a verified customer ID
- B. Strengthen system prompt: verification is mandatory
- C. Few-shot examples of always calling `get_customer` first
- D. Routing classifier enabling only a subset of tools per request type

**Answer: A.** Financial consequences + required ordering = deterministic enforcement. B and C are probabilistic (non-zero failure rate). D changes *availability*, not *ordering*: solves a different problem.
**Trap type:** prompt-vs-code (Trap 1). **Signal words:** "12% of cases", "incorrect refunds".

## Q2: Agent calls `get_customer` for "check my order #12345"
**Stem:** Both tools have minimal descriptions ("Retrieves customer information" / "Retrieves order details") and similar identifier formats. Most effective *first step*?
- A. 5–8 few-shot examples in the system prompt
- B. Expand each description: input formats, example queries, edge cases, boundaries vs similar tools
- C. Keyword-based routing layer that pre-selects the tool
- D. Merge into one `lookup_entity` tool

**Answer: B.** Descriptions are the primary mechanism for tool selection; the fix is low-effort and hits the root cause. A adds token overhead without fixing it. C is over-engineered and bypasses the LLM's language understanding. D is valid but more effort than a "first step" warrants.
**Trap type:** over-engineering / proportionality. **Qualifier:** "first step".

## Q3: 55% first-contact resolution vs 80% target
**Stem:** Agent escalates straightforward damage-replacement-with-photo cases yet autonomously attempts complex policy-exception cases. Best way to calibrate escalation?
- A. Explicit escalation criteria in the system prompt with few-shot examples
- B. Self-reported 1–10 confidence with threshold routing
- C. Separate classifier trained on historical tickets
- D. Sentiment analysis threshold

**Answer: A.** The root cause is unclear decision boundaries. B: LLM self-confidence is poorly calibrated (already confidently wrong on hard cases). C: heavy infrastructure before prompt optimisation. D: sentiment ≠ complexity.
**Trap type:** unreliable proxies (Trap 5).

## Q4: Where does a shared `/review` command live?
**Answer: A**, `.claude/commands/` in the repo (version-controlled, available on clone/pull). `~/.claude/commands/` is personal; CLAUDE.md is context, not command definitions; `.claude/config.json` with a `commands` array doesn't exist.
**Trap type:** invented feature / wrong scope. (Note: skills in `.claude/skills/` are the modern superset, but the guide's answer is the commands directory.)

## Q5: Monolith → microservices across dozens of files
**Answer: A**, plan mode. Complex, multi-file, architectural decisions, multiple valid approaches. B risks rework; C assumes you know the structure without exploring; D ignores that complexity is *already stated*, not hypothetical.
**Trap type:** "start simple and see" temptation. **Signal:** "dozens of files", "decisions about service boundaries".

## Q6: Different conventions per code area + test files spread everywhere
**Answer: A**, `.claude/rules/` with YAML `paths:` globs (e.g. `**/*.test.tsx`). B relies on inference; C skills need manual invocation or discretionary loading, contradicting "automatic"; D directory-bound CLAUDE.md can't cover files scattered across directories.
**Trap type:** wrong config layer. **Signal:** "regardless of location", "automatically".

## Q7: Reports cover only visual arts (digital art, graphic design, photography)
**Answer: B**, coordinator decomposition too narrow (the logs *show* the three subtasks). Every subagent did its assigned job. A/C/D blame downstream agents.
**Trap type:** wrong-component blame (Trap 3). **Technique:** read the logs in the stem as evidence.

## Q8: Web search subagent times out
**Answer: A**, return structured error context (failure type, attempted query, partial results, alternatives) to the coordinator. B's generic "search unavailable" hides context. C marks failure as success (suppression). D terminates the whole workflow.
**Trap type:** the two anti-patterns: silent suppression and total failure.

## Q9: Synthesis agent needs fact-checks (85% simple, 15% deep); +40% latency
**Answer: A**, scoped `verify_fact` tool for the simple 85%; complex cases still route through the coordinator. B creates blocking dependencies; C over-provisions (violates least privilege / separation of concerns); D speculative caching can't predict needs.
**Trap type:** over-provisioning tools. **Signal:** the 85/15 split is telling you "cover the common case narrowly".

## Q10: CI job hangs on `claude "Analyze this pull request…"`
**Answer: A**, `claude -p "…"` (or `--print`). `CLAUDE_HEADLESS` and `--batch` don't exist; `< /dev/null` is a Unix workaround that doesn't address the documented mechanism.
**Trap type:** invented flags.

## Q11: Move both workflows to Batches for 50% savings?
Workflows: (1) blocking pre-merge check, (2) overnight tech-debt report.
**Answer: A**, batch only the overnight report. Batches can take up to 24h with no latency SLA: unacceptable for a blocking check. B relies on "often faster"; C misunderstands `custom_id` correlation; D adds needless complexity.
**Trap type:** cost-saving temptation on a blocking flow (Trap 7).

## Q12: 14-file PR yields inconsistent depth and contradictory feedback
**Answer: A**, per-file local passes + a separate cross-file integration pass. Root cause is **attention dilution**. B shifts burden to developers. C: bigger context windows don't fix attention quality. D: consensus-of-3 suppresses real bugs that are found intermittently.
**Trap type:** "bigger/more of the same" (Trap 8).

---

## What the 12 teach you
| Lesson | Questions |
|---|---|
| Enforce with code when the rule is critical | 1 |
| Fix the layer that's actually broken (descriptions, decomposition, criteria) | 2, 3, 7 |
| Structured, informative errors > generic or hidden ones | 8 |
| Give agents exactly the tools they need | 9 |
| Know which file/flag/mode to use | 4, 5, 6, 10 |
| Fit the API to the workflow's latency | 11 |
| Split reviews; don't stuff them | 12 |

## Third-party question archetypes (unverified, for pattern only)
Public practice banks (open-exam-prep, clearcatnet, readroo.st, claudecertifiedarchitects.com) reuse these archetypes: `stop_reason` loop control; picking the simplest workflow pattern (chaining/routing/parallelization/orchestrator-workers/evaluator-optimizer); coordinator owns gap loops and errors; subagents only see their prompt; deterministic mechanisms beat prompt nudges; provenance and dates on findings; config scope (project vs local vs user); MCP stdio and resources. Typical junk distractors: "increase max_tokens", "temperature 0", "add a prompt instruction", "regex post-process". Their answer keys are not verified against Anthropic; if one contradicts files 03–12, trust the official guide.
