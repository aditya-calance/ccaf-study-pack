# 20. Practice Set - Domain 5: Context Management & Reliability

> 10 original questions covering task statements 5.1-5.6 (context preservation and lost-in-the-middle, escalation, error propagation, large-codebase context, human review and calibration, provenance). Two are select-two (Q8, Q10). Domain 5 is the most-cited weak spot in candidate reports, so read the stems twice: single qualifiers ("explicitly", "valid empty", "already") decide the answer.
>
> Verify note: everything here follows the official guide's philosophy (structural fixes over prompt exhortation; explicit criteria over sentiment or self-confidence). Any mention of compaction commands beyond `/compact` is not tested here.

---

## Questions

### Q1 [Customer Support Resolution Agent | 5.1 | Medium]
A support session runs 25 turns. At turn 15 the platform summarizes earlier history to save tokens. Later the agent quotes a refund of $48 when the customer had been told $84.50, and forgets a callback date the customer was promised. The customer says, "I was told this on Tuesday." What is the most effective design change?

A. Make the summarization prompt more detailed so it retains more of the transcript.
B. Summarize less often and store full transcripts in a database.
C. Extract transactional facts (amounts, dates, order numbers, statuses, customer expectations) into a persistent "case facts" block that is included in every prompt, outside the summarized history.
D. Move to a model with a larger context window so summarization is unnecessary.

### Q2 [Multi-Agent Research System | 5.1 | Medium-Hard]
A synthesis agent receives nine subagent reports concatenated in one prompt (about 60k tokens). Final reports consistently omit findings from reports 4 through 6, though you confirm those findings are present in the input and correct. Reports 1-3 and 7-9 are well represented. What should you change first?

A. Put a key-findings summary at the start of the aggregated input and organize the detailed results under explicit section headers.
B. Switch to a model with a larger context window.
C. Add "read every section carefully and do not skip the middle" to the synthesis prompt.
D. Randomize the order of reports on each run and average the resulting drafts.

### Q3 [Customer Support Resolution Agent | 5.2 | Medium]
A customer writes: "I just need to change my shipping address on order 5521. Actually, forget it - get me a human agent." The agent replies, "Happy to help! Let me pull up order 5521 to see if I can fix the address first." The customer becomes annoyed. The address change is within the agent's capability. What should the agent have done?

A. Investigate briefly and escalate only if the address cannot be changed.
B. Resolve the address change since it is simple, then offer a human afterwards.
C. Ask the customer why they want a human so the request can be routed to the right team.
D. Escalate immediately, honoring the explicit request without first attempting to investigate or resolve.

### Q4 [Customer Support Resolution Agent | 5.2 | Medium-Hard]
Escalation currently fires on (a) a negative-sentiment score and (b) the agent's self-reported confidence below 6/10. Logs show many angry customers with easy cases get escalated, while a calm customer asking for a price match against a competitor (policy covers only own-site price adjustments) was granted a discount autonomously. What is the most effective change?

A. Tune the sentiment and confidence thresholds until the two error types balance out.
B. Replace them with explicit escalation criteria in the system prompt - explicit human requests, policy exceptions or gaps, and inability to make progress - with few-shot examples of escalate versus resolve, including frustration on a solvable case.
C. Train a separate classifier on historical tickets to predict escalation before the agent runs.
D. Add a second agent that reviews every response for tone before it is sent.

### Q5 [Multi-Agent Research System | 5.3 | Medium]
A search subagent has two outcomes in the same run: for one source a request timed out; for a narrow query on another topic the search worked and returned zero matching documents. Currently both are reported to the coordinator as "no results," and the report silently omits both topics. What is the best design?

A. Return structured error context for the timeout (failure type, attempted query, partial results, alternatives), distinguish it from the valid empty result, and let the subagent retry transient failures locally before propagating.
B. Return a generic "search unavailable" status for both so the coordinator handles them identically.
C. Terminate the whole research workflow when any subagent times out.
D. Have the subagent catch the timeout and return an empty result marked as successful so the pipeline continues.

### Q6 [Large Codebase Exploration | 5.4 | Medium]
Two hours into mapping a 900-file service, the agent begins saying "typically these handlers use a repository pattern" instead of naming the specific classes it found earlier, and its answers about the same module conflict with earlier ones. What is the best response?

A. Keep going; add "be precise and specific" to the prompt.
B. Start a fresh session with no notes and re-explore.
C. Have the agent keep a scratchpad file of key findings and refer back to it, delegate verbose exploration to subagents that return summaries, and use `/compact` when the context fills with discovery output.
D. Tell the agent to re-read every relevant file before answering each question.

### Q7 [Structured Data Extraction | 5.5 | Hard]
A validation run over 12,000 documents shows 97% overall field accuracy. Management wants to auto-accept high-confidence extractions and cut human review to a small sample. What should you do before reducing review?

A. Proceed; 97% exceeds the human baseline.
B. Analyze accuracy by document type and by field to confirm no segment underperforms, then adopt ongoing stratified random sampling of high-confidence extractions to measure error rates and catch new patterns.
C. Route by the model's own overall confidence and sample uniformly at random from all documents.
D. Require three independent runs to agree before auto-accepting.

### Q8 [Structured Data Extraction | 5.5 | Medium] - Select TWO
Reviewer capacity is limited. Which TWO practices best route human attention?

A. Have the model output field-level confidence scores and calibrate review thresholds using a labeled validation set.
B. Use one uncalibrated document-level self-reported confidence with a fixed 0.8 cutoff.
C. Review documents in the order they arrive until capacity runs out.
D. Route extractions with low calibrated confidence, or with ambiguous or contradictory source documents, to human review first.
E. Review only the highest-volume document type.

### Q9 [Multi-Agent Research System | 5.6 | Medium]
A search subagent finds a market-share figure of 18% from a 2021 report; a document subagent finds 35% from a 2024 study. The synthesis report flags them as contradictory and asks the coordinator to resolve it. What is the best preventive change?

A. Average the two values and cite "multiple sources."
B. Always keep the most recent figure and discard older ones.
C. Discard the value from whichever source has the lower reputation.
D. Require subagents to include publication or data-collection dates in their structured outputs, and preserve source attribution so temporal differences are not misread as contradictions.

### Q10 [Multi-Agent Research System | 5.6 | Medium-Hard] - Select TWO
After summarization steps, final reports state numbers without citing sources. When two credible sources of the same year disagree (for example $50B versus $35-65B), the synthesis output silently chooses one. Which TWO changes best fix provenance and uncertainty handling?

A. Keep only the value from the source the synthesis agent judges most credible.
B. Require subagents to output structured claim-source mappings (source URLs, document names, relevant excerpts) that the synthesis agent must preserve and merge.
C. Annotate conflicting values with source attribution, and separate well-established from contested findings in the report.
D. Cite "various industry sources" to keep the report concise.
E. Convert all content to uniform prose paragraphs for readability.

---

## Answer key & explanations

### Q1 - Answer: C  (5.1)
**Root cause:** progressive summarization condenses numbers, dates, and customer expectations into vague text. A persistent case-facts block outside summarized history keeps them verbatim.
- A: still a lossy summary; better wording does not guarantee exact values.
- B: heavier storage and more tokens without solving in-prompt fidelity.
- D: a bigger window does not protect against summarization loss.
**Trap:** more capacity / more detailed summary versus structural separation of facts.

### Q2 - Answer: A  (5.1)
Lost-in-the-middle: models process the beginning and end of long inputs reliably but may omit middle content. Place key-findings summaries first and use explicit section headers. (Upstream, also have subagents return structured key facts rather than verbose content.)
- B: larger windows do not fix position effects.
- C: an exhortation is probabilistic.
- D: shuffling makes omissions random rather than eliminating them.
**Trap:** "bigger context" and "tell it to try harder."

### Q3 - Answer: D  (5.2)
An explicit request for a human is honored immediately, without first investigating. (Contrast: if a customer is merely frustrated but has not asked for a human and the issue is solvable, acknowledge and offer resolution; escalate if they reiterate.)
- A, B: both attempt to resolve first, overriding the stated preference.
- C: adds friction and second-guesses the customer.
**Trap:** over-applying "resolve when simple"; the qualifier "explicit request" decides.

### Q4 - Answer: B  (5.2)
Sentiment and self-reported confidence are unreliable proxies for case complexity. The real failures are undefined boundaries (policy gaps, exceptions). Explicit criteria plus few-shot examples fix that proportionately.
- A: tuning thresholds on the wrong signals.
- C: over-engineered before prompt fixes are tried.
- D: addresses tone, not the decision boundary.
**Trap:** sentiment/confidence routing; infrastructure before prompt criteria. (When a lookup returns multiple customer matches, ask for more identifiers rather than guessing.)

### Q5 - Answer: A  (5.3)
Access failures (timeouts) need structured context so the coordinator can retry, re-query, or proceed with partial results; a valid empty result is a successful answer and must not look like a failure. Subagents do local recovery for transient errors and propagate only what they cannot resolve; the report should carry coverage annotations.
- B: generic status hides context.
- C: terminating on a single failure is unnecessary.
- D: suppressing the error as success prevents recovery.
**Trap:** two anti-patterns (silent suppression and total abort) vs. structured propagation.

### Q6 - Answer: C  (5.4)
Context degradation shows as "typical patterns" instead of specific classes. Scratchpad files persist findings across context boundaries, subagents isolate verbose exploration, `/compact` reduces context.
- A: no structural change.
- B: throws away everything found.
- D: re-reading everything re-fills context and repeats the problem.
**Trap:** more effort or restart rather than persisting and delegating.

### Q7 - Answer: B  (5.5)
Aggregate accuracy can hide poor performance in specific document types or fields. Validate by segment first, then use stratified random sampling of high-confidence outputs for ongoing error measurement and novel-pattern detection.
- A: aggregate metric masks segments.
- C: overall confidence without calibration; uniform sampling can under-sample rare segments.
- D: agreement between runs does not measure accuracy per segment and can share the same blind spots.
**Trap:** trusting the headline metric.

### Q8 - Answer: A and D  (5.5)
Field-level confidence calibrated on a labeled validation set, and routing low-confidence or ambiguous/contradictory sources to reviewers first, prioritize limited capacity.
- B: uncalibrated, coarse.
- C: arrival order ignores risk.
- E: volume is not risk.
**Trap:** uncalibrated self-confidence.

### Q9 - Answer: D  (5.6)
Temporal differences are not contradictions; require dates in structured outputs and keep attribution.
- A: fabricates a number and loses traceability.
- B: discards data arbitrarily (older data may matter for trends).
- C: arbitrary selection without evidence.
**Trap:** arbitrarily selecting or blending a value.

### Q10 - Answer: B and C  (5.6)
Claim-source mappings must survive summarization; genuine conflicts are annotated with attribution, and reports distinguish well-established from contested findings.
- A: silently picks a winner.
- D: destroys provenance.
- E: content types should be rendered appropriately (financial data as tables, news as prose), not flattened.
**Trap:** concision or arbitrary selection over provenance.

---

## Scoring table

| Q | Task | Correct | Your answer | Score (1 / 0) |
|---|------|---------|-------------|---------------|
| 1 | 5.1 | C | | |
| 2 | 5.1 | A | | |
| 3 | 5.2 | D | | |
| 4 | 5.2 | B | | |
| 5 | 5.3 | A | | |
| 6 | 5.4 | C | | |
| 7 | 5.5 | B | | |
| 8 | 5.5 | A + D | | |
| 9 | 5.6 | D | | |
| 10 | 5.6 | B + C | | |

Select-two questions score 1 only if both are right. **Total: ___ / 10.**
- 9-10: strong. 7-8: review missed task statements. 5-6: re-read chapter 5.x for each miss. Below 5: redo the domain chapter; Domain 5 is the most-cited weak spot in candidate reports.
