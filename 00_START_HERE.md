# CCAR-F (CCA-F) One-Day Study Pack: START HERE

**Exam:** Claude Certified Architect – Foundations (community name CCA-F; official code CCAR-F). 60 questions · 120 min · scaled 720/1000 to pass · 4 of 6 scenarios drawn at random.
**Basis:** official Exam Guide v1.0 (July 2026) + six candidate write-ups + public practice banks + current Claude API / Agent SDK / Claude Code / Cowork docs (researched Sept 2026).
**Goal:** take you from zero to exam-ready in one focused day, with a "why" behind every rule so you can reason through questions you have never seen.

---

## The one idea to hold onto

> **The exam tests judgement, not trivia.** Most options "would work". You are choosing the one that (1) fixes the *root cause*, (2) is *proportionate* (no over-engineering), and (3) uses **deterministic** mechanisms (code, hooks, schemas, config) where a rule *must* hold and **prompts** where it merely *should*.

That is the whole game; the rest of this pack is the technical detail that lets you apply it.

## What I found in the research (the short version)

| Finding | Consequence for your study |
|---|---|
| The exam is defined by **30 task statements in 5 domains** (D1 27% · D3 20% · D4 20% · D2 18% · D5 15%) | Every chapter here maps to task statements (1.1 … 5.6) |
| Real scores reported: 738, 881, 911. Practice scores of 930+ overstated readiness | Don't memorise banks; understand the principles; do the timed mock |
| Real questions are wordier; correct answers turn on **one qualifier** | Practise reading for qualifiers ("first step", "guarantee", "regardless of location") |
| Weakest areas for candidates: **Domain 5** and **Claude Code config**; surprise volume of **git/CI-CD flag** questions | Extra time on files 11–12, 07–08 |
| Eight trap patterns recur (prompt vs code; text-parsing loops; over-engineering; sentiment routing; too many tools; batch for blocking; self-review; wrong-component blame) | File 02 and the cheat sheet drill these |
| Out of scope: pricing, caching internals, streaming, auth, vision, computer use, fine-tuning, MCP hosting | File 14 (what's new) is context, not core |
| 2026 landscape moved (Fable 5.1 / Opus 5 / Sonnet 5 / Haiku 4.5, adaptive thinking, Managed Agents, Claude Code 2.1.x, Cowork) but the exam is written to stable concepts | Skim file 14 once; don't let it eat hands-on time |

## Folder map

```
ccaf_practice/
├── 00_START_HERE.md                          ← you are here
├── 01_foundations/
│   ├── 01_exam_intel_and_trend_analysis.md   format, blueprint, scenarios, candidate reports, traps
│   └── 02_answer_heuristics_and_mental_models.md   the 12 rules + elimination checklist
├── 02_domain_modules/                        one or two chapters per domain
│   ├── 03_D1a_agentic_loops_and_multi_agent_orchestration.md        1.1–1.3
│   ├── 04_D1b_enforcement_hooks_decomposition_sessions.md           1.4–1.7
│   ├── 05_D2a_tool_design_errors_and_tool_distribution.md           2.1–2.3
│   ├── 06_D2b_mcp_integration_and_builtin_tools.md                  2.4–2.5
│   ├── 07_D3a_claude_md_rules_skills_commands.md                    3.1–3.3
│   ├── 08_D3b_plan_mode_iterative_refinement_and_cicd.md            3.4–3.6
│   ├── 09_D4a_prompting_fewshot_and_structured_output.md            4.1–4.3
│   ├── 10_D4b_validation_retry_batch_and_multipass_review.md        4.4–4.6
│   ├── 11_D5a_context_management_and_escalation.md                  5.1, 5.2, 5.4
│   └── 12_D5b_error_propagation_human_review_and_provenance.md      5.3, 5.5, 5.6
├── 03_scenarios_and_updates/
│   ├── 13_scenario_playbooks.md              all 6 scenarios, decisions the exam probes
│   └── 14_whats_new_2026_api_models_claude_code_cowork.md
├── 04_practice/
│   ├── 15_official_sample_questions_annotated.md   the 12 official questions decoded
│   ├── 16_practice_D1_agentic_architecture.md
│   ├── 17_practice_D2_tools_and_mcp.md
│   ├── 18_practice_D3_claude_code.md
│   ├── 19_practice_D4_prompting_structured_output.md
│   ├── 20_practice_D5_context_and_reliability.md
│   ├── 21_full_mock_exam_60q.md              timed, 120 minutes
│   └── 22_mock_exam_answers_and_analysis.md
└── 05_reference/
    ├── 23_cheat_sheet_last_hour.md
    └── 24_hands_on_labs_and_resources.md
```

## The one-day schedule (≈ 13 hours with breaks)

Read in order. The learn → drill loop: every module block ends with its practice set.

| Time | Block | Files | Notes |
|---|---|---|---|
| 08:00–08:45 | **0. Orient** | 01, 02 | Read 02 slowly. It is the exam's thought process |
| 08:45–10:45 | **1. Domain 1 (27%)** | 03, 04 → then 16 | Loop, coordinator, hooks, decomposition, sessions. Biggest payoff |
| 10:45–11:00 | Break | | |
| 11:00–12:30 | **2. Domain 2 (18%)** | 05, 06 → then 17 | Tool descriptions, errors, `tool_choice`, MCP scopes |
| 12:30–13:15 | Lunch | | |
| 13:15–14:45 | **3. Domain 3 (20%)** | 07, 08 → then 18 | Config layers, plan mode, CI flags (extra-heavy on the real exam) |
| 14:45–16:15 | **4. Domain 4 (20%)** | 09, 10 → then 19 | Schemas, few-shot, retry, Batches math, review passes |
| 16:15–16:30 | Break | | |
| 16:30–17:45 | **5. Domain 5 (15%)** | 11, 12 → then 20 | Weakest area for candidates: read actively |
| 17:45–18:30 | **6. Scenarios** | 13 | Don't skip any of the six |
| 18:30–19:00 | Dinner | | |
| 19:00–19:30 | **7. Landscape** | 14 | Skim; know names and what's out of scope |
| 19:30–20:00 | **8. Official samples** | 15 | Decode the 12 real questions |
| 20:00–22:00 | **9. Full timed mock** | 21 → 22 | 120 minutes, no notes. Then analyse |
| 22:00–22:30 | **10. Patch weak spots** | 22's "re-read map", 23 | Cheat sheet last |

### If you only have 7–8 hours (triage)
1. 01 + 02 (45 min) → 2. 03, 04 (1.5 h) → 3. 05 (45 min) → 4. 07, 08 (1.25 h) → 5. 09, 10 (1.25 h) → 6. 11 (45 min) → 7. 15 (30 min) → 8. mock 21 timed (2 h) → 9. 23.
Skip: 06 detail (keep MCP scope table), 12 (read Section headers only), 14, 24.

### If you have 2 days
Day 1 as above without the mock. Day 2 morning: Labs A–C (file 24), reread 02, do 16–20 untimed, then the mock in the afternoon and patch.

## How to study each module (the loop)
1. Read **"The 60-second version"** first; predict what the chapter will say.
2. Read the chapter; for each *Do/Don't table*, ask "why is the anti-pattern tempting?".
3. Answer the *Quick check* items without looking.
4. Do the domain practice set; for every miss, write the **principle** and the **trap type**, not just the right letter.
5. Keep a running "my traps" list on paper (it goes in your head during the exam).

## Readiness targets
| Signal | Target |
|---|---|
| Domain practice sets (16–20) | ≥ 75% first attempt, ≥ 90% after review |
| Full mock (21), timed | **≥ 48/60 (80%)**, finishing with ≥ 10 minutes spare |
| Official 12 (file 15) | Can state the principle for each without reading the analysis |
| Cheat sheet | Can recite sections A, G, H from memory |

## Honest caveats
- The exam guide is v1.0 (July 2026) and "subject to change without notice". Re-check the Partner Academy page before the exam.
- The mock and practice questions here are **original** (written for this pack from the guide's logic). They are not real exam items; the only real items are the 12 in file 15. Third-party bank answer keys were not verifiable against Anthropic.
- Some Claude Code and SDK specifics (plan-mode toggles, checkpoints, `--bare`, hook event lists, AGENTS.md, Managed Agents details) come from docs briefs rather than the exam guide; chapters mark them **Verify**. They are unlikely to decide the exam; the guide's named concepts will.
- Exam content is under NDA: after the exam, don't share questions. This pack contains none.

## Quick sources
Official guide (Partner Academy) · code.claude.com/docs · platform.claude.com/docs · Anthropic Engineering: *Building effective agents*, *How we built our multi-agent research system*, *Writing tools for agents*, *Effective context engineering* · candidate write-ups listed in file 24.

Good luck. Trust the principles.
