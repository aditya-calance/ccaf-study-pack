# 9. Prompting with Explicit Criteria, Few-Shot Examples and Structured Output (Domain 4a)

> **Domain 4: Prompt Engineering & Structured Output (20% of exam)** | Task statements: 4.1, 4.2, 4.3 | Priority: **MUST** (Domain 4 is the second-heaviest after D1 and extraction/CI-review scenarios lean on it) | Read time: ~20 min

## The 60-second version

- Vague instructions ("be conservative", "only report high-confidence findings") do NOT improve precision. Explicit categorical criteria (report X, skip Y) do.
- False positives destroy trust in the whole tool, including the categories that are accurate. Temporarily disable the noisy category, fix its prompt, then re-enable.
- Severity levels need concrete code examples per level, otherwise classification drifts.
- Few-shot is the strongest lever for consistent format and ambiguous-case judgment. Use 2-4 targeted examples that show WHY one action beat plausible alternatives.
- Few-shot examples should generalize judgment (acceptable pattern vs real issue), not enumerate every case. For extraction, vary document formats to stop null/hallucinated fields.
- Structured output = `tool_use` + JSON schema. It eliminates syntax errors, NOT semantic errors (totals that do not sum, value in the wrong field).
- `tool_choice`: `auto` (may return text), `any` (must call some tool, model picks), forced `{"type":"tool","name":...}` (must call that one).
- Schema design: nullable/optional when the source may lack the data (prevents fabrication); enum plus `"unclear"`; `"other"` plus a detail string for extensible categories; normalization rules go in the prompt.

---

## Chapter 4.1 - Explicit criteria to improve precision and reduce false positives

**Why the exam cares:** CI code-review scenarios describe developers ignoring a noisy bot. The right answer is specific criteria and disabling the bad category, not "tell it to be more careful".

**Core concepts**

- A model cannot calibrate "high confidence" on its own; its self-reported confidence does not track real precision. "Be conservative" is a mood, not a rule. It changes tone, not the decision boundary.
- Explicit criteria define the decision boundary in terms of observable code facts. Compare:
  - Vague: "Check that comments are accurate."
  - Explicit: "Flag a comment only when the behavior it claims contradicts what the code actually does. Do not flag stale TODOs, wording, or missing comments."
- State both sides: which issues to REPORT (bugs, security vulnerabilities, data-loss risks) and which to SKIP (minor style, local conventions, patterns the codebase uses consistently).
- Trust economics: if the "naming style" category is 60% wrong, developers learn to dismiss everything, so the accurate "SQL injection" findings get ignored too. Trust is shared across categories.
- Operational move: temporarily disable the high-false-positive category (drop it from the prompt or filter it in post-processing), keep the high-precision categories running, and iterate on the disabled category offline until precision recovers. Then re-enable.
- Severity: define each level with the criteria AND a concrete code example so two runs classify the same snippet the same way.

| Do | Don't | Why |
|---|---|---|
| "Report: null derefs, unvalidated input reaching SQL/shell, resource leaks. Skip: formatting, naming, patterns already used elsewhere in repo" | "Be conservative and only report things you are sure about" | Criteria move the boundary; adjectives do not |
| Disable the 60%-FP category now, fix it, re-enable | Keep all categories on and ask devs to "give it time" | Noisy category erodes trust in accurate ones |
| Severity table with a code snippet per level | "Mark critical issues as critical" | Undefined levels give inconsistent labels |
| Filter on category + rule | Filter on model-stated confidence >= 0.9 | Self-confidence is poorly calibrated; a distractor pattern |

**Worked example: review prompt fragment**

```text
Review the diff. REPORT only:
1. bug: behavior that will fail or return wrong results on realistic input
2. security: untrusted input reaching a query, shell, path, or HTML sink; secrets in code
SKIP: formatting, naming, import order, missing docstrings, patterns that already
appear elsewhere in this repo (local conventions), and speculative "could be improved" notes.

Severity (use the example as the anchor):
- critical: exploitable or data-destroying.   e.g. cursor.execute(f"... WHERE id={user_id}")
- high: crashes or wrong results on common input. e.g. items[0] on a list that can be empty
- medium: wrong on rare input.  e.g. off-by-one only when page_size == 1
- low: correct but fragile.  e.g. bare `except:` around a non-critical log call

Output each finding as: file:line | category | severity | issue | suggested fix
```

**Exam traps**

- "Add 'only report findings you are highly confident about'" - sounds like precision control, fails per the guide.
- "Ask the model to self-rate confidence and drop < 80%" - same confidence-filtering distractor (contrast with 4.6, where confidence is used for ROUTING to human review, not as a precision fix).
- "Switch to a larger model" - over-engineering; the fix is criteria.
- "Remove the whole reviewer until it is perfect" - too blunt; disable only the noisy category.

**Quick check**
- Q: Why does "be conservative" fail? -> It does not define which issues count; the decision boundary is unchanged.
- Q: One category has a high FP rate and devs ignore all findings. First action? -> Temporarily disable that category, refine its criteria, re-enable.
- Q: How do you get consistent severity labels? -> Explicit criteria plus a concrete code example per level.

---

## Chapter 4.2 - Few-shot prompting for consistency and quality

**Why the exam cares:** When detailed instructions still yield inconsistent output, the guide names few-shot examples as the most effective technique. Questions test how many, which ones, and what they must contain.

**Core concepts**

- Few-shot works because examples show the mapping (input -> reasoning -> output) that prose describes ambiguously. They fix format (location, issue, severity, suggested fix) and ambiguous decisions in one shot.
- Choose 2-4 TARGETED examples. Target the cases where the model was wrong or inconsistent: ambiguous inputs, borderline calls. Ten near-duplicates add tokens without adding information.
- Show the reasoning for why the chosen action beat plausible alternatives (e.g. why `search_orders` rather than `get_customer` for "where's my stuff?"; why a branch-level gap is a test gap but a trivial getter is not).
- Include contrast pairs: an acceptable pattern and a genuine issue that look alike. This cuts false positives while letting the model generalize the principle to novel code rather than only matching listed cases.
- Extraction variety: show documents with different structures (inline citations vs bibliography; methodology section vs details embedded in prose; informal measurements like "a handful", "about 2 cups"). Examples that show correct null for absent fields and correct extraction from messy formats reduce both empty results and hallucinated values.
- Few-shot does not fix a tool-selection problem caused by bad tool descriptions (see Domain 2): fix descriptions first when tools overlap, use examples for the remaining judgment.

| Do | Don't | Why |
|---|---|---|
| 2-4 examples aimed at the ambiguous cases | 20 examples covering every known case | Targeted beats exhaustive; exhaustive teaches matching, not judgment |
| Each example includes reasoning "chose A over B because..." | Bare input/output pairs for hard cases | Reasoning transfers to novel inputs |
| Pair acceptable vs genuine-issue look-alikes | Only show issues | Only-issue examples raise false positives |
| Fix the output format in every example | Describe the format only in prose | Examples anchor format more reliably |
| Vary document layouts in extraction examples | All examples from one template | Model overfits to the template and returns null elsewhere |

**Worked example: few-shot block for review findings**

```text
<example>
Code: `def total(items): return sum(i.price for i in items) / len(items)`
Finding: billing/cart.py:42 | bug | high | Division by zero when items is empty.
         Fix: return 0 if not items else ...
Why reported: crashes on a realistic input (empty cart), not a style preference.
</example>

<example>
Code: `except KeyError: return None   # missing optional config key`
Finding: NONE.
Why skipped: broad handling is intentional and documented; this repo uses the same
pattern for optional config. Local convention, not a defect.
</example>

<example>
Code: `if user.role == "admin" or user.role == "Admin":`
Finding: auth/guard.py:9 | bug | medium | Case-inconsistent role check; other paths
         lowercase the role. Fix: normalize once at login.
Why reported over skipped: inconsistent with the rest of the code, could silently deny access.
</example>
```

Example 2 is the acceptable pattern; Examples 1 and 3 are genuine issues. That trio teaches a boundary, not a list.

**Exam traps**

- "Add many more examples until every case is covered" - misses generalization; the guide says 2-4 targeted.
- "Add examples" when the real problem is overlapping tool descriptions (a recurring trap in B). Ask what the ROOT cause is.
- "Use examples that show only correct findings" - no contrast, more false positives.
- "Few-shot cannot help extraction" - it can: it reduces null/hallucination by showing varied formats.

**Quick check**
- Q: Instructions alone give inconsistent output format. Best technique? -> Few-shot examples demonstrating the exact format.
- Q: What makes an ambiguous-case example valuable? -> It shows the reasoning for choosing one action over plausible alternatives.
- Q: Extraction returns null for values buried in prose. Fix? -> Add examples with varied document structures showing the correct extraction.

---

## Chapter 4.3 - Structured output with tool use and JSON schemas

**Why the exam cares:** "Reliable JSON" questions have a canonical answer (tool_use + schema), and follow-ups probe what schemas do NOT guarantee.

**Core concepts**

- Define an extraction tool whose `input_schema` is your desired output shape. The model "calls" the tool; you read `tool_use.input`. That is schema-compliant JSON, so parse errors (trailing commas, unquoted keys, prose wrapped around JSON) disappear. This beats "please respond in JSON" prompting.
- Syntax vs semantic: the schema guarantees shape and types. It does not guarantee that `line_items` sum to `total`, that a date sits in `due_date` rather than `invoice_date`, or that the value is true to the document. Semantic errors need validation (Chapter 4.4).
- `tool_choice` modes:

| Mode | Value | Behavior | Use when |
|---|---|---|---|
| auto | `{"type":"auto"}` (default) | Model may answer in text instead of calling a tool | Chat where a tool call is optional. Not a guarantee of structure |
| any | `{"type":"any"}` | Must call some tool; model chooses which | Several extraction schemas (invoice, receipt, contract) and document type unknown |
| forced | `{"type":"tool","name":"extract_metadata"}` | Must call that named tool | A specific step must run first, e.g. `extract_metadata` before enrichment |

- Schema design against fabrication: a `required` field the document does not contain forces the model to invent a value. Make such fields optional or nullable (`"type":["string","null"]`) so "absent" is a legal answer.
- Enums: include `"unclear"` for genuinely ambiguous cases; include `"other"` plus a free-text `*_detail` field for extensible categories, so new categories do not get squeezed into a wrong bucket.
- Format normalization ("dates as ISO 8601, currency as decimal number, strip thousands separators") belongs in the PROMPT, alongside the strict schema. The schema constrains type, not how messy source text is interpreted.

| Do | Don't | Why |
|---|---|---|
| tool_use + JSON schema | "Return valid JSON" in prose and `json.loads` | Prose JSON can fail to parse |
| `any` for unknown doc type across several schemas | `auto` and hope it calls a tool | `auto` can return text |
| Forced tool for must-run-first extraction | Prompt "always call extract_metadata first" | Must happen -> enforce, don't ask |
| Nullable for maybe-absent fields | `required` on everything | Required-but-absent invites fabrication |
| `"unclear"` and `"other"` + detail | Closed enum with no escape | Model forces a wrong label |
| Normalization rules in prompt | Assume schema normalizes formats | Schema does not interpret source text |

**Worked example: full extraction schema and Python (Anthropic SDK)**

```json
{
  "name": "extract_invoice",
  "description": "Extract invoice data from the provided document. Use null for any field not present in the document; never guess.",
  "input_schema": {
    "type": "object",
    "properties": {
      "invoice_number": {"type": ["string", "null"], "description": "Identifier printed on the invoice, or null"},
      "vendor_name": {"type": "string"},
      "invoice_date": {"type": ["string", "null"], "description": "ISO 8601 YYYY-MM-DD, or null"},
      "due_date": {"type": ["string", "null"], "description": "ISO 8601 YYYY-MM-DD, or null"},
      "currency": {"type": ["string", "null"], "description": "ISO 4217 code such as USD, or null"},
      "line_items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "description": {"type": "string"},
            "quantity": {"type": ["number", "null"]},
            "amount": {"type": "number"}
          },
          "required": ["description", "amount"]
        }
      },
      "stated_total": {"type": ["number", "null"], "description": "Total exactly as printed on the document"},
      "calculated_total": {"type": "number", "description": "Sum of line_items amounts, computed by you"},
      "payment_terms": {
        "type": "string",
        "enum": ["net_15", "net_30", "net_60", "due_on_receipt", "unclear", "other"]
      },
      "payment_terms_detail": {"type": ["string", "null"], "description": "Fill when payment_terms is 'other' or 'unclear'"}
    },
    "required": ["vendor_name", "line_items", "calculated_total", "payment_terms"]
  }
}
```

```python
import anthropic

client = anthropic.Anthropic()
EXTRACT_TOOL = {...}  # the JSON above, as a Python dict

SYSTEM = (
    "Extract invoice data. Normalize dates to YYYY-MM-DD and amounts to plain numbers "
    "(strip currency symbols and thousands separators). If a field is not in the "
    "document, return null. Do not infer missing values."
)

def extract(document_text: str) -> dict:
    resp = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=2048,
        system=SYSTEM,
        tools=[EXTRACT_TOOL],
        tool_choice={"type": "tool", "name": "extract_invoice"},   # forced (see NOTE)
        messages=[{"role": "user", "content": f"<document>\n{document_text}\n</document>"}],
    )
    if resp.stop_reason == "max_tokens":
        raise RuntimeError("truncated; tool input may be partial")
    for block in resp.content:
        if block.type == "tool_use" and block.name == "extract_invoice":
            return block.input          # already a dict, no json.loads
    raise RuntimeError(f"no tool_use block; stop_reason={resp.stop_reason}")
```

For unknown document types, pass several tools (`extract_invoice`, `extract_receipt`, `extract_contract`) with `tool_choice={"type": "any"}` and branch on `block.name`.

> **NOTE: exam vs. modern API.** The exam is written to the guide: `tool_use` + `tool_choice` (any / forced) is the expected answer. Know the modern alternatives too. Per the API brief (verify against current docs): newer models such as Claude Fable 5.1 return HTTP 400 for forced `tool_choice` (`any` or `tool`); use `auto` plus an instruction, `strict: true` tools, or structured outputs. Assistant-turn prefill (pre-seeding `{`) is removed on newer models (400 on Fable 5/5.1, Opus 4.6+/5, Sonnet 4.6/5). Modern options: `output_config: {"format": {"type": "json_schema", "schema": {...}}}` on `messages.create` (or `client.messages.parse()` with Pydantic), and `strict: true` on a tool definition (with `additionalProperties: false` and `required`) so tool input is guaranteed to match the schema. Structured outputs are incompatible with citations. Even with these, semantic validation (4.4) is still your job.

**Exam traps**

- "Strict schema guarantees the extracted values are correct" - false; only syntax/shape.
- "Mark every field required so nothing is missed" - causes fabrication for absent data.
- "Use `auto` to guarantee structured output" - `auto` may return prose.
- "Use prefill to force JSON" - removed on newer models; not the guide's answer.
- "Closed enum keeps data clean" - without `unclear`/`other`, ambiguous cases get forced into wrong buckets.

**Quick check**
- Q: Which tool_choice when document type is unknown and you have 3 extraction tools? -> `any`.
- Q: Which ensures `extract_metadata` runs before enrichment? -> Forced `{"type":"tool","name":"extract_metadata"}`.
- Q: Schema passes but line items do not sum to total. Why? -> Schemas catch syntax, not semantic errors; add validation.
- Q: How to stop invented values for absent fields? -> Make them nullable/optional.

---

## Chapter recap

- [ ] I can rewrite a vague review instruction into report/skip criteria.
- [ ] I can explain why confidence-based filtering and "be conservative" fail.
- [ ] I can describe temporarily disabling a noisy category to protect trust.
- [ ] I can define severity levels with code examples.
- [ ] I can design 2-4 few-shot examples covering an ambiguous case with reasoning and contrast pairs.
- [ ] I can use few-shot to fix null/hallucinated extraction across varied formats.
- [ ] I can build an extraction tool schema and read `tool_use.input`.
- [ ] I can choose auto / any / forced and justify.
- [ ] I can separate syntax errors (schema fixes) from semantic errors (validation fixes).
- [ ] I can design nullable fields, `unclear`, `other` + detail, and put normalization in the prompt.
- [ ] I know the modern alternatives (`output_config.format`, `strict: true`) and the Fable 5.1 forced-choice restriction.

## Mnemonics

- **"Report / Skip / Anchor"**: criteria say what to report, what to skip, and anchor severity with examples.
- **"2-4, Why, Contrast"**: few-shot = 2-4 examples, each with the why, including a look-alike acceptable case.
- **"Auto may chat, Any must call, Forced names one."**
- **"Schema = shape, not truth."**
- **"Null beats a lie"**: absent data must be legally expressible (nullable, `unclear`, `other`).
