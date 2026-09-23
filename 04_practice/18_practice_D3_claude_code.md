# 18. Practice Set - Domain 3: Claude Code Configuration & Workflows

> 12 original questions covering task statements 3.1-3.6 (CLAUDE.md hierarchy, commands/skills, path-specific rules, plan mode vs direct execution, iterative refinement, CI/CD with `-p`). Two are select-two. Style mimics the official sample questions: every option is workable-sounding, and the key is the root-cause, proportionate fix. Do the whole set first, then open the answer key. Budget about 2 minutes per question.
>
> All questions are original; contexts are varied on purpose. Do not memorize them - memorize the reasoning patterns in the key.
> Verify note: flag names used in Q10 (`-p`, `--output-format json`, `--json-schema`) are from the official guide; the exact JSON field that carries schema-validated output (`structured_output` per notes_E) is lower confidence - check current docs.

---

## Questions

### Q1 [Code Generation with Claude Code | 3.1 | Easy-Medium]
Your tech lead spent a week writing a thorough set of testing and commit-message conventions and saved them in her `~/.claude/CLAUDE.md`. Claude Code follows them perfectly for her. A developer who joined this week runs the same tasks in the same repository and Claude ignores every convention. Both are on the latest Claude Code version and have the same repository checked out. What is the most effective fix?

A. Ask each new developer to copy the tech lead's `~/.claude/CLAUDE.md` into their own home directory during onboarding.
B. Paste the conventions into the repository README so Claude reads them when it scans the project.
C. Move the conventions into the project-level CLAUDE.md (root `CLAUDE.md` or `.claude/CLAUDE.md`) and commit it; have developers run `/memory` to confirm the file is loaded.
D. Convert the conventions into a skill saved in each developer's `~/.claude/skills/` directory so they load on demand.

### Q2 [Claude Code Configuration for Teams | 3.1 | Medium]
A monorepo has three packages: `payments`, `web`, and `mobile-sdk`. A 700-line root `CLAUDE.md` contains everything: PCI handling rules, accessibility rules, iOS/Android packaging steps, and general code style. The team also keeps focused standards files in `docs/standards/` (`pci.md`, `a11y.md`, `mobile-release.md`, `style.md`). Developers report that when working in `mobile-sdk`, Claude sometimes applies PCI rules and it burns context on unrelated material. Domain maintainers know exactly which standards apply to which package. Which restructuring is best?

A. Keep the root `CLAUDE.md` short with universal rules only, and add a `CLAUDE.md` in each package that uses `@import` to pull in only the standards files relevant to that package.
B. Keep the single file but reorder sections so the `mobile-sdk` content appears last and is therefore weighted most heavily.
C. Add a line at the top of the root `CLAUDE.md`: "Ignore any section that does not apply to the package you are currently editing."
D. Move all standards into `.claude/rules/` files with no `paths` frontmatter so each topic lives in its own file.

### Q3 [Developer Productivity | 3.2 | Medium]
Your team has a `/dependency-audit` skill in `.claude/skills/dependency-audit/SKILL.md`. Each run dumps thousands of lines of transitive dependency analysis into the conversation. After two invocations in one session, developers notice Claude has "forgotten" the architecture discussion from earlier and gives weaker answers. You still want the full analysis to run and only its conclusions to be visible. What should you do?

A. Move the skill to `~/.claude/skills/` so it is only loaded for the developer who uses it most.
B. Add `context: fork` to the skill's frontmatter so it runs in an isolated sub-agent context and returns only its result to the main conversation.
C. Tell developers to run `/compact` immediately after every `/dependency-audit` invocation.
D. Split the skill into three smaller skills (direct deps, transitive deps, licenses) and invoke them one at a time.

### Q4 [Claude Code Configuration for Teams | 3.2 | Medium] - Select TWO
A `/new-migration` skill needs two inputs: a migration name and a target service. Developers often invoke it bare and Claude invents plausible values. The platform lead has also been sending the skill file around chat, and several developers have stale copies. Which TWO actions address both problems?

A. Keep the skill in the platform lead's `~/.claude/skills/` and ask her to re-share it whenever it changes.
B. Commit the skill to `.claude/skills/new-migration/SKILL.md` in the repository so it arrives with every clone or pull.
C. Add a paragraph to CLAUDE.md reminding developers to always pass a migration name and a service.
D. Add an `argument-hint` (for example `[migration-name] [service]`) to the skill's frontmatter so developers are prompted for the required parameters.
E. Add `context: fork` to the skill so it runs in isolation and does not guess.

### Q5 [Code Generation with Claude Code | 3.3 | Medium]
Infrastructure code lives in many places: `services/billing/infra/*.tf`, `services/search/infra/*.tf`, `services/auth/infra/*.tf`, and shared modules under `modules/**/*.tf`. Conventions (naming, mandatory tags, state backend rules) apply only when editing Terraform files and are irrelevant when Claude is working on application code. The team wants these to load automatically and only when relevant, with minimal upkeep. Which approach is most maintainable?

A. Put a `CLAUDE.md` with the Terraform conventions in every `infra/` directory and in `modules/`.
B. Add a "Terraform conventions" section to the root `CLAUDE.md` and rely on Claude to apply it only for `.tf` work.
C. Create a `/tf-conventions` skill and ask developers to invoke it before touching infrastructure.
D. Create `.claude/rules/terraform.md` with YAML frontmatter `paths: ["**/*.tf"]` containing the conventions.

### Q6 [Code Generation with Claude Code | 3.4 | Medium]
You must migrate roughly 50 files from a legacy HTTP client to a newer one. Two designs are plausible: an adapter shim that keeps call sites unchanged, or direct replacement at every call site. They differ in test impact and in whether a shared retry configuration must be introduced. No one on the team has mapped how the legacy client is used. What is the best way to proceed?

A. Use plan mode to explore usage and compare the two designs, then switch to direct execution to implement the chosen approach.
B. Start with direct execution using the adapter shim because it touches fewer files, and adjust if problems appear.
C. Migrate five representative files directly first and decide on the design after seeing the results.
D. Write a detailed migration spec by hand first, then run direct execution with the spec so Claude never needs to explore.

### Q7 [Code Generation with Claude Code | 3.4 | Easy]
A bug report includes a full stack trace: `parse_due_date()` in `billing/dates.py` raises `TypeError` when the invoice has no due date. The fix is a single guard clause plus one test. A teammate suggests entering plan mode and spawning an Explore subagent to survey the whole repository first. What is the most appropriate approach?

A. Follow the teammate: plan mode plus a repository-wide Explore survey, since any change to billing carries risk.
B. Ask Claude to interview you about billing edge cases before touching the code.
C. Use direct execution: point Claude at the stack trace and the function, ask for the guard clause and a test.
D. Write a complete test suite for the entire `billing` package before making any change.

### Q8 [Claude Code Configuration for Teams | 3.5 | Medium]
Claude wrote a data migration script that moves customer records to a new schema. It crashes on records where `phone` is `null`, and after you described the problem in prose twice, the second fix broke handling of empty-string phones. You need to fix this edge case reliably and prevent regressions. What is the most effective next step?

A. Rewrite the prompt with a longer prose explanation of every way a phone value can be missing.
B. Ask Claude to add defensive `try/except` blocks around each field in the script.
C. Give Claude specific test cases (input record and expected output) for null, empty-string, and valid phones, then iterate by sharing test failures.
D. Run the script on production data in small batches and paste each new error into the conversation.

### Q9 [Developer Productivity | 3.5 | Medium]
You are asked to add a caching layer for a pricing service. You have never built one in this domain and are unsure about invalidation, stampedes, and what happens if the cache backend goes down. You want the implementation to account for considerations you may not think of. Which approach best fits?

A. Write tests for the cases you can already think of, then implement to pass them.
B. Ask Claude to implement a standard LRU cache and review the diff for problems afterward.
C. Provide three input/output examples of cached and uncached price lookups.
D. Use the interview pattern: have Claude ask you questions about invalidation strategy, failure modes, and consistency requirements before implementing.

### Q10 [Claude Code for Continuous Integration | 3.6 | Medium]
Your pipeline step runs `claude "Review this diff for SQL injection risks"`. The job hangs until timeout. Once you fix that, the output is free-form prose that your bot cannot turn into inline pull-request comments with file, line, and severity. Which change addresses both problems?

A. `claude -p "Review this diff for SQL injection risks" --output-format json --json-schema '<findings schema>'`, then post from the structured result.
B. `claude --headless --format json "Review this diff for SQL injection risks"`.
C. `claude -p "Review this diff for SQL injection risks"` and use regular expressions on the prose to extract `file:line` patterns.
D. `claude -p "Review this diff ... respond only with JSON"` and call `json.loads` on stdout, with a retry on parse failure.

### Q11 [Claude Code for Continuous Integration | 3.6 | Medium] - Select TWO
A nightly job runs Claude Code non-interactively to generate unit tests. Output includes many tests that duplicate existing scenarios, trivial getter tests, and tests that build objects by hand instead of using the team's fixtures. Which TWO changes most directly improve test quality?

A. Include the existing test files in the context so generation avoids scenarios already covered.
B. Increase the maximum number of turns the job may use.
C. Document testing standards, what makes a test valuable, and the available fixtures in the project's CLAUDE.md.
D. Switch the job to a larger model.
E. Add a post-processing step that deletes any generated test with fewer than three assertions.

### Q12 [Claude Code for Continuous Integration | 3.6 | Medium-Hard]
An automated review runs on every push to a pull request. After a developer pushes a follow-up commit, the bot re-posts nearly the same comments it made earlier, including on issues that were already fixed or acknowledged. Reviewers are now muting the bot. What is the best fix?

A. Restrict each run to the diff of the latest commit only, so earlier code is never re-reviewed.
B. Pass the prior review findings into the new run and instruct Claude to report only new issues or ones still unaddressed.
C. Deduplicate by exact-string matching of comment text against comments already on the PR.
D. Run the review only once, on the first push, and disable it for later commits.

---

## Answer key & explanations

### Q1 - Answer: C  (3.1, diagnosing hierarchy problems)
**Root cause:** the instructions live at user level (`~/.claude/CLAUDE.md`), which applies only to that user and is never shared through version control. Instructions the whole team needs belong at project level, committed to the repo. `/memory` shows which memory files are actually loaded, confirming the fix.
- A: copies a file manually per person; no version control, drift guaranteed, and it treats the symptom.
- B: README is not a loaded memory file; Claude is not guaranteed to read it.
- D: a personal skill is again user-scoped (not shared) and loads on demand, whereas these are universal standards that should always apply.
**Trap:** manual process instead of the structural fix; wrong scope.

### Q2 - Answer: A  (3.1)
**Root cause:** one monolithic file loads everything everywhere. Package-level CLAUDE.md files with `@import` of only the relevant standards give each package exactly what maintainers know it needs.
- B: ordering does not scope content; everything is still loaded.
- C: prompt-level "ignore" still pays the token cost and is probabilistic.
- D: `.claude/rules/` is a good modular layout, but rules without `paths` frontmatter load at launch, so the `mobile-sdk` session would still see the PCI rules.
**Trap:** looks modular but does not conditionally scope; "relies on Claude to infer."

### Q3 - Answer: B  (3.2)
**Root cause:** verbose skill output pollutes the main context. `context: fork` runs the skill in an isolated sub-agent context so only the result returns.
- A: relocating the file changes who can see it, not where output goes.
- C: manual and reactive; the context is polluted first, and `/compact` can lose the architecture detail you care about.
- D: same total output, just in more invocations.
**Trap:** symptom-management (compaction) vs. isolating the source.

### Q4 - Answer: B and D  (3.2)
Two problems, two fixes. Distribution/staleness: project-scoped skills under `.claude/skills/` are version-controlled and arrive with clone/pull. Guessed parameters: `argument-hint` prompts for the required arguments when invoked bare.
- A: personal scope plus manual re-sharing is exactly the stale-copy problem.
- C: CLAUDE.md advice is not enforced and does not prompt at invocation time.
- E: `context: fork` isolates output; it does not gather missing parameters.
**Trap:** right feature name, wrong job (fork is about isolation).
(Project-scoped commands in `.claude/commands/` are the equivalent for slash commands.)

### Q5 - Answer: D  (3.3)
**Root cause:** the convention is tied to a file type spread across many directories, not to a directory. A path-scoped rule with glob `**/*.tf` loads only when matching files are edited, wherever they live.
- A: directory-bound files across many locations, easy to miss a new `infra/` folder, duplicated upkeep.
- B: always loaded, and relies on inference.
- C: requires manual invocation, contradicting "automatically."
**Trap:** directory CLAUDE.md for cross-directory conventions (guide: glob rules beat directory CLAUDE.md here).

### Q6 - Answer: A  (3.4)
Multiple valid approaches with different infrastructure implications, ~50 files, and unknown usage: plan mode for investigation, then direct execution to implement the plan (the guide's combined pattern).
- B: commits to a design before exploring; risks costly rework.
- C: incremental discovery of dependencies late is the exact rework risk plan mode avoids; a design still has to be chosen.
- D: assumes the answer without exploring.
**Trap:** "start direct, switch if complexity appears" - the complexity is already stated.

### Q7 - Answer: C  (3.4)
A well-scoped, single-function fix with a clear stack trace is direct-execution territory.
- A: over-engineering; plan mode and repo-wide exploration for a one-line guard.
- B: the interview pattern is for unfamiliar domains, not a known trace.
- D: disproportionate.
**Trap:** applying heavyweight process to a simple change; "risk" framing.

### Q8 - Answer: C  (3.5)
Specific test cases with example input and expected output fix edge-case handling (the guide cites null values in migration scripts), and the test suite guards regressions as you iterate on failures.
- A: more prose has already failed twice; it is interpreted inconsistently.
- B: defensive wrappers can hide errors and don't define expected behavior.
- D: uses production as the test harness.
**Trap:** more prose vs. concrete examples.

### Q9 - Answer: D  (3.5)
In an unfamiliar domain the risk is unknown unknowns. The interview pattern makes Claude surface considerations (invalidation, failure modes) before code exists.
- A: tests only cover what you already thought of.
- B: reviewing afterward is the costly-rework path.
- C: examples clarify a known transformation, not unknown design constraints.
**Trap:** technique fits a different problem type.

### Q10 - Answer: A  (3.6, CLI flags)
`-p`/`--print` runs non-interactively (prevents the hang); `--output-format json` with `--json-schema` yields machine-parseable structured findings for inline comments.
- B: `--headless` and `--format` are not the documented mechanism (invented flags).
- C: fixes the hang with `-p`, but regex over free prose is brittle and gives no schema guarantee for severity or line fields.
- D: prompt-only JSON is probabilistic; needs retry scaffolding the schema flag removes.
**Trap:** fake flags; prompt/regex instead of enforced schema. (Verify: the field holding the validated result is `structured_output` per notes_E.)

### Q11 - Answer: A and C  (3.6)
Providing existing tests avoids duplicate scenarios; CLAUDE.md is how CI-invoked Claude gets project context (standards, valuable-test criteria, fixtures).
- B: turns don't fix missing context.
- D: bigger model is the "throw capacity at it" distractor.
- E: an arbitrary heuristic that deletes good tests and keeps bad multi-assert ones.
**Trap:** capacity/heuristic instead of context.

### Q12 - Answer: B  (3.6)
Include prior findings in context and tell Claude to report only new or still-unaddressed issues.
- A: misses earlier issues still open and cross-commit interactions.
- C: exact-string match fails when wording changes, and it is post-hoc.
- D: abandons review on new code.
**Trap:** post-processing or narrowing scope instead of giving the model the state it needs.

---

## Scoring table

| Q | Task | Correct | Your answer | Score (1 / 0) |
|---|------|---------|-------------|---------------|
| 1 | 3.1 | C | | |
| 2 | 3.1 | A | | |
| 3 | 3.2 | B | | |
| 4 | 3.2 | B + D | | |
| 5 | 3.3 | D | | |
| 6 | 3.4 | A | | |
| 7 | 3.4 | C | | |
| 8 | 3.5 | C | | |
| 9 | 3.5 | D | | |
| 10 | 3.6 | A | | |
| 11 | 3.6 | A + C | | |
| 12 | 3.6 | B | | |

Select-two questions score 1 only if both are right. **Total: ___ / 12.**
- 11-12: solid. 9-10: review missed task statements. 7-8: re-read chapter 3.x for each miss. Below 7: redo the domain chapter before the real thing (real exam wording is denser than practice; treat 10+ here as the ready line).
