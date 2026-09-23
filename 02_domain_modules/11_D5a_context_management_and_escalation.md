# 11. Domain 5a - Context Management and Escalation

> **Domain 5: Context Management & Reliability (15%)** | Task statements: 5.1, 5.2, 5.4 (5.3, 5.5, 5.6 are in chapter 12) | Priority: **MUST** (candidates most often report Domain 5 as their weakest; "knowing lost-in-the-middle vs designing around it") | Read time: ~18 min

## The 60-second version

- Progressive summarization destroys exactly what matters: amounts, percentages, dates, order numbers, and what the customer said they expect. Fix: a persistent **case facts block** re-sent every turn, outside summarized history.
- "Lost in the middle": models handle the start and end of long inputs reliably and drop findings buried in the middle. Fix: key findings summary FIRST, explicit section headers, instructions/ask LAST.
- Tool results accumulate. A 40-field order lookup where 5 fields matter wastes tokens on every later turn. Trim to relevant fields in the tool layer (a hook or wrapper) before the result enters context.
- The API is stateless: send the full conversation history each request or coherence is lost.
- Upstream agents feeding budget-limited downstream agents return structured data (key facts, citations, relevance scores), not prose and reasoning chains.
- Escalate on: explicit human request (immediately, no investigation first), policy gap/exception, no meaningful progress. Never on sentiment or self-reported confidence.
- Multiple customer matches: ask for another identifier. Never pick by heuristic (most recent, closest name).
- Long codebase exploration degrades ("typical patterns" instead of the actual class names). Counter with scratchpad files, subagent delegation, phase summaries, manifests for crash recovery, and /compact.

---

## Chapter 5.1 - Manage conversation context to preserve critical information

**Why the exam cares:** Domain 5 stems describe a long support session or a multi-agent aggregation where a specific number, date, or finding goes missing. You must name the mechanism (summarization loss, position effect, tool-output bloat) and pick the structural fix.

### Core concepts

**1. Progressive summarization risk.** Each summarization pass rewrites the previous summary. Specifics decay first: "$249.99 refund requested for order #88412 on March 3, customer expects it within 5 business days" becomes "customer wants a refund for a recent order." Numbers, percentages, dates, and customer-stated expectations are the highest-loss categories, and they are the ones you are later graded or sued on. A summary is prose and prose is lossy by design; transactional facts must not live only there.

**2. The "case facts" block.** Extract transactional facts (amounts, dates, order numbers, statuses) into a small structured block that is included in every prompt, outside the summarized history. Summarize the conversation around it, never through it. For multi-issue sessions, keep a separate structured layer per issue (order ID, amount, status), so issue B's details cannot overwrite issue A's.

**3. Lost in the middle.** Models reliably use information at the beginning and end of long inputs and may omit findings from the middle. This is a property to design around, not a bug to prompt away. Mitigations from the guide:
- Put a **key findings summary at the beginning** of aggregated inputs.
- Organize detailed results with **explicit section headers**.
- Put the task/question at the end (recency) and durable facts at the start (primacy).
- Keep the middle short: trimming and structured returns shrink the middle so less can get lost.

**4. Tool output accumulation.** Every tool result stays in history and is re-sent every turn. An order lookup returning 40+ fields when the return decision needs 5 (order_id, status, items, total, delivery_date) costs tokens on every subsequent request and dilutes attention. Trim before it accumulates: a PostToolUse-style hook or a wrapper inside your tool returns only relevant fields. Trim by relevance, not by truncating characters (a cut-off JSON blob can drop the one field you need).

**5. Full history each request.** The Messages API is stateless. To keep coherence you pass the complete conversation (user, assistant with tool_use, and tool_result turns) in each request. Passing only the latest message, or dropping tool_use/tool_result pairs, breaks continuity. This is not in tension with trimming: you trim the CONTENT of individual tool results, you do not delete turns.

**6. Upstream agents return structured data.** When a downstream agent (e.g. synthesis) has a limited context budget, modify upstream agents to return key facts, citations, and relevance scores rather than verbose content and reasoning chains. Also require metadata (dates, source locations, methodology) so synthesis can interpret correctly (see 5.6).

### Worked example - case facts block prompt layout

Position matters. Durable, high-value material at the top; bulky history in the middle; the current ask at the bottom.

```text
[SYSTEM PROMPT - stable, first]
Role, escalation rules, few-shot examples (see 5.2).

[CASE FACTS - rebuilt from structured store EVERY turn, never summarized]
<case_facts>
  customer_id: C-20931 (verified)
  issues:
   - issue_id: 1
     order_id: 88412
     amount_usd: 249.99
     order_date: 2026-03-03
     status: delivered_damaged
     customer_expectation: "refund to original card within 5 business days"
   - issue_id: 2
     order_id: 88977
     amount_usd: 34.00
     status: in_transit, ETA 2026-03-14
  actions_taken: [get_customer ok, lookup_order 88412 ok]
  open_questions: [refund policy limit for damaged goods > 30 days?]
</case_facts>

[SUMMARY OF EARLIER CONVERSATION - lossy, allowed to be vague]
Customer was frustrated about delayed shipping, asked about warranty...

[RECENT TURNS - verbatim, last N messages incl. tool_use/tool_result pairs]
...

[CURRENT USER MESSAGE - last, highest recency]
```

The facts block is populated by extraction code (or a structured-output extraction step) after each tool result, then serialized into the prompt. The summary can shrink freely because nothing critical lives only there.

### Worked example - tool output trimming (40 fields to 5)

```python
KEEP = ["order_id", "status", "items", "total_usd", "delivered_at"]

def lookup_order_trimmed(order_id: str) -> dict:
    raw = orders_api.get(order_id)          # ~40 fields: warehouse codes,
                                            # audit trail, carrier internals...
    slim = {k: raw[k] for k in KEEP if k in raw}
    slim["items"] = [{"sku": i["sku"], "name": i["name"], "price": i["price"]}
                     for i in raw["items"]]
    return slim                             # this is what enters context
```

### Token-budget illustration

Assume a 25-turn support session with 6 order lookups. Illustrative numbers, not measurements.

| Component | Untrimmed | Managed |
|---|---|---|
| System prompt + few-shots | 2,000 | 2,000 |
| Order lookups: 6 x 40 fields | 6 x 1,500 = 9,000 | 6 x 250 = 1,500 |
| Older conversation (turns 1-15) | 12,000 verbatim | 1,200 summary |
| Case facts block | 0 (facts scattered) | 400 |
| Recent turns (10-25), verbatim | 6,000 | 6,000 |
| **Total per request** | **~29,000** | **~11,100** |

Because tool results are re-sent every turn, the 7,500-token saving on lookups repeats on every remaining request. The managed version is also better on quality: the critical facts sit in a 400-token block at a privileged position instead of somewhere in a 29,000-token middle.

### Worked example - aggregated research input layout

```text
## KEY FINDINGS (read first)
1. Market grew 12% in 2025 (source A, 2026-01). 2. Two sources disagree on share (see Conflicts).
3. No data found for APAC (search timed out, see Coverage gaps).

## Section A - Financial data   (structured, with source + date)
## Section B - Regulatory news
## Section C - Technical findings
## Conflicts and gaps

## TASK (last): Write a 1-page brief using only the material above.
```

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Persist amounts/dates/IDs in a case facts block sent each turn | Rely on a rolling prose summary to carry them | Summaries round numbers into vagueness |
| Key findings first, headers, task last | Dump 12 result blobs and ask at the top | Middle content gets omitted |
| Trim tool output to relevant fields in code | Ask the model to "ignore irrelevant fields" | Tokens are still paid every turn |
| Send full message history each request | Send only the latest user message | API is stateless |
| Upstream agents return facts + citations + relevance | Return full reasoning chains to synthesis | Downstream budget is limited |
| Buy fewer tokens via structure | Move to a bigger context window / bigger model | Window size does not fix position effects or waste |

### Exam traps

- "Use a larger context window" - does not fix lost-in-the-middle; the effect persists in long inputs.
- "Add to the prompt: pay attention to the middle" - a prompt plea is not a structural fix.
- "Summarize the whole conversation each turn to save tokens" - this is the cause of the problem, unless facts are held outside.
- "Truncate tool output to first 500 characters" - loses fields unpredictably; select fields instead.
- "Summarize by dropping old tool_use/tool_result turns" - breaks history coherence.

### Quick check

- Customer's refund amount drifts after 20 turns. Root cause and fix? -> Progressive summarization; persistent case facts block outside history.
- Synthesis omits the finding from source #4 of 9. Fix? -> Findings summary at the top, section headers, shorter structured inputs (position effect).
- Where does trimming a 40-field lookup happen? -> In the tool layer/hook before it enters context.

---

## Chapter 5.2 - Escalation and ambiguity resolution patterns

**Why the exam cares:** The customer support agent scenario is a recurring scenario. Distractors offer sentiment scores and confidence thresholds; the guide says both are unreliable.

### Core concepts

**Three legitimate triggers:**
1. **Customer explicitly asks for a human** - honor immediately, without first investigating or trying to talk them out of it.
2. **Policy exception or gap** - the policy is silent or ambiguous on this request (e.g. customer asks for competitor price matching while policy only covers own-site price adjustments). Complexity alone is not a trigger; a complex but in-policy case should be resolved.
3. **Unable to make meaningful progress** - tools failed, loops without advancing, missing capability.

**Explicit demand vs. mild frustration.** If the customer says "get me a human," escalate now. If the customer is merely frustrated but the issue is within capability, acknowledge the frustration and offer resolution; escalate only if the customer reiterates the preference for a human.

**Why sentiment and self-reported confidence fail.** An angry customer with a simple address change is easy; a calm customer asking for a policy exception is hard. Sentiment does not track complexity. A model's stated "confidence 8/10" is poorly calibrated and is not correlated reliably with correctness. Both are proxies; the exam wants the proxy replaced with explicit, checkable criteria.

**Multiple matches.** If `get_customer` returns 3 "John Smith" records, do not pick the most recent, the closest address, or the highest-spend account. Ask for an additional identifier (email, phone, last 4 of card, order number). A wrong pick means acting on the wrong account (refund to the wrong person).

**Few-shot escalation criteria.** Put explicit criteria plus examples in the system prompt showing escalate vs. resolve, including the boundary cases. Examples teach the boundary that rules alone leave fuzzy.

### Worked example - system prompt fragment

```text
ESCALATION RULES
Escalate to a human agent (call escalate_to_human) when:
 (a) the customer asks for a human, at any point -> escalate at once; do not investigate first;
 (b) the request is not covered by, or is ambiguous under, written policy;
 (c) you cannot make progress after tool failures or repeated attempts.
Do NOT escalate because the customer sounds angry, or because you feel unsure.
If frustrated but the issue is standard, apologize briefly and resolve it;
escalate only if they repeat the request for a human.
If a lookup returns multiple matching customers, ask for email or order number.
Never choose among matches yourself.

EXAMPLES
User: "This is ridiculous, I want to talk to a real person."
 -> Acknowledge, escalate immediately with case summary. (explicit request)
User: "Ugh, my package is late again!!" (order in transit, standard ETA lookup)
 -> Empathize, look up order, give ETA. Do not escalate. (frustration, in capability)
User: "Amazon has this cheaper, match it."  (policy covers own-site adjustments only)
 -> Escalate: policy silent on competitor matching.
User: "Refund order 88412." (get_customer returns 2 matches)
 -> Ask: "Can you confirm the email on the account?" Do not pick one.
```

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Escalate immediately on explicit request | Try "one quick lookup first" | Guide: honor without investigation |
| Escalate on policy silence | Improvise a competitor price match | Unauthorized commitment |
| Acknowledge frustration, resolve if in scope | Auto-escalate on negative sentiment | Sentiment is not complexity |
| Use explicit criteria + few-shot | Route on "confidence < 7" | Self-reported confidence is uncalibrated |
| Ask for identifiers on multiple matches | Pick the most recent/most likely | Heuristic selection risks wrong-account actions |
| Pass a structured handoff summary to the human | Dump the raw transcript | Human needs the case facts quickly |

Reminder of the philosophy: a hard requirement like "no refund over $500 without approval" is a hook (code), whereas judgment-based escalation is prompt plus few-shot.

### Exam traps

- "Route to human when sentiment score is below threshold" - sentiment proxy.
- "Have the model output a 1-10 confidence and escalate under 6" - self-report proxy.
- "Train a separate classifier on tickets to predict escalations" - over-engineered first step; and off-topic to a prompt/criteria gap.
- "On multiple matches choose the account with the most recent order" - heuristic.
- "If customer demands a human, first check whether you can resolve it" - violates immediate honoring.

### Quick check

- Calm customer asks for something policy does not mention. Escalate? -> Yes, policy gap.
- Angry customer, simple address change. -> Acknowledge, resolve; escalate only if they ask for a human again.
- Two matching customer records. -> Ask for an additional identifier.

---

## Chapter 5.4 - Context in large codebase exploration

**Why the exam cares:** Developer productivity and code-exploration scenarios. Stems describe a long session where the agent stops naming real classes and starts saying "typically, services follow a repository pattern."

### Core concepts

**Context degradation.** In extended sessions the model becomes inconsistent and refers to "typical patterns" instead of the specific classes it discovered earlier. Verbose discovery output (file listings, grep dumps, full file reads) crowds out and buries earlier findings.

**Countermeasures (know all five):**

| Technique | What it does |
|---|---|
| **Subagent delegation** | Spawn a subagent for a specific question ("find all test files", "trace refund flow dependencies"); verbose output stays in its context, the main agent receives a distilled result and keeps high-level coordination. |
| **Scratchpad files** | The agent writes key findings (class names, paths, decisions) to a file and re-reads it for later questions, so facts survive across context boundaries. |
| **Phase summaries** | Summarize findings of exploration phase 1, then inject that summary into the initial context of the phase-2 subagents. |
| **Crash-recovery manifests** | Each agent exports state to a known location; the coordinator loads a manifest on resume and injects state into agent prompts. |
| **/compact** | Reduce context usage when it fills with verbose discovery output; can be given a focus. |

Tool naming note: the exam guide calls the subagent-spawning tool "Task" (with `allowedTools` including "Task"); newer SDK docs call it the "Agent" tool. Same idea.

Verify: notes list /compact, /clear, /context as Claude Code commands; the guide only names /compact. Treat `/context` detail as lower confidence.

### Worked example - scratchpad and manifest

```markdown
<!-- .scratch/findings.md  (agent appends as it learns) -->
## Refund flow (phase 1)
- Entry: src/api/RefundController.java#createRefund
- Calls: RefundService.process -> PolicyEngine.evaluate -> LedgerClient.post
- Tests: test/refund/RefundServiceTest.java (12 cases), no test for LedgerClient retries
- Open: where is the $500 threshold enforced?
```

```json
// .scratch/manifest.json - written by each agent, loaded by coordinator on resume
{
  "run_id": "explore-2026-09-21-a",
  "phase": 2,
  "agents": [
    {"name": "trace-refund-flow", "status": "complete",
     "state_file": ".scratch/trace-refund-flow.json"},
    {"name": "find-tests", "status": "in_progress",
     "state_file": ".scratch/find-tests.json", "last_checkpoint": "scanned 140/312 files"},
    {"name": "map-ledger-deps", "status": "not_started"}
  ],
  "phase1_summary_file": ".scratch/findings.md"
}
```

On resume, the coordinator reads the manifest, skips complete agents, and injects each pending agent's state file and the phase summary into its prompt.

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Delegate narrow questions to subagents | Have main agent read every file itself | Verbose output pollutes the coordinator |
| Persist findings to a scratchpad and re-read | Trust memory of turn 3 at turn 80 | Degradation causes "typical pattern" answers |
| Inject phase-1 summary into phase-2 agents | Restart phase 2 blind, or give it the raw phase-1 transcript | Summary is compact, targeted |
| Export state to known paths + manifest | Keep state only in memory | A crash loses everything |
| /compact (with focus) when discovery output fills context | Continue until answers get inconsistent | Reactive too late |

### Exam traps

- "Switch to a model with a larger context window" - does not stop degradation.
- "Restart the session and re-explore from scratch" - throws away findings; scratchpad/summary is the fix.
- "Ask the model to be more specific" - a prompt does not restore lost context.
- "Store crash state in the conversation history" - lost when the process dies; must be external files.

### Quick check

- Agent says "typically there's a service layer" instead of naming `RefundService`. -> Context degradation; scratchpad + subagent delegation.
- How does a coordinator resume after a crash? -> Load the manifest of exported agent states, inject into prompts.
- What goes into phase-2 subagents' initial context? -> The phase-1 summary of key findings.

---

## Chapter recap

- I can explain why a rolling summary loses amounts, dates, and expectations, and design a case facts block sent every turn.
- I can lay out a prompt with primacy (facts/key findings first) and recency (task last), headers in the middle.
- I can trim tool output by field selection in code, and I know history is sent in full each request.
- I can specify structured upstream returns (facts, citations, relevance) for budget-limited downstream agents.
- I can list the three escalation triggers and why sentiment/confidence are unreliable.
- I handle multiple matches by asking for identifiers, and write few-shot escalation criteria.
- I can name the five long-exploration countermeasures and sketch a manifest.

## Mnemonics

- **FACTS-FIRST**: facts block on top, findings summary on top, ask on the bottom. "Ends are strong, middle is weak."
- **HPN** escalation: **H**uman asked, **P**olicy gap, **N**o progress. (Not sentiment, not confidence.)
- **SPSMC** for exploration: **S**ubagents, **P**ad (scratchpad), **S**ummaries between phases, **M**anifest, **C**ompact.
- 40 to 5: trim in the tool, not in the prompt.
