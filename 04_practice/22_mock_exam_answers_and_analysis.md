# 22. Mock Exam Answers and Analysis (for file 21)

> Do not read before finishing `21_full_mock_exam_60q.md`. Scoring: 1 point per item; multiple-response items are all-or-nothing (all correct options and no wrong ones). Real exam partial-credit rules are not published; assume none.
> Domains: D1 Agentic Architecture and Orchestration (16 items) | D2 Tool Design and MCP (11) | D3 Claude Code Config and Workflows (12) | D4 Prompt Engineering and Structured Output (12) | D5 Context Management and Reliability (9).

## Trap-type legend

| Code | Trap type | How it is disguised |
|---|---|---|
| T1 | Prompt where code is required | Stronger wording, repetition, few-shot, self-check for a MUST-happen rule |
| T2 | Over-engineering | Classifier, router, pre-processor, consolidation when a small root-cause fix exists |
| T3 | Wrong root cause / blame downstream | Fixing an agent that works correctly |
| T4 | Unreliable proxy | Sentiment, self-reported confidence, "confident overall" |
| T5 | Bigger model / bigger context | Presented as fixing attention or selection problems |
| T6 | Loop-control anti-pattern | Text parsing, arbitrary cap, text-block-as-completion |
| T7 | Batch for blocking flow / batch misuse | 50% saving lures |
| T8 | Self-review | Same session, extended thinking, "be critical" |
| T9 | Too many / wrong tools | More tools, cross-role tools, generic tools |
| T10 | Non-existent or misapplied feature | Invented config, wrong scope |
| T11 | Too late / after the fact | Post-hoc reversal or audit for a preventive requirement |
| T12 | Single qualifier | Answer turns on one word: "guaranteed", "cannot be modified", "explicitly", "first step" |
| T13 | Suppressed or generic error | Empty-success, "unavailable", terminate everything |
| T14 | Arbitrary selection | Pick by heuristic, recency, or larger value instead of asking/annotating |
| T15 | Partial fix / half-true statement | Correct-sounding option that fixes only one symptom |

---

## Scenario 1: Customer Support Resolution Agent

**Q1 - B** | D1 | TS 1.4 | T1, T12 ("in any percentage of sessions")
- A: Prompt repetition and few-shot are still probabilistic; the prompt was already rewritten twice and failed.
- B: Correct. A prerequisite gate gives a deterministic guarantee that identity verification precedes order and refund operations, and the error message lets the agent self-correct.
- C: The self-attestation is itself model output; nothing enforces it.
- D: Post-hoc (T11): the wrong refund has already been paid.

**Q2 - C** | D1 | TS 1.1 | T6
- A: Parsing punctuation to infer completion is a natural-language-signal anti-pattern.
- B: Raising a cap and length heuristics do not address the actual signal; the cap is an arbitrary stopper.
- C: Correct. Continue on `stop_reason == "tool_use"`, finish on `"end_turn"`; text presence is not a completion indicator.
- D: Probabilistic instruction; models legitimately emit text alongside tool calls.

**Q3 - A** | D1 | TS 1.5 | T1, T12 ("vendor-operated; cannot change")
- A: Correct. A post-tool-result hook normalizes heterogeneous formats deterministically before the model reasons on them.
- B: Asks the model to do date arithmetic on mixed formats; error-prone, probabilistic.
- C: An extra tool adds a call per lookup and relies on the agent remembering it.
- D: Few-shot cannot guarantee correct arithmetic; still probabilistic.

**Q4 - D** | D1 | TS 1.4 | T2/T15
- A: Pushes the burden to the customer and hurts first-contact resolution.
- B: Three isolated agents each re-verify and lose shared context; results can contradict.
- C: Escalating by default sacrifices the 80% resolution target.
- D: Correct. Decompose, verify once, investigate in parallel over shared context, synthesize one response.

**Q5 - A** | D1 | TS 1.4 | T4/T15
- A: Correct. Humans without transcript access need customer ID, root cause, amounts, actions taken, recommended action.
- B: Confidence and sentiment are unreliable proxies and carry no case content.
- C: Raw fragments force inference; no root cause or recommendation.
- D: Defeats the purpose of a handoff.

**Q6 - C** | D1 | TS 1.5 | T11, T1
- A: Post-hoc (after the money moves); reversal is not prevention.
- B: Prompt compliance is probabilistic; it already failed four times.
- C: Correct. Intercept the outgoing call, block over-threshold amounts and redirect to human escalation, so the customer still gets help.
- D: Disproportionate; removes autonomous handling of the many refunds under the threshold and harms resolution rate.

**Q7 - B** | D2 | TS 2.1 | T2, T12 ("first step")
- A: Valid architecture but more effort than a first step; the immediate problem is inadequate descriptions.
- B: Correct. Descriptions are the primary selection mechanism. Also review the keyword-sensitive prompt line, which creates an unintended association.
- C: Over-engineered; bypasses the model's language understanding.
- D: Adds token overhead without fixing the root cause; does not address the prompt bias either.

**Q8 - B, D** | D2 | TS 2.2 | T13, T15
- A: A blanket cap does not distinguish retryable from non-retryable errors and would also cut off transient recovery.
- B: Correct. Structured error metadata (category, retryable flag, description) enables recovery decisions.
- C: Suppresses errors as success (T13); agent cannot tell a denial from an empty result.
- D: Correct. Business errors should be non-retryable with a customer-friendly explanation.
- E: Terminating on any failure removes recovery options.

**Q9 - D** | D2 | TS 2.3 | T9, T5
- A: `"any"` forces a tool call; it does not reduce confusion among 19 tools.
- B: Larger model does not fix decision complexity.
- C: Long prompt guidance is weaker than removing irrelevant tools.
- D: Correct. Scoped tool sets (about 4-5) per role; move the rest to the agents that own those workflows.

**Q10 - A** | D2 | TS 2.2 | T13
- A: Correct. Access failures and valid empty results must be distinguishable: error with transient category and retryable flag versus success with empty list.
- B: Still labels a failure as success; the model may ignore the free-text warning.
- C: Majority voting on a failing backend is not a design; it multiplies load.
- D: Generic status hides the distinction the agent needs.

**Q11 - A, C** | D5 | TS 5.1 | T15
- A: Correct. Trim verbose tool output to relevant fields before it accumulates.
- B: More compression worsens the loss of numbers and dates (progressive summarization risk).
- C: Correct. Persistent case-facts block outside summarized history preserves amounts, dates, statuses and stated expectations.
- D: Bigger window does not stop irrelevant fields consuming attention and does not solve position effects.
- E: Pushes burden to the customer; poor experience and still unreliable.

**Q12 - C** | D5 | TS 5.2 | T12 ("explicitly"), T4
- A: Frustration-then-resolve applies when the customer has NOT requested a human; here the request is explicit.
- B: Investigating first ignores the explicit request; honoring it is immediate.
- C: Correct. Escalate immediately with a structured handoff.
- D: Sentiment thresholds are unreliable proxies and irrelevant when the customer states a preference.

**Q13 - B** | D5 | TS 5.2 | T14
- A: Heuristic selection of a customer record risks misidentification.
- B: Correct. Ask for additional identifiers when tool results return multiple matches.
- C: Over-escalation; the agent can resolve with one clarifying question.
- D: Discloses other customers' data; a privacy failure.

**Q14 - D** | D3 | TS 3.1 | T10, T12 ("same repo", "her laptop")
- A: Fragile, manual, and not version-controlled.
- B: `.claude/commands/` holds slash commands, not standing instructions.
- C: No such config mechanism exists.
- D: Correct. User-level instructions are not shared through version control; project-level CLAUDE.md or `.claude/rules/` is; `/memory` verifies loaded files.

**Q15 - A** | D4 | TS 4.2 | T2, T15
- A: Correct. 2-4 targeted few-shot examples for ambiguous cases with reasoning for the choice over alternatives.
- B: Excessive examples add tokens and do not generalize better than a few well-chosen ones.
- C: Forcing one tool breaks all other requests.
- D: Keyword router bypasses model judgment (over-engineering).

---

## Scenario 2: Multi-Agent Research System

**Q16 - B** | D1 | TS 1.2 | T2/T15
- A: Arbitrary word-count rule; not tied to what the query needs.
- B: Correct. Coordinator dynamically selects subagents by query complexity.
- C: Removes specialization.
- D: Caching does not address per-query routing and returns stale or mismatched answers.

**Q17 - A, E** | D1 | TS 1.2 | T3
- A: Correct. Iterative refinement: evaluate synthesis for gaps, re-delegate targeted queries, re-synthesize.
- B: Gives the synthesis agent out-of-role tools (T9).
- C: Output length is not the problem.
- D: Causes duplication across subagents and blurs the partition.
- E: Correct. The root cause is narrow decomposition; enumerate the topic's breadth and partition into distinct subtopics.

**Q18 - C** | D1 | TS 1.3 | T10
- A: Subagents do not share memory between invocations; context must be explicit in the prompt.
- B: Model size is not the issue; the agent has no findings.
- C: Correct. Pass complete findings in the prompt, structured to separate content from metadata for attribution.
- D: Subagents pulling from siblings breaks hub-and-spoke routing.

**Q19 - D** | D1 | TS 1.3 | T10 (fork_session misuse)
- A: `fork_session` branches a session for divergent approaches; it is not a parallel-subtask mechanism.
- B: Reduces coverage to hide a latency problem.
- C: Reinvents what the SDK does natively.
- D: Correct. Multiple spawning calls in one coordinator response run in parallel. (Tool name: "Task" in the exam guide; "Agent" in newer SDK docs.)

**Q20 - A** | D1 | TS 1.3 | T15
- A: Correct. Specify goals and quality criteria, not procedures, so subagents can adapt.
- B: More steps keep the design brittle.
- C: A fixed script forfeits adaptivity.
- D: Removing criteria removes the guardrails that make delegation safe.

**Q21 - B** | D1 | TS 1.7 | T12 ("6 of 200", "context mostly valid")
- A: Wasteful when only a few files changed.
- B: Correct. Resume the named session and inform it of the specific changed files for targeted re-analysis.
- C: Stale tool results would be trusted silently.
- D: Forking is for divergent exploration from a baseline, and replaying all calls is wasteful.

**Q22 - C** | D1 | TS 1.2 | T2/T3
- A: Keeps the uncontrolled flow; logging inside one agent does not give coordinator-level observability.
- B: Shared memory undermines isolation and controlled flow.
- C: Correct. Hub-and-spoke gives observability, consistent error handling and controlled information flow.
- D: Polling adds coupling without fixing error handling.

**Q23 - D** | D2 | TS 2.1 | T9, T2
- A: Forcing one tool breaks the other use case.
- B: A generic merged tool restates the ambiguity in a parameter.
- C: Examples do not fix near-identical descriptions.
- D: Correct. Rename and split with clear contracts and boundary-stating descriptions.

**Q24 - A** | D2 | TS 2.3 | T1
- A: Correct. Replace a generic tool with a constrained one that validates its input.
- B: Prompt-only restriction is probabilistic.
- C: Adds an out-of-role tool.
- D: Summarizing junk after fetching does not stop the wasted fetch.

**Q25 - C, D** | D2 | TS 2.2 | T13
- A: Suppresses the error as success.
- B: Terminating on a single failure is an anti-pattern.
- C: Correct. Local recovery for transient failures.
- D: Correct. Propagate only unresolved errors, with structured context.
- E: Generic status hides context and removes local recovery.

**Q26 - B** | D2 | TS 2.4 | T10, T12 ("no secrets committed")
- A: Loses automatic sharing.
- B: Correct. Project `.mcp.json` with `${VAR}` expansion; personal servers in `~/.claude.json`; all configured servers are available simultaneously.
- C: Literal token committed; a gitignored file shared in repo is contradictory.
- D: False; tools from all configured servers are available at once.

**Q27 - C** | D3 | TS 3.2 | T10
- A: Personal scope; and "be brief" does not isolate context.
- B: CLAUDE.md is always loaded; it does not provide isolation or tool limits.
- C: Correct. Project skill with `context: fork` (isolated sub-agent context) and `allowed-tools`.
- D: Personal, not shared via repo.

**Q28 - D** | D5 | TS 5.6 | T14
- A: Arbitrary choice hides a conflict; the gap may be temporal.
- B: Averaging produces a number no source reported.
- C: Discards evidence.
- D: Correct. Preserve both with attribution and dates, annotate, and let the coordinator reconcile.

**Q29 - A** | D5 | TS 5.1 | T5
- A: Correct. Put key findings first, use explicit section headers, and reduce upstream verbosity to mitigate lost-in-the-middle.
- B: Larger windows do not remove position effects.
- C: Randomizing and merging adds cost without fixing the mechanism.
- D: An instruction does not reliably overcome position bias.

**Q30 - B** | D5 | TS 5.3 | T13
- A: Silent omission misleads readers.
- B: Correct. Coverage annotations mark well-supported versus gap areas.
- C: Terminating on a single failure is an anti-pattern.
- D: Unmarked model knowledge breaks provenance.

---

## Scenario 3: Claude Code for CI

**Q31 - C** | D3 | TS 3.6 | T2/T10
- A: Prompt-only JSON is not schema-enforced; parse failures remain.
- B: `--verbose` does not structure output.
- C: Correct. `-p` with `--output-format json` and `--json-schema` yields machine-parseable findings.
- D: A second model call is extra cost and another failure point.

**Q32 - D** | D3 | TS 3.6 | T2
- A: Loses review of new commits.
- B: Hash matching misses reworded findings and cannot recognize fixed issues.
- C: Noisy and erases developer replies.
- D: Correct. Include prior findings and ask for only new or unaddressed issues.

**Q33 - B, E** | D3 | TS 3.6 | T15
- A: Variety is not the goal; it raises low-value output.
- B: Correct. Existing tests in context prevent duplicates.
- C: Random filtering discards quality.
- D: Batch is about cost and latency, not test quality.
- E: Correct. Standards, valuable-test criteria and fixtures in CLAUDE.md.

**Q34 - A** | D3 | TS 3.6 | T8
- A: Correct. An independent instance lacks the generator's reasoning context.
- B: Extended thinking in the same context retains the same bias.
- C: Instruction cannot remove retained reasoning.
- D: Repeating self-review is still self-review.

**Q35 - B** | D3 | TS 3.1 | T10
- A: Headings do not scope loading.
- B: Correct. Modular files with `@import` per package, or `.claude/rules/`.
- C: Duplicating recreates the problem.
- D: User-level configuration is not shared or versioned and the CI runner should rely on project files.

**Q36 - C** | D3 | TS 3.3 | T2
- A: Always loaded; wastes context.
- B: Directory-bound; cannot cover scattered locations well.
- C: Correct. `.claude/rules/` with `paths` glob loads only when editing matching files.
- D: Requires manual invocation; not automatic.

**Q37 - D** | D3 | TS 3.2 | T10
- A: Changes everyone's behavior.
- B: Same.
- C: Committed to the repo; it is visible and clutters shared config.
- D: Correct. Personal variant in `~/.claude/skills/` with a different name.

**Q38 - A, D** | D3 | TS 3.4 | T15
- A: Correct. Well-scoped single-function fix: direct execution.
- B: Multiple viable designs across 52 files call for plan mode.
- C: Over-application of plan mode to a trivial change.
- D: Correct. Plan mode for architecture, then direct execution.
- E: Trivial rename: plan mode is unnecessary.

**Q39 - A** | D3 | TS 3.5 | T5
- A: Correct. Concrete input/output examples (including the null case) and tests when prose is interpreted inconsistently.
- B: More prose has failed three times.
- C: Model size does not resolve underspecification.
- D: Majority voting yields a arbitrary consensus, not a specified behavior.

**Q40 - B** | D3 | TS 3.5 | T12 ("may not have anticipated")
- A: Discovers problems late.
- B: Correct. Interview pattern surfaces considerations first.
- C: Spec from memory in an unfamiliar domain omits unknown unknowns.
- D: Tests after design do not surface design failure modes.

**Q41 - C** | D4 | TS 4.1 | T4
- A: Confidence filtering fails; the model's confidence is not calibrated and "high-confidence" does not define categories.
- B: Temperature does not define what counts as an issue.
- C: Correct. Explicit categorical criteria with severity examples; temporarily disable noisy categories to rebuild trust.
- D: Second pass without criteria repeats the ambiguity.

**Q42 - D** | D4 | TS 4.5 | T7
- A: Pre-merge is blocking; batch has no latency SLA (up to 24 hours).
- B: Batch does not support multi-turn tool calling within a request.
- C: `custom_id` correlates requests to results.
- D: Correct. Sync for blocking checks; single-turn batch generation with `custom_id`, external test run, resubmit only failures.

**Q43 - A** | D4 | TS 4.4 | T15
- A: Correct. `detected_pattern` supports analysis of dismissal patterns.
- B: Unstructured text cannot be aggregated.
- C: Per-file counts hide which constructs are problematic.
- D: Free-text reasons are hard to analyze and depend on developer effort.

**Q44 - B** | D1 | TS 1.6 | T15
- A: Fixed chain is suited to predictable tasks, not to unknown structure.
- B: Correct. Adaptive decomposition: map, prioritize, adapt as dependencies emerge.
- C: Under-specified.
- D: Random sampling ignores impact.

**Q45 - C** | D2 | TS 2.4 | T2
- A: Custom build for a standard integration is unnecessary.
- B: A prompt cannot integrate a proprietary service.
- C: Correct. Community server for standard integration; custom server for team-specific workflow; env var expansion for credentials.
- D: Loses tool structure and error semantics.

---

## Scenario 4: Structured Data Extraction

**Q46 - D** | D4 | TS 4.3, 4.4 | T15
- A: False; schemas guarantee syntax, not semantics.
- B: Temperature does not enforce arithmetic consistency.
- C: Reintroduces syntax errors.
- D: Correct. Add semantic validation and retry with the specific error.

**Q47 - A** | D4 | TS 4.3 | T15
- A: Correct. Optional or nullable fields prevent fabrication to satisfy required fields.
- B: A sentinel string still forces a value; downstream systems may treat it as data.
- C: Retry on absent information is ineffective.
- D: Format check does not stop fabrication.

**Q48 - B** | D4 | TS 4.3 | T12 ("unknown types")
- A: `auto` allows plain text.
- B: Correct. `"any"` guarantees a tool call while letting the model choose which schema.
- C: Forces the wrong tool for other types.
- D: Prompt wording is probabilistic.

**Q49 - C** | D4 | TS 4.3 | T2/T15
- A: Loses validation and consistency.
- B: Redeploy churn; still forces wrong values in the interim.
- C: Correct. `"other"` plus detail string; `"unclear"` for ambiguity.
- D: Discards useful data.

**Q50 - D** | D4 | TS 4.4 | T15
- A: Retry cannot create information that is absent.
- B: Format errors are typically fixable with feedback.
- C: Reversed.
- D: Correct.

**Q51 - A** | D4 | TS 4.4 | T1
- A: Correct. Calculated versus stated totals and `conflict_detected`.
- B: Vague instruction; no detectable signal.
- C: Silently overrides source data.
- D: Discards recoverable documents.

**Q52 - B** | D4 | TS 4.2 | T15
- A: Detailed instructions already exist and are insufficient.
- B: Correct. Few-shot across varied structures fixes empty or null extraction.
- C: Forcing a tool ensures a call, not that the field is found.
- D: Retrying the same input rarely changes a systematic miss.

**Q53 - B, C** | D4 | TS 4.5 | T7
- A: Wasteful.
- B: Correct. Resubmit only failures by `custom_id`, chunking oversized documents.
- C: Correct. Refine on a sample first to maximize first-pass success.
- D: Gives up the 50% saving for a non-blocking job.
- E: Batch does not support multi-turn tool calling within a request.

**Q54 - C** | D1 | TS 1.4 | T1
- A: Repetition is probabilistic; 1% still fails.
- B: Few-shot is also probabilistic.
- C: Correct. Deterministic prerequisite gate.
- D: A second model is probabilistic and adds cost.

**Q55 - D** | D1 | TS 1.6 | T5, T2
- A: Larger window does not solve attention distribution.
- B: Repeating and merging does not target the cause.
- C: Summarization loses field-level detail (progressive summarization risk).
- D: Correct. Focused per-section passes plus an integration pass (prompt chaining).

**Q56 - A** | D2 | TS 2.3 | T1
- A: Correct. Forced tool selection for the first call, then follow-up turns.
- B: `"any"` allows an enrichment tool first.
- C: Prompt ordering is probabilistic.
- D: `auto` does not guarantee.

**Q57 - B** | D2 | TS 2.4 | T9
- A: More tools mean more calls.
- B: Correct. MCP resources expose content catalogs and reduce exploratory calls.
- C: Prompt stuffing of very large catalogs wastes context.
- D: Raising the limit permits more waste, not less.

**Q58 - C** | D5 | TS 5.5 | T4/T12 ("first")
- A: Aggregate can mask weak segments.
- B: Arbitrary reduction with no segment data.
- C: Correct. Validate by document type and field segments before automating.
- D: Presumes the weakness is invoices; no evidence.

**Q59 - A, B, E** | D5 | TS 5.5 | T4
- A: Correct. Field-level confidence calibrated on a labeled validation set.
- B: Correct. Stratified random sampling of high-confidence outputs.
- C: Aggregate masks segments.
- D: Uncalibrated self-report is unreliable.
- E: Correct. Route low-confidence and ambiguous or contradictory documents to reviewers first.
- F: Sampling only flagged items cannot detect errors hiding in high-confidence output.

**Q60 - D** | D5 | TS 5.6 | T14
- A: Arbitrary selection.
- B: Different documents, not duplicates.
- C: Meaningless value.
- D: Correct. Require dates in structured outputs so temporal differences are not mistaken for contradictions; annotate.

---

## Answer strip (for quick scoring)

| Q | Ans | Q | Ans | Q | Ans | Q | Ans |
|---|---|---|---|---|---|---|---|
| 1 | B | 16 | B | 31 | C | 46 | D |
| 2 | C | 17 | A,E | 32 | D | 47 | A |
| 3 | A | 18 | C | 33 | B,E | 48 | B |
| 4 | D | 19 | D | 34 | A | 49 | C |
| 5 | A | 20 | A | 35 | B | 50 | D |
| 6 | C | 21 | B | 36 | C | 51 | A |
| 7 | B | 22 | C | 37 | D | 52 | B |
| 8 | B,D | 23 | D | 38 | A,D | 53 | B,C |
| 9 | D | 24 | A | 39 | A | 54 | C |
| 10 | A | 25 | C,D | 40 | B | 55 | D |
| 11 | A,C | 26 | B | 41 | C | 56 | A |
| 12 | C | 27 | C | 42 | D | 57 | B |
| 13 | B | 28 | D | 43 | A | 58 | C |
| 14 | D | 29 | A | 44 | B | 59 | A,B,E |
| 15 | A | 30 | B | 45 | C | 60 | D |

Multiple-response items: Q8, Q11, Q17, Q25, Q33, Q38, Q53 (TWO each), Q59 (THREE). Single-answer letters are balanced: 13 each of A, B, C, D.

---

## Score conversion (raw of 60 to approximate readiness)

The official pass mark is a scaled 720 on 100-1000; the raw cut score is not published (forms are equated). Candidate reports: 44/60 scored 738; about 43/60 is reported to pass at roughly 724. Treat that as approximately 72% raw. This mock is intentionally harder and wordier than the practice sets, so a score a little lower than your practice-set scores is normal, but the target below is set with margin.

| Raw (of 60) | Approx. % | Readiness | Action |
|---|---|---|---|
| 0-29 | under 50% | Not ready | Re-study all domains from files 03-12; redo scenarios hands-on |
| 30-38 | 50-63% | Well below | Focus on your two weakest domains; rebuild the mental model rules (code vs prompt) |
| 39-42 | 65-70% | Borderline fail | One more focused pass on missed task statements; retake a fresh set |
| 43-47 | 72-78% | Borderline pass | Around the reported cut; do not book on this alone |
| 48-52 | 80-87% | Ready (target) | Book the exam; review misses and flagged items |
| 53-60 | 88%+ | Strong | Light review only; spend time on ambiguous-qualifier reading |

Aim for 48+ on this mock. Also check the per-domain floors below: a candidate with 48 total but under 50% in one domain should still patch that domain (the official score report gives percent-correct per domain).

Multiple-response note: count an item correct only if every correct option, and none other, is selected.

---

## Domain tally sheet

Mark each question you got right, then total per domain.

| Domain | Weight | Items | Question numbers | Your correct | % |
|---|---|---|---|---|---|
| D1 Agentic Architecture and Orchestration | 27% | 16 | 1, 2, 3, 4, 5, 6, 16, 17, 18, 19, 20, 21, 22, 44, 54, 55 | ___ / 16 | |
| D2 Tool Design and MCP | 18% | 11 | 7, 8, 9, 10, 23, 24, 25, 26, 45, 56, 57 | ___ / 11 | |
| D3 Claude Code Config and Workflows | 20% | 12 | 14, 27, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40 | ___ / 12 | |
| D4 Prompt Engineering and Structured Output | 20% | 12 | 15, 41, 42, 43, 46, 47, 48, 49, 50, 51, 52, 53 | ___ / 12 | |
| D5 Context Management and Reliability | 15% | 9 | 11, 12, 13, 28, 29, 30, 58, 59, 60 | ___ / 9 | |
| **Total** | 100% | 60 | | ___ / 60 | |

Per-scenario tally (diagnoses stamina and scenario-specific gaps): S1 Q1-15 ___/15 | S2 Q16-30 ___/15 | S3 Q31-45 ___/15 | S4 Q46-60 ___/15.

Reading the tally: under 70% in any domain means re-read the mapped chapters below. Under 60% in D1 (the heaviest) is the highest priority. Candidate reports say D3 and D5 are the most common weak spots.

---

## Task statement index (for cross-reference)

| TS | Questions |
|---|---|
| 1.1 | 2 |
| 1.2 | 16, 17, 22 |
| 1.3 | 18, 19, 20 |
| 1.4 | 1, 4, 5, 54 |
| 1.5 | 3, 6 |
| 1.6 | 44, 55 |
| 1.7 | 21 |
| 2.1 | 7, 23 |
| 2.2 | 8, 10, 25 |
| 2.3 | 9, 24, 56 |
| 2.4 | 26, 45, 57 |
| 2.5 | (none in this mock - review built-in tools: Grep vs Glob, Edit fallback) |
| 3.1 | 14, 35 |
| 3.2 | 27, 37 |
| 3.3 | 36 |
| 3.4 | 38 |
| 3.5 | 39, 40 |
| 3.6 | 31, 32, 33, 34 |
| 4.1 | 41 |
| 4.2 | 15, 52 |
| 4.3 | 46, 47, 48, 49 |
| 4.4 | 43, 50, 51 (and 46) |
| 4.5 | 42, 53 |
| 4.6 | (covered by 34 and 44 in spirit; re-read multi-pass and independent-instance review) |
| 5.1 | 11, 29 |
| 5.2 | 12, 13 |
| 5.3 | 30 |
| 5.4 | (none - review scratchpad files, /compact, manifests, Explore subagent) |
| 5.5 | 58, 59 |
| 5.6 | 28, 60 |

Coverage gaps in this mock (2.5, 4.6 direct, 5.4) are on purpose limited by 60 items; study them anyway, since the real exam samples 4 of 6 scenarios and may weight them differently.

---

## If you missed these, re-read chapter N

> Chapter numbering (matches the real files 03-12): 03 = TS 1.1-1.3 (loops, multi-agent, subagents); 04 = TS 1.4-1.7 (enforcement, hooks, decomposition, sessions); 05 = TS 2.1-2.3 (tool design, errors, distribution); 06 = TS 2.4-2.5 (MCP integration, built-in tools); 07 = TS 3.1-3.3 (CLAUDE.md, skills/commands, path rules); 08 = TS 3.4-3.6 (plan mode, refinement, CI/CD); 09 = TS 4.1-4.3 (criteria, few-shot, tool_use schemas); 10 = TS 4.4-4.6 (validation/retry, batch, multi-pass review); 11 = TS 5.1, 5.2, 5.4 (context, escalation, large-codebase context); 12 = TS 5.3, 5.5, 5.6 (error propagation, human review, provenance).

| Missed question(s) | Concept | Re-read |
|---|---|---|
| 2, 16, 17, 18, 19, 20, 22 | Loops, coordinator design, context passing, parallel spawn | 03 |
| 1, 3, 4, 5, 6, 21, 44, 54, 55 | Gates, hooks, handoffs, decomposition, sessions | 04 |
| 7, 8, 9, 10, 23, 24, 25, 56 | Tool descriptions, structured errors, tool distribution, tool_choice | 05 |
| 26, 45, 57 | MCP scoping, env expansion, resources, community servers | 06 |
| 14, 27, 35, 36, 37 | CLAUDE.md hierarchy, skills, path rules | 07 |
| 31, 32, 33, 34, 38, 39, 40 | CI flags, plan mode, iterative refinement | 08 |
| 15, 41, 46, 47, 48, 49, 52 | Explicit criteria, few-shot, schemas, tool_choice for extraction | 09 |
| 42, 43, 50, 51, 53 | Retry limits, semantic validation, batch, detected_pattern | 10 |
| 11, 12, 13, 29 | Context trimming, case facts, escalation, lost in the middle | 11 |
| 28, 30, 58, 59, 60 | Error propagation/coverage, provenance, conflicts, dates, calibration, stratified sampling | 12 |

## Pattern-based post-mortem

After scoring, classify each miss using the trap legend at the top:
- 3+ misses of T1 (prompt vs code): re-read the hooks and gates chapters; ask "does this MUST always happen?"
- 3+ misses of T2 (over-engineering): practise choosing the smallest root-cause fix.
- Misses tagged T12: your reading is the problem, not knowledge. Underline qualifiers on the second read.
- Misses of T7, T8: memorize the sentence "batch is for non-blocking work; review needs a fresh, independent instance."
- Misses of T13 (suppressed or generic errors): revisit error propagation and empty-result semantics.

Facts to Verify: the spawning tool is "Task" in the exam guide and "Agent" in newer SDK docs; hook names (post-tool-use processing, pre-tool-call interception) are referred to generically here because the guide describes the patterns rather than every event name. The chapter numbering above is assumed, not read from files 03-12.
