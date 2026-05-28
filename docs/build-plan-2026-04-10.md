# AIR Build Plan: MCP Server + Python SDK + did:wba + Presentation

## Context

AIR has a live REST API (Cloudflare Workers + D1) but no programmatic SDK or MCP server — making it a website, not infrastructure. OAID already has 3 SDKs + MCP server. The W3C CG presentation (~2 weeks) needs did:wba support and a live demo. This session delivers the four Priority 1 roadmap items.

## Build Order (REVISED per eng review)

~~SDK first~~ → **API changes first** (did:wba + per-agent auth + deploy) → SDK (built against final API) → MCP Server → slides.

Rationale: Building SDK against the pre-change API creates a circular dependency — API changes break SDK tests. API first eliminates this.

---

## 1. API Changes (`api/src/index.js`) — FIRST

### 1a. did:wba Support
- Add `validateDidWba(did)` — regex validates `did:wba:DOMAIN[:PATH_SEGMENTS]`
  - Reject IP-based domains (127.x, 10.x, 192.168.x, 169.254.x, localhost)
  - Reject domains < 4 chars or > 253 chars
- Add `resolveDidWba(did)` — best-effort resolution, never blocks registration
  - `did:wba:example.com` → fetch `https://example.com/.well-known/agent.json`
  - `did:wba:example.com:agent:bot` → fetch `https://example.com/agent/bot/did.json`
  - 3-second timeout via `AbortController`
  - 1KB response size limit (truncate, don't reject)
  - No redirect following (security)
  - On any error → `did_wba_resolved: false`, registration continues
- Response includes `did_wba_resolved: true|false` (response-only, no schema change)

### 1b. Per-Agent Secret Key for PUT Auth
- **New DB column:** `agent_secret TEXT` in agents table
- **Registration:** Generate a random 32-char hex secret at registration, store hashed (SHA-256), return plaintext in 201 response
- **PUT endpoint:** Require `X-Agent-Secret` header matching stored hash
- **SDK implication:** `register()` returns `agent_secret` in `RegistrationResult`. User must store it to update later.
- Run D1 migration: `ALTER TABLE agents ADD COLUMN agent_secret TEXT`

### 1c. Other Changes
- Update `schema.sql` to include `is_demo` column (currently missing, exists in production)
- Add did:wba seed agent: `did:wba:agentidentityregistry.org:agents:demo`
- **Deploy:** `npx wrangler deploy`
- **Verify:** curl tests for did:wba validation, PUT auth, before proceeding to SDK

---

## 2. Python SDK (`sdk/python/`)

**Package:** `agent-identity-registry` | **Python:** >=3.10 | **Deps:** `httpx`, `pydantic>=2.0`

```
sdk/python/
├── pyproject.toml
├── README.md
├── src/agent_identity_registry/
│   ├── __init__.py          # re-exports AIRClient + all models
│   ├── client.py            # AIRClient — async httpx
│   ├── models.py            # Pydantic v2 models (field-mapped to actual API JSON)
│   └── exceptions.py        # exception hierarchy
└── tests/
    ├── test_client_unit.py      # mock httpx, test all error paths
    └── test_client_integration.py # real API calls
```

**Full API surface (covers all 9 endpoints):**
```python
from agent_identity_registry import AIRClient

async with AIRClient(base_url="https://agentidentityregistry.org") as air:
    agent = await air.lookup("AIR-XXXX-XXXX-XXXX")       # GET /agents/:id
    score = await air.trust_score("AIR-XXXX-XXXX-XXXX")   # GET /agents/:id/trust-score
    agents = await air.list_agents(limit=10)               # GET /agents
    result = await air.register(name=..., creator_did=...) # POST — returns agent_secret!
    updated = await air.update("AIR-XXXX", secret="...", description=...) # PUT — requires secret
    avail = await air.check_name("MyAgent")                # GET /agents/check-name
    health = await air.health()                            # GET /health

    # Admin (requires admin_key in constructor)
    stats = await air.admin_stats()                        # GET /admin/stats
    recent = await air.admin_recent(limit=20)              # GET /admin/recent
    await air.delete("AIR-XXXX-XXXX-XXXX")                # DELETE /agents/:id
```

**Pydantic models — MUST be field-mapped to actual API JSON:**

Key mapping notes (from `api/src/index.js` lines 251-286):
- `creator` is a nested object: `{did, name, type}`
- `components` is nested: `{provenance, behavioral, transparency, security, peer_attestations}`
- `trust_score` and `trust_grade` are flat top-level fields
- `warnings` in registration response is conditionally absent (use `Optional[list[str]] = None`)
- `AdminStats.grade_distribution` is `dict[str, int]` (dynamic keys)

**Exception hierarchy:**
| Exception | HTTP Status | When |
|-----------|-------------|------|
| `AIRError` | base class | any API error |
| `AgentNotFoundError` | 404 | agent doesn't exist |
| `RateLimitedError` | 429 | rate limit (exposes `retry_after_seconds`) |
| `ValidationError` | 400 | bad input |
| `ConflictError` | 409 | ID collision |
| `UnauthorizedError` | 401 | admin key or agent secret invalid |
| `ServerError` | 500 | internal error |

**Design notes:**
- Async-only for v1. README documents `asyncio.run()` for sync scripts.
- Constructor: `AIRClient(base_url=..., admin_key=None)`. Calling admin methods without admin_key raises `ValueError` before making the request.
- `update()` requires `secret` parameter. No admin_key needed — per-agent auth.

---

## 3. MCP Server (`mcp-server/`)

**Package:** `air-mcp-server` | **Deps:** `mcp~=1.12` (pinned minor), `agent-identity-registry`

```
mcp-server/
├── pyproject.toml
├── README.md
├── src/air_mcp/
│   ├── __init__.py
│   ├── server.py            # FastMCP server + 7 tools
│   └── __main__.py          # CLI: python -m air_mcp [--transport streamable-http --port 8080]
└── tests/
    └── test_server.py
```

**7 Tools (added health per outside voice finding #7):**
| Tool | Description | Required Params | Optional Params |
|------|-------------|-----------------|-----------------|
| `air_lookup_agent` | Full agent identity document | `air_id: str` | — |
| `air_trust_score` | Trust score with component breakdown | `air_id: str` | — |
| `air_register_agent` | Register new agent (returns secret) | `name`, `creator_did` | `description`, `creator_name`, `creator_type`, `capabilities`, `open_source`, `code_repository`, `documentation_url` |
| `air_update_agent` | Update agent fields | `air_id`, `secret` | `description`, `capabilities`, `security_certifications`, `open_source`, `code_repository`, `documentation_url` |
| `air_list_agents` | List registered agents | — | `limit: int`, `offset: int` |
| `air_check_name` | Check if agent name exists | `name: str` | — |
| `air_health` | API health check | — | — |

**Transport:**
- Default: stdio (Claude Desktop, Cursor)
- Flag: `--transport streamable-http --port 8080` for remote agents
- Uses `mcp` SDK's built-in streamable HTTP support

**Claude Desktop config:**
```json
{
  "mcpServers": {
    "air": {
      "command": "/opt/homebrew/bin/python3.13",
      "args": ["-m", "air_mcp"],
      "env": { "AIR_BASE_URL": "https://agentidentityregistry.org" }
    }
  }
}
```

---

## 4. Presentation Slides

### 4a. HTML (`presentations/w3c-cg/index.html`)
- **Self-contained single file** — reveal.js + CSS inlined (~500KB realistic, not 200KB)
- 12 slides from `presentations/w3c-cg-outline.md`
- Live API demo on slide 7 (same-origin fetch, no CORS issues)
- Backup static data inline for network failure
- Dark theme, speaker notes via reveal.js notes plugin
- **Deploy to `agentidentityregistry.org/presentations/w3c-cg/`** for same-origin CORS

### 4b. Canva (via Canva MCP)
- Generate professional deck from the same content
- For Peter/Kenny to customize in Canva editor

---

## Implementation Sequence

| Step | Deliverable | Depends On | Files |
|------|-------------|------------|-------|
| 1 | D1 migration (agent_secret column) | — | SQL command |
| 2 | did:wba validation + resolution in API | — | edit index.js |
| 3 | Per-agent secret key auth for PUT | Step 1 | edit index.js |
| 4 | Seed data (did:wba agent) + schema.sql fix | Step 2 | edit seed.sql, schema.sql |
| 5 | Deploy API (`wrangler deploy`) + curl tests | Steps 2-4 | — |
| 6 | Python SDK (models + client + exceptions) | Step 5 | 5 new files |
| 7 | SDK tests (unit + integration) | Step 6 | 2 new files |
| 8 | MCP Server (server + main + config) | Step 6 | 5 new files |
| 9 | MCP Server tests | Step 8 | 1 new file |
| 10 | HTML slides (self-contained) | Step 5 | 1 new file |
| 11 | Deploy slides to site | Step 10 | — |
| 12 | Canva slides | Step 10 | external |

**Parallel opportunities:** Steps 6-9 (SDK+MCP) and Step 10 (slides) are independent after Step 5.

---

## Verification

| Deliverable | Behavioral Test |
|-------------|-----------------|
| D1 migration | `wrangler d1 execute` succeeds, column exists |
| did:wba valid | `curl POST register` with `did:wba:example.com:agent:bot` → 201, has `did_wba_resolved` |
| did:wba reject | `did:wba:` → 400, `did:wba:127.0.0.1:x` → 400 |
| PUT auth | PUT without secret → 401, PUT with correct secret → 200 |
| SDK import | `python3.13 -c "from agent_identity_registry import AIRClient, Agent, TrustScore"` |
| SDK lookup | Call `air.lookup()` on demo agent, assert `agent.air_id` starts with `AIR-` |
| SDK register | Register with `did:wba:*`, assert 201, assert `agent_secret` in response |
| SDK update | Use returned secret to update description, assert 200 |
| MCP startup | `python3.13 -m air_mcp` runs, prints server info |
| MCP tool | air_lookup_agent returns agent data |
| Slides render | Open from `agentidentityregistry.org/presentations/w3c-cg/`, 12 slides, live demo works |

---

## NOT in scope

| Deferred Item | Rationale |
|---------------|-----------|
| PyPI publishing / CI pipeline | Demo phase — `pip install -e .` locally is sufficient |
| JavaScript SDK | After Python proves the pattern (roadmap P3-8) |
| Retry/backoff in SDK | `RateLimitedError` exposes retry_after for caller. SDK stays simple. |
| did:wba resolution caching | Low volume. Re-resolve on each registration is fine. |
| Trust score model update for did:wba | Provenance already credits creator_did presence. Resolvability bonus is a future enhancement. |
| DNS rebinding SSRF protection | Cloudflare Workers fetch() goes through edge network. Domain-string validation is pragmatic for v1. |
| Staging environment | Deploy to production with curl verification. Risk accepted for 2-founder project. |

## What already exists

| Existing Code | Reused? |
|---------------|---------|
| `api/src/index.js` — all 9 API endpoints | Yes — SDK wraps, doesn't reimplement |
| `api/src/index.js:190-236` — trust score calculation | Yes — stays server-side, SDK returns result |
| `api/src/index.js:128-184` — AIR ID generation | Yes — stays server-side |
| `api/src/index.js:560-566` — admin auth pattern | Yes — per-agent auth follows same pattern |
| `presentations/w3c-cg-outline.md` — 12 slides | Yes — content source for slides |

## Failure modes

| Codepath | Failure Mode | Test? | Error Handling? | User Sees? |
|----------|-------------|-------|-----------------|------------|
| did:wba resolve | Target domain offline | Yes | Yes (3s timeout → resolved=false) | Registration succeeds, resolved=false |
| did:wba resolve | Redirect loop | No | Partial (no-redirect flag) | Fetch fails, resolved=false |
| PUT with wrong secret | Incorrect hash comparison | Yes | Yes (401) | Clear error |
| SDK → unreachable API | httpx.ConnectError | Yes | Needs catch → AIRError | SDK exception |
| MCP tool → SDK error | AgentNotFoundError | Yes | Propagate to MCP error response | MCP error message |
| Slides live demo | API down during presentation | No formal test | Backup static data | Falls back to screenshots |
| Per-agent secret | Secret lost by user | No | No recovery mechanism | Cannot update agent (by design) |

**Critical gaps:** 0 (all failure modes either have tests + handling, or are documented risks)

## Worktree Parallelization Strategy

Sequential implementation, no parallelization opportunity until Step 5 completes. After API deploy:
- **Lane A:** SDK + MCP (Steps 6-9) — touches `sdk/`, `mcp-server/`
- **Lane B:** Slides (Steps 10-11) — touches `presentations/`
- No conflict between lanes.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 3 arch issues resolved, 35 test paths mapped, 0 perf issues |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |
| Outside Voice | Claude subagent | Blind spot detection | 1 | issues_found | 15 findings, 3 tensions resolved |
| OMC Critic | Opus subagent | Pre-review validation | 1 | REVISE→REVISED | 1 critical + 3 major, all incorporated |

**UNRESOLVED:** 0 decisions
**VERDICT:** ENG REVIEW CLEARED — ready to implement.
