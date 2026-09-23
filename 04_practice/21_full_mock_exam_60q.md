# 21. Full Mock Exam - 60 Questions (CCAR-F / CCA-F style)

> Format: 60 items, 4 scenarios x 15 questions, 120 minutes. Multiple-choice (select ONE) and multiple-response (select TWO or THREE - each item states how many). No partial credit is assumed for multiple-response items.
> Blueprint mix (approximate, matches the official weights): Agentic Architecture and Orchestration 16 | Tool Design and MCP Integration 11 | Claude Code Configuration and Workflows 12 | Prompt Engineering and Structured Output 12 | Context Management and Reliability 9 = 60. Which question belongs to which domain is deliberately NOT shown; see file 22 after you finish.
> This exam is original. It is intentionally wordier and harder than the official samples: constraints are spread across several phrases and most options are workable in some world. Choose the option that best fits ALL stated constraints and addresses the root cause with proportionate effort.
> Answer key and analysis: `22_mock_exam_answers_and_analysis.md`. Do not open it until you have finished.

## How to sit this exam

1. Set a 120-minute timer. Budget 2 minutes per question. There is no built-in slack, so aim for about 90 seconds on easy items to bank time for hard ones.
2. Pass 1 (about 90 min): answer everything. If a question is not resolved after 2 minutes, choose your best guess, flag it, move on.
3. Pass 2 (about 25 min): return to flagged items only. Many look easier on a second read.
4. Reserve the last 5 minutes to confirm multi-response items have the right NUMBER of selections.
5. Read every stem twice. The answer often turns on one qualifier hidden mid-sentence: "guaranteed", "first step", "most effective", "cannot be modified", "explicitly", "only after", "must", "without", "in any percentage of sessions".
6. Apply the exam philosophy: MUST happen -> code, hooks, schemas, gates. SHOULD happen -> prompts. Prefer the simplest, root-cause, proportionate fix. Be suspicious of: sentiment or self-confidence routing, arbitrary iteration caps, parsing text for loop end, bigger model or bigger context as a fix, more tools, self-review, batch API for blocking flows.
7. Closed book. Do not consult notes until scoring.

---

# SCENARIO 1: Customer Support Resolution Agent

You are the lead engineer for a customer support resolution agent built on the Claude Agent SDK. It handles high-ambiguity requests: returns, billing disputes, account problems. It reaches backend systems through custom MCP tools: `get_customer`, `lookup_order`, `process_refund` and `escalate_to_human`. The business target is 80%+ first-contact resolution while escalating when appropriate. Questions 1-15 refer to this system.

---

**Question 1** (Select ONE)

A compliance review of last month's transcripts finds that in 3% of sessions `process_refund` executed against an order that belonged to a different account than the person chatting. In every affected session the agent called `lookup_order` with an order number the customer typed and never called `get_customer`, even though the system prompt (rewritten twice already) states: "You MUST verify the account with get_customer before touching any order or refund." Finance says a mismatched refund is unacceptable in any percentage of sessions. Which change best addresses this?

A. Move the verification sentence to the first line of the system prompt, repeat it directly before the tool list, and add a worked example of a verified refund.
B. Add a programmatic gate in the tool-execution layer that rejects `lookup_order` and `process_refund` calls until `get_customer` has returned a verified customer ID in the current session, returning an error that tells the agent which step is missing.
C. Require the agent to write "Identity verified: yes/no" in its reasoning before each refund call and proceed only if it wrote "yes".
D. Run a nightly Claude-based audit of the day's refunds and automatically reverse any that look mismatched.

---

**Question 2** (Select ONE)

Your service's agentic loop is: send messages to Claude; if the response contains any text block, print it and return; otherwise execute the `tool_use` blocks, append the results, and repeat. In production, customers occasionally see only "Let me pull up that order for you." and the conversation ends without an answer. Traces show that Claude's response contained that sentence together with a `tool_use` block, and `stop_reason` was `"tool_use"`. Which fix is most reliable?

A. Continue the loop only when the text block ends with a colon or an ellipsis, since those signal an unfinished thought.
B. Raise the iteration limit and add a second pass that re-asks the question whenever the final text is shorter than 50 characters.
C. Drive the loop from `stop_reason`: append the assistant message, execute the requested tools and append results while it is `"tool_use"`, and present the response only when it is `"end_turn"`.
D. Instruct the model in the system prompt never to write text in the same turn as a tool call.

---

**Question 3** (Select ONE)

`lookup_order` returns `created_at` as a Unix epoch integer. The billing MCP server returns ISO 8601 strings with UTC offsets. A legacy returns service returns status as integers 1 through 4. In a noticeable share of sessions the agent mis-computes 30-day return-window eligibility and mislabels statuses. The billing and returns servers are vendor-operated; your team cannot change them. What is the most appropriate fix?

A. Add a hook that processes tool results after execution and normalizes timestamps to one format and numeric statuses to labelled strings before the model sees them.
B. Add a conversion table and date-arithmetic instructions to the system prompt.
C. Add a `convert_timestamp` tool and instruct the agent to call it after every lookup.
D. Add six few-shot examples showing epoch and offset conversions with correct eligibility decisions.

---

**Question 4** (Select ONE)

One customer message says: charged twice for order A, an item missing from order B, and please change the delivery address on open order C. The current agent either resolves the first issue and ends its reply, or interleaves all three and mixes up amounts. Given the first-contact-resolution goal, which restructuring is best?

A. Reply asking the customer to open three separate conversations so each gets a clean context.
B. Spawn three independent agent instances that each start from the raw message so no issue can contaminate another, then concatenate their replies.
C. Escalate every multi-issue message to a human because it exceeds single-agent capability.
D. Have the agent split the message into distinct issues, verify the customer once, investigate each issue (in parallel where independent) using that shared verified context, then synthesize a single unified resolution.

---

**Question 5** (Select ONE)

`escalate_to_human` creates a ticket that human agents work from a queue UI; they have no access to the AI conversation transcript. Human agents report that they must re-ask customers everything. Today the agent sends only `reason: "complex billing issue"`. What should you change?

A. Have the agent compile a structured handoff: verified customer ID, relevant order IDs, root-cause analysis, amounts involved, actions already taken, and a recommended next action.
B. Add the agent's self-reported confidence score and a sentiment label so the queue can prioritize.
C. Attach the customer's last three raw messages verbatim and let the human infer the rest.
D. Tell the customer to repeat the details to the human agent once connected.

---

**Question 6** (Select ONE)

Policy: refunds above $250 require human approval. The system prompt says so, yet in two weeks four refunds of $300-$480 went through. The rule must hold with certainty, and the customer should still be helped. Which implementation is best?

A. A hook that inspects completed refund results and, for amounts above $250, triggers a reversal and an alert.
B. Strengthen the prompt with the consequences of violations and three negative examples.
C. A hook that intercepts outgoing `process_refund` calls, blocks any with amount above $250, and redirects the flow to `escalate_to_human` with a handoff summary.
D. Remove `process_refund` from the agent entirely so humans issue every refund.

---

**Question 7** (Select ONE)

Your agent has `search_orders` (find orders by customer email, date range, or product) and `lookup_order` (full detail for one order ID). Both descriptions read "Finds order information." The agent often calls `lookup_order` with an email address and gets errors. The system prompt also contains: "When the customer mentions an order, immediately look up the order." What is the most effective first step?

A. Consolidate both into a single `find_order` tool that decides internally which backend to query.
B. Rewrite both descriptions with accepted input formats, example queries, edge cases and boundaries versus the sibling tool, and reword the system-prompt line that biases toward `lookup_order`.
C. Add a pre-processing layer that pattern-matches identifiers in user text and pre-selects the tool.
D. Add eight few-shot examples of correct selection to the system prompt.

---

**Question 8** (Select TWO)

`process_refund` returns `{"error": "Operation failed"}` for four distinct causes: gateway timeout, malformed order ID, refund window expired, and the agent's service account lacking rights for high-value refunds. The agent retries every failure three times and tells customers "please try again later". Which TWO changes fix this?

A. Cap the agent at one retry per tool call, in the system prompt, for all errors.
B. Return failures using the MCP `isError` flag with structured metadata: an error category (transient, validation, business, permission), an `isRetryable` boolean, and a human-readable description.
C. Return empty successful results for policy denials so the agent does not loop.
D. For business-rule violations, return a non-retryable marker with a customer-friendly explanation so the agent explains the outcome or offers alternatives instead of retrying.
E. Throw an exception that ends the session on any non-transient failure.

---

**Question 9** (Select ONE)

To ship faster, a team attached every internal tool to the support agent: 4 core tools, 7 analytics and reporting tools, 8 administration tools. Tool selection got worse, and the agent sometimes calls a report generator while answering a refund question. The analytics and admin tools are used only by other workflows. What is the most effective fix?

A. Set `tool_choice` to `"any"` so the agent must always pick a tool.
B. Upgrade to a larger model.
C. Add a long system-prompt section explaining when to use each of the 19 tools.
D. Restrict this agent to the small set of tools its role needs and move analytics and admin tools to the agents that own those workflows.

---

**Question 10** (Select ONE)

For a customer with recent orders, `lookup_order` sometimes returns `[]` after a database timeout, because the MCP server catches the exception and returns an empty list flagged successful. Customers are told "we have no orders on your account." What is the right fix?

A. Return an error result (with `isError`, a transient category and a retryable flag) for the timeout, and reserve a successful empty list for queries that genuinely matched nothing.
B. Keep returning an empty list but add a free-text warning field.
C. Have the agent call `lookup_order` three times whenever it sees an empty result and take the majority.
D. Return a generic "search unavailable" for both timeouts and genuine empty results.

---

**Question 11** (Select TWO)

Sessions with four or more issues reach 60+ turns. Every `lookup_order` call returns 45 fields, of which about 5 matter for returns. After the harness summarizes older turns, the agent sometimes says "a partial refund was promised" instead of "$84.17 promised for the damaged blender on 3 March", and customers dispute it. Which TWO changes best address this?

A. Trim tool outputs to only the return-relevant fields before they accumulate in context.
B. Instruct the summarizer to compress older turns harder.
C. Keep a persistent case-facts block (amounts, dates, order numbers, statuses, customer-stated expectations) in every prompt, outside the summarized history.
D. Move to a larger-window model and stop summarizing.
E. Tell the agent to re-ask the customer for amounts whenever it is unsure.

---

**Question 12** (Select ONE)

A customer writes: "Stop. I want to speak to a human agent about my order." The order status is trivially retrievable (shipped yesterday). Under the current prompt the agent offers to check the status first; the customer repeats the request and rates the chat poorly. What should the prompt encode for this case?

A. Acknowledge the frustration, attempt resolution, and escalate only after the customer asks a third time.
B. Look up the status first so the handoff is richer, then escalate.
C. Honor the explicit request immediately by escalating with a structured handoff, without first attempting investigation.
D. Escalate only if a sentiment score exceeds a negative threshold.

---

**Question 13** (Select ONE)

`get_customer` called with the name "Priya Nair" returns three matching records. The agent currently selects the record with the most recent order. Some customers have been shown another person's order data. What should the agent do instead?

A. Rank the matches with a heuristic combining recency and name-similarity and proceed if the top score exceeds a threshold.
B. Ask the customer for additional identifying information (such as email, phone, or an order number) to disambiguate before proceeding.
C. Escalate every multi-match lookup to a human agent.
D. Show the customer a short summary of all three records and ask which is theirs.

---

**Question 14** (Select ONE)

The agent's repository requires every tool handler to include a structured-logging call. The lead added that rule to `~/.claude/CLAUDE.md` on her laptop and her Claude Code sessions comply. A teammate who joined last week generates handlers without logging, in the same repo. What is the most direct fix?

A. Ask the new teammate to copy the lead's home-directory file.
B. Put the rule in a file under `.claude/commands/`.
C. Add a `commands` array to a `.claude/config.json`.
D. Move the rule into the project-level CLAUDE.md (or a topic file under `.claude/rules/`) committed to the repo, and use `/memory` to confirm which memory files are loaded in each developer's session.

---

**Question 15** (Select ONE)

Tool descriptions are already thorough (formats, boundaries, examples). Even so, for ambiguous messages such as "where's my refund for the blender?" (order status, refund status, or account lookup?), the agent picks inconsistent tools. What is the most effective next step?

A. Add three or four targeted few-shot examples of ambiguous requests, each showing the chosen tool and why it was preferred over the plausible alternatives.
B. Add forty examples covering every conceivable phrasing.
C. Force `tool_choice` to `lookup_order` for all requests.
D. Add a keyword-based pre-classifier that picks the tool before the model runs.

---

# SCENARIO 2: Multi-Agent Research System

You are building a multi-agent research system with the Claude Agent SDK. A coordinator delegates to specialized subagents: web search, document analysis, synthesis and report generation. The system researches topics and produces comprehensive, cited reports. Questions 16-30 refer to this system.

---

**Question 16** (Select ONE)

The coordinator's prompt tells it to run web search, then document analysis, then synthesis, then report generation for every request. A user asks "What year was the EU AI Act formally adopted?" and the system spends four minutes on the full pipeline. Which coordinator change is most appropriate?

A. Add a rule that queries under 20 words skip the synthesis subagent.
B. Have the coordinator analyze each query's complexity and requirements and dynamically select which subagents to invoke instead of always running the full pipeline.
C. Merge all four subagents into one agent that always does everything.
D. Cache the outputs of all previous queries and return the nearest match.

---

**Question 17** (Select TWO)

Reports on "the future of urban mobility" cover e-scooters and bike share and omit public transit, autonomous vehicles, ride-hailing and infrastructure. Every subagent completes its assigned work correctly. The coordinator's log shows the subtasks "e-scooter regulation", "bike-share economics", "micromobility safety". Which TWO changes best address this?

A. After receiving synthesis output, have the coordinator evaluate coverage gaps, re-delegate targeted queries to search and analysis subagents, and re-invoke synthesis until coverage is sufficient.
B. Give the synthesis agent broader web search tools so it can fill gaps itself.
C. Increase the maximum output tokens of the synthesis agent.
D. Tell each search subagent to widen its queries beyond its assigned subtopic.
E. Change the coordinator's decomposition step to enumerate the topic's full breadth first, then partition it into distinct, non-overlapping subtopics or source types.

---

**Question 18** (Select ONE)

The coordinator invokes the synthesis subagent with the prompt "Synthesize the research findings gathered so far." The subagent returns a generic report with no citations and says it has no findings. The web search and document analysis subagents produced good results in earlier turns. What is the right fix?

A. Enable a shared memory that persists between subagent invocations.
B. Move synthesis to a larger model.
C. Have the coordinator pass the complete prior findings directly in the synthesis prompt, in a structured format that keeps content separate from metadata such as source URL, document name, page and date.
D. Add "Task" to the synthesis subagent's allowed tools so it can ask the other subagents for their results.

---

**Question 19** (Select ONE)

The coordinator must research five independent subtopics. The trace shows: turn 1 emits one subagent-spawning call for subtopic 1; after it returns, turn 2 emits one for subtopic 2; and so on. Total latency is roughly five times a single call. The coordinator's allowed tools already include the spawning tool ("Task"; called "Agent" in newer SDK docs). What is the best fix?

A. Use `fork_session` once per subtopic.
B. Cut the research to three subtopics.
C. Run the subagents in separate OS threads from application code outside the SDK and stitch results together manually.
D. Have the coordinator emit multiple spawning calls in a single response for independent subtopics so they run in parallel.

---

**Question 20** (Select ONE)

The coordinator prompt reads: "Step 1: search for 'X market size 2024'. Step 2: open the first three results. Step 3: extract all numbers..." When a source is paywalled, subagents stall and cannot adapt. Which redesign fits multi-agent best practice?

A. State research goals and quality criteria (coverage, source diversity, recency, citation requirements) and let subagents choose how to achieve them.
B. Add more numbered steps that cover paywalls and other failure cases.
C. Replace the coordinator with a fixed script.
D. Remove the quality criteria so subagents have fewer constraints.

---

**Question 21** (Select ONE)

Two days ago you ran a named investigation session of a 200-file legacy monolith. Overnight a teammate merged changes to 6 of those files. You need to continue the investigation. Which approach is best?

A. Start a fresh session and re-explore all 200 files.
B. Resume the named session with `--resume <session-name>` and tell the agent which 6 files changed so it re-analyzes those specifically.
C. Resume the session and say nothing; the agent will notice the changes on its own.
D. Use `fork_session` from the original baseline and replay every earlier tool call.

---

**Question 22** (Select ONE)

To cut latency, an engineer lets the web search subagent send results directly to the synthesis subagent, bypassing the coordinator. In testing, when a search fails partway, synthesis silently produces reports with missing sections and nobody can see what information flowed where. Which principle should guide the redesign?

A. Keep direct subagent messaging and add logging inside the synthesis agent.
B. Have all subagents write to a common shared memory store.
C. Route all inter-subagent communication through the coordinator for observability, consistent error handling and controlled information flow.
D. Have the synthesis agent poll the search agent's status.

---

**Question 23** (Select ONE)

The document analysis subagent has two tools: `analyze_content` ("Analyzes content and returns findings") and `analyze_document` ("Analyzes a document and returns findings"). The model frequently picks the wrong one. Which fix is most effective?

A. Force `tool_choice` to `analyze_document` on every turn.
B. Merge them into one `analyze` tool with a mode parameter.
C. Add six few-shot examples to the system prompt.
D. Rename and split by purpose with distinct input/output contracts (for example `extract_web_results` for web page content, plus purpose-specific tools such as `extract_data_points` and `verify_claim_against_source`) and write descriptions that state inputs, outputs and when to use each versus alternatives.

---

**Question 24** (Select ONE)

The document analysis subagent uses a generic `fetch_url` tool. Logs show it fetching arbitrary pages (login walls, tracker pages, non-document links), wasting context. Which is the best fix?

A. Replace `fetch_url` with a constrained `load_document` tool that validates that the URL points to a supported document.
B. Add a system-prompt sentence: "Only fetch document URLs."
C. Also give the subagent a web search tool so it can find better URLs.
D. Add a hook that summarizes whatever `fetch_url` returns.

---

**Question 25** (Select TWO)

The web search subagent sees intermittent 503 errors from the search provider; most succeed on retry. Currently every failure goes to the coordinator as "search failed" and the coordinator retries the whole subtopic. Which TWO changes are correct?

A. Have the subagent silently return an empty successful result after the first failure.
B. Terminate the whole research run whenever any subagent reports a failure.
C. Have the subagent retry transient failures locally, with backoff, before reporting anything.
D. When recovery fails, propagate structured error context to the coordinator: failure type, attempted query, partial results and alternative approaches.
E. Remove retries from subagents and return a generic "unavailable" status.

---

**Question 26** (Select ONE)

The team wants (1) a shared code-search MCP server that every developer receives automatically when cloning the repo, authenticated by each developer's own token with no secrets committed; and (2) one developer's experimental MCP server visible only to her. Both must be usable in the same session. What is the correct configuration?

A. Put both in `~/.claude.json` and share instructions on the wiki.
B. Put the shared server in project-level `.mcp.json` using environment variable expansion for the token (for example `${SEARCH_TOKEN}`), and the experimental server in user-scoped `~/.claude.json`.
C. Put the shared server in `.mcp.json` with the literal token and the personal server in the same file, gitignored.
D. Use profiles, because only one MCP server can be active per session.

---

**Question 27** (Select ONE)

Analysts run a `/deep-dive` procedure that reads dozens of files and prints thousands of lines of exploration, degrading the main conversation. The team wants it shared through the repo, isolated from the main context, and limited to read-only tools. What should you do?

A. Create `~/.claude/commands/deep-dive.md` that says "be brief".
B. Add a section to the root CLAUDE.md.
C. Create `.claude/skills/deep-dive/SKILL.md` with `context: fork` and `allowed-tools` limited to read-only tools.
D. Create a personal skill in `~/.claude/skills/` with `allowed-tools` set.

---

**Question 28** (Select ONE)

The document analysis subagent finds two credible sources: an industry body reports 42% cloud adoption among mid-size firms (survey year 2022); a consultancy reports 61% (survey year 2025). Today the subagent keeps the larger value and synthesis presents 61% as fact. Which handling best preserves provenance?

A. Silently keep the more recent value.
B. Average the two values.
C. Drop both because they conflict.
D. Include both values with source attribution and dates in the structured output, annotate the conflict, and let the coordinator decide how to reconcile before synthesis.

---

**Question 29** (Select ONE)

The synthesis agent receives 34 findings (about 28,000 tokens) concatenated in retrieval order. Reports reliably reflect the first and last sources but omit findings from the middle. Which change is most effective?

A. Put a key-findings summary at the start of the aggregated input, organize the details under explicit section headers, and have upstream agents return concise structured facts rather than verbose content.
B. Switch to a model with a larger context window.
C. Randomize input order on each run and merge the outputs.
D. Add the instruction "give equal attention to sources in the middle."

---

**Question 30** (Select ONE)

The patent-database subagent could not be reached even after local retries. The other three source types succeeded, and the report is due. Which output is best?

A. Omit the patent section without mention.
B. Deliver the report with coverage annotations distinguishing well-supported findings from topic areas with gaps due to unavailable sources, and note the failure.
C. Fail the whole task.
D. Fill the patent section from the model's background knowledge without marking it.

---

# SCENARIO 3: Claude Code for Continuous Integration

You are integrating Claude Code into a CI/CD pipeline (GitHub Actions). The system runs automated code review, generates test cases, and posts feedback on pull requests. You must design prompts that give actionable feedback and minimize false positives. The repository is a monorepo. Questions 31-45 refer to this system.

---

**Question 31** (Select ONE)

The job runs `claude -p "Review this PR and list findings"`; a script uses regular expressions on the prose output to create inline PR comments. Formatting varies run to run, so roughly 10% of comments fail to attach to the right line. Which change is most reliable?

A. Append "Respond with valid JSON only" to the prompt and call `json.loads` on the output.
B. Add `--verbose` to the command.
C. Run with `--output-format json` together with `--json-schema` describing the finding fields (file, line, severity, issue, suggested fix) and consume the machine-readable result.
D. Post-process the prose with a second Claude call that reformats it.

---

**Question 32** (Select ONE)

Reviews rerun on every push. Developers complain about repeated comments on issues already flagged, some of which they have already fixed. What should you do?

A. Run the review only on the first push of each PR.
B. Hash each comment and skip ones identical to earlier comments in the script.
C. Delete all previous bot comments and repost the full review each time.
D. Supply the prior review findings in the context on each rerun and instruct Claude to report only new or still-unaddressed issues.

---

**Question 33** (Select TWO)

Generated tests often duplicate scenarios already covered, use ad hoc mocks instead of the team's fixtures, and include trivial getter tests. Which TWO changes will most improve test generation?

A. Increase temperature to get more varied tests.
B. Provide the existing test files in context so generation avoids scenarios already covered.
C. Ask for 50 tests and randomly keep 10.
D. Switch the job to the Message Batches API to save cost.
E. Document testing standards, criteria for valuable tests, and available fixtures in CLAUDE.md.

---

**Question 34** (Select ONE)

Step 1 of the pipeline is a Claude Code session that implements auto-fixes for lint failures. Step 2, in the same session, asks: "Review the changes you just made for bugs." It rarely finds anything, while human reviewers regularly find bugs in the same changes. Which change is best?

A. Run the review in a separate, independent Claude Code instance that does not carry the generator's reasoning context.
B. Enable extended thinking during the self-review.
C. Strengthen the instruction to "be extremely critical of your own work".
D. Have the same session review twice, with a checklist the second time.

---

**Question 35** (Select ONE)

The monorepo has packages `payments`, `web` and `infra`, each with different maintainers and standards. The root CLAUDE.md is 900 lines; CI review comments cite payments rules on web code. Which reorganization is best?

A. Keep the single file but add headings.
B. Split standards into focused files and use `@import` in each package's CLAUDE.md to include only the standards relevant to that package (or use `.claude/rules/` topic files).
C. Duplicate the full root file into every package directory.
D. Move the standards into `~/.claude/CLAUDE.md` on the CI runner.

---

**Question 36** (Select ONE)

Migration SQL conventions must apply to every `*.sql` file, which live in `db/migrations`, `services/*/sql` and `tools/*/fixtures`. You want the conventions loaded only when Claude edits such files, to conserve context. What is the best mechanism?

A. Put them in the root CLAUDE.md.
B. Put a CLAUDE.md in each of those directories.
C. Create a `.claude/rules/` file with YAML frontmatter `paths` containing a glob such as `**/*.sql`.
D. Create a skill that developers must remember to invoke.

---

**Question 37** (Select ONE)

The team has a project skill `.claude/skills/review-pr`. One engineer wants a stricter variant for her own use without changing anyone else's behavior. What should she do?

A. Edit the committed `SKILL.md`.
B. Add her stricter rules to the project CLAUDE.md.
C. Commit a modified copy at `.claude/skills/review-pr-strict/` and tell teammates to ignore it.
D. Create a personal variant under `~/.claude/skills/` with a different name.

---

**Question 38** (Select TWO)

Which TWO pairings of task and approach are most appropriate?

A. Fix an off-by-one in a single function whose stack trace is in the CI log: direct execution.
B. Migrate an HTTP client across 52 files where two wrapper designs are viable: direct execution with a long upfront specification.
C. Add a date-validation conditional to one form handler: plan mode with the Explore subagent first.
D. Restructure a monolith into services, touching dozens of files with open decisions about boundaries: plan mode for exploration and design, then direct execution to implement.
E. Rename a local variable: plan mode, to avoid rework.

---

**Question 39** (Select ONE)

The prompt "Convert legacy user records to the new schema, handling missing values sensibly" yields a script that treats null `middle_name` inconsistently: sometimes an empty string, sometimes "N/A", sometimes dropping the record. You have reworded the prose three times. What is most effective?

A. Provide two or three concrete input/output examples including a null case, plus tests with expected outputs, then iterate by sharing failures.
B. Rewrite the prose with even more detail.
C. Move to a larger model.
D. Run the generation five times and take the majority behavior.

---

**Question 40** (Select ONE)

You must add a distributed cache layer to a service, in a domain where you are unfamiliar with invalidation strategies, stampede protection and failure modes. Which way of working with Claude Code best surfaces considerations you may not have anticipated?

A. Ask Claude to implement immediately and patch problems as they appear.
B. Have Claude interview you with questions about invalidation, consistency and failure modes before it implements anything.
C. Write a 200-line specification from memory and give it to Claude.
D. Skip design and write tests afterwards.

---

**Question 41** (Select ONE)

The reviewer prompt says: "Review this diff. Be conservative and only report high-confidence findings." Developers dismiss about 60% of comments (naming nits, comment wording), and trust is falling even for genuine security findings. What is the best fix?

A. Require a numeric confidence of at least 0.9 on each finding.
B. Lower the sampling temperature.
C. Replace the vague instruction with explicit categorical criteria: report defined classes such as bugs and security vulnerabilities, skip minor style and local patterns, and give concrete code examples per severity level; optionally disable the noisiest category while it is being improved.
D. Add a second model pass that filters out findings it considers unimportant.

---

**Question 42** (Select ONE)

A nightly job generates tests for 300 modules. Each generation currently lets Claude call a `run_tests` tool mid-generation and repair failures. A manager wants the Message Batches API for the 50% saving. Separately, a pre-merge review check must stay fast because developers wait on it. Which plan is best?

A. Move both workflows to batch and poll for completion.
B. Submit the nightly job as a batch as it is today, with tool calls mid-request.
C. Keep both synchronous because batch results cannot be matched to requests.
D. Keep pre-merge synchronous. For nightly, restructure into single-turn generation requests in a batch (one `custom_id` per module), run the tests outside the request after results return, and resubmit only modules that fail.

---

**Question 43** (Select ONE)

Developers dismiss some review comments. The team wants to analyze systematically which code constructs generate findings that get dismissed, so they can fix the prompt. What should each structured finding include?

A. A `detected_pattern` field naming the code construct that triggered the finding, alongside location, issue, severity and suggested fix.
B. A free-text "reasoning" paragraph.
C. A count of dismissals per file.
D. A field where the developer writes a reason when dismissing.

---

**Question 44** (Select ONE)

A nightly job is asked to "add comprehensive tests" to a 400-file legacy module whose structure and dependencies are poorly documented. Which task-decomposition approach fits?

A. A fixed prompt chain that generates tests file by file in alphabetical order.
B. First map the structure and identify high-impact areas, then create a prioritized plan that adapts as dependencies are discovered.
C. A single prompt: "add comprehensive tests to this module."
D. Pick a random sample of files and generate tests for those only.

---

**Question 45** (Select ONE)

The review pipeline needs Jira ticket lookup for context and access to an internal, proprietary release-gate service. What is the best integration approach?

A. Write custom MCP servers for both.
B. Use a community Jira MCP server and describe the release gate in the prompt.
C. Adopt an existing community Jira MCP server configured in project `.mcp.json` with environment variable expansion for credentials, and build a custom MCP server only for the release-gate service.
D. Use Bash and `curl` for both.

---

# SCENARIO 4: Structured Data Extraction

You are building a system that extracts information from unstructured documents (invoices, receipts, lab reports, contracts), validates the output with JSON schemas, and feeds downstream systems including an ERP. It must maintain high accuracy and handle edge cases. Questions 46-60 refer to this system.

---

**Question 46** (Select ONE)

Your prompt says "Return JSON with these fields" and the code calls `json.loads`; about 2% of responses have syntax problems (trailing commas, prose wrappers). After moving to tool use with a strict JSON schema, syntax errors vanish. A finance reviewer now finds invoices where line items do not sum to the stated total, and amounts sitting in the wrong fields. Which statement and next step are correct?

A. Schema-enforced tool use guarantees semantic correctness, so the bug must be in the schema definition.
B. Set the temperature to zero to remove the remaining errors.
C. Switch back to free-form JSON, which handles semantics better.
D. Tool use with a schema eliminates syntax errors but not semantic ones, so add semantic validation (for example comparing summed line items to the stated total) and a retry that feeds back the specific error.

---

**Question 47** (Select ONE)

The schema marks `purchase_order_number` as a required string. Invoices without a PO number get plausible but fabricated numbers. What is the best fix?

A. Make the field optional or nullable so the model can return null when the source lacks it, keeping fields that are always present as required.
B. Tell the prompt to output "UNKNOWN" when unsure while keeping the field required.
C. Retry until the model produces a value.
D. Add a regular-expression format check to the field.

---

**Question 48** (Select ONE)

You have `extract_invoice`, `extract_receipt` and `extract_contract` tools with different schemas, and incoming document types are unknown. Occasionally the model replies in plain text ("This looks like an invoice...") instead of calling a tool. Which `tool_choice` setting fits?

A. `"auto"`
B. `"any"`
C. Forced selection of `extract_invoice`
D. None; rely on stronger prompt wording

---

**Question 49** (Select ONE)

A `document_category` enum lists invoice, receipt, credit_note, purchase_order. New kinds (statements, delivery notes) get forced into wrong values, and ambiguous documents get guessed. Which schema design is best?

A. Replace the enum with a free-text string.
B. Add each new category to the enum as it appears and redeploy weekly.
C. Add an `"other"` value with a companion detail string, and an `"unclear"` value for ambiguous documents.
D. Remove the field.

---

**Question 50** (Select ONE)

Three validation failures occur: (1) the date "03/04/25" fails an ISO date check; (2) `vendor_tax_id` is null because the document says "see attached tax certificate", which was never provided; (3) a currency symbol appears in a numeric field. The team plans retry-with-error-feedback for all three. Which prediction is correct?

A. All three will be fixed by retrying.
B. None will be fixed.
C. Only (2) will be fixed.
D. Retrying with the document, the failed extraction and the specific errors will likely fix (1) and (3), which are format problems; (2) will not, because the information is absent from the source, and should be left null and routed for review.

---

**Question 51** (Select ONE)

Some invoices show a line-item sum that differs from the stated total, and some documents contradict themselves (subtotal on page 1 differs from page 3). Which design best supports downstream handling?

A. Extract `calculated_total` alongside `stated_total` to flag discrepancies, and add a `conflict_detected` boolean for internally inconsistent sources.
B. Add "double-check the totals" to the prompt.
C. Overwrite `stated_total` with the calculated value.
D. Reject any document with an inconsistency.

---

**Question 52** (Select ONE)

Lab-report PDFs present reference ranges in a table, or in narrative text, or in footnotes. The model returns null for `reference_range` on narrative-style reports even though the range is present. The instructions are already detailed. What is the most effective fix?

A. Add still more detailed instructions.
B. Add three or four few-shot examples showing correct extraction from each document structure (table, narrative, footnote).
C. Force a specific tool call.
D. Retry each null result once.

---

**Question 53** (Select TWO)

A nightly batch of 5,000 invoices has a 2.4% failure rate: about 60 documents exceeded the context limit and the rest produced malformed output. Next week a much larger volume is planned and the team wants to minimize resubmission cost. Which TWO actions are best?

A. Resubmit the entire batch.
B. Resubmit only the failed documents identified by `custom_id`, chunking the oversized ones.
C. Refine the prompt and schema on a small representative sample set before submitting large volumes.
D. Switch the job to the synchronous API to avoid failures.
E. Change the batch to run multi-turn tool calls so the model can repair failures within the request.

---

**Question 54** (Select ONE)

A `post_to_erp` tool writes validated data to the ERP. Policy: nothing may be posted unless schema validation and the totals check have passed. The prompt states this, yet about 1% of documents are posted after failed validation. What is the best fix?

A. Repeat the policy more emphatically in the system prompt.
B. Add few-shot examples of correctly skipped posts.
C. Enforce it in code with a prerequisite gate that blocks `post_to_erp` until a passed validation result is recorded for that document, and returns an error routing failures to review.
D. Ask a second Claude instance to approve each post.

---

**Question 55** (Select ONE)

A 180-page master services agreement must yield about 40 fields drawn from many sections. A single call gives inconsistent depth and misses fields from the middle. Which approach is best?

A. Use a model with a larger context window.
B. Run the same call three times and merge.
C. Summarize the whole document first and extract from the summary.
D. Extract section by section in focused passes, then run a separate cross-section integration pass to reconcile fields and conflicts.

---

**Question 56** (Select ONE)

The pipeline must always run `extract_metadata` (document type, language, page count) before any enrichment tool. Sometimes the model calls an enrichment tool first or answers in text. What is the most reliable approach?

A. Use `tool_choice` with forced selection of `extract_metadata` on the first request, then continue with follow-up turns for the later steps.
B. Set `tool_choice` to `"any"` on every turn.
C. Put the ordering rule in the prompt.
D. Use `"auto"` with few-shot examples.

---

**Question 57** (Select ONE)

Before each extraction the agent makes many exploratory calls to list vendors, GL account codes and schema versions, adding latency. Which MCP-based improvement is most fitting?

A. Add more listing tools.
B. Expose those catalogs as MCP resources so the agent sees what is available without exploratory tool calls.
C. Paste the full catalogs (tens of thousands of entries) into the system prompt.
D. Raise the agent's iteration limit.

---

**Question 58** (Select ONE)

The dashboard shows 97% field-level accuracy overall, and the team proposes removing human review for all documents. Volume mix: invoices 80%, handwritten receipts 12%, faxed contracts 8%. What should you do first?

A. Approve the removal; 97% clears the bar.
B. Halve the amount of human review and re-measure.
C. Break accuracy down by document type and field before deciding, because an aggregate can hide poor performance on smaller segments.
D. Retrain the model on more invoices.

---

**Question 59** (Select THREE)

Reviewer capacity is limited. You want to reduce human review safely. Which THREE practices are correct?

A. Have the model output field-level confidence scores and calibrate review thresholds against a labeled validation set.
B. Sample high-confidence extractions with stratified random sampling for ongoing error-rate measurement and to detect new error patterns.
C. Rely on the 97% aggregate accuracy figure to switch off review for common types.
D. Auto-approve any document where the model says it is "confident" overall, without calibration.
E. Route low-confidence extractions and ambiguous or contradictory source documents to human review first.
F. Sample only the documents already flagged as low confidence.

---

**Question 60** (Select ONE)

A reconciliation step flags the price for one SKU as contradictory: $4.10 in one contract and $4.85 in another. The structured outputs contain no dates. Later you learn one is from 2023 and the other is a 2025 amendment. What is the right design change?

A. Always keep the higher value.
B. Ask the model to detect duplicates and merge them.
C. Average conflicting values.
D. Require publication or effective dates in the structured output so reconciliation can recognize temporal differences instead of contradictions, and annotate conflicts rather than choosing arbitrarily.

---

**End of exam.** Count your flagged items, then open file 22.
