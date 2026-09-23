# 4. Domain 1b - Enforcement, Hooks, Decomposition, and Sessions

> **Domain 1: Agentic Architecture & Orchestration (27%)**
> Task statements: 1.4 (enforcement and handoffs), 1.5 (hooks and normalization), 1.6 (task decomposition), 1.7 (session state, resume, fork). Plus: Anthropic's five workflow patterns with a "which pattern when" table.
> Priority: **MUST** | Read time: ~22 min | Companion: file 03 (1.1-1.3)

## The 60-second version

- If a rule MUST hold, enforce it in code (hooks, prerequisite gates). Prompts are probabilistic: the guide's example is the ~12% of cases where an agent skipped `get_customer` and refunded on the wrong identity even with clear instructions.
- Prerequisite gate: block `process_refund` until `get_customer` has returned a verified customer ID in this session.
- Escalation handoff: the human has no transcript. Compile customer ID, root cause, refund amount, recommended action into a structured summary.
- PostToolUse hook = transform tool RESULTS before the model sees them (Unix timestamps, ISO 8601, numeric status codes -> one format). PreToolUse hook = inspect/block outgoing tool CALLS (refund over $500 -> deny and redirect to human escalation).
- Prompt chaining = fixed sequential steps for predictable work (per-file review, then cross-file pass). Dynamic decomposition = plan adapts to discoveries, for open-ended tasks.
- Big review: per-file local passes plus a separate cross-file integration pass, to avoid attention dilution (the guide's example is a 14-file PR).
- `--resume <session-name>` continues a named session; `fork_session` branches from a shared baseline. If prior tool results are stale, start fresh with a structured summary, or tell the resumed session exactly which files changed.
- Five workflow patterns: chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer. Pick the simplest that fits.

---

## Chapter 1.4 - Implement multi-step workflows with enforcement and handoff patterns

**Why the exam cares:** "Most effective first step" questions where the wrong answers are stronger prompts, few-shot examples, or routing classifiers, and the right answer is a programmatic gate.

### Core concepts

**Programmatic enforcement vs prompt guidance.** A prompt saying "always verify the customer before refunding" reduces failures; it does not eliminate them. When the consequence is financial or identity-related, a non-zero failure rate is unacceptable. In the guide's support scenario the agent skipped `get_customer` in 12% of cases. The fix is a gate: the refund tool call is rejected by code unless a verified customer ID exists in session state.

**Prerequisite gate.** Application (or hook) code tracks state, e.g. `verified_customer_id`, set only when `get_customer` returns success. A downstream tool call that needs it is blocked with an explanatory message the model can act on ("Call get_customer first"), and the loop continues so the model self-corrects.

**Multi-concern requests.** A customer message with three issues (refund, address change, billing question): decompose into distinct items, investigate each in parallel with shared context (the verified customer record), then synthesize one unified resolution.

**Structured handoff.** When escalating mid-process, the human agent cannot see the transcript. The handoff must be self-contained:

| Field | Purpose |
|---|---|
| customer_id (verified) | Identify without re-asking |
| issue_summary | What the customer wants |
| root_cause | What the agent found |
| actions_taken | What is already done (avoid duplicates) |
| refund_amount | Numbers, currency |
| recommended_action | What the human should do next |
| escalation_reason | Policy limit, customer request, agent unable |

(Escalation trigger rules such as explicit customer request or policy gaps are Domain 5; sentiment score or self-reported confidence are NOT reliable triggers.)

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Block `process_refund` in code until `get_customer` verified an ID | Add "ALWAYS call get_customer first" to the system prompt and stop there | Prompt has non-zero failure rate (12% in the guide) |
| Return a clear denial message so the agent recovers | Silently drop the call | Model needs feedback to fix its path |
| Send a structured handoff with root cause + recommendation | Dump the raw transcript or send "customer is upset" | Humans lack transcript; unstructured is unusable |
| Use prompts for preferences and style | Use hooks for style | Hooks are for MUST rules; prompts for SHOULD |
| Investigate multi-concern items in parallel with shared context | Handle serially, or ignore concerns 2 and 3 | Latency and completeness |

### Worked example: gate in the loop (Python)

```python
class SessionState:
    verified_customer_id: str | None = None

def gate(tool_name: str, tool_input: dict, state: SessionState):
    """Return None if allowed, else an error dict to feed back as a tool_result."""
    if tool_name in {"process_refund", "lookup_order"} and not state.verified_customer_id:
        return {"errorCategory": "business", "isRetryable": False,
                "message": "Blocked: customer not verified. Call get_customer first."}
    return None

def after_tool(tool_name: str, result: dict, state: SessionState):
    if tool_name == "get_customer" and result.get("customer_id"):
        state.verified_customer_id = result["customer_id"]
```

In the loop from file 03, call `gate(...)` before `run_tool(...)`; if it returns an error dict, append it as a `tool_result` with `is_error: true` and continue. Model-driven flow is preserved; only the forbidden transition is closed.

Structured handoff payload:

```json
{
  "customer_id": "C-1042",
  "issue_summary": "Refund request for damaged item on ORD-77812",
  "root_cause": "Carrier damage confirmed by delivery photo",
  "actions_taken": ["verified identity", "confirmed order delivered 2026-09-12"],
  "refund_amount": {"value": 640.00, "currency": "USD"},
  "recommended_action": "Approve refund; exceeds $500 automated limit",
  "escalation_reason": "policy_threshold"
}
```

### Exam traps

- "Strengthen the system prompt / add few-shot examples showing verification first." Improves odds, does not guarantee. Wrong when the question asks for a guarantee.
- "Add a routing classifier to detect risky refunds." Over-engineered and still probabilistic.
- "Escalate when sentiment is negative / when the model's confidence is low." Unreliable triggers.
- "Pass the entire transcript to the human agent." Humans lack transcript access; use structured summary.

### Quick check

- Q: Agent skips identity verification 12% of the time. Most effective first step? -> Programmatic prerequisite gate blocking the refund tool.
- Q: What must a handoff include? -> Customer ID, root cause, refund amount, recommended action (plus actions taken).
- Q: Prompts vs code: which for a SHOULD rule? -> Prompts; MUST rules go in code.

---

## Chapter 1.5 - Apply Agent SDK hooks for tool call interception and data normalization

**Why the exam cares:** The two canonical hook examples (normalize timestamps/status codes in PostToolUse; block refunds over $500 in a pre-call hook) appear repeatedly.

### Core concepts

**Two directions.**

| Hook | Runs | Typical use |
|---|---|---|
| `PreToolUse` (outgoing call) | Before the tool executes; can allow, deny, or modify | Block policy violations, redirect to escalation |
| `PostToolUse` (incoming result) | After the tool returns, before the model processes it | Normalize formats, trim noise, redact |

Other SDK hook events include `UserPromptSubmit`, `Stop`, `SubagentStop`, `PreCompact`, `SessionStart/End`, `Notification` [Verify the exact list for your SDK version; the guide's named patterns are PostToolUse and outgoing-call interception].

**Normalization.** Different MCP tools return dates as Unix epoch (`1726704000`), ISO 8601 (`2026-09-19T00:00:00Z`), or a human string; statuses as `0/1/2` or `"SHIPPED"`. A PostToolUse hook maps everything to one canonical form before Claude reasons over it, so the model does not have to guess or mis-compare. This is deterministic and cheap; prompting Claude to "convert timestamps yourself" is not.

**Blocking with redirection.** A PreToolUse hook on `process_refund` inspects `amount`; if greater than $500, it denies the call and returns a reason that steers the agent toward `escalate_to_human`. The agent continues the loop with that feedback.

**Hooks vs prompts.** Hooks give deterministic guarantees; prompts give probabilistic compliance. Use hooks when business rules require guaranteed compliance. Use prompts for judgment, tone, and preferences.

**Claude Code flavor (related, out of the SDK specifics).** In Claude Code, hooks are configured in `settings.json` with a `matcher`, command handlers receive JSON on stdin (`tool_name`, `tool_input`), exit code 2 blocks and feeds stderr back to Claude, and JSON output can carry `hookSpecificOutput` with `permissionDecision: "deny"` and a reason. CLAUDE.md is context, not enforcement; guaranteed blocking uses hooks or `permissions.deny`.

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| PostToolUse hook normalizes epoch/ISO/status codes | Ask Claude in the prompt to normalize each tool's format | Prompted normalization is inconsistent; hook is deterministic |
| PreToolUse hook denies refunds > $500 and points to escalation | "Never refund over $500" in the system prompt only | Prompt can be ignored |
| Return a reason string with the denial | Return a bare failure | Agent needs to know what to do next |
| Keep hooks narrow (match by tool name) | One giant hook doing business logic for everything | Maintainability |
| Reserve hooks for MUST rules | Encode fuzzy judgment ("is customer angry?") in hooks | Hooks are deterministic rules, not judgment |

### Worked example: both hooks (Python, SDK-style sketch)

Hook signatures and registration differ by SDK version [Verify]; the logic is what the exam tests.

```python
from datetime import datetime, timezone

STATUS_MAP = {0: "pending", 1: "shipped", 2: "delivered", 3: "cancelled"}

def normalize(obj):
    """PostToolUse: recursively normalize timestamps and status codes."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k.endswith("_at") and isinstance(v, (int, float)):
                out[k] = datetime.fromtimestamp(v, tz=timezone.utc).isoformat()
            elif k == "status" and isinstance(v, int):
                out[k] = STATUS_MAP.get(v, f"unknown({v})")
            else:
                out[k] = normalize(v)
        return out
    if isinstance(obj, list):
        return [normalize(x) for x in obj]
    return obj

async def post_tool_use(input_data, tool_use_id, context):
    result = input_data["tool_response"]
    return {"modified_result": normalize(result)}     # shape is illustrative


REFUND_LIMIT = 500.00

async def pre_tool_use(input_data, tool_use_id, context):
    if input_data["tool_name"] == "process_refund":
        amount = input_data["tool_input"].get("amount", 0)
        if amount > REFUND_LIMIT:
            return {
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    f"Refund ${amount:.2f} exceeds the ${REFUND_LIMIT:.0f} automated "
                    "limit. Use escalate_to_human with a structured handoff."
                ),
            }
    return {}     # allow
```

Registration is via the options object (a `hooks` mapping from event name to matcher + callbacks) [Verify exact syntax]. Combine with the 1.4 gate: PreToolUse can also check `verified_customer_id`.

### Exam traps

- "Add the $500 limit prominently at the top of the system prompt." Not a guarantee.
- "Use few-shot examples of refusing large refunds." Same problem.
- "Add a PostToolUse hook to block the refund." Wrong direction: blocking outgoing calls is PreToolUse-style interception; PostToolUse is for results.
- "Have the model convert Unix timestamps in its reasoning." Probabilistic; use a hook.
- "Use a bigger model for more reliable compliance." Not a guarantee.

### Quick check

- Q: Where do you convert epoch timestamps to ISO before the model sees them? -> PostToolUse hook.
- Q: Where do you stop a $600 refund and redirect to a human? -> Pre-call (PreToolUse) interception hook that denies with a reason.
- Q: Hooks or prompts for a rule with legal consequences? -> Hooks.

---

## Chapter 1.6 - Design task decomposition strategies for complex workflows

**Why the exam cares:** Choosing between fixed pipelines and adaptive plans, and fixing shallow, inconsistent large reviews.

### Core concepts

**Prompt chaining (fixed sequential pipeline).** Steps known in advance, each output feeds the next. Best for predictable, multi-aspect work such as code review or document processing: step 1 analyze each file, step 2 cross-file integration, step 3 summarize.

**Dynamic (adaptive) decomposition.** The plan is generated and revised from intermediate findings. Best for open-ended investigation: "add comprehensive tests to a legacy codebase" -> first map structure, identify high-impact areas (heavily used, high-risk, untested), create a prioritized plan, and adapt as dependencies are discovered (e.g. module A needs a fixture that module B reveals).

**Attention dilution.** Reviewing a 14-file PR in a single pass produces uneven depth: detailed on some files, superficial on others, contradictory comments (flagging a pattern in one file, approving the same pattern elsewhere). Fix: per-file local analysis passes (each file gets focused attention), then a separate cross-file integration pass for data flow, interface mismatches, and consistency. Bigger context windows do not fix this; structure does.

**Selection rule.** Predictable multi-aspect review -> chaining. Unknown terrain -> dynamic. This is the same axis as fixed tree vs model-driven in 1.1.

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Per-file passes then one cross-file pass on the 14-file PR | One giant prompt with all 14 files | Attention dilution, inconsistent depth |
| Map structure -> prioritize -> plan -> adapt for legacy test task | Hard-code "write tests for files A..Z in order" | Dependencies are unknown up front |
| Use a fixed pipeline for a known checklist review | Invent a dynamic planner for a fixed process | Over-engineering |
| Run per-file passes in parallel (independent) | Serialize independent file reviews | Latency |
| Pass per-file findings (structured) into the integration pass | Re-read everything raw in the integration pass | Focus and cost |

### Worked example: chain with per-file and cross-file passes

```python
files = changed_files(pr)                       # e.g. 14 files

# Pass 1: independent, parallelizable, focused
local_findings = [
    review_file(f, prompt="Review ONLY this file for bugs, security, and style. "
                          "Return JSON [{line, severity, issue}].")
    for f in files
]

# Pass 2: integration over the findings + diffs of interfaces
cross = review_cross_file(
    findings=local_findings,
    prompt="Given per-file findings and the changed interfaces, find cross-file "
           "issues: data-flow mismatches, broken contracts, inconsistent handling. "
           "Do not repeat per-file findings.",
)
report = summarize(local_findings, cross)
```

Adaptive plan sketch (legacy tests):

```
1. Map: list modules, entry points, dependency graph (Glob/Grep/Read)
2. Rank: by usage, risk, current coverage
3. Plan: ordered task list  ->  execute task 1
4. After each task: update plan (new dependency? untested helper? reorder)
```

### Exam traps

- "Use a model with a larger context window for the 14-file review." Does not fix attention dilution.
- "Run the review three times and keep only issues found in 2 of 3 runs." Suppresses real but hard-to-find issues; it is not a structural fix.
- "Dynamic planning for every task." Over-engineered when the steps are known.
- "Fixed pipeline for open-ended legacy-code exploration." Cannot adapt to discoveries.

### Quick check

- Q: 14-file PR gets inconsistent, shallow feedback. Fix? -> Per-file passes plus a separate cross-file integration pass.
- Q: Which decomposition for "add tests to a legacy codebase"? -> Dynamic: map, prioritize, adapt.
- Q: Predictable multi-aspect review? -> Prompt chaining.

---

## Chapter 1.7 - Manage session state, resumption, and forking

**Why the exam cares:** Choosing between resume, fork, and fresh-with-summary is a recurring scenario question.

### Core concepts

**Named resumption.** `--resume <session-name>` continues a specific prior conversation (in the CLI; the SDK exposes a `resume` option taking a session ID). Use it to continue a named investigation across work sessions. (Claude Code notes also describe `--continue` for the most recent session.)

**fork_session.** Creates an independent branch from a shared baseline (the analysis already done). Use it to compare two divergent approaches (e.g. two testing strategies or two refactor designs) without either polluting the other or repeating the shared exploration. The original session is unchanged.

**Staleness.** A resumed session still contains old tool results (file contents read before someone edited them). The model may trust them. Two remedies:
1. Resume AND tell it precisely what changed ("auth.py and session.py were modified since your analysis; re-read those two"), enabling targeted re-analysis instead of full re-exploration.
2. Start a NEW session and inject a structured summary of validated findings. More reliable when many results are stale.

**Decision rule.**

| Situation | Choose |
|---|---|
| Prior context mostly valid, few or no changes | Resume |
| Prior context valid but a few files changed | Resume + inform of specific changes |
| Most tool results stale, or long noisy history | New session + structured summary |
| Want to try two approaches from same analysis | fork_session |
| Independent task, no shared baseline | New session |

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Name sessions and resume by name | Rely on memory of which run it was | Continuity |
| Tell a resumed session which files changed | Silently resume after code edits | Stale tool results mislead |
| Fork to compare approaches from a shared baseline | Run approach B after A in the same session | A's decisions contaminate B |
| Start fresh with a summary when results are stale | Resume a huge stale session hoping the model notices | Stale results are trusted |
| Keep the injected summary structured (findings, decisions, open questions) | Paste the whole old transcript | Defeats the purpose |

### Worked example

```bash
# Day 1
claude --resume legacy-tests            # continue named investigation (if it exists)

# SDK: fork from a shared analysis baseline
#   options = ClaudeAgentOptions(resume=session_id, fork_session=True)
#   -> branch A: "characterization tests first"
#   -> branch B: "unit tests per module"

# Day 2, code changed overnight -> resume with targeted update
claude --resume legacy-tests
> Since your last analysis, src/billing/invoice.py and src/billing/tax.py changed
> (see git diff HEAD~3). Re-read only those, then update the test plan.
```

Fresh-start summary:

```
Context (validated 2026-09-21):
- Modules mapped: billing (high risk, 0% covered), auth (medium, 40%)
- Decisions: characterization tests first; fixtures in tests/fixtures/
- Open: tax rounding behavior unclear
Task: continue with billing/invoice.py tests.
```

[Verify] CLI flag spelling for forking (`--fork-session` vs SDK `fork_session`) in the version you use; the guide names `fork_session` and `--resume <session-name>`.

### Exam traps

- "Always resume; the context is preserved so it is always better." Ignores stale tool results.
- "After edits, resume and let the model figure out what changed." Model may trust stale reads; tell it.
- "Fork isn't needed; just ask for both approaches sequentially." Cross-contamination.
- "Start new session and paste the full previous transcript." Not a summary; carries staleness.

### Quick check

- Q: Two refactor strategies from one analysis? -> fork_session.
- Q: Files changed since last session? -> Resume and name the changes, or start fresh with a summary if broadly stale.
- Q: Why is fresh + summary sometimes more reliable than resume? -> Stale tool results can be trusted by the model.

---

## Anthropic's workflow patterns

These five patterns (from Anthropic's "Building effective agents" guidance) underpin the decomposition questions. A **workflow** has predefined code paths; an **agent** decides its own path. Prefer the simplest pattern that works.

| Pattern | Shape | Example |
|---|---|---|
| Prompt chaining | A -> B -> C, each step consumes the last; optional gates between steps | Per-file review then cross-file pass; draft -> translate |
| Routing | Classify input, send to a specialized handler | Refund vs technical vs billing; easy questions to a small model |
| Parallelization | Sectioning (independent subtasks run at once) or voting (same task multiple times) | Per-file reviews concurrently; multiple votes on a risky classification |
| Orchestrator-workers | Central LLM dynamically decides subtasks, delegates, synthesizes | Coordinator with search/analysis subagents (file 03); multi-file code changes |
| Evaluator-optimizer | One LLM produces, another critiques, loop until good | Iterative refinement with clear criteria; translation polishing |

### Which pattern when

| Situation | Pattern | Why |
|---|---|---|
| Steps are fixed and known; each depends on the previous | Prompt chaining | Predictable, easy to debug |
| Inputs fall into distinct categories needing different handling | Routing | Specialization without one bloated prompt |
| Subtasks are independent and speed matters | Parallelization (sectioning) | Concurrent execution |
| Need higher confidence on one judgment | Parallelization (voting) | Multiple attempts, aggregate |
| Subtasks cannot be predicted up front (open-ended research, unknown files to change) | Orchestrator-workers | Dynamic decomposition |
| Clear quality criteria and iterative improvement helps | Evaluator-optimizer | Feedback loop |
| Must-hold business rule inside any of the above | Add a hook/gate | Deterministic enforcement |

Mapping to the guide: 1.2/1.3 coordinator with subagents = orchestrator-workers; 1.2 refinement loop = evaluator-optimizer style; 1.6 review = chaining with parallel sectioning; 1.4 gate = deterministic layer around any pattern.

Trap: reaching for a multi-agent orchestrator when a two-step chain works. Proportionality counts.

---

## Chapter recap

- [ ] I can justify a prerequisite gate over prompt-only enforcement, citing the 12% skipped `get_customer`.
- [ ] I can list the fields of a structured escalation handoff and why the human needs them.
- [ ] I can place PostToolUse (normalize results) and pre-call interception (block > $500, redirect to escalation) correctly.
- [ ] I can choose hooks for MUST rules and prompts for SHOULD rules.
- [ ] I can split a 14-file review into per-file plus cross-file passes and explain attention dilution.
- [ ] I can choose chaining vs dynamic decomposition and describe an adaptive plan for a legacy codebase.
- [ ] I can choose between resume, resume + change notice, fork_session, and fresh + summary.
- [ ] I can name the five workflow patterns and pick one from a scenario.

## Mnemonics

- **"MUST = code, SHOULD = prompt."**
- **"Pre = Prevent calls, Post = Polish results."** (PreToolUse blocks; PostToolUse normalizes.)
- **"Gate before the money."** Verify identity before refund tools.
- **"Local then global."** Per-file passes, then cross-file pass.
- **"Chain the known, adapt the unknown."**
- **"Resume if fresh, fork to compare, summarize if stale."**
- **Workflow patterns: C-R-P-O-E** (Chaining, Routing, Parallelization, Orchestrator-workers, Evaluator-optimizer).
