# 19. Practice Set - Domain 4: Prompt Engineering & Structured Output

> 13 original questions covering task statements 4.1-4.6 (explicit criteria, few-shot, tool-use schemas and `tool_choice`, validation/retry, batch processing with SLA arithmetic, multi-instance/multi-pass review). Two are select-two (Q6, Q10). All options sound workable; choose the root-cause, proportionate fix. Do all questions first, then check the key. About 2 minutes per question.
>
> Verify note: batch facts used here come from the guide (50% savings, up to 24-hour window, no guaranteed latency SLA, no multi-turn tool calling inside one request, `custom_id` correlation). Batch pricing beyond the 50% figure is out of scope - awareness only.

---

## Questions

### Q1 [Claude Code for CI - Automated Review | 4.1 | Medium]
Your review prompt says: "Check that code comments are accurate. Be conservative and only report findings you are highly confident about." The bot posts many comments about phrasing, outdated TODO wording, and trivial docstring style, while developers say real mismatches slip through. Developers have started dismissing the bot's comments without reading them. What is the most effective prompt change?

A. Add a numeric requirement: "Only report findings with confidence of at least 90%."
B. Replace the instruction with explicit categorical criteria: report a comment only when its claimed behavior contradicts what the code actually does; skip wording, style, and TODO phrasing.
C. Strengthen the tone: "Be extremely conservative; when in doubt, say nothing."
D. Add a second model call that scores each finding's importance and drops the bottom half.

### Q2 [Claude Code for CI - Automated Review | 4.1 | Medium]
Your reviewer reports three categories. Measured precision after a month: security 88%, logic bugs 81%, naming conventions 38%. Developer survey: trust in the bot is falling across all categories, and reviewers say they "skim past everything now." You need trust back quickly without shipping a blind spot. What should you do?

A. Keep all three categories and add a disclaimer to each comment that some findings may be wrong.
B. Ask reviewers to triage each naming finding manually and thumbs-up or down the useful ones.
C. Temporarily disable the naming-conventions category while you refine its criteria offline, keeping security and logic reviews on.
D. Reduce the number of comments per PR to five regardless of category.

### Q3 [Structured Data Extraction | 4.2 | Medium]
An extraction prompt pulls cargo weight from freight documents. Documents vary: some have a clean "Weight: 1,240 kg" line, some say "approx. one and a half tons," some embed it in a paragraph, and some list pallets with per-pallet weights. The model sometimes invents exact numbers for vague phrases and sometimes returns null when the weight is clearly stated in prose. The instructions are already detailed. What is the most effective improvement?

A. Add 3-4 targeted few-shot examples covering the varied formats, showing correct handling of informal measurements (including when to return null) and the reasoning behind each choice.
B. Extend the instructions with an exhaustive list of every phrase seen so far that denotes a weight.
C. Add a regex post-processor that converts phrases like "one and a half tons" to numbers.
D. Set temperature to 0 and switch to the largest available model.

### Q4 [Claude Code for CI - Automated Review | 4.2 | Medium]
A review agent flags intentional patterns (a deliberate early return in a hot path, an allowed broad `except` at a process boundary) as issues, and its findings arrive in inconsistent shapes: some lack a location, some lack severity, fixes vary in detail. The team wants consistent, actionable findings and better judgment on acceptable-versus-genuine patterns. Which change is best?

A. Enforce an output schema via tool use for all findings.
B. Write a 15-rule checklist enumerating each acceptable pattern the model should ignore.
C. Add a second pass that asks the model to remove its own false positives.
D. Add 2-4 few-shot examples showing the exact finding format (location, issue, severity, suggested fix), including contrasting cases of an acceptable pattern left alone versus a genuine issue reported, with brief reasoning.

### Q5 [Structured Data Extraction | 4.3 | Medium]
A pipeline ingests invoices, receipts, and purchase orders. You define three extraction tools (`extract_invoice`, `extract_receipt`, `extract_purchase_order`) with distinct schemas. The document type is unknown at request time. About 4% of responses are plain text ("This looks like an invoice from...") which breaks the parser. What is the most reliable fix?

A. Keep `tool_choice: "auto"` and add a sentence to the system prompt: "Always respond using one of the extraction tools."
B. Force `tool_choice: {"type": "tool", "name": "extract_invoice"}` for every request.
C. Set `tool_choice: "any"` so the model must call a tool but can choose which extraction tool fits the document.
D. Keep `"auto"` and add a fallback that parses the plain-text answer when no tool call is present.

### Q6 [Structured Data Extraction | 4.3 | Medium-Hard] - Select TWO
A contract-extraction tool schema marks `contract_end_date` as a required string and defines `payment_terms` as an enum of `["net30", "net60", "net90"]`. Production shows fabricated end dates for evergreen contracts that have none, and unusual terms such as "net45" being forced into `net30`. Which TWO schema changes best address these problems?

A. Make `contract_end_date` optional/nullable so the model can return null when the source has no date.
B. Raise `max_tokens` so the model has room to explain missing dates.
C. Add a prompt line: "Never leave a field blank; always give your best guess."
D. Extend the enum with `"other"` plus a `payment_terms_detail` string (and an `"unclear"` value for ambiguous text) so unusual terms are captured rather than forced.
E. Drop the schema and ask for free-form JSON in a text response.

### Q7 [Structured Data Extraction | 4.4 | Medium-Hard]
About 6% of invoice extractions fail validation. Two types dominate: (1) line items do not sum to the stated total because the model put a tax amount in the wrong field; (2) the purchase order number is missing because it is printed only on a separate cover sheet that is not part of the submitted document. Which retry design is best?

A. Retry every failed extraction up to five times, appending "please try again more carefully."
B. For type 1, re-invoke with the original document, the failed extraction, and the specific validation errors; for type 2, do not retry - return null and flag it for follow-up because the information is not in the source.
C. Retry both types with `tool_choice` forced to the extraction tool so the model cannot skip the field.
D. For both types, retry with a larger model.

### Q8 [Structured Data Extraction | 4.4 | Medium]
Extraction uses tool use with a strict JSON schema, and no schema violations occur. Yet finance reports that about 3% of extracted invoices have line items that do not add up to the total, or values placed in the wrong fields. You want to detect these automatically. What should you do?

A. Tighten the schema so every numeric field is required and typed as a number.
B. Add "double-check your arithmetic" to the prompt.
C. Add a second model call that re-reads the invoice and gives a general accuracy opinion.
D. Have the model extract `calculated_total` (sum of line items) alongside `stated_total`, and add a `conflict_detected` boolean; validate and route discrepancies for review or retry with the specific error.

### Q9 [Batch Processing | 4.5 | Hard]
A legal team needs a compliance summary for each incoming contract within 36 hours of its arrival. Contracts arrive continuously all day. You will use the Message Batches API, which processes batches within up to 24 hours and offers no guaranteed latency SLA. You submit accumulated contracts on a fixed schedule. What is the MAXIMUM interval between submissions that still guarantees the 36-hour window (worst case: a contract arrives just after a submission)?

A. Every 6 hours
B. Every 12 hours
C. Every 24 hours
D. Every 36 hours

### Q10 [Batch Processing | 4.5 | Medium] - Select TWO
Which TWO of the following workloads are the best fit for the Message Batches API?

A. A pre-merge security check that blocks the merge button until it finishes.
B. A weekly compliance audit over 12,000 archived documents, reviewed on Monday morning.
C. A live support assistant that must call an order-lookup tool mid-request and use the result to continue.
D. A nightly test-generation job whose output is reviewed the next morning.
E. Inline code suggestions shown in an editor as the developer types.

### Q11 [Batch Processing | 4.5 | Medium]
A batch of 50,000 document-extraction requests finishes. 1,400 results show errors indicating the input exceeded the context limit; the other 48,600 succeeded. Each request carried a `custom_id` equal to the document ID. What is the best next step?

A. Resubmit the entire batch with a shortened prompt.
B. Move the entire workload to synchronous real-time calls.
C. Use `custom_id` to identify the 1,400 failures, chunk those documents into smaller pieces, and resubmit only them.
D. Silently truncate the failed documents to fit and count them as successful.

### Q12 [Claude Code for CI - Automated Review | 4.6 | Medium-Hard]
A quarterly configuration migration touches 22 files across several services. A single-pass review of the full change yields uneven depth (thorough comments on the first files, one-liners on later ones), missed obvious bugs, and contradictory verdicts: an identical retry pattern is flagged in one service and approved in another. What is the best restructuring?

A. Add an instruction: "Give equal attention to every file."
B. Review each file in its own pass only, and merge the per-file results.
C. Run the full review three times and keep only findings that appear in at least two runs.
D. Run per-file passes for local issues, then a separate integration pass focused on cross-file data flow and consistency.

### Q13 [Code Generation with Claude Code | 4.6 | Medium]
In your CI pipeline the same Claude session generates a patch and then is asked to review it. Reviews approve nearly everything, even patches later found to have subtle logic errors. A colleague proposes several fixes. Which is most effective?

A. Give the review step a large extended-thinking budget.
B. Run the review in a separate, independent Claude instance that sees the diff and requirements but not the generator's reasoning; optionally have it report a confidence per finding for routing.
C. Add "act as a hostile reviewer" to the same session's prompt.
D. Ask the generating session to report its confidence and skip review when it is 8/10 or higher.

---

## Answer key & explanations

### Q1 - Answer: B  (4.1)
**Root cause:** the criteria are vague, so the model has nothing concrete to decide on. Explicit categorical criteria (report contradicted claimed behavior; skip wording/style/TODOs) define what to report and skip.
- A: confidence thresholds do not add discriminating information; the model is equally "confident" about nitpicks.
- C: "be conservative" is the same failure in stronger words.
- D: a filter that guesses importance is another vague judgment layered on the original problem.
**Trap:** confidence-based filtering and tone instead of specific criteria.

### Q2 - Answer: C  (4.1)
High false-positive categories undermine trust in accurate ones. Temporarily disable the 38% category, fix it offline, keep good categories running.
- A: disclaimers legitimize noise.
- B: pushes work onto reviewers and leaves the noise live.
- D: an arbitrary cap could drop true security findings.
**Trap:** keeping the noisy category on; arbitrary caps.

### Q3 - Answer: A  (4.2)
Detailed instructions already exist and fail on varied formats; few-shot examples showing handling of informal measurements and varied structures (with reasoning) reduce fabrication and empty extraction and generalize to new phrasing.
- B: enumerating phrases matches only known cases.
- C: regex covers only what you anticipated and does nothing about fabrication.
- D: temperature/model size do not teach the null-vs-approximate judgment.
**Trap:** more instruction or more capacity instead of examples.

### Q4 - Answer: D  (4.2)
Few-shot examples both fix format consistency and demonstrate judgment (acceptable vs genuine), and enable generalization to novel patterns.
- A: a schema fixes shape but not the false-positive judgment (partial fix only).
- B: rule lists cover only pre-specified cases.
- C: self-review retains the same reasoning biases.
**Trap:** partial fix that solves one of two stated problems.

### Q5 - Answer: C  (4.3)
With multiple schemas and unknown document type, `tool_choice: "any"` guarantees a tool call while letting the model choose which. ("auto" may return text; forced-tool would misroute other document types.)
- A: prompt compliance is probabilistic.
- B: forces the wrong schema on receipts/POs.
- D: repairs after the fact and keeps the failure mode.
**Trap:** "auto" plus prompt; forcing one tool. (Forced named tool is right when a specific extraction must run first, e.g. `extract_metadata` before enrichment.)

### Q6 - Answer: A and D  (4.3)
Nullable fields prevent fabricating values to satisfy required fields; an enum with "other" + detail (and "unclear") handles extensible categories and ambiguity.
- B: token room does not change schema pressure.
- C: encourages the fabrication.
- E: gives up syntax guarantees.
**Trap:** blaming the prompt when the schema forces the behavior.

### Q7 - Answer: B  (4.4)
Retry with error feedback works for structural/format errors (misplaced tax). Retry cannot succeed when information is absent from the source (PO on an unsent sheet).
- A: blind retries with no feedback, and pointless for absent data.
- C: forcing the tool guarantees a call, not the missing fact; risks fabrication.
- D: bigger model cannot read an unsent page.
**Trap:** retry everything; capacity.

### Q8 - Answer: D  (4.4)
Strict schemas remove syntax errors, not semantic errors. Extracting `calculated_total` next to `stated_total` (plus `conflict_detected`) makes semantic errors detectable in code.
- A: syntax/typing, already satisfied.
- B: unverifiable prompt request.
- C: a vague second opinion, not a checkable invariant.
**Trap:** confusing schema validity with semantic correctness.

### Q9 - Answer: B  (4.5, SLA arithmetic)
Worst case: contract arrives just after a submission, waits the full interval W, then up to 24 hours of processing. Need W + 24 <= 36, so W <= 12 hours. (The guide's example: 30-hour SLA with 4-hour windows - i.e. 30 - 24 = 6 maximum, with 4 leaving margin. In practice pick a safer figure than the exact maximum.)
- A: meets the SLA but is not the maximum (and creates more batches).
- C: 24 + 24 = 48 hours, fails.
- D: 36 + 24 = 60 hours, fails.
**Trap:** forgetting the wait-for-next-submission term; batches have no guaranteed SLA beyond the 24-hour window.

### Q10 - Answer: B and D  (4.5)
Latency-tolerant, non-blocking workloads (weekly audits, nightly generation) suit batch (50% savings).
- A: blocking flow, batch inappropriate.
- C: batch does not support multi-turn tool calling within one request.
- E: interactive latency needed.
**Trap:** batch for blocking or tool-looping flows.

### Q11 - Answer: C  (4.5)
Use `custom_id` to isolate failures, fix the cause (chunking oversized docs), resubmit only those.
- A: reprocesses 48,600 successes.
- B: discards the savings for no reason.
- D: silent truncation loses data and hides failure.
**Trap:** reprocessing everything; hiding errors.

### Q12 - Answer: D  (4.6)
Root cause: attention dilution across many files. Per-file local passes plus an integration pass for cross-file flow.
- A: an instruction does not change how attention is spread.
- B: per-file only cannot catch cross-file issues or consistency.
- C: consensus filtering suppresses real bugs found intermittently.
**Trap:** "one more instruction"; consensus voting.

### Q13 - Answer: B  (4.6)
Self-review retains the generator's reasoning context and is less likely to question its own decisions. An independent instance without that context is more effective; per-finding confidence can route review attention.
- A: extended thinking in the same session does not remove the bias.
- C: role prompt in the same context has the same anchoring.
- D: self-reported confidence is poorly calibrated and skipping review removes the safeguard.
**Trap:** self-review, self-confidence.

---

## Scoring table

| Q | Task | Correct | Your answer | Score (1 / 0) |
|---|------|---------|-------------|---------------|
| 1 | 4.1 | B | | |
| 2 | 4.1 | C | | |
| 3 | 4.2 | A | | |
| 4 | 4.2 | D | | |
| 5 | 4.3 | C | | |
| 6 | 4.3 | A + D | | |
| 7 | 4.4 | B | | |
| 8 | 4.4 | D | | |
| 9 | 4.5 | B | | |
| 10 | 4.5 | B + D | | |
| 11 | 4.5 | C | | |
| 12 | 4.6 | D | | |
| 13 | 4.6 | B | | |

Select-two questions score 1 only if both are right. **Total: ___ / 13.**
- 12-13: strong. 10-11: review missed task statements. 8-9: re-read the relevant chapter 4.x. Below 8: redo the domain before the real exam.
