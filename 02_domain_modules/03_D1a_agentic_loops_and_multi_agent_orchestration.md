# 3. Domain 1a - Agentic Loops and Multi-Agent Orchestration

> **Domain 1: Agentic Architecture & Orchestration (27%, the heaviest domain)**
> Task statements: 1.1 (agentic loops), 1.2 (coordinator-subagent patterns), 1.3 (subagent invocation, context passing, spawning)
> Priority: **MUST** | Read time: ~20 min | Companion file: 04 (1.4-1.7: enforcement, hooks, decomposition, sessions)

## The 60-second version

- The loop is driven by `stop_reason`: `"tool_use"` = run the tools, append results, call again; `"end_turn"` = done. Nothing else decides termination.
- Tool results go back as a `user` message containing `tool_result` blocks, each carrying the matching `tool_use_id`. The full history is re-sent every call; that is how the model "remembers".
- Model-driven decisions (Claude picks the next tool from context) beat pre-configured decision trees for open-ended work. Use fixed sequences only when the order truly never varies.
- Anti-patterns: parsing the assistant's text for "I'm done", checking whether text exists as a completion signal, and arbitrary iteration caps as the PRIMARY stop mechanism (a cap is a safety net only).
- Multi-agent = hub-and-spoke. The coordinator owns decomposition, delegation, aggregation, error handling. Subagents never talk to each other directly.
- Subagents have isolated context. They see only their prompt (plus their own system prompt and tools). Anything they need (prior findings, URLs, page numbers) must be passed explicitly in the prompt.
- Parallel subagents = multiple `Task` tool calls in ONE coordinator response, not one per turn. The coordinator's `allowedTools` must include `"Task"`.
- Coordinator prompts state goals and quality criteria, not step-by-step procedures. Overly narrow decomposition (e.g. "renewable energy" split into only solar and wind) silently drops coverage; fix at the coordinator, and add a gap-check refinement loop.

---

## Chapter 1.1 - Design and implement agentic loops for autonomous task execution

**Why the exam cares:** Loop-termination questions are a staple. Three of the four wrong answers are always one of the named anti-patterns (text parsing, iteration cap, text-present check).

### Core concepts

**Lifecycle.** Send request (system prompt + tools + messages) -> inspect `response.stop_reason` -> if `"tool_use"`, execute every `tool_use` block in `response.content`, append the assistant turn AND a `user` turn with the `tool_result` blocks -> loop. If `"end_turn"`, extract the final text and stop.

**Why append the assistant turn too.** The API is stateless. The tool_result must follow the assistant message that contained the matching `tool_use` (same `tool_use_id`), or the request is rejected. The growing message list IS the agent's working memory.

**Model-driven vs pre-configured.** In a model-driven loop Claude looks at everything so far and chooses the next tool (or none). A decision tree or fixed tool sequence is deterministic but brittle: it cannot adapt to an unexpected intermediate result. The exam rewards model-driven for open-ended tasks and programmatic gates (file 04) only for rules that MUST hold.

**Other stop reasons** exist (`max_tokens`, `stop_sequence`, `pause_turn` for server tools, `refusal`) [Verify exact list in current API docs]. A robust loop treats `"tool_use"` as continue, `"end_turn"` as done, and handles anything else explicitly (e.g. `max_tokens` = truncated, retry or surface an error), rather than silently treating it as success.

**Tool errors are just results.** If a tool fails, return a `tool_result` with `is_error: true` and structured detail (Domain 2.2) so the model can recover; do not crash the loop.

**Iteration cap.** A `max_iterations` guard is reasonable as a runaway safeguard. It is wrong as the primary stopping mechanism, because it cuts off legitimate long tasks and lets short ones run to the cap.

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| `while response.stop_reason == "tool_use"` (or loop until `"end_turn"`) | Regex the text for "task complete" / "done" | Natural language is ambiguous; stop_reason is the API contract |
| Append assistant content, then a user message of `tool_result` blocks | Send only the new tool result without the assistant turn | Protocol requires matching `tool_use_id`; model needs the history |
| Run ALL tool_use blocks from one response, return all results together | Execute only the first tool_use block | Missing results break the next request |
| Cap iterations only as a safety net that raises/logs | Use "stop after N turns" as the completion logic | Arbitrary cap truncates real work |
| Let Claude choose tool order | Hard-code get_customer -> lookup_order -> refund in the loop | Brittle; gates belong in hooks for compliance-critical steps only |
| Treat any non-text `stop_reason` deliberately | Assume "has text content" means finished | A `tool_use` response often contains text ("Let me look that up") AND a tool call |

### Worked example: full agentic loop (Python, Anthropic SDK)

```python
import json
import anthropic

client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY
MODEL = "claude-sonnet-5"
MAX_ITERATIONS = 25                      # safety net ONLY, not the stop condition

TOOLS = [
    {
        "name": "get_customer",
        "description": "Look up a customer by email or customer ID. Returns verified "
                       "customer_id, name, and account status. Use before any order or "
                       "refund operation.",
        "input_schema": {
            "type": "object",
            "properties": {"identifier": {"type": "string",
                           "description": "Email address or customer ID (e.g. C-1042)"}},
            "required": ["identifier"],
        },
    },
    {
        "name": "lookup_order",
        "description": "Fetch an order by order ID (e.g. ORD-77812). Requires a verified "
                       "customer_id from get_customer.",
        "input_schema": {
            "type": "object",
            "properties": {"order_id": {"type": "string"},
                           "customer_id": {"type": "string"}},
            "required": ["order_id", "customer_id"],
        },
    },
]

def run_tool(name: str, args: dict) -> dict:
    """Dispatch to real implementations. Return (content, is_error)."""
    if name == "get_customer":
        return {"customer_id": "C-1042", "name": "A. Rivera", "status": "active"}
    if name == "lookup_order":
        return {"order_id": args["order_id"], "total": 129.00, "status": "delivered"}
    raise ValueError(f"unknown tool {name}")

def run_agent(user_message: str) -> str:
    messages = [{"role": "user", "content": user_message}]

    for _ in range(MAX_ITERATIONS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system="You are a support agent. Use tools to verify facts before answering.",
            tools=TOOLS,
            messages=messages,
        )

        # 1. Terminate ONLY on stop_reason, never on text inspection
        if response.stop_reason == "end_turn":
            return "".join(b.text for b in response.content if b.type == "text")

        if response.stop_reason != "tool_use":
            # max_tokens, refusal, etc. -> handle explicitly, do not pretend success
            raise RuntimeError(f"Unexpected stop_reason: {response.stop_reason}")

        # 2. Keep the assistant turn (text + tool_use blocks) in history
        messages.append({"role": "assistant", "content": response.content})

        # 3. Execute EVERY tool_use block; return all results in ONE user message
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                try:
                    result = run_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })
                except Exception as exc:          # errors are data, not crashes
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps({"errorCategory": "transient",
                                               "isRetryable": True,
                                               "message": str(exc)}),
                        "is_error": True,
                    })
        messages.append({"role": "user", "content": tool_results})

    raise RuntimeError("Iteration safety cap hit - investigate, do not treat as done")

print(run_agent("Where is order ORD-77812 for a.rivera@example.com?"))
```

Notes: the `for ... in range(MAX)` is a guard, and the real exit is the `end_turn` branch. If Claude emits two `tool_use` blocks in one response (parallel tool calls), both results return in the same user message.

### Exam traps

- "Check whether the response contains a text block; if so, finish." Wrong: `tool_use` turns often include text.
- "Stop when the assistant says 'I have completed the task'." Wrong: parsing natural language.
- "Set max_iterations = 10 and return whatever we have." Wrong as primary control; acceptable only as a backstop.
- "Pre-define the tool sequence so behavior is predictable." Wrong for open-ended tasks (model-driven is the point); right only when the order is truly invariant.
- "Send only the tool_result as the next message." Wrong: history must include the assistant tool_use turn.

### Quick check

- Q: Which value of `stop_reason` means "run tools and call again"? -> `"tool_use"`.
- Q: What is the correct role and block type for returning a tool's output? -> A `user` message with `tool_result` blocks keyed by `tool_use_id`.
- Q: When is an iteration cap appropriate? -> As a runaway safeguard alongside stop_reason logic, never as the primary stop.

---

## Chapter 1.2 - Orchestrate multi-agent systems with coordinator-subagent patterns

**Why the exam cares:** The reference scenario is a multi-agent research system. Questions test who talks to whom, what subagents can see, and why answers come back incomplete (usually a coordinator decomposition failure, not a subagent failure).

### Core concepts

**Hub-and-spoke.** One coordinator; N specialized subagents (e.g. web search, document analysis, synthesis, report generation). ALL communication flows through the coordinator. Benefits: observability (one place to log), consistent error handling, controlled information flow. There is no subagent-to-subagent channel. [Note: the experimental Agent Teams feature in Claude Code lets teammates message each other; this is outside the exam's hub-and-spoke model. Awareness only.]

**Coordinator responsibilities.**
1. Analyze the query and decide which subagents to invoke (not always the full pipeline; a simple factual question needs one search agent, not search + analysis + synthesis + report).
2. Decompose and partition scope to minimize duplication (distinct subtopics or source types per agent).
3. Delegate with complete context (1.3).
4. Aggregate results, handle errors, and decide whether coverage is sufficient.

**Isolated context.** Subagents do NOT inherit the coordinator's conversation history and do NOT share memory between invocations. Consequence: what the coordinator does not put in the prompt does not exist for the subagent.

**Narrow decomposition risk (exam favorite).** Scenario: topic "impact of AI on creative industries"; the coordinator only spawns agents for digital art, graphic design, and photography; final report misses music, writing, film. Every subagent did its job perfectly. Root cause: the coordinator's decomposition. Fix: instruct the coordinator to enumerate the full topic breadth first (and to check coverage), not to tune the subagents.

**Iterative refinement loop.** Coordinator sends findings to synthesis -> evaluates the synthesis for gaps against the research goals -> re-delegates targeted queries to search/analysis subagents for the gaps -> re-invokes synthesis -> repeats until coverage is sufficient. The exit criterion is coverage against goals, not a fixed number of rounds.

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Route every subagent result through the coordinator | Let the search agent hand results straight to the synthesis agent | Loses observability, error handling, and control |
| Have the coordinator pick subagents per query complexity | Always run the whole pipeline | Wasteful and slower; simple queries need fewer agents |
| Assign each subagent a distinct subtopic or source type | Give overlapping scopes to several agents | Duplicate work and duplicate findings |
| Add a gap-analysis step and re-delegate with targeted queries | Accept the first synthesis | Broad topics need coverage checks |
| Fix incomplete coverage at the coordinator's decomposition | Add more tools / a bigger model to subagents | Root cause is scope partitioning |
| Assume subagents know nothing you did not pass | Assume shared history or memory | Isolated context is by design |

### Worked example: coordinator/subagent sketch (Claude Agent SDK, Python)

This is a sketch based on the SDK shape in the exam materials (`query`, `ClaudeAgentOptions`, `AgentDefinition`). Parameter names may vary between SDK versions [Verify against current docs].

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

COORDINATOR_PROMPT = """You coordinate a research team producing a cited report.

GOAL: a comprehensive, well-sourced report on the user's topic.
QUALITY CRITERIA:
- Cover the full breadth of the topic; list its major sub-areas BEFORE delegating.
- Every claim must carry a source (URL or document name, and page where available).
- If sources conflict, keep both values with attribution; do not pick silently.
- After a draft synthesis, check it for gaps against the sub-areas list. If gaps
  exist, delegate targeted follow-up searches, then re-run synthesis.
- Use only the subagents the query needs; a narrow factual question needs one search.
Delegate independent searches in parallel (multiple Task calls in one response).
"""

options = ClaudeAgentOptions(
    system_prompt=COORDINATOR_PROMPT,
    allowed_tools=["Task"],          # REQUIRED for the coordinator to spawn subagents
    agents={
        "web_searcher": AgentDefinition(
            description="Searches the web for one assigned subtopic and returns "
                        "structured findings with source URLs.",
            prompt="You are a web research specialist. Search only the subtopic you "
                   "are given. Return JSON: [{claim, source_url, publication_date}].",
            tools=["WebSearch", "WebFetch"],
        ),
        "doc_analyzer": AgentDefinition(
            description="Analyzes provided documents and extracts findings with "
                        "document name and page numbers.",
            prompt="Extract findings from the documents given in your prompt. "
                   "Return JSON: [{claim, document, page}].",
            tools=["Read"],
        ),
        "synthesizer": AgentDefinition(
            description="Combines supplied findings into a cited report and lists "
                        "coverage gaps. Does NOT search.",
            prompt="Use ONLY the findings supplied in your prompt. Preserve every "
                   "citation. End with a 'Gaps' section.",
            tools=[],                # no search tools: prevents cross-role misuse
        ),
    },
)

async def main():
    async for message in query(
        prompt="Research the impact of AI on creative industries.",
        options=options,
    ):
        print(message)

asyncio.run(main())
```

Things to notice: the coordinator has only `Task` (it orchestrates, it does not search); each subagent has a narrow tool list; the synthesizer gets no search tools; the prompt states goals and criteria, not a script.

### Exam traps

- Report is missing whole areas -> distractor: "give search subagents more tools / bigger context". Correct: coordinator decomposition was too narrow.
- "Let subagents share a memory store so they stay in sync." Contradicts isolation and hub-and-spoke; route through the coordinator.
- "Always run all four subagents for consistency." The coordinator should choose dynamically.
- "Limit the coordinator to 3 refinement rounds." An arbitrary cap; loop until coverage criteria are met (with a sane backstop).

### Quick check

- Q: Who handles errors from a failed subagent in hub-and-spoke? -> The coordinator.
- Q: Every subagent performed correctly, yet the report omitted music and film. Where is the bug? -> Coordinator's task decomposition.
- Q: Does a subagent see the coordinator's earlier conversation? -> No; only what is in its prompt.

---

## Chapter 1.3 - Configure subagent invocation, context passing, and spawning

**Why the exam cares:** Mechanics questions: what must be in `allowedTools`, what a subagent can see, how to parallelize, and how to preserve source attribution across agent boundaries.

### Core concepts

**Task tool.** The mechanism for spawning a subagent. The exam guide calls it `Task` and requires `"Task"` in the coordinator's `allowedTools`. Newer SDK docs call the same tool `Agent` (the built-in subagent tool). Same concept; if an option says "add Task to allowedTools", that is the right mechanism.

**AgentDefinition.** Per-subagent-type config: `description` (what it is for; the coordinator uses it to decide when to delegate), `prompt` (its system prompt), and `tools` (allowlist restricting what it can do). Model can also be set in some versions [Verify]. Descriptions matter for the same reason tool descriptions do: they drive selection.

**Explicit context passing.** Because nothing is inherited, the coordinator must paste complete prior findings into the subagent prompt (e.g. web search results plus document analysis go to the synthesis agent verbatim). A one-line "use the earlier results" fails.

**Separate content from metadata.** Pass findings as structured data with `claim` distinct from `source_url`, `document_name`, `page`, `publication_date`. This preserves attribution through synthesis and lets conflicting figures be compared with dates rather than merged into one number.

**Parallel spawning.** Emit several `Task` tool_use blocks in a single coordinator response; they run concurrently. Spawning them in separate turns serializes the work and wastes latency.

**Goals, not procedures.** A coordinator prompt that says "step 1 search X, step 2 search Y, step 3 ..." removes the subagents' ability to adapt to what they find. Specify the research goal and quality criteria (coverage, citation, recency, conflict handling) and let subagents choose how.

**Forking (preview of 1.7).** Fork-based session management branches from a shared analysis baseline to explore divergent approaches. Covered in file 04.

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Include `"Task"` in the coordinator's `allowedTools` | Define agents but leave `Task` out | Coordinator cannot spawn anything |
| Paste full prior findings into the synthesis subagent prompt | Say "use the results from before" | No inherited context |
| Pass `{claim, source_url, page, date}` records | Pass a prose summary stripped of sources | Attribution is lost and cannot be recovered |
| Emit multiple Task calls in ONE response for independent work | One Task call per turn for independent work | Sequential = slow |
| Restrict each subagent's `tools` to its role | Give every subagent every tool | Misuse across specialization (a synthesizer trying web search) |
| Prompt with goals + quality criteria | Prompt with a rigid numbered procedure | Rigid scripts block adaptation |

### Worked example: passing context explicitly

Coordinator-built prompt for the synthesis subagent:

```json
{
  "task": "Synthesize a 400-word section on AI in music production. Use ONLY the findings below. Cite every claim as [n]. If two findings conflict, report both with their dates.",
  "findings": [
    {"id": 1, "claim": "Generative tools used in ~30% of surveyed studios",
     "source_url": "https://example.org/survey-2025", "publication_date": "2025-03-01",
     "agent": "web_searcher"},
    {"id": 2, "claim": "Adoption reached 41% of surveyed studios",
     "document": "IndustryReport_2026.pdf", "page": 14, "publication_date": "2026-02-10",
     "agent": "doc_analyzer"}
  ],
  "output_format": {"sections": ["body", "citations", "gaps"]}
}
```

The synthesizer can now reconcile 30% vs 41% as a time-series difference, not a contradiction, precisely because dates and sources travelled with the claims.

Parallel spawn shape (conceptually, one assistant turn with three tool_use blocks):

```
assistant: [
  Task(subagent="web_searcher", prompt="Subtopic: AI in music. Return JSON findings ..."),
  Task(subagent="web_searcher", prompt="Subtopic: AI in film and video ..."),
  Task(subagent="doc_analyzer", prompt="Documents: [full text ...]. Extract ...")
]
```

### Exam traps

- "Subagents automatically share the coordinator's history, so just say 'continue'." False.
- "Spawn the subagents one at a time to keep the coordinator's context clean." Loses parallelism; the right lever for context size is returning structured, concise findings.
- "Summarize findings to a paragraph before passing to synthesis to save tokens." Drops attribution metadata; keep the structured records.
- "Write a detailed step-by-step procedure in the coordinator prompt for consistency." Guide prefers goals and criteria.
- "Give the synthesis agent web search so it can fill gaps itself." Cross-role tool misuse; prefer a scoped `verify_fact`-style tool for frequent narrow needs and route complex gaps back through the coordinator (2.3).

### Quick check

- Q: What must `allowedTools` contain for a coordinator to spawn subagents? -> `"Task"` (called `Agent` in newer SDK docs).
- Q: How do you run three independent searches concurrently? -> Emit three Task calls in a single coordinator response.
- Q: Why pass structured findings with source fields instead of prose? -> To preserve attribution and let synthesis handle conflicts with dates.

---

## Chapter recap

- [ ] I can write a loop that continues on `"tool_use"`, ends on `"end_turn"`, and appends assistant + tool_result turns correctly.
- [ ] I can name three termination anti-patterns (text parsing, arbitrary cap as primary, text-present check).
- [ ] I can explain model-driven vs decision-tree control and when each is right.
- [ ] I can draw hub-and-spoke and state what the coordinator owns.
- [ ] I can diagnose "incomplete coverage with correct subagents" as narrow decomposition.
- [ ] I can design a gap-check refinement loop with a coverage-based exit.
- [ ] I can configure `allowedTools=["Task"]` and `AgentDefinition(description, prompt, tools)`.
- [ ] I can pass explicit, structured, attributed context and spawn parallel Task calls in one response.
- [ ] I can write a coordinator prompt of goals + criteria instead of procedures.

## Mnemonics

- **"tool_use = turn the crank, end_turn = stop."** Only stop_reason turns the crank.
- **HUB: Hand off, Unify, Backstop errors** (coordinator's three jobs, all through the hub).
- **"No paste, no memory."** A subagent knows only what is pasted into its prompt.
- **"One response, many Tasks"** = parallel.
- **"Goals in, procedures out."** Coordinator prompts state what good looks like.
- **"Blame the splitter."** Missing coverage with healthy subagents = coordinator decomposition.
- Out of scope reminder: streaming, prompt caching, and pricing details of these loops are out of scope - awareness only.
