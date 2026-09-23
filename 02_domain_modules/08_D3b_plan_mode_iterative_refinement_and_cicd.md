# 8. Plan Mode, Iterative Refinement and CI/CD Integration (D3b)

> **Domain 3: Claude Code Configuration & Workflows (20%)** | Task statements: 3.4, 3.5, 3.6 | Priority: **MUST** (candidates reported more git/CI-CD flag questions than practice exams; the "Claude Code for CI/CD" scenario is in the 6-scenario pool) | Read time: ~20 min

## The 60-second version

- Plan mode for large, ambiguous, multi-file or architectural work (e.g. library migration touching 45+ files). Direct execution for small, well-scoped changes (one validation check in one function).
- Best combo: plan mode to investigate and design, then direct execution to implement the approved plan.
- The **Explore subagent** does verbose discovery in its own context and returns only a summary, protecting the main context window.
- Prose is interpreted inconsistently -> give **2-3 concrete input/output examples**.
- Test-driven iteration: write tests first (behavior, edge cases, performance), then share failures to drive fixes.
- Interview pattern: have Claude ask you questions first in unfamiliar domains (cache invalidation, failure modes).
- Interacting problems -> one detailed message; independent problems -> fix sequentially.
- CI: `claude -p` (non-interactive, no hangs) + `--output-format json` + `--json-schema` for machine-parseable findings; CLAUDE.md gives CI its context; use an **independent review instance**, not self-review; re-runs get prior findings and report only new/unaddressed issues; give existing tests to avoid duplicate test suggestions.

## Chapter 3.4 - Determine when to use plan mode vs direct execution

**Why the exam cares:** Questions give a task and ask which mode; the trap is over-planning trivial fixes or diving into a risky migration without exploring.

**Core concepts**
- **Plan mode**: read-only exploration and design; Claude proposes a plan and you approve before any change. Enter with Shift+Tab or `--permission-mode plan`. Fits large-scale changes, multiple valid approaches, architectural decisions, multi-file modifications. It prevents costly rework by choosing the approach before editing.
- **Direct execution**: simple, clear scope, you could describe the diff in a sentence (single-file bug fix with a stack trace, adding a date validation conditional).
- **Explore subagent**: read-only search agent that runs discovery in a separate context and returns a summary. Keeps grep output and file dumps out of the main conversation, avoiding context exhaustion in multi-phase tasks. Subagent spawning tool is named **Task** in the exam guide (`allowedTools` includes `"Task"`); newer SDK docs call it **Agent**.
- **Combined use:** plan mode (with Explore) to investigate a library migration and write the plan -> switch to direct execution to carry it out.

**Verify (lower-confidence notes):** notes_E states plan mode details (Shift+Tab toggle, `--permission-mode plan`, the built-in Plan subagent) and checkpoints/rewind (auto snapshot before edits, Esc Esc or `/rewind`, does not undo Bash side effects) "from prior knowledge", not fetched from docs. Confirm at /docs/en/permission-modes and /docs/en/sessions. The exam-relevant logic (when to plan vs execute, Explore isolates context) comes from the official guide.

**Do / Don't**

| Do | Don't | Why |
|---|---|---|
| Plan mode for 45+ file library migration | Start editing immediately | Multiple approaches and dependencies; rework is costly |
| Direct execution for a single-file fix with a stack trace | Plan mode for a typo/validation check | Overhead with no benefit |
| Explore subagent for "find every usage of the old API" | Grep repeatedly in the main session | Verbose output fills context |
| Plan, approve, then execute | Stay in plan mode for the entire task or skip the plan | Combined pattern is the guide's example |
| Choose plan mode for microservice restructuring | Choose it "because it is safer" for anything | Match to complexity, not fear |

**Worked example**

```text
Task: migrate from moment.js to date-fns across 45+ files, some with custom formatters.
1. Shift+Tab into plan mode.
2. Prompt: "Use the Explore subagent to catalogue every moment() usage by pattern.
   Propose a migration plan with order, risky spots, and test strategy."
3. Review and correct the plan (e.g. "handle timezone helpers first").
4. Exit plan mode; execute directly: "Implement step 1-3 of the plan."
Contrast: "add a null check in parseDate() at utils/date.ts:42" -> just do it.
```

**Exam traps**
- "Start direct execution and switch to plan if it gets complicated": for known architectural impact this risks rework.
- "Use a bigger context window / more tokens for the migration": does not address the problem; the Explore subagent does.
- "Plan mode for every task": over-engineering.
- Confusing plan mode (Claude Code feature) with extended thinking.

**Quick check**
- Restructure a monolith into microservices? -> Plan mode.
- Fix a one-line bug with a clear stack trace? -> Direct execution.
- How to keep discovery output from filling the context? -> Explore subagent (summary returned).

## Chapter 3.5 - Apply iterative refinement techniques for progressive improvement

**Why the exam cares:** Tests which refinement technique matches the failure: inconsistent output, edge cases, unfamiliar domain, or several bugs at once.

**Core concepts**
- **Input/output examples:** when prose descriptions produce inconsistent results, provide 2-3 concrete examples of input and the exact expected output. Also the fix for edge cases: give a specific test case (e.g. `null` values in a migration script: input row, expected result).
- **Test-driven iteration:** write the test suite first (expected behavior, edge cases, performance requirements), let Claude implement, run the tests, then paste the failures back. Each failure is precise feedback.
- **Interview pattern:** "Before implementing, ask me questions." Surfaces considerations you did not anticipate (cache invalidation strategy, failure modes, consistency) in domains you know less well. Use before implementation, not after.
- **Single message vs sequential:**
  - Problems that **interact** (fixing one changes another; e.g. shared schema and its validators): describe them all in one detailed message so Claude designs one coherent fix.
  - **Independent** problems: fix one at a time, verifying each; smaller changes are easier to check.

| Situation | Technique |
|---|---|
| Output format keeps coming back subtly different | 2-3 input/output examples |
| Correctness with many edge cases | Tests first, iterate on failures |
| New domain, unknown unknowns | Interview pattern |
| Null-handling bug in migration | Specific failing case: input + expected output |
| Three bugs sharing one cause/module | One message |
| Three unrelated bugs | Sequential |

**Do / Don't**

| Do | Don't | Why |
|---|---|---|
| Show `{"name": null}` -> `""` example | Re-describe "handle nulls gracefully" | Prose is ambiguous; examples are not |
| Share the exact failing test output | Say "still broken" | Failures localize the issue |
| Ask Claude to interview you for a caching layer | Accept the first design | Hidden requirements surface early |
| Bundle interacting fixes | Fix them serially and thrash | Each serial fix may break the other |
| Fix independent issues one by one | Dump 10 unrelated issues in one message | Harder to verify and attribute |

**Worked example**

```text
Prompt (transformation ambiguity):
Convert legacy phone strings to E.164. Examples:
  "(415) 555-0132"   -> "+14155550132"
  "415.555.0132 x9"  -> "+14155550132"   (extension dropped)
  ""                 -> null
  null               -> null
Write tests from these first, then implement; I'll share failures.

Interview prompt:
I want a caching layer for the product API. Before writing code, interview me:
ask about invalidation, staleness tolerance, failure modes, and traffic shape.
```

**Exam traps**
- "Add more detailed prose instructions" when examples are the effective fix.
- "Ask Claude to try again" without new information.
- "Always send all issues at once" or "always one at a time": the right answer depends on interaction.
- Self-reported confidence ("Claude says it works") instead of running tests.

**Quick check**
- Prose keeps being misread? -> 2-3 concrete input/output examples.
- How do failing tests help? -> Share them back to guide the next iteration.
- Two bugs in one interacting component? -> One message.

## Chapter 3.6 - Integrate Claude Code into CI/CD pipelines

**Why the exam cares:** A full scenario (PR review, test generation, false positives, batch vs blocking) plus the flag-level questions candidates said were more numerous than expected.

**Core concepts**
- **`-p` / `--print`**: non-interactive mode. Without it, a CI job waits for input and hangs. The answer to "pipeline hangs" is `-p`.
- **`--output-format json`** returns a machine-readable envelope (`result`, `session_id`, `total_cost_usd`); **`--json-schema '{...}'`** enforces the shape, and the validated data appears in a `structured_output` field. Use it to produce findings (file, line, severity, message) that a script posts as inline PR comments. (`stream-json` needs `--verbose`.)
- **CLAUDE.md for CI context:** CI-invoked Claude reads the repo's CLAUDE.md. Put testing standards, what counts as a valuable test, fixture conventions and review criteria there. This improves test generation and cuts low-value output. Keep it concise (read every run).
- **Session isolation:** the session that wrote the code retains its reasoning and is biased toward its own output. An **independent review instance** (fresh context) catches more. Self-review, or asking the same session "double check", is the distractor.
- **Re-runs after new commits:** include prior review findings in context and instruct: report only **new or still-unaddressed** issues. Prevents duplicate comments.
- **Test generation:** provide existing test files in context so Claude does not suggest scenarios already covered.
- **Batch API (out of scope for CLI details; from Domain 4/5):** 50% cheaper, up to 24h, no latency SLA. Fine for overnight/non-blocking jobs, wrong for a pre-merge check developers wait on.
- **GitHub Actions:** `anthropics/claude-code-action@v1` (GA; `@beta` deprecated, inputs renamed: `direct_prompt` -> `prompt`, `max_turns`/`model` move into `claude_args`). Quick setup with `/install-github-app`. Secrets: `ANTHROPIC_API_KEY` (or OAuth token). Permissions: contents, pull-requests, issues write. Interactive mode (`@claude` mention) vs automation mode (`prompt` input, any event or cron).
- **`--bare`**: skips hooks, skills, plugins, MCP, auto memory and CLAUDE.md discovery for reproducible CI runs; needs `ANTHROPIC_API_KEY`. **Verify:** notes_E says it is "recommended for CI, will become default" and that without it `-p` still runs project hooks and `.mcp.json`. Because `--bare` skips CLAUDE.md, pass context explicitly (e.g. `--append-system-prompt`) if you rely on it. Not in the exam guide; recent-docs material.
- **Permissions in CI:** `--allowedTools "Bash(git diff *),Read"` pre-approves only what is needed; `--permission-mode dontAsk` denies everything not pre-approved (lockdown; no prompt to hang on); `--max-turns` caps runtime/cost. **Verify:** `--permission-prompts none` appears in notes_E only; do not rely on it for the exam.

### CLI flags cheat table

| Flag / command | Purpose | Exam note |
|---|---|---|
| `-p`, `--print` | Non-interactive run, prints result, exits | Fix for CI hanging on input |
| `--output-format text\|json\|stream-json` | Output shape | `json` for parsing; `stream-json` needs `--verbose` |
| `--json-schema '<schema>'` | Enforce structured output (with json) | Result in `structured_output`; pairs with inline PR comments |
| `--allowedTools "Bash(git diff *),Read"` | Pre-approve specific tools | Least privilege in CI |
| `--permission-mode plan\|acceptEdits\|dontAsk\|auto` | Set permission behavior | `dontAsk` = deny anything not pre-approved |
| `--dangerously-skip-permissions` | Bypass all prompts | Avoid; sandbox-only awareness |
| `--max-turns N` | Cap agentic turns | Cost/time control (a limit, not a design for correctness) |
| `--append-system-prompt` | Add instructions to the system prompt | Inject CI rules |
| `--bare` | Skip hooks/skills/plugins/MCP/auto memory/CLAUDE.md | Reproducible CI |
| `--continue`, `--resume <session_id>` | Continue latest / specific session | Multi-step; but reviews should use a new session |
| `--settings`, `--mcp-config`, `--agents` | Load settings / MCP config / subagent JSON | Config injection |
| `/install-github-app` | Set up the GitHub app and secrets | Quick GitHub setup |
| `anthropics/claude-code-action@v1` | GitHub Action | `prompt`, `claude_args` inputs |
| `/memory`, `/rewind`, `/compact`, `/clear` | Session commands (interactive, not for `-p`) | Terminal-only commands do not work in `-p` |

**Verify (git/CI-CD reports):** candidates said the real exam had more git/pipeline command questions than practice tests, but no specific commands were named. Expect `-p`, `--output-format json`, `--json-schema`, `--allowedTools`, Action config, and worktree/branch-safe automation logic. `claude --worktree` (isolated parallel work) is from lower-confidence notes.

**Do / Don't**

| Do | Don't | Why |
|---|---|---|
| `claude -p "review this diff"` in the job | Run interactive `claude` | Hangs waiting for input |
| `--output-format json --json-schema` | Parse free text with regex | Guaranteed structure for automation |
| New session to review generated code | Ask the generating session to review itself | Retained reasoning biases it |
| Pass prior findings; "only new or unaddressed" | Re-review from scratch each push | Duplicate comments erode trust |
| Include existing test files in context | Ask for "more tests" blind | Duplicates already-covered scenarios |
| Put fixtures and review criteria in CLAUDE.md | Repeat them in every workflow prompt | One source; consistent |
| Batch API for nightly audits | Batch for PR gates | 24h window, no SLA |

**Worked example**

```bash
# PR review job
claude -p --bare --output-format json \
  --allowedTools "Read,Bash(git diff *)" \
  --permission-mode dontAsk --max-turns 8 \
  --json-schema '{"type":"object","properties":{"findings":{"type":"array","items":{
    "type":"object","properties":{"file":{"type":"string"},"line":{"type":"integer"},
    "severity":{"enum":["high","medium","low"]},"message":{"type":"string"}},
    "required":["file","line","severity","message"]}}},"required":["findings"]}' \
  "Review the diff. Prior findings: $(cat prior_findings.json). Report only new or unaddressed issues." \
  | jq '.structured_output.findings'
```

```yaml
# .github/workflows/review.yml (minimal)
on: { pull_request: { types: [opened, synchronize] } }
permissions: { contents: read, pull-requests: write, id-token: write }
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "Review this PR against the criteria in CLAUDE.md. Report only new issues."
          claude_args: "--max-turns 5"
```

**Verify:** exact input names in the workflow (`anthropic_api_key`, `prompt`, `claude_args`) are from notes_E; confirm at /docs/en/github-actions before relying on them. The exam tests concepts more than YAML.

**Exam traps**
- "Pipe `/dev/null` or `yes` into interactive Claude": hack; `-p` is the answer.
- "Use `--output-format json` alone to enforce a schema": it formats the envelope; `--json-schema` enforces structure.
- "Use extended thinking / bigger model to reduce review bias": the root cause is shared session context; use an independent instance.
- "Tell Claude to only report high-confidence findings": vague; false positives need explicit criteria (Domain 4).
- "Stuff test standards into the workflow prompt": CLAUDE.md is the designed mechanism.
- "Use Message Batches for the PR check": not for blocking flows.
- "`--max-turns` fixes wrong reviews": an iteration cap is a distractor, not a quality fix.

**Quick check**
- Job hangs waiting for input? -> Add `-p`.
- Machine-parseable findings for inline comments? -> `--output-format json` + `--json-schema`.
- Avoid duplicate comments on the second push? -> Give prior findings, ask for new/unaddressed only.
- Who reviews generated code? -> A separate, independent instance.

## Chapter recap

- I can choose plan mode vs direct execution and explain the combined pattern.
- I can explain what the Explore subagent isolates and why (Task/Agent tool).
- I can pick between input/output examples, test-driven iteration, the interview pattern, and single vs sequential messages.
- I can build a `claude -p` CI command with `--output-format json`, `--json-schema`, `--allowedTools`, and permission mode.
- I can explain why independent review beats self-review and how to avoid duplicate findings on re-runs.
- I can use CLAUDE.md and existing tests to improve CI test generation.
- I can state what `claude-code-action@v1` and `--bare` do, and flag the Verify items.

## Mnemonics

- **"P for Pipeline"**: `-p` means no prompt, no hang.
- **"JSON shapes the box, schema fills it"**: `--output-format json` vs `--json-schema`.
- **"Plan wide, cut narrow"**: plan mode for wide changes, direct execution for narrow ones.
- **"Show, don't tell"**: examples beat prose.
- **"Fresh eyes"**: a new session reviews; the author does not.
- **"Only the new"**: re-runs report new/unaddressed findings only.
