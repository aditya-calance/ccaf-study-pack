# 12. Domain 5b - Error Propagation, Human Review and Provenance

> **Domain 5: Context Management & Reliability (15%)** | Task statements: 5.3, 5.5, 5.6 (5.1, 5.2, 5.4 are in chapter 11) | Priority: **MUST** (multi-agent research scenario is a recurring scenario; coverage gaps and provenance are favorite stems) | Read time: ~18 min

## The 60-second version

- Subagent failures propagate as **structured error context**: failure type, what was attempted, partial results, alternatives. Not "search unavailable."
- **Access failure** (timeout, 503, permission) is not the same as a **valid empty result** (query ran, nothing matched). Different coordinator decisions: retry/reroute vs. "no data exists."
- Subagents recover locally from transient failures (retry with backoff), and propagate only what they cannot resolve.
- Two anti-patterns: **silent suppression** (return empty as success) and **whole-workflow termination** on one failure. Correct: continue, annotate gaps.
- Final synthesis carries **coverage annotations**: which findings are well supported, which topics have gaps because sources were unavailable.
- 97% overall accuracy can hide a segment at 60%. Validate by document type and field. Sample high-confidence extractions with stratified random sampling. Calibrate field-level confidence on labeled sets. Route low confidence/contradictory documents to reviewers.
- Provenance: claim-source mappings must survive summarization. Conflicting stats are annotated with sources, never arbitrarily picked. Dates disambiguate "contradictions." Render by content type (tables for financial, prose for news, lists for technical).

---

## Chapter 5.3 - Error propagation across multi-agent systems

**Why the exam cares:** The multi-agent research scenario. Stems show a web-search subagent timing out and ask what the coordinator should receive or do. Two of the four options are the anti-patterns.

### Core concepts

**Structured error context** enables intelligent coordinator recovery. A useful error carries:

| Field | Purpose |
|---|---|
| `failure_type` | timeout, rate_limit, auth, not_found, source_unavailable, validation... drives retry vs. reroute |
| `attempted` | exact query/source/parameters tried, so the coordinator does not repeat it |
| `partial_results` | anything gathered before failure, so work is not thrown away |
| `alternatives` | suggested next steps (different source, narrower query, other agent) |
| `retryable` | boolean, consistent with MCP tool error design from Domain 2 |

**Generic statuses hide information.** "search unavailable" tells the coordinator nothing about whether to retry, reroute, or accept a gap.

**Access failure vs. valid empty.** A timeout means we do not know the answer; retry or use another source. A successful query with zero matches is an answer ("no records found"), and retrying is wasteful; reporting it as a failure is wrong too. Conflating them either causes pointless retries or silently converts unknowns into "nothing exists."

**Local recovery first, propagate the rest.** A subagent should retry transient failures itself (e.g. 2-3 retries with backoff) and only escalate to the coordinator what it cannot resolve, including what it tried and partial results. This keeps the coordinator's context clean.

**Two anti-patterns (both wrong):**
1. **Silent suppression:** catch the exception, return `[]` as success. The coordinator believes the topic was covered and the final report confidently states nothing exists.
2. **Whole-workflow termination:** one subagent's failure aborts the entire pipeline, discarding 4 successful branches.

**Coverage annotations.** The synthesis states which sections are well supported and which have gaps due to unavailable sources, so the reader knows the boundaries of the claims.

### Worked example - structured error return from a subagent

```json
{
  "status": "error",
  "subagent": "web_search_agent",
  "failure_type": "timeout",
  "retryable": true,
  "attempted": {
    "query": "EU battery recycling regulation 2026 enforcement",
    "source": "web_search",
    "retries_done": 2,
    "backoff_ms": [1000, 3000]
  },
  "partial_results": [
    {"claim": "Regulation (EU) 2023/1542 applies from 2025-02-18",
     "source_url": "https://example.org/reg-summary",
     "published": "2025-03-01"}
  ],
  "alternatives": [
    "query the document_analysis agent on the cached legal PDFs",
    "retry with narrower query 'enforcement penalties only'"
  ]
}
```

Contrast: a valid empty result.

```json
{"status": "ok", "subagent": "web_search_agent",
 "query": "Acme Corp 2026 recall", "results": [],
 "note": "query succeeded; no matching documents"}
```

### Worked example - coordinator coverage report

```json
{
  "topic": "EU battery recycling market",
  "coverage": {
    "regulation":  {"status": "well_supported", "sources": 4},
    "market_size": {"status": "well_supported_with_conflict",
                    "sources": 3, "see": "conflicts[0]"},
    "apac_players": {"status": "gap",
                     "reason": "web_search timeout after 2 retries; document corpus has no APAC files",
                     "recovery_tried": ["retry x2", "document_analysis fallback"],
                     "next_step": "re-run search when service recovers"}
  },
  "failed_subagents": [
    {"name": "web_search_agent", "failure_type": "timeout", "partial_results_used": true}
  ],
  "report_caveat": "APAC section omitted; conclusions apply to EU and North America only."
}
```

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Return failure type, attempt, partials, alternatives | Return "search unavailable" | Coordinator cannot decide |
| Distinguish timeout from zero matches | Treat empty as error or error as empty | Different next actions |
| Retry transient errors inside the subagent | Bubble every hiccup to the coordinator | Noise and wasted context |
| Continue other branches, annotate the gap | Abort the workflow on one failure | Loses good work |
| Report the gap in synthesis | Return `[]` as success | Silent suppression = false completeness |

### Exam traps

- "Return an empty result set so the pipeline keeps running" - silent suppression.
- "Throw so the whole workflow stops and the user retries" - termination anti-pattern.
- "Have the coordinator just retry every failed call 5 times" - ignores non-retryable failures and duplicates local recovery.
- "Add a generic `error: true` flag" - generic status.
- Fine-sounding but wrong: "Fabricate a plausible section from model knowledge to fill the gap" - never.

### Quick check

- Search returns 200 with 0 hits. -> Valid empty; report "no matches," do not retry as failure.
- Subagent times out after 2 local retries. -> Propagate structured error with attempts, partials, alternatives.
- Final report when APAC data is unavailable? -> Include it as an annotated coverage gap.

---

## Chapter 5.5 - Human review workflows and confidence calibration

**Why the exam cares:** Structured extraction scenario. Stems say "accuracy is 97%, so we plan to remove human review" and ask what is wrong.

### Core concepts

**Aggregate accuracy masks segments.** 97% overall could be 99.8% on typed invoices and 62% on handwritten receipts, or perfect on `total` and poor on `tax_id`. Before automating, measure accuracy by document type and by field.

Illustrative table:

| Segment | Share of volume | Accuracy |
|---|---|---|
| Typed invoices | 80% | 99.5% |
| Scanned receipts | 15% | 96% |
| Handwritten forms | 5% | 62% |
| **Overall** | 100% | **~97.8%** (looks great) |

**Stratified random sampling.** Even for extractions the model marks high confidence, keep sampling a random slice, stratified by document type/field, to (a) measure the real error rate of the high-confidence bucket and (b) detect novel error patterns that no threshold anticipated. Stratification ensures small segments (5% handwritten) get enough samples, which simple random sampling would under-represent.

**Field-level confidence, calibrated.** Have the model output confidence per field, then calibrate thresholds against a **labeled validation set**: at what stated confidence does actual accuracy reach the target for each field? Raw model confidence is not trustworthy until checked against labels (this echoes 5.2: uncalibrated self-reported confidence is unreliable, and calibration is what makes it usable for routing).

**Routing.** Send to human review: low-confidence fields, and documents that are ambiguous or whose sources contradict each other. Reviewer capacity is limited, so prioritize by confidence and impact.

### Worked example - routing logic

```python
THRESH = {"total": 0.90, "tax_id": 0.97, "vendor": 0.85}   # calibrated on labeled set, per field

def route(doc):
    needs_review = []
    for field, (value, conf) in doc.fields.items():
        if conf < THRESH[field]:
            needs_review.append(field)
    if doc.has_conflicting_values or doc.type not in VALIDATED_TYPES:
        return "human_review", needs_review
    if needs_review:
        return "human_review", needs_review
    # high confidence path: still sampled
    if stratified_sampler.pick(doc.type, doc.fields.keys()):
        return "audit_sample", []
    return "auto_accept", []
```

Thresholds differ per field because calibration curves differ. `VALIDATED_TYPES` enforces "validate by document type before automating."

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Report accuracy per document type and field | Decide on one aggregate number | Masking |
| Keep stratified sampling of auto-accepted output | Stop all review once accuracy looks high | Drift and novel errors go unseen |
| Calibrate thresholds on labeled data | Trust raw model confidence | Uncalibrated |
| Route ambiguous/contradictory docs to humans | Auto-pick one value | Risk of silent error |
| Prioritize the review queue | Review in arrival order | Limited reviewer capacity |

### Exam traps

- "Overall accuracy is 97% on 10,000 docs, so automate everything" - masking.
- "Use simple random sampling of 1%" - small segments under-sampled; the guide says stratified.
- "Ask the model to double-check its own high-confidence outputs" - self-review, not independent measurement.
- "Set threshold at 0.9 for all fields" - not per-field, not calibrated.

### Quick check

- Why not automate at 97%? -> It may hide a failing document type or field; segment first.
- What does stratified sampling of high-confidence output detect? -> True error rate of that bucket and novel error patterns.
- How do you choose a confidence threshold? -> Calibrate against a labeled validation set, per field.

---

## Chapter 5.6 - Provenance and uncertainty in multi-source synthesis

**Why the exam cares:** Multi-agent research scenario again. Stems: two subagents report different market sizes; the final report cites one with no source; a "contradiction" is really 2022 vs 2025 data.

### Core concepts

**Attribution is lost in summarization.** When findings are compressed without claim-source mappings, "the market is $4.2B" survives while its source does not. Require subagents to output structured claim-source mappings (source URL, document name, relevant excerpt), and require synthesis to preserve and merge these mappings.

**Conflicting statistics: annotate, do not pick.** If two credible sources disagree ($4.2B vs $5.1B), include both with attribution and methodology, and let the coordinator decide how to reconcile before synthesis. Arbitrarily choosing one fabricates certainty. In document analysis, complete the analysis with conflicting values included and explicitly annotated.

**Temporal data.** Require publication or data collection dates. A 2022 figure and a 2025 figure differing is trend, not contradiction. Without dates the synthesis mislabels time differences as conflict.

**Structure the report.** Separate well-established findings from contested ones, preserving each source's original characterization and methodological context.

**Content-type-appropriate rendering.** Financial data as tables, news as prose, technical findings as structured lists. Do not flatten everything into one uniform format (all bullets, or all paragraphs).

### Worked example - subagent finding with provenance

```json
{
  "subagent": "document_analysis_agent",
  "finding": {
    "claim": "EU battery recycling market was EUR 4.2B in 2024",
    "value": 4.2, "unit": "EUR_billion", "metric_year": 2024,
    "source": {
      "type": "pdf",
      "name": "GlobalBatteryOutlook_2025.pdf",
      "location": "p.31, Table 4",
      "url": null,
      "excerpt": "The European recycling segment reached EUR 4.2 billion in 2024...",
      "published": "2025-03-10",
      "data_collected": "2024-Q1 to 2024-Q4",
      "method": "survey of 212 operators"
    },
    "relevance_score": 0.91,
    "confidence": "high",
    "conflicts_with": ["finding_017"]
  }
}
```

The conflicting finding (finding_017: EUR 5.1B, source B, 2025-01, method: industry association estimate incl. collection services) is carried alongside instead of resolved silently.

### Worked example - conflict annotation in the synthesis

```markdown
### Market size (contested)
| Source | Value | Year | Method |
|---|---|---|---|
| GlobalBatteryOutlook (2025-03) | EUR 4.2B | 2024 | operator survey |
| EU Recyclers Assoc. (2025-01) | EUR 5.1B | 2024 | association estimate, includes collection |

The gap likely reflects scope (collection services). Both figures are reported; not reconciled.
```

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Carry claim-to-source mapping through every hop | Summarize claims and drop URLs | Attribution is unrecoverable later |
| Annotate conflicts with both sources | Pick the higher / more recent / "more credible" value silently | False certainty |
| Store publication/collection dates | Compare numbers without years | Time change looks like contradiction |
| Separate established vs contested sections | One flat list of findings | Reader cannot gauge strength |
| Tables for financials, prose for news, lists for technical | Uniform bullets everywhere | Format should serve content |
| Let coordinator reconcile, then synthesize | Have synthesis agent decide alone | Coordinator has context on sources |

### Exam traps

- "Average the two values" - fabricates a number nobody reported.
- "Discard the lower-credibility source" - the guide says both credible sources are annotated.
- "Add a final citation-check step to fix attribution" - can't recover mappings that were dropped upstream; fix at source with structured output.
- "Convert everything to a single narrative for readability" - violates content-type rendering.

### Quick check

- Two credible sources give different growth rates. -> Annotate both with attribution; do not choose.
- A 2022 vs 2025 figure differ. -> Check dates; likely temporal difference, not a conflict.
- What must the synthesis agent do with claim-source pairs? -> Preserve and merge them.

---

## Domain 5 self-test (8 mini-scenarios)

1. A 30-turn support chat: the agent tells the customer their refund is "about $200" when it was $249.99, and forgets the promised 5-day timeline. What do you change? 
2. A synthesis agent given 10 subagent reports omits the findings of the 5th, 6th, and 7th. Cheapest effective fix?
3. A customer writes "This is awful. Just get me a manager." The agent starts by looking up the order. What is wrong and what is the correct behavior?
4. `get_customer("Maria Lopez")` returns 3 records. The agent selects the one with the most recent activity. Assess.
5. A subagent's web search times out; it returns `{"results": []}` and the final report says "no APAC competitors identified." Diagnose and fix.
6. A long exploration session: the agent now says "the app probably uses a typical MVC pattern" for a codebase where it earlier found `RefundService` and `PolicyEngine`. The process may also crash overnight. Design the response.
7. An extraction pipeline reports 97% accuracy and the team proposes removing human review for anything above 0.9 confidence. What do you check first and what do you keep?
8. Two subagents report 2019 and 2024 unemployment figures for the same region; the synthesis flags them as "contradictory sources" and picks the 2024 one without saying why. What is missing?

### Answers

1. Extract amounts/dates/expectations into a case facts block sent every turn outside the summary (5.1). Not a bigger window.
2. Lost in the middle. Put a key findings summary at the top, add section headers, have subagents return structured facts/relevance rather than long prose (5.1).
3. Explicit human request must be honored immediately, no investigation first; escalate with a case summary (5.2).
4. Wrong. Multiple matches require asking for an additional identifier; never heuristic selection (5.2).
5. Silent suppression of an access failure as a valid empty result. Return structured error (type timeout, attempted query, partials, alternatives) after local retries; report APAC as a coverage gap (5.3).
6. Scratchpad file of findings, subagents for narrow questions, phase summary injected into next-phase agents, /compact when verbose, manifest of agent state exports loaded on resume (5.4).
7. Segment accuracy by document type and field; calibrate per-field thresholds on a labeled set; keep stratified random sampling of high-confidence output; route ambiguous/contradictory docs to reviewers (5.5).
8. Publication/collection dates in structured output so the temporal difference is read as a trend, and, where a real conflict exists, annotate both sources rather than silently choose (5.6).

## Chapter recap

- I can build a structured error (type, attempted, partials, alternatives, retryable) and separate access failure from valid empty.
- I can name and reject both anti-patterns: silent suppression and whole-workflow termination.
- I can produce coverage annotations in a final synthesis.
- I can explain why aggregate accuracy misleads and set up stratified sampling and calibrated field thresholds.
- I can route ambiguous/contradictory or low-confidence items to human review under limited capacity.
- I can specify claim-source mappings with dates, and annotate conflicts rather than pick.
- I can choose tables, prose, or lists by content type.

## Mnemonics

- **TAPA** for errors: **T**ype, **A**ttempted, **P**artials, **A**lternatives.
- "Empty is an answer; timeout is a question."
- **97% is a mean, not a promise**: slice by type and field.
- **SCD** for provenance: **S**ource on every claim, **C**onflicts annotated, **D**ates always.
