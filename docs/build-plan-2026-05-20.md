# AIR Build Plan — BossClaw-Aware Revision (May 20, 2026)

**Supersedes:** `build-plan-2026-04-10.md` (Apr 30 plan)

**Status:** Reviewed 3× (OMC Critic, gstack Eng Review, Claude Outside Voice). Updated for BossClaw as first consumer. Pending Kenny approval.

---

## Context

The April 30 plan was designed for "any Python developer." Since then:

1. **BossClaw shipped Phase 1** (May 18, 2026) — the first AIR-native consumer-facing agent. Cross-platform Tauri app (Mac + Win + Linux). Now blocked on AIR features.
2. **Anthropic Project Deal** (March 2026) validated the agent-commerce thesis. 69 employees, Claude agents transacting autonomously in Slack. AIR + BossClaw are the open-internet version of what Anthropic proved internally.
3. **Legal structure decided** (May 15): AIR stays nonprofit, BossClaw spins off as separate for-profit C-Corp. Strengthens AIR's W3C neutrality.

BossClaw being the first consumer means the build plan reorders priorities and **adds new endpoints** the April 30 plan didn't include.

---

## Build Order (REVISED for BossClaw)

```
P0  API changes (BossClaw blocker)
P1  Slides + presentation (W3C demo)
P2  Python SDK + MCP server (ecosystem, post-presentation)
```

The April 30 plan put SDK and MCP at the top. With BossClaw being Rust + Tauri (not Python) and an MCP client (not server consumer), those drop to P2.

---

## 1. API Changes (`api/src/index.js`) — P0

### 1a. did:wba Validation + Resolution (unchanged from Apr 30)
- `validateDidWba(did)` — regex validates `did:wba:DOMAIN[:PATH_SEGMENTS]`
- Reject IP-based domains (127.x, 10.x, 192.168.x, 169.254.x, localhost)
- `resolveDidWba(did)` — best-effort, 3s timeout, 1KB response limit, no redirects
- Two resolution paths: `.well-known/agent.json` (root) and `/path/did.json` (path-based)
- Response includes `did_wba_resolved: true|false`

### 1b. Public Key Field at Registration (NEW)
**Why:** BossClaw generates an Ed25519 keypair on first run, stores the private key in OS keychain (Phase 1 already shipped). At registration, BossClaw submits its public key. Other agents need this to verify BossClaw's signatures.

- New DB column: `public_key TEXT` (Ed25519, base64url-encoded)
- Registration endpoint accepts optional `public_key` field
- If provided, validated (32 bytes after base64url decode)
- Returned in agent lookup responses

### 1c. Per-Agent Secret Key for PUT Auth (unchanged from Apr 30)
- New DB column: `agent_secret_hash TEXT` in agents table
- Registration: generate 32-char hex secret, store SHA-256 hash, return plaintext in 201 response
- PUT endpoint: require `X-Agent-Secret` header matching stored hash
- BossClaw stores its secret in the same OS keychain as the Ed25519 private key

### 1d. DID Document Endpoint (NEW — critical for BossClaw Phase 4)
**Why:** BossClaw Phase 4 verifies counterparty attestations. To verify a JWT signature, the verifying agent needs the signer's public key. The DID document is how that public key is published.

- `GET /agents/{air_id}/did-document` returns JSON-LD DID document
- Includes: `id`, `verificationMethod` (Ed25519 public key), `authentication`, `assertionMethod`
- Same shape as W3C DID Core spec
- Cacheable, no auth required
- Falls back to 404 if agent has no public_key on file

Example response:
```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
  "id": "did:wba:agentidentityregistry.org:agents:AIR-XXXX-XXXX-XXXX",
  "verificationMethod": [{
    "id": "did:wba:agentidentityregistry.org:agents:AIR-XXXX-XXXX-XXXX#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:wba:agentidentityregistry.org:agents:AIR-XXXX-XXXX-XXXX",
    "publicKeyMultibase": "z6Mk..."
  }],
  "authentication": ["#key-1"],
  "assertionMethod": ["#key-1"],
  "service": [{
    "id": "#trust-score",
    "type": "AIRTrustScore",
    "serviceEndpoint": "https://agentidentityregistry.org/api/v1/agents/AIR-XXXX-XXXX-XXXX/trust-score"
  }]
}
```

### 1e. AIR-Issued did:wba for Keyless Agents (NEW)
**Why:** Not every BossClaw user owns a domain. AIR becomes the DID host of last resort. If an agent registers without specifying their own creator_did, AIR mints them a did:wba that resolves through AIR itself.

- If registration has no `creator_did` AND has `public_key`, AIR mints: `did:wba:agentidentityregistry.org:agents:{air_id}`
- That DID resolves at the DID document endpoint above
- Format matches the W3C CG's did:wba spec — same method, just hosted by AIR

### 1f. Schema fixes (unchanged from Apr 30)
- Update `schema.sql` to include `is_demo` column (already in prod DB, missing in schema file)
- Add did:wba seed agent for demo
- D1 migrations: `ALTER TABLE agents ADD COLUMN public_key TEXT; ALTER TABLE agents ADD COLUMN agent_secret_hash TEXT;`

### Deploy + Verify (unchanged from Apr 30)
- `npx wrangler deploy`
- curl-test every new endpoint before proceeding to slides

---

## 2. Presentation Slides — P1

### 2a. New Opener Slide (NEW)
> "Anthropic just proved this works at Project Deal. We're shipping the identity layer."
> 
> One screenshot from Project Deal. One sentence framing the gap (it only worked inside a single trusted Slack workspace). Pivot to the rest of the deck.

### 2b. Reference Implementation Slide (NEW)
- GitHub: github.com/ahnkwangwook-oss/bossclaw
- 60-second demo video: two BossClaws negotiating a marketplace exchange + signing an attestation, both identifiable via AIR did:wba
- Architecture diagram: AIR as identity layer underneath BossClaw

### 2c. Existing 12 slides
- Keep the structure from `presentations/w3c-cg-outline.md`
- Slide 4 ("No one else does multi-dimensional trust scoring") softened to acknowledge SwarmSync's commerce-scoped scoring
- Slide 10 (Collaboration) gains three named interop proposals (Gaowei, Ben, Taylor)

### 2d. Technical
- Self-contained HTML (reveal.js inlined, ~500KB, no CDN)
- Deploy to `agentidentityregistry.org/presentations/w3c-cg/` for same-origin CORS
- Live API demo on slide 7 with backup static data
- Then Canva version for Peter/Kenny to customize

### 2e. Narrative softening (per May 15 legal decision)
- "BossClaw is **an** AIR-native agent, not **the** AIR agent"
- AIR encourages multiple implementations
- Project Deal validates the thesis; BossClaw demos the integration; any agent could do it (open standards, open code, open identity)

---

## 3. Python SDK + MCP Server — P2 (post-presentation)

Still planned, but no longer blocking BossClaw or the presentation.

### Python SDK (`sdk/python/`)
- Package: `agent-identity-registry` | Python >=3.10 | Deps: httpx, pydantic>=2.0
- Covers all 9 endpoints + new DID document endpoint
- Pydantic v2 models field-mapped to actual API JSON
- Full exception hierarchy mapped to HTTP status codes
- Async-only for v1

### MCP Server (`mcp-server/`)
- Package: `air-mcp-server` | Deps: `mcp~=1.12`, agent-identity-registry
- 8 tools (7 original + `air_get_did_document`)
- Transport: stdio (default) + streamable-http via CLI flag

These ship for the ecosystem after the W3C presentation, not before.

---

## Implementation Sequence

| Step | Deliverable | Depends On | Status |
|------|-------------|------------|--------|
| 1 | D1 migration (public_key, agent_secret_hash) | — | Pending |
| 2 | did:wba validation + resolution in API | — | Pending |
| 3 | Public key field at registration | Step 1 | Pending |
| 4 | Per-agent secret + PUT auth | Step 1 | Pending |
| 5 | DID document endpoint | Steps 1-4 | Pending |
| 6 | AIR-issued did:wba for keyless agents | Step 5 | Pending |
| 7 | Schema.sql fix + seed data update | — | Pending |
| 8 | Deploy API + curl verify | Steps 1-7 | Pending |
| 9 | HTML slides (with BossClaw + Project Deal additions) | Step 8 | Pending |
| 10 | Deploy slides to agentidentityregistry.org | Step 9 | Pending |
| 11 | Python SDK (P2) | Step 8 | Deferred |
| 12 | MCP Server (P2) | Step 11 | Deferred |
| 13 | Canva slides | Step 10 | External |

---

## Verification

| Deliverable | Behavioral Test |
|-------------|-----------------|
| D1 migration | `wrangler d1 execute` succeeds, columns exist |
| did:wba valid | `curl POST register` with `did:wba:example.com:agent:bot` → 201, has `did_wba_resolved` |
| did:wba reject | `did:wba:` → 400, `did:wba:127.0.0.1:x` → 400 |
| Public key | Register with `public_key` → 201, lookup returns it |
| PUT auth | PUT without secret → 401, PUT with correct secret → 200 |
| DID document | `curl /api/v1/agents/AIR-XXXX/did-document` → JSON-LD with publicKey |
| AIR-issued did:wba | Register without creator_did but with public_key → response has minted did:wba |
| Slides render | Open from agentidentityregistry.org/presentations/w3c-cg/, 14 slides, live demo works |
| BossClaw integration | BossClaw Phase 2 swap from mock client to live HttpAirClient succeeds |

---

## NOT in Scope

| Deferred Item | Rationale |
|---------------|-----------|
| Attestation issuance endpoint | BossClaw signs its own attestations using DID. AIR just hosts the public key. |
| Attestation verification endpoint | BossClaw fetches DID doc and verifies locally. No round-trip to AIR needed. |
| PyPI publishing / CI pipeline | Demo phase — `pip install -e .` locally is sufficient |
| JavaScript SDK | After Python proves the pattern |
| Retry/backoff in SDK | `RateLimitedError` exposes retry_after for caller |
| did:wba resolution caching | Low volume |
| Trust score updates for did:wba resolved | Provenance already credits creator_did. Resolvability bonus is a future enhancement. |
| DNS rebinding SSRF protection | Cloudflare Workers fetch() goes through edge network |
| Staging environment | Deploy to prod with curl verification. Risk accepted. |
| Key rotation flow | BossClaw v1 uses one keypair per install. Rotation is v1.1+. |

---

## What Already Exists

| Existing Code | Reused? |
|---------------|---------|
| `api/src/index.js` — all 9 API endpoints | Yes — extended, not replaced |
| `api/src/index.js:190-236` — trust score calculation | Yes — stays server-side |
| `api/src/index.js:128-184` — AIR ID generation | Yes — stays server-side |
| `api/src/index.js:560-566` — admin auth pattern | Yes — per-agent auth follows same pattern |
| `presentations/w3c-cg-outline.md` — 12 slides | Yes — extended with BossClaw + Project Deal slides |
| BossClaw repo (Phase 1 shipped) | Yes — mock AIR client swaps to live in Phase 2 |

---

## BossClaw Coordination

BossClaw v1 is 5 phases over 8-12 weeks part-time. Dependency mapping:

| BossClaw Phase | AIR Dependency |
|----------------|----------------|
| Phase 1 (shipped) | None — foundation only |
| Phase 2 (AIR integration) | did:wba validation, public key at registration, AIR-issued did:wba for keyless agents |
| Phase 3 (A2A messaging) | None |
| Phase 4 (attestation signing) | DID document endpoint |
| Phase 5 (launch polish) | All AIR features stable |

**Mock-AIR strategy:** BossClaw builds against a mock client for weeks 1-4, swaps to live AIR once API ships. ~1 week of swap work in BossClaw.

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| BossClaw blocked >4 weeks on AIR | Mock-AIR strategy decouples timelines |
| W3C demo fails (network) | Backup static data + local mock |
| did:wba spec drift (W3C CG changes) | Stay on stable v0.1, refactor post-presentation |
| Kenny review timeline unclear | This plan is the unblock document |
| BossClaw Phase 4 needs features we haven't built | DID document endpoint added explicitly here |

---

## What Changed from Apr 30 Plan

1. **+ DID document endpoint** (`GET /agents/{air_id}/did-document`) — critical for BossClaw Phase 4
2. **+ Public key field at registration** — Ed25519 base64url
3. **+ AIR-issued did:wba for keyless agents** — for users without their own domain
4. **+ Project Deal opener slide** — Anthropic validation
5. **+ BossClaw Reference Implementation slide** — github.com/ahnkwangwook-oss/bossclaw
6. **+ Risk register + BossClaw coordination table**
7. **↓ Python SDK demoted to P2** — BossClaw is Rust, doesn't need it
8. **↓ MCP server demoted to P2** — BossClaw is an MCP client, not consumer
9. **Slides narrative softened** — "an AIR-native agent, not THE AIR agent" per May 15 legal decision

---

## GSTACK Review Status (from Apr 30 plan, still valid)

| Review | Status | Findings |
|--------|--------|----------|
| Eng Review | CLEAR | 3 arch issues resolved, 35 test paths mapped |
| Outside Voice | issues_found | 15 findings, 3 tensions resolved |
| OMC Critic | REVISE→REVISED | 1 critical + 3 major, all incorporated |

**VERDICT:** Plan v2 ready for Kenny approval. All BossClaw deltas additive — no Apr 30 decisions reversed.
