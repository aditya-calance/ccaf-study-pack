# 01. Exam Intel and Trend Analysis

> Read time: ~15 min. Priority: MUST. Source of truth: the official *Claude Certified Architect – Foundations Exam Guide*, v1.0, effective July 2026 (exam code **CCAR-F**), cross-checked against six first-person candidate write-ups and third-party practice banks.

---

## 1. What the exam actually is

| Item | Fact |
|---|---|
| Official name / code | Claude Certified Architect – Foundations. Formal code **CCAR-F**; "CCA-F" is community shorthand for the same exam. Not a real rename. |
| Delivery | Pearson VUE (online proctored or test centre); registration through the Anthropic Partner Academy |
| Items | **60**, multiple-choice and multiple-response. Each item states how many answers to select |
| Structure | **4 scenarios drawn at random from a bank of 6** (so about 15 questions per scenario) |
| Time | **120 minutes** (about 2 min/question) |
| Passing | Scaled **720 on a 100–1000 scale**. Criterion-referenced, equated across forms. No fixed raw percent is published |
| Score report | Pass/fail, scaled score, percent correct per domain (domain % does not decide pass/fail) |
| Fee | $125 per attempt (partner-tier discount may apply) |
| Retakes | Wait 14 days after fail 1, 30 after fail 2, 90 after fail 3; max 4 attempts per rolling 12 months |
| Validity | 12 months; free non-proctored renewal assessment if renewed on time; lapse means full retake |
| Prerequisites | None formal. Guide assumes ~6+ months hands-on with Claude API, Agent SDK, Claude Code and MCP |
| Confidentiality | You sign an NDA before starting. Don't reproduce exam content afterwards |

**Philosophy (from the guide):** it "validates that practitioners can make informed decisions about tradeoffs when implementing real-world solutions with Claude". It is a *judgement* exam, not an API-trivia exam. Multiple options usually work; you pick the *most effective* one.

## 2. Blueprint and how to spend your study time

| # | Domain | Weight | ≈ Qs of 60 | Task statements | Files |
|---|---|---|---|---|---|
| D1 | Agentic Architecture & Orchestration | **27%** | ~16 | 1.1–1.7 (7) | 03, 04 |
| D3 | Claude Code Configuration & Workflows | 20% | ~12 | 3.1–3.6 (6) | 07, 08 |
| D4 | Prompt Engineering & Structured Output | 20% | ~12 | 4.1–4.6 (6) | 09, 10 |
| D2 | Tool Design & MCP Integration | 18% | ~11 | 2.1–2.5 (5) | 05, 06 |
| D5 | Context Management & Reliability | 15% | ~9 | 5.1–5.6 (6) | 11, 12 |

Total: **30 task statements**. Every exam item is written against one of them.

**Cross-domain reality:** the scenarios mix domains. E.g. the Customer Support scenario mostly tests D1 + D2 + D5 together, so a single question can need hooks (D1) *and* tool design (D2) *and* escalation (D5). Study the *concepts*, not silos.

## 3. The six scenarios (4 will appear)

| # | Scenario | Primary domains |
|---|---|---|
| S1 | Customer Support Resolution Agent (Agent SDK; tools get_customer, lookup_order, process_refund, escalate_to_human; 80% first-contact resolution target) | D1, D2, D5 |
| S2 | Code Generation with Claude Code (slash commands, CLAUDE.md, plan mode vs direct) | D3, D5 |
| S3 | Multi-Agent Research System (coordinator + search / analysis / synthesis / report subagents; cited reports) | D1, D2, D5 |
| S4 | Developer Productivity with Claude (Agent SDK, built-in tools Read/Write/Bash/Grep/Glob + MCP servers) | D2, D3, D1 |
| S5 | Claude Code for Continuous Integration (automated review, test generation, PR feedback, false-positive control) | D3, D4 |
| S6 | Structured Data Extraction (JSON-schema validation, edge cases, downstream integration) | D4, D5 |

**Rule from candidates:** don't skim any scenario. One candidate skimmed two of six and one of those appeared. See file 13 for playbooks on all six.

## 4. Explicitly OUT of scope (do not waste your day)

Fine-tuning; API auth/billing/account management; language- or framework-specific implementation detail; deploying or hosting MCP servers; Claude internals/training; Constitutional AI/RLHF; embeddings/vector DBs; **computer use**; **vision**; **streaming/SSE implementation**; **rate limits, quotas, pricing calculations**; OAuth/key rotation; cloud-provider configs; benchmarking/model comparisons; **prompt caching internals** (only know it exists); token counting/tokenization.

Implication: the "what's new in 2026" material (file 14) is context and hedging, **not** the core of the exam. The exam is written against a stable set of ideas: `stop_reason` loops, Task tool, hooks, `tool_choice`, `.mcp.json`, CLAUDE.md, `.claude/rules`, skills frontmatter, `-p` / `--json-schema`, Batches API, and so on.

## 5. What candidates report (six first-person accounts, Sept 2026)

| Signal | Detail |
|---|---|
| Real scores seen | 738 (44/60 correct), 881, 911, plus several "passed" without a score. Nobody reported an easy pass with a huge margin |
| Practice vs real | Practice scores of 930–950 overstated readiness. Real questions are **wordier, more layered and more ambiguous**; the constraint is spread across phrases and often hinges on **one qualifier** ("first step", "most maintainable", "guarantee", "without…") |
| Timing | Most finished with 10–18 minutes to spare. About 2 min/question. Flag-and-return works. Second reads made many flagged items easier |
| Weakest areas | **Domain 5** (lost-in-the-middle, designing around it) and **Claude Code config** (a candidate using it daily still scored 69% in D3: fluent in what you use, blind in what you don't) |
| Surprises | More git / CI-CD command and flag questions than in any mock; none of the real scenarios matched the practice ones; multi-agent orchestration and context budgeting were more nuanced than expected |
| Regrets | Not enough hands-on building; skimming scenarios; memorising practice questions (false confidence); late study of CI flags |
| Failure stories | None found publicly. Only policy (14/30/90-day waits) |

## 6. Pattern analysis: the eight recurring traps

These recur across the official sample questions and every candidate account. Learn them as reflexes.

| # | Trap (wrong-answer bait) | Correct instinct | Task stmt |
|---|---|---|---|
| 1 | "Strengthen the prompt / add few-shot examples" for a rule that must always hold | **Programmatic enforcement** (hook, prerequisite gate) for critical business logic (identity check before refunds, $500 cap) | 1.4, 1.5 |
| 2 | Text-based loop control: parse "I'm done", cap iterations, check assistant text | Loop on **`stop_reason`** (`tool_use` continue, `end_turn` stop) | 1.1 |
| 3 | Blame downstream agents when output is incomplete | Check the **coordinator's decomposition** (too narrow) first | 1.2 |
| 4 | Over-engineering: routing classifier, ML model, consolidated mega-tool, bigger context window | **Proportionate first step**: fix tool descriptions, add escalation criteria + few-shot | 2.1, 5.2 |
| 5 | Sentiment analysis or self-reported confidence to route escalations | **Explicit criteria** (policy gap, customer asks for human, cannot progress) | 5.2 |
| 6 | Too many tools per agent, or synthesis agent given all search tools | **Scoped tools** (4–5 per role) plus a narrow cross-role tool (e.g. `verify_fact`) | 2.3 |
| 7 | Message Batches API for a blocking flow (pre-merge check) | Batch = latency-tolerant only (overnight/weekly); synchronous for blocking | 4.5 |
| 8 | Same session reviews its own output; "run 3 times, keep consensus"; bigger model for a 14-file PR | **Independent reviewer instance**; **per-file passes + cross-file integration pass** | 3.6, 4.6, 1.6 |

Additional recurring items: free-text where an explicit ID is needed (ask for identifiers when multiple matches); generic error strings ("Operation failed") instead of structured errors; empty result marked as success when it was a failure (or vice versa); silent error suppression **or** killing the whole workflow on one failure; required schema fields that force the model to fabricate; retries for information that simply isn't in the source; user-scope config used for team-wide rules; subdirectory CLAUDE.md where a glob rule is needed; direct execution for an architectural change (or plan mode for a one-line fix).

## 7. Question anatomy (how to decode a stem)

1. **Find the failure signal**: numbers ("12% of cases", "55% resolution", "14 files", "18 tools") tell you the layer at fault.
2. **Find the qualifier**: "most effective *first step*", "most *maintainable*", "*guarantee*", "*without* increasing latency", "*regardless of* directory". The qualifier eliminates two options.
3. **Classify each option**: (a) deterministic vs probabilistic, (b) fixes root cause vs symptom, (c) proportionate vs over-engineered, (d) real feature vs invented feature (`CLAUDE_HEADLESS`, `--batch`, `.claude/config.json` are fakes).
4. **Watch for "all of them are valid"**: choose the one Anthropic considers *architecturally cleanest*, cheapest and most direct.
5. **Multi-response items**: the stem states how many to select; partial correctness is not what you want, so verify each pick independently against the principle.

## 8. Strategy for the 120 minutes

- First pass: ~1.5–2 min/question; flag anything you're under 70% sure about; never leave blanks.
- Read each stem twice; underline the qualifier mentally.
- Second pass (last ~25 min): revisit flagged items; on a re-read, re-derive from principles (must → code; should → prompt; root cause first; simplest sufficient).
- Don't change answers without a concrete reason; first instincts based on principles are usually right.
- Scenario pacing: when a new scenario starts, spend 30 seconds re-reading its setup; it frames all ~15 questions.

## 9. Confidence calibration

Candidates who scored 738–911 reported practice scores in the 900s. Target **≥ 80% on the wordy full mock (file 21) under timed conditions**, i.e. 48+ of 60, because the real exam is harder than typical practice questions and the raw cut score is undisclosed (one candidate passed with 43/60 = 724).

## Sources
- Official Exam Guide v1.0 (Anthropic Partner Academy PDF, July 2026).
- Candidate accounts: Very Good Ventures ("A 738 Story"), Suraj Khaitan (dev.to), re:cinq, Sarvesh (Big Tech Careers), Sachin (Substack); domain/scenario summaries from dev.to aws-builders and certified-architect.com.
