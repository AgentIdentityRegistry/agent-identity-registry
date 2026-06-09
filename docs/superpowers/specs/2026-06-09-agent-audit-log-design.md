# Design — #5 Agent-Record Audit Log (externally-anchored hash chain)

**Date:** 2026-06-09
**Status:** Approved design (post independent review), pending spec review → implementation plan
**Branch:** `feat/audit-log`

## Goal

A **public, free, tamper-evident** change-history of agent records: every register / update / delete is recorded as one append-only entry. The integrity guarantee is honest — verifiable *without trusting AIR* — via an external anchor. Supports AIR's neutral-governance positioning ("don't trust us, verify against our public anchor"). Records the **fact** of each change (which fields, when, by whom-type), never the old values.

## Why this shape (post-review rework)

An independent critic returned **REWORK** on the first design (a plain in-DB hash chain). Confirmed flaws, all addressed here:
- **C1/C2 (critical):** a hash chain whose tip lives only in AIR's own DB can be rewritten end-to-end (or tail-truncated) by whoever controls the DB; `verify` would still pass. "Tamper-evident against the operator" was therefore false. → **Fixed by the external anchor (§4).**
- **H1:** non-deterministic `changed_fields` serialization → not third-party reproducible. → **Sorted + JCS-canonical (§3).**
- **H2/M1:** tip-read outside the write batch → fork race that poisons the verify signal. → **`UNIQUE(prev_hash)` + non-NULL GENESIS sentinel (§3).**
- **H3:** audit-in-batch couples audit failure to the user mutation. → **Explicit "audit-or-fail" decision (§6).**
- **H4:** `test:api` is an explicit file list (new test silently not run) + unbounded `verify`. → **Update `test:api`; bounded verify + checkpoint (§7, §10).**
- **H5:** endpoint paths must be under `/api/v1/` with the `AIR-…` regex. → **Corrected (§7).**
- **M3:** immutable public delete log vs GDPR erasure. → **Tombstone + minimal data (§8).**
- **M4/L1/L2/L3 + backfill:** actor semantics, rollback migration, leave `schema.sql` alone, worker-generated `created_at`, genesis-from-deploy (§9).

## 1. What is recorded

One entry per mutation, on three events:
- `registered` — from `registerAgent` (actor `registrant`)
- `updated` — from `updateAgent` (actor `owner`; the field list it already computes)
- `deleted` — from `deleteAgent` (actor `admin`)
- `redacted` — a tombstone written when an entry's subject is legally erased (§8)

No old/new values (those are the future paid forensic tier). Field **names** only.

## 2. Table — `agent_audit_log` (migration `0006`)

| column | type | notes |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | chain traversal order (NOT in the hash) |
| `air_id` | TEXT NOT NULL | subject agent (pseudonymous) |
| `event` | TEXT NOT NULL | `registered`/`updated`/`deleted`/`redacted` (CHECK constraint) |
| `changed_fields` | TEXT | JCS-canonical JSON array of sorted field names; NULL for register/delete/redact |
| `actor` | TEXT NOT NULL | `registrant`/`owner`/`admin`/`system` (CHECK constraint) |
| `created_at` | TEXT NOT NULL | **worker-generated** ISO 8601 (never client-supplied) |
| `prev_hash` | TEXT NOT NULL | previous entry's `entry_hash`; the literal `"GENESIS"` for the first |
| `entry_hash` | TEXT NOT NULL | this entry's hash (§3) |

Constraints/indexes: `UNIQUE(prev_hash)` (enforces a single linear chain — §3); `INDEX(air_id)` (per-agent history); PK gives chain order. A `migrations/rollbacks/0006_..._rollback.sql` (`DROP TABLE agent_audit_log`) per the 0005 precedent. **Do NOT add the table to `schema.sql`** (stale snapshot; test harness applies migrations on top — adding it would double-create).

## 3. Hash chain (in `api/src/audit.mjs`)

```
canonicalContent = [air_id, event, changedFieldsCanonicalOrEmpty, actor, created_at].join("\n")
entry_hash = sha256Hex(canonicalContent + "\n" + prev_hash)     // prev_hash = "GENESIS" for entry #1
```
- `id` is deliberately excluded (an autoincrement surrogate would break third-party reproducibility; ordering/linkage come from `prev_hash`).
- **Determinism (H1):** `changed_fields` is sorted ascending then serialized with the existing `jcsCanonicalize` (note: JCS sorts object keys but NOT array elements — so the array must be sorted explicitly first). Empty/none → the empty string. Pinned by a byte-exact test so Rust/Python/anyone reproduces the hash. The canonical recipe is documented in `openapi.yaml` + `docs`.
- **Linearity + race safety (H2):** `UNIQUE(prev_hash)`. Two concurrent writers that read the same tip both try to insert with the same `prev_hash`; the loser's batch hits the unique violation and rolls back atomically (D1 guarantees all-or-nothing). The handler maps that collision to a **clean retryable 409**, not a 500. Genesis is the literal `"GENESIS"` (not NULL) so the constraint also covers the first two concurrent inserts (SQLite allows multiple NULLs).
- Reuse the existing `sha256Hex` (`index.js:460`) and `jcsCanonicalize` (`index.js:526`); move/share as needed so `audit.mjs` stays self-contained + unit-testable with `makeTestD1`.

Module shape (mirrors `trust.mjs` pure-fn + DB-fn split):
- `auditEntryHash(content, prevHash)` — pure, testable.
- `recordAuditEvent(db, { airId, event, changedFields, actor, now })` — reads tip, computes hash, returns the bound INSERT statement (so the caller can put it in the same `batch()` as the mutation).
- `verifyAuditChain(db, { fromId, toId })` — bounded walk; recomputes each hash, checks linkage; returns `{ valid, entries_checked, first_broken_id, tip_hash, count }`.
- `computeChainTip(db)` — `{ tip_hash, count }` for the anchor + verify.

## 4. External anchor (the fix that makes "tamper-evident" honest)

The weekly cron (`wrangler.toml`, `0 3 * * SUN`, already does did:wba re-resolution) gains a step:
1. Compute `(tip_hash, entry_count)` of the global chain.
2. **Sign** it with the registry's Ed25519 key (publish the public key in the OpenAPI / a well-known doc).
3. **Publish** the signed `{ anchored_at, tip_hash, entry_count, signature }` to a **public append-only surface AIR cannot silently rewrite** — a commit to a dedicated public repo `AgentIdentityRegistry/audit-anchors` via the GitHub API (the repo's own commit history is the tamper-evident witness). Prereqs: the anchor repo + a scoped GitHub token stored as a worker secret.

`GET /api/v1/audit/verify` then cross-checks the **live** chain tip against the **last published anchor**: any rewrite of history *before* the last anchor, or any tail-truncation below the anchored count, is now externally detectable. This is what earns the public claim "verify against our published anchor."

**Honest-claim rule:** public copy may say "tamper-evident against accidental corruption **and** against the operator back to the last weekly anchor." It must NOT imply real-time trustlessness between anchors.

## 5. Reuse map (don't reinvent)

Everything needed already exists in the codebase — follow these:
- `sha256Hex` (`index.js:460`) — the chain hash.
- `jcsCanonicalize` (`index.js:526`) — canonical JSON (sorts object keys; does NOT sort arrays → sort the field-name array first).
- `UNIQUE`-index pattern — copy from `migrations/0005_attestation_replay_dup_guard.sql:18-23`.
- Pure-fn + DB-fn split — copy `trust.mjs`'s structure; unit-test with `makeTestD1` (`test/helpers/d1.mjs`).
- Router branch pattern — copy the attestation routes (`AIR-…` regex + `path.split("/")[4]`).
- Ed25519 signing helpers (already used for did:wba / attestations) — for signing the anchor (§4).

## 6. Hooks + audit-or-fail coupling (H3 — explicit decision)

`registerAgent`, `updateAgent`, `deleteAgent` each build their mutation statement(s) and the `recordAuditEvent` INSERT, then run them together in a single D1 `batch()` (atomic, all-or-nothing). **Decision: audit-or-fail.** A mutation that cannot be audited is rejected — appropriate for governance infra ("we never change a record without logging it"). The only expected failure is the `UNIQUE(prev_hash)` race (H2), which returns a **retryable 409** (client/SDK retries; the mutation also rolled back, so no orphan change). This intentionally differs from the existing best-effort trust recompute (which stays in its own try/catch *after* the batch). `registerAgent` currently does two sequential INSERTs (`index.js:1108/1125`) — they move into the batch alongside the audit insert.

## 7. Endpoints (corrected paths — H5)

- `GET /api/v1/agents/{air_id}/history` — public, paginated (`?limit`/`?offset`), that agent's entries oldest→newest. Router uses the same `AIR-[A-Z0-9]{4}-...` regex + `path.split("/")[4]` as the attestation routes.
- `GET /api/v1/audit/verify` — **bounded** (`?from=&to=`, default = since the last checkpoint, not genesis). Returns `{ valid, entries_checked, range, tip_hash, count, last_anchor: { anchored_at, tip_hash, entry_count, matches } }`. The cron writes a verified-up-to checkpoint so routine verification is incremental, not genesis-to-now (H4b); also avoids Worker CPU/memory limits on a growing chain.
- `GET /api/v1/audit/anchor` — returns the latest published anchor (convenience mirror of the public repo).

## 8. Deletes + GDPR (M3 — tombstone, minimal data)

- The chain stores only pseudonymous data (`air_id` + field-names + actor + timing + hashes) — **no names, emails, or values** — minimizing PII in the immutable layer.
- **Never silently remove entries.** On a verified legal-erasure request, the PII-bearing data lives in the `agents` table (redactable/deletable there); the chain gets a **`redacted` tombstone** entry recording *that* a subject was erased for a legal reason at time T — so the erasure itself is auditable and the chain stays intact + verifiable.
- Document the retention/erasure policy in the governance docs; this is a deliberate decision, with legal review recommended before any GDPR-scope launch. (Crypto-shredding of `air_id` is a documented future upgrade, not v1.)

## 9. Smaller decisions

- **Actor semantics (M4):** `registrant` = the self-asserted POSTer at registration (NOT an authenticated owner; registration is open + rate-limited); `owner` = holder of the agent-secret at update; `admin` = admin-key delete; `system` reserved for any future cron-driven row mutation. Defined in docs.
- **Backfill:** the chain starts empty at deploy (genesis = first event after `0006`). Pre-existing agents have no `registered` entry; `/history` notes "history tracked since <deploy date>." No backfill (it'd require fabricating timestamps).
- **`created_at`:** worker-generated (`new Date().toISOString()`), never client-supplied (prevents backdating).

## 10. Tests + rollout

- New `api/test/audit.test.mjs` AND **update root `package.json` `test:api`** to include it (else it silently never runs — H4a). The `makeTestD1` harness auto-applies `0006` (globs `migrations/*.sql`).
- Cases: hash determinism (byte-exact, incl. sorted `changed_fields`); record register/update/delete → `verify` valid; tamper a row → `verify` flags `first_broken_id`; `UNIQUE(prev_hash)` rejects a duplicate prev (race → 409); GENESIS sentinel; tombstone entry; bounded-range verify; tip/count computation.
- Anchor cron logic unit-tested against a fake publisher (no real GitHub calls in tests).
- Rollout: apply migration `0006` to remote D1 (`wrangler d1 migrations apply`), create the public `audit-anchors` repo + worker secret for the GitHub token + signing key, `wrangler deploy`, then smoke-test the three endpoints + one anchor publish.

## Scope guardrails (YAGNI)

In: the table + chain + anchor + 3 endpoints + hooks + tombstone + tests + docs/OpenAPI.
Out: old-value storage, paywall/accounts, Durable Object serialization (the `UNIQUE` constraint suffices), crypto-shredding, per-agent sub-chains, a full Merkle/Trillian transparency log, backfill of historical events.

## Honest claims (must hold in all public copy)
Tamper-evident against accidental corruption and against the operator **back to the last weekly anchor**; third parties can reproduce every hash (deterministic recipe) and cross-check the tip against the public `audit-anchors` repo. Not real-time-trustless between anchors.
