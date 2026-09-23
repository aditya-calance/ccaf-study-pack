# 24. Hands-On Labs and Resources

> Priority: SHOULD (but candidates' #1 regret was "not enough hands-on building"). If you have 90 minutes spare in your day, do Lab A (30 min) and Lab C (30 min) in a scratch folder; they convert the highest-weight abstractions into muscle memory. Exercises are adapted from the official guide's "Preparation Exercises" (Section 8).

---

## Lab A: Agentic loop + hooks + escalation (Domains 1, 2, 5), ~30 min
Goal: internalise `stop_reason`, tool results, structured errors, and a programmatic gate.

1. Define 3–4 tools: `get_customer`, `lookup_order`, `process_refund`, `escalate_to_human`. Give two of them similar purposes; write descriptions with input formats, examples, and boundaries.
2. Implement the loop: call → if `stop_reason == "tool_use"` execute **all** `tool_use` blocks → append one `user` message with all `tool_result`s → repeat; stop on `end_turn`.
3. Return structured errors: `{"isError": true, "errorCategory": "transient|validation|permission|business", "isRetryable": false, "message": "..."}`.
4. Add a gate: refuse `process_refund` unless `get_customer` returned a verified ID this session; add a policy hook that redirects refunds > $500 to `escalate_to_human`.
5. Test: multi-issue message; a timeout (transient) vs "refund window exceeded" (business); an ambiguous name that matches 2 customers (agent should ask for another identifier).

Check yourself: can you explain why the gate is code, not prompt? Why must every `tool_use` get a `tool_result`?

## Lab B: Claude Code team configuration (Domain 3), ~30 min
1. Root `CLAUDE.md` with universal standards; `@import` a `standards/testing.md`.
2. `.claude/rules/api.md` with `paths: ["src/api/**/*"]`; `.claude/rules/tests.md` with `paths: ["**/*.test.*"]`. Open a matching and a non-matching file; run `/memory` to see what loaded.
3. `.claude/skills/analyze-codebase/SKILL.md` with `context: fork`, `allowed-tools`, `argument-hint`.
4. `.mcp.json` with `${GITHUB_TOKEN}`; add a personal server at user scope. Confirm both are available.
5. Try plan mode on (a) a single-file bug fix, (b) a 40-file migration, (c) a feature with two valid designs. Note when planning pays off.
6. CI: `claude -p "Review this diff" --output-format json --json-schema '{...}'` locally; read the `structured_output` field.

## Lab C: Structured extraction pipeline (Domains 4, 5), ~30 min
1. Extraction tool with schema: required + optional/nullable fields, enum with `"other"` + `detail`, `"unclear"` value. Feed a document that lacks a field: verify `null`, not fabrication.
2. Validation-retry loop (Pydantic): on failure, resend document + failed output + specific error. Classify errors as retry-fixable (format) vs futile (info absent).
3. Add `calculated_total` next to `stated_total`; flag mismatches; add `conflict_detected`.
4. Batch 100 docs with the Message Batches API (`custom_id`); resubmit only failures; compute wall-clock vs SLA.
5. Emit field-level confidence; route low-confidence to review; segment accuracy by document type/field.

## Lab D: Multi-agent research pipeline (Domains 1, 2, 5), ~40 min
1. Coordinator with `allowedTools` including `Task`; two subagents with `AgentDefinition` (own prompts, restricted tools).
2. Pass findings **in the subagent prompt**; emit parallel `Task` calls in one response.
3. Findings shape: `{claim, evidence, source_url, doc_name, publication_date}`.
4. Simulate a timeout: subagent returns `{failure_type, attempted_query, partial_results, alternatives}`; coordinator proceeds and annotates coverage gaps.
5. Feed two credible but conflicting statistics with different dates: report both with attribution.

---

## Reference links (verified reachable during research, Sept 2026)
| Topic | URL |
|---|---|
| Claude Code docs (moved) | https://code.claude.com/docs/en/ (index: https://code.claude.com/docs/llms.txt) |
| Memory / CLAUDE.md | https://code.claude.com/docs/en/memory |
| Hooks | https://code.claude.com/docs/en/hooks |
| Skills | https://code.claude.com/docs/en/skills |
| Subagents | https://code.claude.com/docs/en/sub-agents |
| Headless / CI | https://code.claude.com/docs/en/headless ; https://code.claude.com/docs/en/github-actions |
| MCP in Claude Code | https://code.claude.com/docs/en/mcp |
| Agent SDK | https://code.claude.com/docs/en/agent-sdk/overview |
| API models / pricing (awareness) | https://platform.claude.com/docs/en/models/overview |
| Prompt caching (awareness) | https://platform.claude.com/docs/en/build-with-claude/prompt-caching |
| MCP spec | https://modelcontextprotocol.io/specification/latest |
| Building effective agents | https://www.anthropic.com/engineering/building-effective-agents |
| Multi-agent research system | https://www.anthropic.com/engineering/multi-agent-research-system |
| Writing tools for agents | https://www.anthropic.com/engineering/writing-tools-for-agents |
| Effective context engineering | https://www.anthropic.com/engineering/effective-context-engineering |
| Cowork getting started | https://support.claude.com/en/articles/13345190-getting-started-with-cowork |

## Candidate write-ups worth 10 minutes each
- Very Good Ventures, "A 738 Story": https://verygood.ventures/blog/passing-the-claude-certified-architect-exam/
- Sarvesh (Big Tech Careers): https://newsletter.bigtechcareers.com/p/how-i-passed-claude-architect-certification
- Suraj Khaitan (dev.to): https://dev.to/suraj_khaitan_f893c243958/i-passed-the-claude-certified-architect-foundations-cca-f-exam-my-journey-lessons-and-98j
- re:cinq: https://re-cinq.com/blog/claude-certified-architect-foundations-exam
- Sachin (Substack): https://aiwithsachin.substack.com/p/i-passed-the-claude-certified-architect

## Free / paid practice sources (quality varies; answers unverified vs Anthropic)
open-exam-prep.com/practice/anthropic-cca-f ; claudecertificationguide.com/mock-exam ; certificationpractice.com ; certsafari.com ; claudecertifiedarchitects.com. Beware: memorising a bank gave candidates false confidence (practice 930+, real 738).
