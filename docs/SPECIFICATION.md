# AIR Identity Specification v0.1 (Draft)

**Version**: 0.1 Draft
**Status**: Tracks the deployed production registry (worker `a2d46ed5`)
**Last Updated**: 2026-06-03
**Authors**: Agent Identity Registry Foundation, Technical Steering Committee

> **Source of truth.** This document describes the **deployed** behaviour of the
> registry at `https://agentidentityregistry.org/api/v1/`. The machine-readable
> contract is [`api/openapi.yaml`](../api/openapi.yaml) (OpenAPI 3.1, served at
> `/api/v1/openapi.yaml`). Where this prose and the OpenAPI document disagree,
> the OpenAPI document wins — please file an issue.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Motivation](#motivation)
3. [AIR ID Format](#air-id-format)
4. [Agent Identity Document](#agent-identity-document)
5. [Identity & DID Model](#identity--did-model)
6. [Trust Score Methodology](#trust-score-methodology)
7. [Attestations & AIR Verified](#attestations--air-verified)
8. [Agent-Record Audit Log](#agent-record-audit-log)
9. [API Overview](#api-overview)
10. [Security Considerations](#security-considerations)
11. [Governance Model](#governance-model)
12. [Glossary](#glossary)

---

## Introduction

The Agent Identity Specification (AIR-SPEC) defines the format, protocols, and procedures for creating, verifying, and maintaining cryptographic identities for AI agents. It enables interoperable identity infrastructure across different platforms, organizations, and jurisdictions.

### Scope

This specification covers:
- The format for unique agent identifiers (`AIR-XXXX-XXXX-XXXX`)
- The structure of agent identity documents and their W3C DID documents
- The trust scoring methodology actually computed by the registry
- The attestation protocol and the AIR Verified badge
- API contracts for registry operations

### Design Principles

- **Openness**: Built on W3C standards (DID Core, Ed25519); implementations are openly reviewed
- **Neutrality**: No organization has privileged access or decision-making power
- **Transparency**: All scoring components and the full attestation trail are publicly documented and queryable
- **Interoperability**: Works across platforms via standard DIDs and a public REST API
- **Privacy**: Minimal collection of personal data; no private keys are ever transmitted or stored
- **Decentralization**: Trust is earned from independent attesters anchored to distinct DNS/WHOIS roots; no single party can manufacture it

---

## Motivation

As AI systems become increasingly autonomous, the ability to verify agent identity and trustworthiness becomes essential. Current approaches are ad-hoc:

- Agents claim identities with no cryptographic proof
- Trust is subjective and opaque
- No standardized way to compare agents across platforms
- Malicious actors can impersonate legitimate agents

AIR addresses these problems through:

1. **Cryptographic proof**: each agent has a content-addressed identifier backed by an Ed25519 key and a W3C DID document
2. **Standardized trust assessment**: an objective, published trust score with auditable components
3. **Interoperability**: works with any platform that resolves DIDs and speaks the public REST API
4. **Earned, Sybil-resistant trust**: the AIR Verified badge requires endorsements from independent attesters on distinct WHOIS roots
5. **Neutral governance**: operated by a nonprofit foundation, not commercial interests

---

## AIR ID Format

### Syntax

```
AIR-XXXX-XXXX-XXXX
```

Each `X` is a **Crockford Base32** character: the alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ` — the digits `0-9` plus `A-Z` with the four look-alike letters **I, L, O, U excluded**. IDs are uppercase. (The registry's validation pattern is `^AIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`.)

### Structure

```
┌──────────────────────────────────────────────┐
│  AIR-7F3K-M9JQ-X2PL                            │
│  └──┬──┘ └──┬──┘ └──┬──┘                       │
│     │       │       └── Checksum (4 chars)     │
│     │       └────────── Hash tail  (4 chars)   │
│     └────────────────── Hash head  (4 chars)   │
│                                                │
│  Total: 18 chars (AIR + 3 dashes + 3×4 base32) │
└──────────────────────────────────────────────┘
```

### Generation Algorithm

The AIR ID is **content-addressed** — derived deterministically from the agent's identity document:

1. Serialize the identity document as canonical JSON (object keys sorted).
2. Compute the **SHA-256** hash of the canonical bytes.
3. Take the first 8 hash bytes → Crockford-Base32 → `HEAD` (first 4 bytes) and `TAIL` (next 4 bytes), 4 chars each.
4. Compute **CRC-32** over the full 32-byte hash → Base32 → `CHECKSUM` (4 chars).
5. Format as `AIR-HEAD-TAIL-CHECKSUM`.

Because the ID is a hash of the document, the same content always yields the same ID, and any tampering changes the ID.

### Verification

A recipient can verify integrity by recomputing the hash of the canonical document and confirming the HEAD/TAIL/CHECKSUM segments match. The CHECKSUM additionally catches transcription errors before any network lookup.

---

## Agent Identity Document

The canonical agent record returned by `GET /agents/{air_id}`. Fields marked *(at registration)* are supplied by the creator; the rest are computed by the registry.

### Structure

```json
{
  "@context": "https://agentidentityregistry.org/v1",
  "type": "AgentIdentity",
  "air_id": "AIR-7F3K-M9JQ-X2PL",
  "name": "DataProcessor-v3",
  "description": "Processes and analyzes financial data.",
  "creator": {
    "did": "did:wba:agentidentityregistry.org:agents:AIR-7F3K-M9JQ-X2PL",
    "name": "DataTech Inc.",
    "type": "organization",
    "public_key": "QmFzZTY0dXJsLWVuY29kZWQtZWQyNTUxOS1rZXk"
  },
  "capabilities": ["data_processing", "financial_analysis"],
  "security": {
    "certifications": ["SOC2-Type2", "ISO27001"]
  },
  "transparency": {
    "open_source": true,
    "code_repository": "https://github.com/datatech/processor",
    "documentation_url": "https://docs.datatech.io/processor"
  },
  "verified": false,
  "verification_level": "self-verified",
  "is_demo": false,
  "status": "active",
  "created": "2026-05-15T08:23:42Z",
  "updated": "2026-05-20T14:22:01Z",
  "trust_score": 375,
  "trust_grade": "C",
  "components": {
    "provenance": 400,
    "behavioral": 500,
    "transparency": 300,
    "security": 300,
    "peer_attestations": 300
  },
  "verification_status": { "verified": false, "verification_score": 0, "distinct_whois_roots": 0, "attestation_count": 0 }
}
```

### Fields

| Field | Type | Notes |
|-------|------|-------|
| `@context` | string | JSON-LD context, currently `https://agentidentityregistry.org/v1` |
| `type` | string | Always `AgentIdentity` |
| `air_id` | string | Content-addressed identifier (see above) |
| `name` | string | ≤ 200 chars *(at registration)* |
| `description` | string | ≤ 2000 chars *(at registration)* |
| `creator.did` | string \| null | The agent's DID. If none is brought, the registry mints `did:wba:agentidentityregistry.org:agents:{air_id}` |
| `creator.name` / `creator.type` | string \| null | `type` ∈ `individual`, `organization` |
| `creator.public_key` | string \| null | Ed25519 public key, base64url (43–44 chars) |
| `capabilities` | string[] | ≤ 20 freeform capability tags |
| `security.certifications` | string[] | Self-declared certifications |
| `transparency` | object | `open_source` (bool), `code_repository`, `documentation_url` |
| `verified` | bool | The AIR Verified badge (see [Attestations](#attestations--air-verified)) |
| `verification_level` | string | Label: `self-verified`, `enhanced`, or `kyc-verified` |
| `is_demo` | bool | Seed/demo records are flagged, not hidden |
| `status` | string | `active` or `deleted` (soft-delete) |
| `created` / `updated` | date-time | ISO 8601 |
| `trust_score` / `trust_grade` | int \| null / string \| null | See [Trust Score](#trust-score-methodology) |
| `components` | object \| null | The five trust sub-scores |
| `verification_status` | object | Live attestation aggregate (score, distinct roots, count) |

### Versioning

The AIR ID is a hash of the document, so a material change yields a *new* document with a *new* AIR ID. Earlier documents remain discoverable; `alsoKnownAs` / metadata can express version relationships.

---

## Identity & DID Model

Every agent has a **W3C DID document**, served at `GET /agents/{air_id}/did-document`.

### AIR-minted DIDs (`did:wba`)

Agents that do not bring their own DID receive an AIR-minted one in the **canonical** form:

```
did:wba:agentidentityregistry.org:agents:{air_id}
```

`did:wba` (Web-Based Authentication) is a DNS-anchored DID method requiring no blockchain or central ledger. The DID document is W3C DID Core JSON-LD (camelCase wire format):

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/ed25519-2020/v1"
  ],
  "id": "did:wba:agentidentityregistry.org:agents:AIR-WBA1-DEMO-AGT0",
  "verificationMethod": [{
    "id": "did:wba:agentidentityregistry.org:agents:AIR-WBA1-DEMO-AGT0#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:wba:agentidentityregistry.org:agents:AIR-WBA1-DEMO-AGT0",
    "publicKeyMultibase": "z6Mk..."
  }],
  "authentication": ["...#key-1"],
  "assertionMethod": ["...#key-1"],
  "service": [{
    "id": "...#trust-score",
    "type": "AIRTrustScore",
    "serviceEndpoint": "https://agentidentityregistry.org/api/v1/agents/AIR-WBA1-DEMO-AGT0/trust-score"
  }]
}
```

- **`publicKeyMultibase`** uses the same encoding as `did:key`: multibase prefix `z` (base58btc) + multicodec `0xed01` (Ed25519) + the 32 raw key bytes.
- The first `service` entry (`AIRTrustScore`) is always registry-issued and not user-controlled. Agents may add further entries (e.g. an `A2AInbox`) via `PUT`.
- `alsoKnownAs` lists any other DIDs the agent claims (e.g. its own `did:key` or `did:web`).

### Resolution rules

| DID | How it resolves |
|-----|-----------------|
| **AIR-minted** (`agentidentityregistry.org`) | **Self-hosted via direct DB lookup**, never an HTTP self-fetch (a Worker cannot reliably fetch its own route). The agent existing, being `active`, and having a `public_key` is the proof its DID document resolves. |
| **Non-canonical** on `agentidentityregistry.org` | **Hard-rejected at the source** (only `agents:{air_id}` is accepted) so no future catch-all/SPA route can become a key-substitution vector. |
| **External** `did:wba:DOMAIN[:path]` | Fetched over HTTPS from `https://DOMAIN/.well-known/agent.json` (bare domain) or `https://DOMAIN/path/segments/did.json` (path form). Resolution **must not redirect**, must be `application/json` / `application/did+json`, and is read up to a fixed byte cap. |

### Key binding (Lock 1)

When an **external** `did:wba` attester vouches for an agent, the registry re-resolves the attester's live DID document and confirms it **advertises the exact public key AIR has on file** (a byte-equal `Ed25519VerificationKey2020` in `verificationMethod[]`). The check is **fail-closed**: if the document is missing, malformed, redirected, non-JSON, or the key is absent, the vouch does not count. AIR-minted DIDs skip this binding because they are self-consistent by construction. A weekly cron re-resolves external DIDs and flags drift (`did_wba_resolved = 0` with a distinct "key drift" reason).

---

## Trust Score Methodology

> This section documents the **deployed** scoring. The companion
> [`TRUST-SCORE.md`](TRUST-SCORE.md) contains a fuller, target-state rubric that
> still reflects the original 2026-03 design and is **pending the same
> reconciliation** — where the two differ, the numbers below are what the
> registry actually computes today.

### Formula

The trust score (0–1000) is a **weighted sum** of five components, each on a 0–1000 scale:

```
total = round( 0.25·Provenance
             + 0.25·Behavioral
             + 0.20·Transparency
             + 0.15·Security
             + 0.15·PeerAttestations )
```

### Component scoring (as implemented)

| Component | Weight | How it is computed today | Effective range |
|-----------|--------|--------------------------|-----------------|
| **Provenance** | 25% | base 300; +100 each for creator DID, creator name, and `type = organization` | 300–600 |
| **Behavioral** | 25% | flat **500** placeholder — signed action history is a future release | 500 |
| **Transparency** | 20% | base 300; +150 open-source, +100 code repo, +100 docs URL | 300–650 |
| **Security** | 15% | base 300; +100 per declared certification (max +300) | 300–600 |
| **Peer Attestations** | 15% | `min(300 + round(18·√W), 1000)`, where `W` is the frozen-weight sum of active attestations (baseline **300** with none) | 300–1000 |

The peer-attestation curve uses **frozen weights** (`attester_trust_at_issue × tenure_multiplier_at_issue` captured at attestation time). Freezing breaks the recursive "trust pump" loop — raising one agent's score later cannot retroactively inflate the agents it has vouched for.

### Current ceiling

Because `Behavioral` is a flat 500 and the other input components are capped well below 1000, a maximally-favourable agent today reaches a total of **645 (grade BBB)**. Grades **A / AA / AAA are reserved** for when behavioral telemetry and higher-confidence inputs ship. (Worked example: P=600, B=500, T=650, S=600, A=1000 → `0.25·600 + 0.25·500 + 0.20·650 + 0.15·600 + 0.15·1000 = 645`.)

### Evidence Labels

In addition to the numeric score and letter grade, every agent carries a factual **evidence label** — `Verified` / `Attested` / `Self-declared` / `Registered` — describing what independent evidence exists, never a verdict. It is the canonical human-facing classification; the numeric score + components are the transparent detail, and the legacy letter grade is retained for backward compatibility only. Full criteria + versioning: see `docs/TRUST-SCORE.md` → "Evidence Labels". Exposed in the `evidence` object on `GET /agents/{air_id}` and `/trust-score`, and on `badge.svg`.

### Trust grades

| Score | Grade |
|-------|-------|
| ≥ 950 | AAA |
| ≥ 850 | AA |
| ≥ 700 | A |
| ≥ 600 | BBB |
| ≥ 500 | BB |
| ≥ 400 | B |
| < 400 | C |

### Recalculation

Scores are recomputed **on the events that can change them** — attestation create/revoke, an agent edit, or an attester's deletion (which rescores every agent that attester vouched for). A **weekly cron** (`0 3 * * SUN`) additionally re-resolves external `did:wba` documents and flags key drift. There is no fixed "quarterly" cadence.

---

## Attestations & AIR Verified

Attestations are how one registered agent **vouches** for another. They are the input to the **AIR Verified** badge and to the Peer-Attestation trust component.

### Creating an attestation

Attestations are **signed client-side** — the registry never sees a private key. The attester:

1. Builds the payload `{ attester_air_id, attestation_type, signed_at, statement, subject_air_id }`.
2. Canonicalizes it (JCS / RFC 8785) and signs the canonical bytes with its **Ed25519** key.
3. Multibase-encodes the signature (`z` + base58btc) as `signature_multibase`.
4. `POST /agents/{subject_air_id}/attestations` with that payload, authenticated by the **attester's** `X-Agent-Secret`.

### The six Locks

Whether an attestation counts toward **AIR Verified** is gated by six checks:

1. **Live key binding** — attester's `did:wba` resolves and advertises the on-file key; the Ed25519 signature verifies (fail-closed).
2. **Distinct WHOIS root** — duplicate vouches from the same DNS/WHOIS root are rejected (`409`).
3. **Attester eligibility** — attester tenure ≥ 30 days and trust ≥ 50.
4. **Weighting** — the vouch's contribution is the frozen `attester_trust_at_issue × tenure_multiplier_at_issue`.
5. **Rate limit** — at most 10 attestations per attester per 7 days.
6. **Audit** — every attestation (active and revoked) is part of a public trail.

### AIR Verified

An agent is **Verified** when its live attestation aggregate satisfies **both**:

```
verification_score ≥ 300   AND   distinct_whois_roots ≥ 3
```

where `verification_score = Σ (attester_trust_at_issue × tenure_multiplier_at_issue)` over **active attestations from active attesters**.

- **Dead-vouch filter**: a vouch from a deleted/deactivated attester stops counting toward both the score and Verified; deleting an attester rescores its dependents.
- **The ≥ 3 distinct WHOIS roots requirement is the Sybil moat** — AIR-minted agents all share the `agentidentityregistry.org` root and therefore count as only **one** root among the three required.

### Revoking

`DELETE /agents/{air_id}/attestations/{attestation_id}` soft-deletes an attestation (original attester's `X-Agent-Secret` required) and returns the subject's recomputed verified status.

---

## Agent-Record Audit Log

Every create, update, and delete operation on an agent record is written to a public, append-only, hash-linked audit log. The log records the **fact** of each change — which field names changed, when, and which actor type performed it — never the old or new field values.

### What is logged

| Event | Trigger |
|-------|---------|
| `registered` | Agent registration |
| `updated` | `PUT /agents/{air_id}` (owner) |
| `deleted` | `DELETE /agents/{air_id}` (admin) |
| `redacted` | GDPR erasure tombstone (see below) |

### Entry structure

Each entry contains:

| Field | Notes |
|-------|-------|
| `id` | Chain sequence number (not part of the hash) |
| `event` | One of `registered`, `updated`, `deleted`, `redacted` |
| `changed_fields` | Array of public field names changed; `null` for register/delete/redact events |
| `actor` | Who performed the action (see Actor semantics below) |
| `created_at` | Worker-generated ISO 8601 timestamp — never client-supplied |
| `prev_hash` | The previous entry's `entry_hash`; the literal string `"GENESIS"` for the first entry |
| `entry_hash` | SHA-256 hex digest of the entry (see Hash recipe below) |

### Actor semantics

| Actor | Meaning |
|-------|---------|
| `registrant` | Self-asserted registrant at registration time — **not** an authenticated owner |
| `owner` | Holder of the agent secret at update time |
| `admin` | Admin-key deletion |
| `system` | Reserved for cron-driven changes |

### Hash recipe

```
entry_hash = sha256hex(
  [air_id, event, sortedJCS(changed_fields) or "", actor, created_at].join("\n")
  + "\n" + prev_hash
)
```

- `changed_fields` is serialized as **sorted JCS** (JSON Canonicalization Scheme, RFC 8785, keys sorted) so the hash is deterministic regardless of field order.
- For events where `changed_fields` is `null` (register/delete/redact), the empty string `""` is used in the hash input.
- The genesis entry uses the literal string `"GENESIS"` as `prev_hash`.
- Anyone can re-derive every `entry_hash` and verify the `prev_hash` linkage — no registry access required.

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /agents/{air_id}/history` | Paginated history for one agent (`limit`, `offset`) |
| `GET /audit/verify?from=&to=` | Bounded integrity check of the global audit chain |

### Integrity claim

Tamper-evident against accidental corruption and partial edits, **and against the operator itself back to the last weekly anchor**: every hash is reproducible by third parties (sorted-JCS `changed_fields`; `entry_hash = sha256(content + prev_hash)`; genesis = `"GENESIS"`), and the chain tip + entry count are published every Sunday to the public, append-only [`AgentIdentityRegistry/audit-anchors`](https://github.com/AgentIdentityRegistry/audit-anchors) repo. Anyone can cross-check the live chain against that external anchor via `GET /api/v1/audit/verify` (`last_anchor.matches`). Integrity between weekly anchors is not real-time-guaranteed against the operator.

### GDPR and erasure

The chain stores only pseudonymous data (AIR ID, field names, timing). Legal erasure is handled by a `redacted` tombstone event that records the fact of erasure without revealing the erased content — silent removal would break the hash chain. Legal review is recommended before any GDPR-scope production launch.

### Backfill note

History is tracked from the audit-log launch date (2026-06-09). Agents registered before that date have no `registered` entry in the log.

---

## API Overview

Base URL: `https://agentidentityregistry.org/api/v1`. The full machine-readable contract is at [`/api/v1/openapi.yaml`](../api/openapi.yaml).

### Endpoints

**Public (no auth):**

```
GET  /health                              Service health
GET  /agents                              List/search agents (limit, offset)
GET  /agents/check-name                   Check name availability
GET  /agents/{air_id}                     Full agent record
GET  /agents/{air_id}/trust-score         Trust score + components
GET  /agents/{air_id}/did-document        W3C DID document
GET  /agents/{air_id}/attestations        Attestation trail + verified status
GET  /attestations/recent                 Recent-attestations firehose
GET  /agents/{air_id}/badge.svg           Embeddable trust badge (SVG)
GET  /agents/{air_id}/graph               Trust ego-graph
GET  /agents/{air_id}/dependents          Agents this one vouches for
GET  /graph/stats                         Registry-wide graph stats
GET  /agents/{air_id}/history             Agent-record audit log (paginated)
GET  /audit/verify                        Bounded audit chain integrity check
GET  /openapi.yaml                        This API contract
```

**Agent management:**

```
POST   /agents/register                   Register a new agent (rate-limited)
PUT    /agents/{air_id}                    Update agent (X-Agent-Secret)
POST   /agents/{air_id}/attestations       Create an attestation (attester's X-Agent-Secret)
DELETE /agents/{air_id}/attestations/{id}  Revoke an attestation (original attester)
```

**Admin (operator-only, `X-Admin-Key`):**

```
DELETE /agents/{air_id}                    Soft-delete an agent
GET    /admin/stats                        Registry statistics
GET    /admin/recent                       Recent registrations
```

### Authentication

- **Default: none.** Most endpoints are public and cacheable.
- **`X-Agent-Secret`** — the 32-character hex secret returned at registration. Required for `PUT` and for creating/revoking attestations. Compared in constant time against a stored SHA-256 hash; the plaintext is never persisted.
- **`X-Admin-Key`** — AIR operator-only; required for agent deletion and the `/admin/*` endpoints. Not user-distributable.

### Rate limiting

Only `POST /agents/register` is rate-limited: **5 registrations per hour per source IP**. All other endpoints are unrated as of v0.1.0.

---

## Security Considerations

### Key Management
- Agents hold their own Ed25519 private keys; **no private key is ever transmitted to or stored by the registry**.
- Per-agent secrets are stored only as constant-time-compared SHA-256 hashes.
- Hardware-backed key storage is recommended for high-value agents.

### Cryptography
- **Ed25519 (EdDSA)** for agent signatures and attestations.
- **SHA-256** for content-addressed AIR ID generation and secret hashing.
- **CRC-32** as the AIR ID checksum (transcription-error detection only — not a security primitive).

### DID resolution hardening
- External `did:wba` resolution **rejects redirects**, requires a JSON content type (guarding against HTML/SPA fallbacks), and reads only up to a fixed byte cap.
- An external attester's key is **bound** to its freshly-resolved DID document on every vouch (Lock 1, fail-closed).
- Non-canonical DIDs on the AIR domain are hard-rejected before any lookup.

### Abuse resistance
- Registration rate limiting (5/hr/IP).
- Attestation rate limiting (10 per attester / 7 days) and WHOIS-root distinctness.
- The ≥ 3 distinct WHOIS roots requirement for Verified resists Sybil attacks.

### Privacy
- Minimal PII collection; no personal data is linked to agents without consent.

---

## Governance Model

See [GOVERNANCE.md](GOVERNANCE.md) for the complete governance structure.

**Key points:**
- The Foundation board oversees specification evolution.
- Material changes require board approval plus a community comment period.
- Methodology concerns may be filed as GitHub issues labelled `spec-feedback`.

---

## Glossary

**Agent** — An autonomous software system capable of independent action and decision-making.

**AIR ID** — A content-addressed, Crockford-Base32 identifier (`AIR-XXXX-XXXX-XXXX`) derived from the SHA-256 of an agent's identity document.

**Attestation** — A cryptographically signed vouch by one registered agent for another, signed Ed25519 over the JCS-canonical payload and submitted to the registry.

**AIR Verified** — A badge granted when an agent's active attestation aggregate reaches `verification_score ≥ 300` from attesters on **≥ 3 distinct WHOIS roots**.

**WHOIS root** — The registrable-domain owner behind an attester's identity; the unit of distinctness used to resist Sybil attacks.

**Trust Score** — A weighted composite (0–1000) of five components: provenance, behavioral, transparency, security, peer attestations.

**did:wba** — A DNS-anchored DID method (Web-Based Authentication) used for AIR-minted and external agent DIDs.

**DID** — Decentralized Identifier (W3C standard) for self-sovereign identity.

**publicKeyMultibase** — Multibase (`z` + base58btc) encoding of an Ed25519 public key with multicodec prefix `0xed01`.

---

## Document Status

This specification is a **DRAFT** that tracks the deployed registry. It reflects production worker `a2d46ed5` as of 2026-06-03. Community feedback is welcome — please file GitHub issues labelled `spec-feedback`.

**Companion documents:** [`TRUST-SCORE.md`](TRUST-SCORE.md) (detailed scoring rubric — pending reconciliation), [`GOVERNANCE.md`](GOVERNANCE.md), and the canonical [`api/openapi.yaml`](../api/openapi.yaml).

---

**Agent Identity Registry Foundation**
*Building neutral infrastructure for AI agent trust*
