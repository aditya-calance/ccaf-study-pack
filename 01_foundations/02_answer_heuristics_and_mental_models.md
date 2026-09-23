# 02. Answer Heuristics and Mental Models

> Read time: ~20 min. Priority: **MUST** (read twice: at the start of the day and again right before the mock). This file is the "thought process" of the exam. If you internalise these twelve rules, you can eliminate two options in most questions before you know the technical details.

---

## The master principle

> **If it MUST happen, enforce it in code. If it SHOULD happen, ask for it in a prompt.**

Prompts are probabilistic. Hooks, schemas, tool gating, and settings are deterministic. The exam repeatedly asks which layer a requirement belongs to.

## The twelve rules

### Rule 1: Deterministic beats probabilistic when stakes are high
Refund before verifying identity? Block `process_refund` until `get_customer` returned a verified ID (prerequisite gate / hook). Refund over $500? A PreToolUse-style hook redirects to human escalation. Not "make the system prompt stronger", not "add 5 few-shot examples". *Prompt instructions have a non-zero failure rate.*

### Rule 2: Find the root cause before choosing the fix
Read the evidence in the stem. If the coordinator decomposed "creative industries" into three visual-art subtasks, the fault is the **coordinator's decomposition**, not the search or synthesis agents. If two tools have one-line descriptions and the agent picks the wrong one, the fault is **descriptions**, not "we need a router".

### Rule 3: Proportionate first step
"What's the most effective *first* step?" means the cheapest change that hits the root cause. Order of escalation: better tool descriptions → explicit criteria/few-shot → structural change (split tools, schema) → new infrastructure (classifier, router, fine-tune). Answers that jump to infrastructure are usually wrong when a cheaper fix hasn't been tried.

### Rule 4: Structure beats vibes
Explicit categorical criteria ("flag a comment only when it contradicts code behaviour") beat "be conservative" or "only high-confidence findings". Tool_use + JSON schema beats "please output JSON". Explicit IDs beat free-text names.

### Rule 5: The model doesn't share memory
Subagents don't inherit the coordinator's history. Everything they need must be *in their prompt*: findings, source URLs, constraints. A fresh reviewer instance doesn't share the generator's reasoning: that's a feature (independent review), not a bug.

### Rule 6: The coordinator owns the graph
Hub-and-spoke: all subagent communication routes through the coordinator for observability, error handling, and controlled information flow. Coverage gaps, retries, and error recovery are coordinator concerns. Subagents recover *locally* from transient errors and propagate only what they can't resolve, with context.

### Rule 7: Least privilege for tools
4–5 scoped tools per agent beats 18. Give a synthesis agent a narrow `verify_fact`, not full web search. Replace generic tools (`fetch_url`) with constrained ones (`load_document`).

### Rule 8: Loop on `stop_reason`, never on text
`tool_use` → run tools, append results, call again. `end_turn` → done. Anti-patterns: parsing natural-language "I'm finished", arbitrary iteration caps as the *primary* stop, treating any assistant text as completion. (A `max_turns`-type cap is a safety backstop, not the control flow.)

### Rule 9: Match the API to the latency need
Batches API: 50% cheaper, up to 24 hours, no latency SLA, no multi-turn tool calls, correlate via `custom_id`. Perfect for overnight, weekly, and nightly jobs. Wrong for blocking pre-merge checks.

### Rule 10: Context is a budget; position matters
Trim tool outputs to relevant fields (40 → 5). Keep a persistent "case facts" block outside summarised history. Put key findings at the **start** (and end) of long inputs; middle content is lost. Use scratchpad files and subagents to protect the main context. Progressive summarisation destroys numbers, dates, and stated expectations.

### Rule 11: Never hide uncertainty or failure
Errors carry category, retryability, what was attempted, partial results. An access failure is not an empty result. Conflicting statistics are annotated with sources, not silently picked. Claims keep their source and date through synthesis. Escalate on policy gaps, explicit human requests, and inability to progress, *not* sentiment or self-reported confidence.

### Rule 12: Match the config layer to the scope
| Need | Mechanism |
|---|---|
| Team-wide, always-on standards | Project `CLAUDE.md` (committed) |
| Personal preferences | `~/.claude/CLAUDE.md` (not shared!) |
| Conventions by file type across directories | `.claude/rules/*.md` with `paths:` globs |
| On-demand task workflow | Skill (`.claude/skills/<name>/SKILL.md`), or command in `.claude/commands/` |
| Verbose/exploratory skill output isolated | `context: fork` |
| Guarantee an action happens | Hook |
| Team-shared MCP server | `.mcp.json` (project) with `${ENV}` secrets |
| Personal/experimental MCP server | `~/.claude.json` (user) |

## Elimination checklist (run on every question)

1. **Invented feature?** (`CLAUDE_HEADLESS`, `--batch`, `.claude/config.json`) → cross out.
2. **Blames the wrong component** given the logs? → cross out.
3. **Relies on prompt compliance** where the stem says "guarantee", "always", "financial consequences", "compliance"? → cross out.
4. **Over-engineered** (new classifier, separate model, ML pipeline) when a config/description/prompt-criteria fix is untried? → cross out.
5. **Treats a symptom** (increase max_tokens, larger context window, temperature 0, regex post-processing) rather than the cause? → cross out.
6. **Shifts the burden** to humans (ask developers to split PRs) without fixing the system? → cross out.
7. From what remains, choose the one that **matches the qualifier** ("first step", "most maintainable", "guarantee", "regardless of location").

## Recurring distractor phrases (learn to smell them)
"Increase max_tokens", "set temperature to 0", "add a prompt instruction saying…", "use a larger context model", "run it three times and take consensus", "have the agent report a confidence score", "analyse sentiment", "let it self-review with extended thinking", "parse the output with a regex", "switch everything to batch to save 50%", "retry with exponential backoff and return 'unavailable'", "return empty success on timeout", "terminate the whole workflow".

## Mental model diagrams

```
              MUST (100%)                      SHOULD (~95%)
   ┌───────────────────────────────┐   ┌───────────────────────────────┐
   │ hooks · prerequisite gates    │   │ system prompt · CLAUDE.md     │
   │ JSON schema + tool_use        │   │ few-shot · style guidance     │
   │ permissions.deny · settings   │   │ tone · preferences            │
   └───────────────────────────────┘   └───────────────────────────────┘
```

```
 Who decides the next step?
   Fixed order, known steps ........ prompt chaining (workflow)
   Depends on discoveries .......... dynamic decomposition (agent / orchestrator-workers)
   One-off simple change ........... direct execution
   Architectural / multi-file ...... plan mode first
```

```
 Where does context live?
   Always needed, always true ...... CLAUDE.md
   Only for some file types ........ .claude/rules/ (paths:)
   Only for some tasks ............. skill
   Only right now .................. the prompt / case-facts block
   Must survive compaction/crash ... scratchpad file / manifest
```

## Mnemonics
- **"MUST → code, SHOULD → prompt."**
- **"Root cause, then Proportion."** (RCP)
- **"Coordinator Owns; Subagents Isolated."** (COSI) They only know what you put in the prompt.
- **"S-T-O-P"**: `stop_reason`, Tools scoped, Output via schema, Provenance kept.
- **"Batch is for Breakfast, not for Blocking."**
