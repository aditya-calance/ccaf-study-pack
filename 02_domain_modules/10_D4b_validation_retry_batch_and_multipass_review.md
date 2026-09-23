# 10. Validation and Retry Loops, Batch Processing, and Multi-Pass Review (Domain 4b)

> **Domain 4: Prompt Engineering & Structured Output (20% of exam)** | Task statements: 4.4, 4.5, 4.6 | Priority: **MUST** (batch vs synchronous and independent review are recurring trap topics) | Read time: ~22 min

## The 60-second version

- Retry with error feedback: send back the original document, the failed extraction, and the SPECIFIC validation errors. Retry fixes format/structure/semantic slips.
- Retry is futile when the information is simply absent from the source (for example it lives in an external document you did not provide). Return null / flag it instead of looping.
- Add `detected_pattern` to findings so dismissals can be analysed by code construct. Add `calculated_total` next to `stated_total`, and a `conflict_detected` boolean for inconsistent sources.
- Message Batches API: 50% cheaper, up to 24 hours, no latency SLA, no multi-turn tool calling inside a request, match results by `custom_id`.
- Batch = overnight/weekly/non-blocking. Synchronous = blocking (pre-merge checks). "Batch for a blocking flow" is always wrong.
- SLA math: worst-case wait = submission window W + 24h processing. To guarantee a 30h SLA, W <= 6h; the guide uses 4-hour windows (28h worst case, 2h spare).
- On batch failure resubmit ONLY the failed `custom_id`s, with a fix (e.g. chunk oversize docs). Refine the prompt on a small sample before running the full volume.
- Self-review is weak (the model keeps its own reasoning context). Use an independent instance, split big reviews into per-file passes plus an integration pass, and have the model output confidence with each finding for routing.

---

## Chapter 4.4 - Validation, retry and feedback loops for extraction quality

**Why the exam cares:** It tests whether you know what a retry can and cannot fix, and how to make extraction self-checking.

**Core concepts**

- Tool use removes syntax errors (Chapter 4.3). Remaining failures are semantic: values that do not sum, a value in the wrong field, an out-of-range date. Detect them with code (or a validator library), not by trusting the model.
- Retry-with-error-feedback: the follow-up request contains (1) the original document, (2) the failed extraction, (3) the specific validation errors ("line_items sum to 412.50 but stated_total is 421.50"). Giving the model the exact error lets it correct. Re-sending the same request unchanged just resamples.
- Retry works for: format mismatches, wrong field placement, arithmetic slips, structural errors. Retry does NOT work when the required data is absent from the provided document (for instance "see Appendix C" and Appendix C was not supplied). The model can only fabricate or repeat null. Detect this case (field is null and source has no such value, or the same error repeats) and route to a human or fetch the missing document, rather than looping.
- Bound the loop in code (attempt count is a safety valve here, and is not itself the design). The design point is the error-feedback content and the futility check.
- Self-correction fields in the schema:
  - `stated_total` (as printed) and `calculated_total` (model sums line items). A mismatch flags a discrepancy without pretending to know which is right.
  - `conflict_detected: boolean` (plus a short `conflict_detail`) when the source contradicts itself (two different due dates).
- Feedback loop for review tools: include `detected_pattern` (the code construct that triggered the finding, e.g. `"string-concat-in-sql"`, `"bare-except"`). When developers dismiss findings, group dismissals by `detected_pattern` to see which constructs generate false positives, then fix or disable those criteria (links to 4.1).

| Do | Don't | Why |
|---|---|---|
| Retry with document + failed output + specific errors | Retry with the identical prompt | Without the error the model has nothing to correct |
| Recognize absent-info as non-retryable; return null/flag | Loop until the field is non-null | Retry pressures fabrication |
| `calculated_total` vs `stated_total` check | Trust `stated_total` alone | Catches arithmetic and transcription conflicts |
| `conflict_detected` boolean | Let the model silently pick one value | Preserves the inconsistency for review |
| `detected_pattern` on every finding | Only free-text findings | Enables dismissal-pattern analysis |
| Validate in code | Ask the model "are you sure?" | Deterministic checks catch what self-checks miss |

**Worked example: Pydantic validation and retry loop**

```python
import anthropic
from pydantic import BaseModel, ValidationError, model_validator
from typing import Optional

client = anthropic.Anthropic()

class Invoice(BaseModel):
    vendor_name: str
    line_items: list[dict]
    stated_total: Optional[float]
    calculated_total: float
    conflict_detected: bool = False

    @model_validator(mode="after")
    def totals_match(self):
        real = round(sum(i["amount"] for i in self.line_items), 2)
        if abs(real - self.calculated_total) > 0.01:
            raise ValueError(f"calculated_total {self.calculated_total} != sum of line_items {real}")
        if self.stated_total is not None and abs(real - self.stated_total) > 0.01 \
                and not self.conflict_detected:
            raise ValueError(
                f"line_items sum {real} != stated_total {self.stated_total}; "
                "re-check the amounts, or set conflict_detected=true if the document itself disagrees")
        return self

def call_model(messages):
    r = client.messages.create(model="claude-sonnet-5", max_tokens=2048,
                               tools=[EXTRACT_TOOL],
                               tool_choice={"type": "tool", "name": "extract_invoice"},
                               messages=messages)
    return next(b.input for b in r.content if b.type == "tool_use")

def extract_with_retry(doc: str, max_attempts: int = 3):
    messages = [{"role": "user", "content": f"<document>\n{doc}\n</document>"}]
    last_err = None
    for attempt in range(max_attempts):
        raw = call_model(messages)
        try:
            return Invoice(**raw), attempt
        except (ValidationError, ValueError) as e:
            if e.__class__.__name__ == "ValidationError" and _only_missing_source_data(e, doc):
                return None, attempt          # futile to retry: info not in document
            last_err = str(e)
            messages = [{"role": "user", "content":
                f"<document>\n{doc}\n</document>\n"
                f"<previous_extraction>\n{raw}\n</previous_extraction>\n"
                f"<validation_errors>\n{last_err}\n</validation_errors>\n"
                "Correct the extraction. Fix only what the errors identify; "
                "use null for values the document does not contain."}]
    return None, max_attempts               # escalate to human review
```

`EXTRACT_TOOL` is the schema from Chapter 4.3; `_only_missing_source_data` is your own check (required data absent from `doc`). (Forced `tool_choice` here follows the guide; see the NOTE in Chapter 4.3 for newer models.)

**Exam traps**

- "Retry up to N times until the field is populated" for data that is not in the document. Futile, invites fabrication.
- "Retry with the same prompt and higher temperature" - no error feedback; sampling params are also removed on newer models.
- "Trust the schema, skip validation" - conflates syntax with semantic correctness.
- "Ask the model to double-check its own totals in one pass" - use `calculated_total` vs `stated_total` plus code validation.

**Quick check**
- Q: What goes in the retry request? -> Original document, failed extraction, specific validation errors.
- Q: Total is on page 9 which was never supplied. Retry? -> No; information absent, retry cannot help. Flag/null/fetch the page.
- Q: Purpose of `detected_pattern`? -> Analyse which constructs cause dismissed (false positive) findings.
- Q: Purpose of `conflict_detected`? -> Flags self-contradicting sources instead of a silent pick.

---

## Chapter 4.5 - Batch processing strategies

**Why the exam cares:** Cost/latency trade-off questions; the correct choice depends on whether the workflow is blocking.

**Core concepts**

- Message Batches API facts (exam-level): **50% cost savings**, processing window **up to 24 hours**, **no guaranteed latency SLA** (many batches finish sooner, but you cannot rely on it). The API brief lists other limits (about 100k requests / 256 MB per batch) marked lower confidence: verify before quoting.
- Suited to non-blocking, latency-tolerant work: overnight reports, weekly audits, nightly test generation. Unsuited to blocking work such as a pre-merge check where a developer is waiting.
- No multi-turn tool calling within a single request: each batch item is one request; you cannot execute a tool mid-request and feed back the result. Agentic loops belong in synchronous calls.
- `custom_id` correlates request and result. Results can return in any order, so match on `custom_id`, never on position. Result types: succeeded / errored / canceled / expired.
- Failure handling: collect the failed `custom_id`s and resubmit ONLY those, with a modification aimed at the cause (chunk a document that exceeded the context limit; trim; fix the malformed input). Do not rerun the whole batch.
- Refine on a sample first: run the prompt synchronously (or as a small batch) on a representative sample, fix the prompt, then submit the big batch. This raises first-pass success and avoids paying twice for iterative resubmissions.

| Do | Don't | Why |
|---|---|---|
| Sync API for pre-merge checks | Batch to save 50% on blocking checks | No latency guarantee; devs wait up to 24h |
| Batch for nightly test generation / weekly audits | Sync calls for everything | Forfeits the 50% discount |
| Use `custom_id` to map results | Assume result order matches request order | Order is not guaranteed |
| Resubmit only failed IDs, chunked if oversize | Resubmit the entire batch | Pays again for successes |
| Tune the prompt on a sample first | Launch 100k docs on an untested prompt | Failures multiply cost and delay |
| Keep tool loops synchronous | Expect tool round-trips inside a batch | Unsupported |

**SLA window math (derive it, do not memorize it)**

Model: you submit a batch every W hours. A document that becomes ready just AFTER a submission has to wait for the next one. Worst-case time from ready to result = wait for next submission (W) + batch processing limit (24h).

    worst_case = W + 24h  <=  SLA        ->   W <= SLA - 24h

Worked examples:

1. **Guide example, 30h SLA.** W <= 30 - 24 = 6h. The guide chooses 4-hour windows: worst case 4 + 24 = 28h, which is within 30h with 2h of slack for result retrieval and downstream handling. Six batches per day (24 / 4). Using 6h windows would also technically satisfy 30h (6 + 24 = 30) but with zero margin, so 4h is the safer answer.
2. **48h SLA.** W <= 48 - 24 = 24h. A daily batch works (worst case 24 + 24 = 48, no slack); 12h windows give 36h worst case, 12h slack.
3. **26h SLA.** W <= 26 - 24 = 2h. Requires a submission at least every 2 hours (12 per day); realistic only if volume justifies it.
4. **24h SLA.** W <= 0, impossible: even with instant submission the 24h processing limit alone consumes the whole SLA, and batches give no latency guarantee. Use the synchronous API (or sync for urgent items, batch for the rest).
5. **30h SLA with 1h of downstream post-processing.** W + 24 + 1 <= 30 gives W <= 5h; pick 4h.
6. **Resubmission eats the SLA.** If an item fails at hour 28 and is resubmitted, it may take up to another 24h, so it can miss a 30h SLA. This is why you refine the prompt on a sample first and handle known failure causes (oversize docs) up front.

Common mistakes: answering "24 / 30 = about 1 batch per day" (no such formula), or subtracting from 30 without adding the wait for the next window.

**Worked example: submit and resubmit failed IDs**

```python
requests = [{
    "custom_id": f"doc-{d.id}",
    "params": {"model": "claude-sonnet-5", "max_tokens": 2048,
               "tools": [EXTRACT_TOOL],
               "tool_choice": {"type": "tool", "name": "extract_invoice"},
               "messages": [{"role": "user", "content": d.text}]},
} for d in docs]
batch = client.messages.batches.create(requests=requests)

# later, when batch.processing_status == "ended":
failed = []
for res in client.messages.batches.results(batch.id):
    if res.result.type == "succeeded":
        store(res.custom_id, res.result.message)
    else:                                   # errored / expired / canceled
        failed.append(res.custom_id)

retry_docs = [chunk(d) for d in docs if f"doc-{d.id}" in failed]   # e.g. split oversize docs
# new batch containing ONLY retry_docs, with new custom_ids like "doc-17-part1"
```

**Exam traps**

- "Use batch for pre-merge review, it is 50% cheaper" - blocking workflow; wrong. (Listed in B as a recurring trap.)
- "Batch results are in request order" - use `custom_id`.
- "Run tool calls mid-batch" - unsupported.
- "Batch guarantees completion in 24h" - the guide says up to 24 hours and no guaranteed SLA; window math treats 24h as the planning ceiling.
- "Cost is out of scope so ignore" - the batch discount and window are in scope here; general pricing and caching internals stay out of scope (awareness only).

**Quick check**
- Q: Nightly test generation vs pre-merge check: which is batch? -> Nightly is batch; pre-merge is synchronous.
- Q: 30h SLA, 24h batch: max submission interval? -> 6h (30 - 24); the guide uses 4h.
- Q: 200 of 10,000 documents failed for exceeding context. Action? -> Resubmit only those custom_ids, chunked.

---

## Chapter 4.6 - Multi-instance and multi-pass review architectures

**Why the exam cares:** "Have Claude review its own code" is a favored distractor; the guide's answer is an independent instance plus decomposed passes.

**Core concepts**

- Self-review limits: in the same session the model retains the reasoning that produced the code, so it is biased toward defending its decisions. Adding "now critically review your work" or turning on extended thinking does not remove that bias.
- Independent review instance: a second Claude call with a fresh context that sees the code (and the requirements) but NOT the generator's reasoning. It is more effective at catching subtle issues.
- Multi-pass for large reviews (for example a 14-file PR):
  - Pass 1, per-file: local analysis of each file separately (logic, local bugs, style per criteria).
  - Pass 2, integration: cross-file data flow, interface mismatches, contract changes, using file summaries or the relevant diffs.
  Reason: reviewing 14 files in one prompt dilutes attention (deep on some files, shallow on others) and yields contradictory findings (one file flagged for a pattern accepted in another).
- Confidence alongside findings: a verification pass has the model report a confidence value with each finding, and downstream logic routes by it (high -> auto-post, medium -> reviewer queue, low -> human triage). Calibrate against labelled outcomes. Note the contrast with 4.1: confidence is a routing signal here, not a substitute for explicit criteria to raise precision.

| Do | Don't | Why |
|---|---|---|
| Separate instance reviews generated code | Same session "review your work" | Shared reasoning context biases the review |
| Per-file passes + integration pass | One giant 14-file prompt | Attention dilution, contradictory findings |
| Ask for confidence with each finding, route on it | Drop everything under a threshold as the precision fix | Confidence routes review effort; criteria control precision |
| Independent instance over extended thinking | Rely on thinking budget for self-critique | Thinking does not remove context bias |
| Give the reviewer the same explicit criteria (4.1) | Give it only "review this" | Vague review reproduces the false-positive problem |

**Worked example: pipeline sketch**

```python
def review_pr(files: list[File], requirements: str):
    findings = []
    for f in files:                                        # pass 1: local, independent calls
        findings += review_call(system=CRITERIA, content=f.diff, context=None)
    summaries = [summarize(f) for f in files]              # compact cross-file view
    findings += review_call(system=INTEGRATION_CRITERIA,   # pass 2: data flow, interfaces
                            content="\n".join(summaries) + requirements)
    verified = verify_call(findings)                       # fresh instance, sees code + findings only
    # each finding: {file, line, issue, severity, detected_pattern, confidence: 0-1}
    for f in verified:
        route(f, "auto_comment" if f.confidence >= 0.85 else
                 "human_queue" if f.confidence >= 0.5 else "log_only")
```

(Thresholds are illustrative: calibrate on your labelled data.)

**Exam traps**

- "Ask the generator to self-review with extended thinking" - distractor; independent instance wins.
- "Increase context window to fit all 14 files" - bigger context does not fix attention dilution; split passes.
- "Route by the model's sentiment/self-confidence alone with no calibration" - uncalibrated. Confidence needs calibration and is for routing.
- "Run per-file passes only" - misses cross-file issues; the integration pass is required.

**Quick check**
- Q: Why is self-review weak? -> The model keeps its generation reasoning and is less likely to question it.
- Q: 14-file PR gives shallow, inconsistent feedback. Fix? -> Per-file passes plus an integration pass.
- Q: How is confidence used? -> Reported with each finding, then calibrated and used to route review.

---

## Chapter recap

- [ ] I can build a retry request from document + failed extraction + specific errors.
- [ ] I can tell format/structure errors (retryable) from absent-source data (futile).
- [ ] I can add `detected_pattern`, `calculated_total` / `stated_total`, and `conflict_detected` to a schema.
- [ ] I can write a Pydantic validate-and-retry loop.
- [ ] I can state the Batches API facts: 50%, up to 24h, no SLA, no multi-turn tools, `custom_id`.
- [ ] I can choose batch vs synchronous by whether the workflow is blocking.
- [ ] I can derive submission windows: W <= SLA - 24h, and explain why 4h suits a 30h SLA.
- [ ] I can resubmit only failed `custom_id`s with a targeted fix and refine on a sample first.
- [ ] I can explain self-review limits and design an independent-instance, per-file + integration review.
- [ ] I can use confidence for calibrated routing without confusing it with a precision fix.

## Mnemonics

- **"Doc + Draft + Diagnosis"**: the retry message carries the document, the failed extraction, the errors.
- **"Absent means stop"**: retries fix mistakes, not missing data.
- **"50 / 24 / no promise"**: batch = 50% off, 24h max, no SLA.
- **"W + 24 <= SLA"**: wait for the next window, then process.
- **"Blocking -> sync; sleeping -> batch."**
- **"Fresh eyes, file by file, then the seams"**: independent instance, per-file, integration.
