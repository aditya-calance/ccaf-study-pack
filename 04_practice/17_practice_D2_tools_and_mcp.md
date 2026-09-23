# 17. Practice Set - Domain 2: Tool Design & MCP Integration

> Domain 2 (18% of the exam). Task statements covered: 2.1 to 2.5. 12 original questions (11 single-answer, 1 "select TWO"). Attempt all before opening the answer key. Suggested pace: 2 minutes per question.
>
> Reminders: tool descriptions are the primary mechanism for tool selection; a first-step fix is usually a better description, not a router or more examples. Structured errors beat generic ones. Scope tools per agent (4-5, not 18). Prompts SHOULD, code/config MUST.

---

### Q1 [Multi-Agent Research | 2.1 | Easy]
Your research system has two tools available to the search subagent: `analyze_content` ("Analyzes content") and `analyze_document` ("Analyzes a document"). Traces show the subagent picks the wrong one in about a third of cases; web page results get sent to `analyze_document` and PDFs to `analyze_content`. What is the most effective first fix?

A. Add eight few-shot examples to every subagent prompt showing which tool to call for each source.
B. Rename `analyze_content` to something web-specific such as `extract_web_results` and rewrite both descriptions with expected inputs, outputs and when to use one versus the other.
C. Add a keyword router that inspects the source URL and pre-selects the tool before the model runs.
D. Set tool_choice to force `analyze_document` so the behavior is at least consistent.

---

### Q2 [Customer Support | 2.1 | Hard]
Your `get_customer` and `lookup_order` tools have detailed, well-differentiated descriptions and worked well for weeks. After a prompt revision that added the line "ALWAYS check the customer's account before answering any question about orders or accounts", order-status questions now trigger `get_customer` almost every time, even when the user supplies an order number. What is the most likely cause and best fix?

A. The tool descriptions are still too short; double their length.
B. Consolidate both tools into a single `lookup_entity` tool.
C. The keyword-sensitive wording in the system prompt creates an unintended association with `get_customer` that overrides the descriptions; rewrite that instruction so it does not tie the word "orders" and "accounts" to that tool.
D. Add few-shot examples showing `lookup_order` being called for order numbers, leaving the new prompt line unchanged.

---

### Q3 [Customer Support | 2.2 | Medium]
`process_refund` returns `isError: true` with the message "Operation failed" for three situations: a network timeout, a malformed order ID and a refund requested after the 30-day window. The agent retries the out-of-window refund three times and then tells the customer "something went wrong". What is the best remedy?

A. Tell the agent in the system prompt never to retry more than twice.
B. Cap tool-call retries in your agent loop at two per tool.
C. Return only an HTTP-style status number so the agent can infer the situation.
D. Return structured error metadata (an error category such as transient, validation, business or permission; an `isRetryable` flag; a human-readable description), including a non-retryable flag and customer-friendly explanation for the business rule violation.

---

### Q4 [Multi-Agent Research | 2.2 | Medium]
Your web search tool returns an empty list when the search backend times out. In one run the final report states, "no relevant sources exist on this topic", though many exist. What is the best fix?

A. Distinguish the cases: return an error result (with category such as transient and retryable) for access failures, and return a successful empty result only when the query truly matched nothing.
B. Always mark empty results as errors so the agent is forced to try again.
C. Tell the agent in the prompt to run each search twice before concluding that nothing exists.
D. Return `null` for failures and `[]` for empty results, and document the difference in the README.

---

### Q5 [Multi-Agent Research | 2.2 | Hard | Select TWO]
Transient failures (503s, timeouts) in the search subagent are currently propagated raw to the coordinator, which then wastes turns and sometimes aborts the whole run. Which TWO changes best implement error handling for this architecture?

A. Let the subagent handle transient failures locally (for example, retrying with backoff) before involving the coordinator.
B. Have the coordinator retry every failed subagent identically until it succeeds.
C. When a failure cannot be resolved locally, return to the coordinator the failure type, what was attempted, any partial results and possible alternatives.
D. Convert unresolved failures to empty successful results so the pipeline always continues.
E. Terminate the entire workflow through a top-level exception handler on the first unresolved failure.

---

### Q6 [Developer Productivity | 2.3 | Medium]
An engineering assistant agent has 18 tools spanning file operations, git, Jira, database queries, deployment and documentation search. It regularly chooses inappropriate tools, for example querying the production database when asked to read a config file. What is the best approach?

A. Upgrade to a larger model so it can handle the tool list.
B. Split responsibilities across role-specific agents, each with only the 4-5 tools relevant to its role, and route between them.
C. Keep all 18 tools and add a few-shot example for each one.
D. Keep all 18 tools and set tool_choice to "any" to ensure a tool is always used.

---

### Q7 [Structured Data Extraction | 2.3 | Medium]
Documents arrive as invoices, receipts or contracts, and you do not know the type in advance. You define three extraction tools with different schemas. Occasionally Claude replies in plain text instead of calling any tool, breaking the pipeline. What should you change?

A. Set `tool_choice` to `"any"` so the model must call one of the tools but can choose which fits the document.
B. Force the invoice tool with `{"type": "tool", "name": "extract_invoice"}` for every document.
C. Keep `"auto"` and add "you must call a tool" to the system prompt.
D. Parse the plain text reply with a regex and re-route it into a schema.

---

### Q8 [Developer Productivity | 2.4 | Medium]
Your team wants a shared GitHub MCP server that every developer gets automatically when cloning the repository. One developer also wants to try an experimental personal database MCP server. Tokens must not be committed. Which setup is correct?

A. Put both servers in the project `.mcp.json` with the real tokens inline for convenience.
B. Put the shared server in the project `.mcp.json` using environment variable expansion (for example `${GITHUB_TOKEN}`) for the token, and configure the experimental server in the developer's user-scoped `~/.claude.json`.
C. Put both servers in the user-level `~/.claude.json` and email teammates instructions to copy it.
D. Describe both servers in CLAUDE.md so Claude connects to them when reading the file.

---

### Q9 [Developer Productivity | 2.4 | Hard]
You connect a custom MCP server exposing `search_code_symbols`, a semantic, cross-repository symbol search. Its description reads "Searches code". Despite being far more capable for symbol lookups, the agent keeps using the built-in Grep for such requests. What is the most effective first step?

A. Remove Grep from the agent's allowed tools.
B. Add a hook that blocks any Grep call and tells Claude to use the MCP tool.
C. Rewrite the MCP tool's description to explain its capabilities, inputs, outputs and when it is preferable to Grep.
D. Replace it with a custom-built wrapper MCP server that also exposes Grep.

---

### Q10 [Customer Support | 2.4 | Medium]
At the start of each session the support agent makes five to eight exploratory tool calls just to learn which help-center categories, policy documents and macro templates exist before answering. This adds latency and cost. What is the best improvement?

A. Expose the catalog (categories, document hierarchy, template list) as an MCP resource so the agent sees what is available without exploratory tool calls.
B. Add a `list_everything` tool that the agent must call at the start of each session.
C. Paste the entire help-center content into the system prompt.
D. Add few-shot examples of typical exploration sequences.

---

### Q11 [Developer Productivity | 2.5 | Medium]
You need to find every caller of `parseInvoice`, but several modules wrap and re-export it under other names. Which approach is best?

A. Read every source file in the repo up front and reason across them.
B. Use Glob with `**/*.ts` to list files and scan the list for the name.
C. Run Grep for `parseInvoice` once and report the hits.
D. Grep for the function, identify the wrapper modules and each exported name, then Grep for each of those names, reading files only to follow specific flows.

---

### Q12 [Developer Productivity | 2.5 | Medium]
You attempt to change one specific `return null;` in a large file with the Edit tool, but it fails because that text appears nine times in the file. What is the reliable fallback?

A. Repeat the same Edit call in case the match resolves next time.
B. Read the whole file, make the change, and use Write to save the modified full contents.
C. Use Glob to find the file again and retry.
D. Run Grep to count the matches; the Edit tool will then accept the change.

---

## Answer key & explanations

### Q1 - Answer: B (Trap: examples/routers instead of fixing descriptions)
Descriptions drive tool selection; near-identical descriptions cause misrouting. Renaming to eliminate functional overlap and adding inputs, outputs and boundaries is a low-effort root-cause fix.
- A: Adds token overhead without fixing ambiguous descriptions.
- C: Over-engineered routing that bypasses model judgment and becomes fragile.
- D: Forcing one tool guarantees the wrong tool for half the inputs.

### Q2 - Answer: C (Trap: ignoring the system prompt's keyword effect)
The behavior changed right after the prompt edit, and tool descriptions were unchanged; keyword-sensitive prompt wording can create unintended tool associations. Review prompts for such phrasing. (If verification before order operations must be guaranteed, that is a code-level prerequisite gate from Domain 1, not a broad prompt line.)
- A: Descriptions were already good and were not the variable that changed.
- B: Consolidation is a larger redesign than the cause warrants.
- D: Examples fight the prompt line instead of removing the cause; leaves conflicting signals.

### Q3 - Answer: D (Trap: uniform errors; retry caps)
Structured errors let the agent distinguish retryable transient problems from validation and business errors, and explain policy violations to the customer.
- A: Probabilistic and still gives no information about why it failed.
- B: Arbitrary cap treats the symptom; timeouts might deserve retries, policy denials none.
- C: A bare status number lacks the category, retryability and customer-facing explanation.

### Q4 - Answer: A (Trap: conflating access failure with valid empty result)
The agent must be able to tell "nothing matched" from "could not search". Failures use the error flag with metadata; legitimate empties are successes.
- B: Turns valid results into errors, provoking pointless retries.
- C: A prompt cannot recover information the tool hid; doubles cost.
- D: Null versus empty is a subtle convention easy to misread; doesn't give category or retry info.

### Q5 - Answer: A and C (Trap: propagate everything; suppress everything)
Recover locally from transient failures; propagate only what cannot be resolved, with context and partial results, so the coordinator can decide.
- B: Blind repeated retries of the same call ignore non-retryable causes.
- D: Masks failure as success and yields silently incomplete research.
- E: Kills the run when partial results and alternatives were available.

### Q6 - Answer: B (Trap: bigger model / more prompting)
Too many tools (18 versus 4-5) degrades selection; scope tools to each role.
- A: Reduces neither the decision complexity nor cross-role misuse.
- C: 18 examples inflate context; the design remains the problem.
- D: "any" only forces some tool call; it does not improve which one.

### Q7 - Answer: A (Trap: forced tool vs any confusion)
`"any"` guarantees a tool call while letting the model choose the schema, right when the document type is unknown. (Use forced selection when a specific tool must run first, e.g. `extract_metadata`, then continue in follow-up turns.)
- B: Forces the wrong schema for receipts and contracts.
- C: Prompt reminder is probabilistic; "auto" allows text.
- D: Regex parsing reintroduces fragility that tool use is meant to remove.

### Q8 - Answer: B (Trap: secrets in VCS; wrong scope)
Project `.mcp.json` shares team tooling; `${VAR}` expansion keeps secrets out of version control; personal/experimental servers go in user-scoped `~/.claude.json`.
- A: Commits secrets.
- C: Loses the automatic sharing and relies on manual copying.
- D: CLAUDE.md provides instructions; it does not configure servers.

### Q9 - Answer: C (Trap: restricting tools instead of describing them)
Thin descriptions make built-ins look sufficient; explain capabilities, outputs and boundaries in the MCP tool description.
- A: Removes a tool still needed for plain-text search.
- B: Hard-blocking is heavy-handed and leaves the underlying ambiguity.
- D: Building more custom infrastructure is unwarranted; it also does not solve description quality.

### Q10 - Answer: A (Trap: extra discovery tools / prompt stuffing)
MCP resources expose content catalogs (issue summaries, doc hierarchies, schemas) to reduce exploratory calls.
- B: Still a tool call, still the same exploratory pattern, and mandatory-call reliance is prompt-based.
- C: Bloats context and goes stale.
- D: Examples teach exploration rather than removing its need.

### Q11 - Answer: D (Trap: bulk read; single-name search)
Build understanding incrementally: Grep for entry points, identify exported wrapper names, search each, and Read selectively.
- A: Wastes context.
- B: Glob matches file paths, not content.
- C: Misses callers using the wrapper names.

### Q12 - Answer: B (Trap: repeating failing call)
When Edit lacks a unique anchor, Read the file and Write the modified version. (Widening the anchor text is another practical option in real use but is not offered here; the guide's stated fallback is Read + Write.)
- A: Deterministic failure repeats.
- C: Glob finds paths; it does not make text unique.
- D: Grep informs but does not change how Edit matches.

---

## Scoring table (12 questions)

| Score | Interpretation | What to review |
|---|---|---|
| 11-12 | Exam-ready for D2 | Skim tool_choice and MCP scoping once more |
| 9-10 | Solid | Review the task statement of each miss (2.2 error categories are commonly missed) |
| 6-8 | Borderline | Re-study 2.1 descriptions vs routers, 2.2 structured errors, 2.3 tool scoping; redo after 24h |
| 0-5 | Not ready | Re-read Domain 2 module; write two MCP tool descriptions and one structured error payload by hand |

Map misses: Q1, Q2 = 2.1; Q3, Q4, Q5 = 2.2; Q6, Q7 = 2.3; Q8, Q9, Q10 = 2.4; Q11, Q12 = 2.5.
