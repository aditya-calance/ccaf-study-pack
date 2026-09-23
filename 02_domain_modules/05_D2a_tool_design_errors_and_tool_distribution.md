# 5. D2a - Tool Design, Structured Errors and Tool Distribution

> **Domain 2: Tool Design & MCP Integration (18%)** | Task statements: 2.1, 2.2, 2.3 | Priority: MUST | Read time: ~18 min
> Companion chapter: 06_D2b (2.4 MCP integration, 2.5 built-in tools).

## The 60-second version

- The tool **description** is the primary mechanism the model uses to pick a tool. Minimal or overlapping descriptions cause misrouting. Fix the description (or the tool boundary) BEFORE adding few-shot examples, routing layers or a bigger model.
- Good description = purpose, input formats, example queries, edge cases, boundary vs similar tools ("use this, NOT that, when...").
- Overlap fix: rename + rewrite (`analyze_content` -> `extract_web_results`) or split a generic tool into purpose-specific ones with input/output contracts (`extract_data_points`, `summarize_content`, `verify_claim_against_source`).
- System prompt wording can override good descriptions: keyword-sensitive instructions ("always check the account") create unintended tool associations. Audit the prompt.
- MCP tool failure = result with `isError: true` plus STRUCTURED metadata: `errorCategory` (transient / validation / business / permission), `isRetryable`, human-readable message. Generic "Operation failed" blocks recovery.
- Access failure (timeout, 503) needs a retry decision; valid empty result (query worked, zero matches) is SUCCESS. Never conflate them.
- Subagents recover from transient errors locally; only unresolvable errors go up, with partial results and what was attempted.
- 18 tools degrade selection; 4-5 scoped tools per agent is the target. Cross-role tools only for high-frequency needs (`verify_fact`). `tool_choice`: `auto` (may answer in text), `any` (must call some tool), forced `{"type":"tool","name":...}` (must call that one).

---

## Chapter 2.1 - Design effective tool interfaces with clear descriptions and boundaries

**Why the exam cares:** Tool misrouting is the most common "why does the agent pick the wrong tool" scenario, and the correct answer is nearly always "improve the descriptions / boundaries", not "add examples" or "add a classifier".

### Core concepts

- The model sees only: tool name, description, input schema. It has no other knowledge of what a tool "really does". So the description IS the interface.
- **Minimal descriptions** ("Analyzes content") force the model to guess among similar tools. Unreliable selection follows.
- **Overlapping descriptions** (`analyze_content` vs `analyze_document`, both "analyzes text and returns insights") cause misrouting even when the model is strong. The ambiguity is in the interface, not the model.
- A description should include:
  1. What it does and returns (output shape).
  2. Accepted input formats (e.g. "order ID like `ORD-12345`, not email").
  3. Example queries / when to use it.
  4. Edge cases and limits (e.g. "returns at most 50 rows").
  5. Boundary: what it does NOT do and which tool to use instead.
- **Rename** when the name itself implies the wrong scope (`analyze_content` -> `extract_web_results` with a web-specific description).
- **Split** when one generic tool serves several intents: `analyze_document` -> `extract_data_points` (structured fields), `summarize_content` (prose), `verify_claim_against_source` (claim + source in, supported/unsupported out). Each gets a narrow input/output contract.
- **System prompt keyword sensitivity:** an instruction like "When the user mentions an order, always verify the customer first" can bias the model toward `get_customer` on every order question, overriding the (correct) description of `lookup_order`. When selection is wrong despite good descriptions, read the system prompt for keywords that create tool associations.

### Sample MCP tool definition: bad vs good

```json
// BAD - two near-identical tools with minimal descriptions
{ "name": "analyze_content",  "description": "Analyzes content.",
  "inputSchema": {"type":"object","properties":{"input":{"type":"string"}}} }
{ "name": "analyze_document", "description": "Analyzes a document.",
  "inputSchema": {"type":"object","properties":{"input":{"type":"string"}}} }
```

```json
// GOOD - differentiated, with formats, examples, edges and boundaries
{
  "name": "extract_web_results",
  "description": "Extracts the main result records (title, url, snippet, published_date) from the HTML or text of a WEB SEARCH RESULTS PAGE. Input: raw page text from web_search (max ~200 KB). Example: 'extract results from this search page for \"solar tariffs 2025\"'. Returns a JSON array, empty array if the page has no results (that is a valid result, not an error). Does NOT read PDFs/uploaded files (use extract_data_points) and does NOT judge factual accuracy (use verify_claim_against_source).",
  "inputSchema": {
    "type": "object",
    "properties": {
      "page_text": {"type": "string", "description": "Raw text of a search-results page. Not a URL."},
      "max_results": {"type": "integer", "minimum": 1, "maximum": 50, "default": 10}
    },
    "required": ["page_text"]
  }
}
```

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Write descriptions with inputs, examples, edge cases, boundaries | One-line "Analyzes X" | Description is the primary selection signal |
| Rename/split overlapping tools | Keep two similar tools and add few-shot examples | Examples patch the symptom; the overlap remains |
| Give purpose-specific tools defined I/O contracts | One generic "do everything" tool with a `mode` string | Generic tools are ambiguous and hard to validate |
| Audit system prompt for keyword-triggered rules | Assume prompt and descriptions never conflict | Keyword-sensitive wording creates unintended associations |
| Use explicit ID parameters with format hints | Free-text "identifier" fields | Ambiguous inputs cause wrong-account errors |

### Worked example: fixing misrouting

Symptom: the agent calls `get_customer` when users ask about order status.
Steps: (1) compare descriptions of `get_customer` and `lookup_order`; (2) add boundaries ("Use lookup_order for order status/shipping/items; use get_customer only for identity and account details"); (3) grep the system prompt: "always verify the customer" is present and keyword-triggers `get_customer` -> reword to "verify identity before ISSUING REFUNDS or account changes" (and note that a hard prerequisite should be enforced programmatically, see D1). Do not first build a pre-classifier or add 20 few-shot examples.

### Exam traps

- "Add few-shot examples to the system prompt" when descriptions are minimal: examples are a heavier, less reliable fix than repairing the tool interface (a recurring candidate-reported trap).
- "Route with a keyword classifier before the agent": over-engineering.
- "Use a larger model": does not fix ambiguous interfaces.
- "Merge the two overlapping tools into one": moves the wrong way; split by purpose instead.
- Description is fine but prompt says "always use X": the fix is in the prompt.

### Quick check

- Two tools have near-identical descriptions and get confused. First fix? -> Rewrite/rename to differentiate purpose, inputs, outputs, boundaries (or split a generic one).
- Good descriptions, yet agent overuses one tool. Where to look? -> System prompt keyword-sensitive instructions.
- What should a description say about similar tools? -> When to use this one versus the alternative.

---

## Chapter 2.2 - Implement structured error responses for MCP tools

**Why the exam cares:** The agent's recovery behavior depends entirely on what the error tells it. Uniform errors produce wasted retries or wrong escalations.

### Core concepts

- MCP separates **protocol errors** (JSON-RPC errors: unknown tool, malformed request) from **tool execution errors**, which are returned as a normal tool result with **`isError: true`** so the model can see and react to them.
- Four practical categories:

| Category | Example | Retryable? | Agent should |
|---|---|---|---|
| transient | timeout, 503, rate limit | yes | retry with backoff; recover locally |
| validation | malformed order ID, missing field | no (fix input first) | correct the input and re-call |
| business | refund exceeds policy, order outside return window | no (`retriable: false`) | do not retry; explain to customer using the provided friendly message; escalate if needed |
| permission | caller lacks access | no | do not retry; escalate/ask for access |

- Guide field names: `errorCategory` (transient/validation/permission in the guide's list; business is discussed as its own class with `retriable: false`), `isRetryable` boolean, human-readable description. Use one consistent boolean name in your own server (`isRetryable`); the exam guide itself writes both `isRetryable` and `retriable`.
- Why structure matters: a generic "Operation failed" cannot distinguish "retry in 2s" from "policy says no". The agent either retries a non-retryable error (wasted calls, loops) or gives up on a transient one.
- **Access failure vs valid empty result:** a search that ran fine and found nothing is `isError: false` with an empty list. A timeout is an error. If you return an empty list for a failed query, the agent concludes "no data exists" (silent failure) and the final answer is wrong. If you return an error for zero matches, the agent wastes retries.
- **Local recovery in multi-agent systems:** a subagent retries transient failures itself. It propagates to the coordinator only what it cannot fix, and includes: the failure type, what was attempted (queries, retries), partial results obtained, and possible alternatives. The coordinator can then decide (reroute, proceed with coverage gap annotated) rather than seeing a bare failure.

### Structured error payload example

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"errorCategory\":\"business\",\"isRetryable\":false,\"code\":\"REFUND_EXCEEDS_LIMIT\",\"message\":\"Refund of $620.00 exceeds the $500 automatic limit.\",\"customerMessage\":\"This refund needs a specialist's approval. I can hand it over with all details so you do not have to repeat yourself.\",\"attempted\":{\"tool\":\"process_refund\",\"order_id\":\"ORD-88231\"}}"
    }
  ],
  "isError": true
}
```

Transient variant (retry allowed):

```json
{"isError": true, "content": [{"type":"text","text":"{\"errorCategory\":\"transient\",\"isRetryable\":true,\"message\":\"Orders DB timed out after 5s\",\"retryAfterMs\":2000}"}]}
```

Valid empty result (NOT an error):

```json
{"isError": false, "content": [{"type":"text","text":"{\"matches\":[],\"query\":\"customer email a@b.com\",\"note\":\"Query succeeded; no customer found\"}"}]}
```

### Worked example: subagent error propagation

```python
def search_subagent(query):
    attempts = []
    for i in range(3):                      # local recovery for TRANSIENT only
        r = call_tool("web_search", query=query)
        if not r.is_error:
            return {"status": "ok", "results": r.data}   # may legitimately be []
        err = r.error
        attempts.append({"try": i+1, "category": err["errorCategory"]})
        if not err["isRetryable"]:
            break
        time.sleep(2 ** i)
    return {                                 # propagate with context
        "status": "failed",
        "failure_type": err["errorCategory"],
        "attempted": attempts,
        "partial_results": collected_so_far,
        "alternatives": ["try narrower query", "use cached source"],
    }
```

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| Set `isError: true` on failures | Return an error string as normal success text | The model/harness cannot tell failure from data |
| Include category + isRetryable + message | "Operation failed" | Uniform errors block correct recovery |
| For business errors: `isRetryable:false` + customer-friendly text | Let the agent retry a policy denial | Prevents wasted retries and gives usable wording |
| Return `[]` with success for zero matches | Return an error for no results, or `[]` for a timeout | Access failure and empty result need different handling |
| Retry transient locally; escalate the rest with partial results | Propagate every error to the coordinator, or swallow errors | Coordinator needs context; noise wastes its budget |

### Exam traps

- "Return a generic error to keep the response simple": wrong.
- "Have the agent parse the error message text for the word 'timeout'": fragile; use structured fields.
- "Cap retries at 3 for all errors": an arbitrary cap does not distinguish retryable from non-retryable.
- "Return empty results when the service is down so the workflow continues": silent failure suppression.
- "Terminate the whole workflow on the first subagent error": ignores partial results and local recovery.

### Quick check

- Refund denied by policy: retry? -> No; `isRetryable:false`, give the customer-friendly explanation.
- Search returned zero hits: error? -> No, valid empty result.
- What must a subagent send the coordinator on unrecoverable failure? -> Failure type, what was attempted, partial results, alternatives.

---

## Chapter 2.3 - Distribute tools across agents and configure tool_choice

**Why the exam cares:** Tool count and scoping is a top-cited design trap; `tool_choice` semantics are directly testable.

### Core concepts

- **Too many tools degrade selection.** Giving an agent 18 tools instead of 4-5 increases decision complexity; wrong-tool calls rise.
- **Out-of-role tools get misused.** A synthesis agent holding `web_search` will start searching instead of synthesizing.
- **Scoped access:** each subagent gets only the tools for its role (search agent: search + fetch; synthesis agent: no search; verification agent: read-only lookup).
- **Constrain generic tools:** replace `fetch_url` (fetches anything) with `load_document` that validates the URL is a document source. Narrower tool = fewer ways to go wrong.
- **Scoped cross-role tool:** the synthesis agent needs quick fact checks constantly; round-tripping every one through the coordinator is slow. Give it a light `verify_fact` tool (simple lookups) and keep complex verification routed through the coordinator to the search/verification agent.
- **`tool_choice`:**

| Value | Behavior | Use when |
|---|---|---|
| `{"type":"auto"}` (default) | Model may call a tool OR reply with text | normal agent loops |
| `{"type":"any"}` | Must call some tool; model picks which | guarantee structured output / no conversational reply |
| `{"type":"tool","name":"extract_metadata"}` | Must call that exact tool | ensure a specific first step |

- Forced-first pattern: force `extract_metadata` on turn 1, then on follow-up turns switch back to `auto` (or `any`) for the enrichment tools, feeding the tool result back.
- Note (out-of-scope awareness): `none` also exists (no tools). Notes_D report that forced `tool_choice` (`any`/`tool`) returns 400 on the newest model tier ("Fable 5.1") and that forced tool_choice conflicts with extended thinking on some models. Marked [M]; **Verify** in current docs. For the exam, know the three guide options.

### Worked example

```python
# Turn 1: guarantee metadata extraction runs first
r1 = client.messages.create(
    model=MODEL, max_tokens=1024, tools=TOOLS,
    tool_choice={"type": "tool", "name": "extract_metadata"},
    messages=[{"role": "user", "content": doc_text}],
)
# Turn 2+: let the model choose enrichment tools
r2 = client.messages.create(
    model=MODEL, max_tokens=1024, tools=TOOLS,
    tool_choice={"type": "auto"},
    messages=history_with_tool_result,
)
```

Scoped agent config (conceptual):

```python
AGENTS = {
  "search":    ["web_search", "load_document"],
  "analysis":  ["extract_data_points", "summarize_content"],
  "synthesis": ["verify_fact"],          # scoped cross-role, NOT web_search
  "coordinator": ["Task"],               # spawn subagents (SDK docs may call it "Agent")
}
```

The guide names the spawning tool "Task" (must be in `allowedTools`); newer SDK docs call it the "Agent" tool.

### Do / Don't

| Do | Don't | Why |
|---|---|---|
| 4-5 tools per agent, role-scoped | Give every agent all 18 tools | Selection reliability drops |
| `verify_fact` for frequent simple checks | Full search tools for the synthesis agent | Limited cross-role need, no misuse |
| Route complex verification via coordinator | Let synthesis agent do deep research | Keeps specialization |
| Force a tool for mandatory first steps | Rely on a prompt "always call X first" | Must-happen = programmatic |
| `tool_choice: any` to prevent text-only replies | Parse free text when structured output is needed | Guarantees a tool call |
| `load_document` with URL validation | Open `fetch_url` | Constrained tool prevents misuse |

### Exam traps

- "Give the synthesis agent all tools so it is never blocked": the anti-pattern.
- "Prompt: You must call extract_metadata first": probabilistic; forced tool_choice is the guaranteed mechanism.
- "`any` forces a specific tool": no, `any` forces SOME tool; forced `tool` names one.
- "Use `auto` to guarantee a tool call": `auto` may return text.
- "Send every fact check through the coordinator": correct for complex cases, but the guide wants a scoped `verify_fact` for high-frequency simple ones.

### Quick check

- Agent has 18 tools and misroutes. Fix? -> Scope to the 4-5 relevant to its role.
- Ensure `extract_metadata` runs before enrichment? -> Forced `tool_choice` on turn 1, then continue in follow-up turns.
- Guarantee the model never answers in plain text? -> `tool_choice: "any"`.

---

## Chapter recap

- I can list what a good tool description contains (purpose, formats, examples, edge cases, boundaries).
- I can fix overlap by renaming or splitting, and I check the system prompt for keyword bias.
- I can write a structured MCP error (`isError`, `errorCategory`, `isRetryable`, message) and pick the right recovery per category.
- I distinguish access failures from valid empty results.
- I know local recovery vs propagation with partial results.
- I can justify 4-5 scoped tools over 18, and use `verify_fact` as a scoped cross-role tool.
- I can choose `auto` / `any` / forced `tool` correctly.

## Mnemonics

- **"PIEB"** for descriptions: Purpose, Inputs, Examples, Boundaries.
- **"TVBP"** error categories: Transient (retry), Validation (fix input), Business (explain), Permission (escalate).
- **"Empty is not Error."** Zero matches = success; timeout = failure.
- **"auto may talk, any must call, forced must call THIS."**
- **"18 is a crowd, 4-5 is a team."**
