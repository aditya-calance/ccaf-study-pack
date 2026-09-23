# 16. Practice Set - Domain 1: Agentic Architecture & Orchestration

> Domain 1 (27% of the exam). Task statements covered: 1.1 to 1.7. 16 original questions (14 single-answer, 2 "select TWO"). Scenario tags follow the six official scenarios. Suggested pace: 2 minutes per question, then read the key. Do not look at the key until you have committed to an answer for every question.
>
> Rules of the game (from the exam guide's philosophy): (1) if it MUST happen, use code, hooks or schemas; if it SHOULD happen, use prompts. (2) Choose the root-cause, proportionate fix, not the most elaborate one. (3) Several options will work in some sense; pick the one that fixes the actual cause with the least over-engineering. (4) Read the stem twice; one qualifier ("first step", "most likely root cause", "guarantee") often decides it.
>
> Terminology note: the guide names the subagent-spawning tool "Task" (allowedTools must include "Task"); newer SDK docs call it the "Agent" tool. Both names may appear.

---

### Q1 [Developer Productivity | 1.1 | Easy]
You are building a codebase-exploration agent with the Agent SDK and your own control loop. Testers report that the agent frequently stops after a single step and returns a half-finished answer such as "Let me look at the auth module." Reading your loop, you find it exits as soon as the latest assistant message contains any text block. Logs show that Claude often emits a short text preamble in the same response as a tool call. Which change fixes the loop?

A. Skip exiting when the assistant text contains phrases such as "let me" or "I will" so that preambles are not mistaken for final answers.
B. Raise the maximum iteration count from 10 to 25 so the loop has more chances to reach the final answer.
C. Continue looping while `stop_reason` is `"tool_use"` (executing the tools and returning their results), and terminate when it is `"end_turn"`.
D. Add a system prompt instruction telling Claude never to write text before a tool call so that any text is always final.

---

### Q2 [Multi-Agent Research | 1.2 | Medium]
Your coordinator delegates to four subagents: web search, document analysis, synthesis and report generation. It currently invokes all four in order for every request. Usage data shows that about 60% of requests are narrow factual lookups ("What year did the EU AI Act enter into force?") that only need web search, yet they take 40 seconds; the remaining requests are broad and varied and genuinely use the full pipeline. The mix of request types changes weekly. What is the most effective change?

A. Put a keyword-based router in front of the coordinator that maps query patterns to fixed subagent subsets.
B. Have the coordinator analyze each query's requirements and dynamically select which subagents to invoke, skipping those the query does not need.
C. Run all four subagents on a smaller, faster model so that the full pipeline finishes quickly for every request.
D. Cache the outputs of the synthesis and report subagents so repeated pipelines complete faster.

---

### Q3 [Multi-Agent Research | 1.3 | Medium]
Final reports from your research system read well but many claims lack citations, and a few cite the wrong source. The synthesis subagent's task prompt is assembled by the coordinator, which currently pastes in a prose paragraph summarizing what the search and document-analysis subagents found. The synthesis subagent's system prompt already says "always cite sources." What is the best fix?

A. Strengthen the synthesis system prompt with a stronger, all-caps citation requirement and a penalty warning.
B. Give the synthesis subagent a web search tool so it can look up sources for any uncited claim itself.
C. Add a post-processing step that scans the final report for factual sentences and searches for matching URLs.
D. Have the coordinator pass the prior agents' findings as structured data that keeps content separate from metadata (claim text, source URL, document name, page number), so attribution survives the handoff.

---

### Q4 [Multi-Agent Research | 1.3 | Easy]
You define four specialized subagents through `AgentDefinition` entries (each with a description, system prompt and tool list) and start the coordinator with `allowedTools=["WebSearch", "Read"]`. In testing, the coordinator never delegates; it performs searches and reads files itself and ignores the subagents. What is the most likely cause and fix?

A. The coordinator's allowed tools do not include the subagent-spawning tool (`"Task"`, called `"Agent"` in newer SDK docs); add it so the coordinator can invoke subagents.
B. The subagents need to inherit the coordinator's conversation history; enable history sharing between them.
C. The coordinator's system prompt is too short; add a paragraph in capitals requiring delegation for every task.
D. The coordinator should be given the union of all subagent tools so it can route requests to whichever subagent owns the tool.

---

### Q5 [Customer Support | 1.5 | Medium]
Policy says refunds above $500 require human approval. The system prompt states this rule prominently, and it works in nearly all conversations. An audit still finds roughly 3% of sampled conversations in which the agent processed refunds between $500 and $900 after persuasive customers pushed back. Finance considers any unapproved refund over $500 a compliance incident. What should you implement?

A. Add few-shot examples showing the agent refusing to process refunds above $500 when customers push back.
B. Add a hook that intercepts `process_refund` calls, blocks any with an amount above $500, and redirects the workflow to `escalate_to_human`.
C. Run a daily audit job that reverses unapproved refunds above $500 after the fact.
D. Lower the threshold stated in the prompt to $300 so that occasional lapses stay under the true limit.

---

### Q6 [Customer Support | 1.5 | Medium]
Your agent uses three MCP tools owned by three different teams and none can be modified this quarter. `get_customer` returns `created_at` as a Unix timestamp, `lookup_order` returns ISO 8601 dates, and `check_return_eligibility` returns `status` as a numeric code (1, 2, 3). The agent sometimes miscalculates the 30-day return window and misreads the status codes. Which approach is most reliable?

A. Add conversion rules for each format to the system prompt and ask Claude to normalize before reasoning.
B. Add few-shot examples that show worked date conversions for each source.
C. Add a PostToolUse hook that normalizes timestamps to a single format and maps numeric codes to labels before the model sees the tool results.
D. Create a `normalize_data` tool and instruct the agent to call it after every other tool call.

---

### Q7 [Customer Support | 1.4 | Medium]
When the agent escalates, the human agent working the queue sees only the ticket record; they cannot open the agent's conversation. Today `escalate_to_human` is called with `reason: "complex case"`, and human agents complain they must re-ask customers for their details and history. What is the best change?

A. Have the agent compile a structured handoff summary (customer ID, root cause analysis, refund amount involved, recommended action) and pass it with the escalation.
B. Attach the full raw conversation transcript, including all tool outputs, to every escalation.
C. Add a sentiment score to the escalation payload so humans can prioritize upset customers.
D. Instruct human agents to call the customer first and confirm all details before reading the ticket.

---

### Q8 [Customer Support | 1.4 | Hard]
A verified customer writes: "I was charged twice for order 8841, I need my shipping address changed on order 8907, and please cancel my premium subscription." The agent currently tackles issues one by one, and by the third issue it sometimes forgets facts already established (verified identity, account tier). Total handling time is high. What is the most effective design?

A. Ask the customer to resubmit each issue as a separate ticket so each conversation stays focused.
B. Spin up an independent agent instance for each issue, each starting from scratch with its own customer verification.
C. Resolve only the first issue and escalate the rest to human agents to avoid errors.
D. Decompose the message into distinct items, investigate them in parallel using shared context (the verified customer data), then synthesize one unified resolution.

---

### Q9 [Developer Productivity | 1.6 | Medium]
You ask an agent to "add comprehensive tests to this legacy billing service" (about 300 source files, almost no existing tests, unclear module dependencies). Which decomposition approach is best?

A. Generate tests for each file in alphabetical order using a fixed, identical prompt per file.
B. Map the codebase structure first, identify high-impact areas, create a prioritized plan, and adapt the plan as new dependencies are discovered.
C. Ask for a complete, final test plan for all 300 files up front and execute it without revisiting the plan.
D. Generate tests only for files that already have some test coverage, since those are the best understood.

---

### Q10 [Claude Code for CI | 1.6 | Medium | Select TWO]
A nightly job reviews newly submitted vendor contracts. The steps are predictable and identical each run: extract the clauses, check each clause against the company policy list, and produce a risk summary. Occasionally a set of contracts from the same vendor must also be checked for consistency with each other. Which TWO design choices are appropriate?

A. Implement a fixed sequential prompt chain (extract, then policy-check, then summarize) because the aspects are known in advance.
B. Build an autonomous coordinator that invents its own subtasks from scratch every night because rigid steps are always inferior.
C. Analyze each contract individually for local issues first, then run a separate cross-contract integration pass for consistency.
D. Put all contracts and all review aspects into one prompt so nothing is split across calls.
E. Review a random sample of contracts each night and extrapolate the findings to the rest.

---

### Q11 [Developer Productivity | 1.7 | Hard]
Three days ago you ran a long, named investigation session ("auth-audit") that read about 45 files and produced many verbose tool results. Since then teammates merged a refactor that rewrote or moved most of those files. You want to continue the audit. What is the most reliable approach?

A. Resume the named session with `--resume auth-audit` and continue as though nothing changed.
B. Resume the named session with `--resume auth-audit`, then tell Claude which files changed so it re-analyzes them.
C. Start a new session and inject a structured summary of the previously validated findings, noting which areas are now out of date.
D. Use `fork_session` on the old session so the stale results are copied into a safe branch, then continue in the fork.

---

### Q12 [Developer Productivity | 1.7 | Medium]
After a thorough analysis of a payment module in one session, you want to compare two refactoring strategies (event-driven versus a synchronous facade) without either strategy's discussion contaminating the other, and without repeating the expensive analysis. What should you do?

A. Use `fork_session` to create two independent branches from the shared analysis baseline and explore one strategy in each.
B. Explore both strategies sequentially in the same session and ask Claude to ignore the first when evaluating the second.
C. Open two fresh sessions and have each repeat the full analysis before exploring its strategy.
D. Run `--resume` on the named session twice and explore one strategy in each terminal window.

---

### Q13 [Multi-Agent Research | 1.3 | Hard | Select TWO]
A coordinator's research runs are slow and wasteful. Logs show it emits the web-search subagent call, waits about 30 seconds for the result, and only then, in a following turn, invokes the document-analysis subagent, although neither needs the other's output. Additionally, two web-search subagents frequently retrieve the same well-known articles while niche sources are never covered. Which TWO changes address these problems most directly?

A. Replace the coordinator with a single agent that owns every tool so no delegation delay exists.
B. Emit the independent subagent calls as multiple Task tool calls in a single coordinator response so they run in parallel.
C. Increase the subagents' max output tokens so each search returns more results.
D. Tell each subagent to re-run its search until results differ from what other subagents returned.
E. Partition the research scope across subagents (distinct subtopics or source types) so their work does not overlap.

---

### Q14 [Developer Productivity | 1.1 | Hard | Select TWO]
A custom agentic loop for repository Q&A behaves erratically: it re-reads the same file repeatedly as if it never saw the contents, and sometimes ends the conversation right after requesting a tool. Which TWO fixes correct the loop?

A. Append each tool result to the conversation history (as a tool result tied to the request) before the next model call so Claude can reason on it.
B. Stop the loop after a fixed maximum of 5 iterations, since long runs indicate confusion.
C. End the loop when the reply contains a phrase like "Final answer:" so the model signals completion.
D. Terminate only when `stop_reason` is `"end_turn"` and keep going, running the requested tools, whenever it is `"tool_use"`.
E. Raise the sampling temperature so the model varies its next action.

---

### Q15 [Multi-Agent Research | 1.3 | Medium]
Your coordinator prompt contains a rigid script: "Step 1: search exactly 3 queries about X. Step 2: analyze the first 2 results. Step 3: ...". On unusual topics (for example, a niche regulation with few web sources) the subagents follow the script and return thin results even though better approaches were obvious. Which change to the coordinator's instructions is best?

A. Add more numbered steps covering every edge case you can think of.
B. Add a rule that any step producing fewer than 3 results must be repeated verbatim.
C. Remove the coordinator prompt entirely and rely on subagent descriptions.
D. Rewrite the prompt to state the research goals and quality criteria (coverage, source quality, recency) and let subagents choose how to reach them.

---

### Q16 [Multi-Agent Research | 1.2 | Medium]
To save time, the search subagent writes its findings to a shared scratch file that the analysis subagent reads directly. A failure in search silently leaves the analysis agent reading a stale file; error handling differs between the two agents and you cannot trace which information flowed where. What is the best architectural fix?

A. Add retry logic to the analysis subagent's file read.
B. Give each subagent a rule to check the file's timestamp before reading.
C. Merge search and analysis into one subagent so no handoff exists.
D. Route all inter-subagent communication through the coordinator, which passes results explicitly and handles errors consistently in one place.

---

## Answer key & explanations

### Q1 - Answer: C (Trap: text-parsing / completion-by-content)
Root cause: the loop treats "assistant text present" as completion. `stop_reason` is the control signal: `"tool_use"` means run the tools, append the results and call again; `"end_turn"` means finished.
- A: Still parses natural language for a termination signal; the phrase list will never be complete.
- B: An iteration cap is at best a safety guardrail; it does not fix the premature exit, which happens on step 1.
- D: A prompt asking Claude to change its output behavior is probabilistic and fixes a code bug with a prompt.

### Q2 - Answer: B (Trap: static routing / speed-only fix)
The coordinator's role includes deciding which subagents to invoke based on query complexity. Because the query mix drifts weekly, dynamic selection is more robust than fixed rules.
- A: A keyword router is brittle, bypasses the model's understanding, and needs constant maintenance as the mix changes.
- C: Smaller model speeds each step but every simple query still runs three unneeded subagents; wrong cause.
- D: Caching helps only for repeated queries; the narrow lookups do not need those stages at all.

### Q3 - Answer: D (Trap: prompt reinforcement; fix the data handoff)
Subagents only know what is in their prompt. A prose summary discards URLs, documents and pages; no instruction can restore lost metadata. Passing structured findings with content separated from metadata preserves attribution.
- A: Emphasis cannot cite information the agent was never given.
- B: Gives the synthesis agent tools outside its specialization and duplicates work; the sources already exist upstream.
- C: Post-hoc matching guesses at sources and can attach wrong ones; treats the symptom.

### Q4 - Answer: A (Trap: missing configuration versus prompt fix)
The coordinator can spawn subagents only if its allowed tools include the Task tool (named "Agent" in newer SDK docs). Its list has only WebSearch and Read, so it does the work itself.
- B: Subagents do not automatically inherit coordinator history, by design; also irrelevant to this symptom.
- C: A louder prompt cannot grant a tool it does not have.
- D: Gives the coordinator specialist tools, defeating scoped tool access and the delegation design.

### Q5 - Answer: B (Trap: prompt/few-shot for a MUST-happen rule)
A compliance rule with a financial threshold needs deterministic enforcement: an interception hook on outgoing tool calls that blocks amounts above $500 and redirects to `escalate_to_human`.
- A: Few-shot examples improve probability but leave the non-zero failure rate.
- C: Detects after money moved; reversal is not prevention (and may be impossible).
- D: Still prompt-based, so the same lapses occur at lower amounts and legitimate refunds are over-escalated.

### Q6 - Answer: C (Trap: prompt instructions for data normalization)
A PostToolUse hook transforms heterogeneous results deterministically before the model processes them, and it works even though the tools are unchangeable.
- A: Requires the model to convert correctly every time; still probabilistic.
- B: Examples help formatting but do not guarantee correct arithmetic or mappings.
- D: Depends on the model remembering to call an extra tool each time; adds latency and a new failure mode.

### Q7 - Answer: A (Trap: raw dumps / irrelevant signals)
Humans without transcript access need a compact, structured handoff: customer ID, root cause, amounts, recommended action.
- B: Humans cannot access it, and dumping raw transcripts is noisy even if attached; a curated summary is the pattern.
- C: Sentiment does not describe the problem or what to do.
- D: Pushes the cost onto customers and defeats the point of the agent.

### Q8 - Answer: D (Trap: serialization / re-work)
Multi-concern requests should be decomposed into distinct items and investigated in parallel with shared context, then merged into one resolution. It preserves verification data and cuts time.
- A: Shifts burden to the customer and worsens experience.
- B: Duplicates verification, loses shared context, may create conflicting actions.
- C: Lowers first-contact resolution; the agent can handle these items.

### Q9 - Answer: B (Trap: fixed pipeline for open-ended work)
Open-ended tasks call for adaptive decomposition: map structure, find high-impact areas, produce a prioritized plan and revise as dependencies appear.
- A: Fixed per-file passes ignore importance and dependencies.
- C: A frozen up-front plan cannot adapt to discoveries.
- D: Skips the untested code that most needs tests.

### Q10 - Answer: A and C (Trap: over-autonomy; single mega-pass)
Predictable multi-aspect work fits prompt chaining (A). Per-item local passes plus a separate integration pass (C) avoid attention dilution and handle cross-contract consistency.
- B: Dynamic decomposition suits open-ended investigations, not a known fixed workflow; adds unpredictability.
- D: One giant pass is the attention-dilution pattern the guide warns about.
- E: Sampling misses issues; not a decomposition strategy.

### Q11 - Answer: C (Trap: resuming stale context)
Resume when prior context is mostly valid; when most tool results are stale, a new session with an injected structured summary is more reliable.
- A: Claude would reason from outdated file contents and not know.
- B: Right for a few changed files; here most files changed, so a fresh session avoids carrying large stale results. (Verify: if only a handful had changed, B would win.)
- D: Forking copies the same stale baseline; it is for branching a valid baseline.

### Q12 - Answer: A (Trap: contamination or repeated cost)
`fork_session` creates independent branches from a shared baseline, ideal for comparing approaches.
- B: Same-session exploration contaminates context; "ignore the first" is unreliable.
- C: Repeats the expensive analysis.
- D: Resuming the same session does not create independent branches; both windows would continue one history. (Verify exact CLI behavior; the guide's tool for this is fork_session.)

### Q13 - Answer: B and E (Trap: single-agent shortcut; brute-force loops)
B: parallel subagents are launched by emitting multiple Task calls in one response rather than across turns. E: partitioning scope by subtopic or source type minimizes duplication.
- A: Discards the multi-agent design and its specialization instead of fixing the two problems.
- C: More output does not change sequencing or duplicate coverage.
- D: Subagents are isolated and cannot see one another's results; it also invites endless re-running. Coordination belongs with the coordinator.

### Q14 - Answer: A and D (Trap: iteration caps, text signals)
A: results must be appended so the model can see them (explains repeated reads). D: correct control flow on `stop_reason` (explains the premature ending).
- B: An arbitrary cap is not the primary stopping mechanism and would cut valid long tasks.
- C: Completion detected via text pattern is the named anti-pattern.
- E: Randomness worsens reliability and addresses neither cause.

### Q15 - Answer: D (Trap: procedural over-specification)
Coordinator prompts should specify goals and quality criteria rather than step-by-step procedures, allowing subagents to adapt.
- A: More rigid steps compound the problem.
- B: Repeating identical steps yields identical thin results.
- C: Removes the goals and criteria that guide subagents.

### Q16 - Answer: D (Trap: peer-to-peer shortcuts)
Hub-and-spoke: the coordinator manages all inter-subagent communication for observability, consistent error handling and controlled information flow.
- A: Patches one symptom; still no traceability.
- B: Timestamp checks are a brittle workaround for a design flaw.
- C: Loses specialization and scoped tools; over-corrects.

---

## Scoring table (16 questions)

| Score | Interpretation | What to review |
|---|---|---|
| 14-16 | Exam-ready for D1 | Re-read only the questions you missed; skim tool_choice and session material |
| 11-13 | Solid, some gaps | Review chapters for the task statements of your misses (1.4/1.5 hooks vs prompts; 1.3 context passing) |
| 8-10 | Borderline | Re-study 1.1 loop control, 1.2/1.3 coordinator patterns, 1.4/1.5 enforcement; then redo the set after 24h |
| 0-7 | Not ready | Return to the Domain 1 module; build a small coordinator with subagents and a hook, then retry |

Map misses to task statements: Q1, Q14 = 1.1; Q2, Q16 = 1.2; Q3, Q4, Q13, Q15 = 1.3; Q5, Q6, Q7, Q8 = 1.4/1.5; Q9, Q10 = 1.6; Q11, Q12 = 1.7.
