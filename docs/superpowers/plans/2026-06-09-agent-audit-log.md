# Agent-Record Audit Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, tamper-evident, externally-anchored hash-chain audit log of every agent-record change (register / update / delete), verifiable without trusting AIR.

**Architecture:** A new append-only `agent_audit_log` table (migration `0006`) holds a single global hash chain. A new isolated `api/src/audit.mjs` owns all chain logic (pure hash + DB record/verify). The three mutation handlers write their mutation + the audit entry in one atomic D1 `batch()` (audit-or-fail). A weekly cron publishes a signed `(tip_hash, entry_count)` anchor to a public GitHub repo; `verify` cross-checks the live chain against it. Built in two phases: **A = core chain (standalone, honest interim claim)**, **B = external anchor (delivers the trustless claim)**.

**Tech Stack:** Cloudflare Worker (`api/src/index.js`), D1/SQLite, `node:test` (`api/test/*.test.mjs`, run via `npm run test:api`), `wrangler`, GitHub REST API (anchor publish).

**Spec:** `docs/superpowers/specs/2026-06-09-agent-audit-log-design.md`

---

## File Structure

- **`api/src/crypto-utils.mjs`** (NEW) — extracted `sha256Hex` + `jcsCanonicalize` (currently private in `index.js:460,526`), so both `index.js` and `audit.mjs` import them (avoids a circular dep). One clear responsibility: hashing/canonicalization primitives.
- **`api/src/audit.mjs`** (NEW) — all audit-chain logic: `canonicalizeChangedFields`, `auditEntryHash` (pure), `recordAuditEvent` (returns a bound INSERT for the caller's batch), `computeChainTip`, `verifyAuditChain`, and (Phase B) `buildAnchor` / `publishAnchor`. Mirrors `trust.mjs`'s pure-fn + DB-fn split.
- **`api/migrations/0006_add_agent_audit_log.sql`** (+ `migrations/rollbacks/0006_add_agent_audit_log_rollback.sql`) — the table.
- **`api/src/index.js`** — extraction re-import; hooks in `registerAgent`/`updateAgent`/`deleteAgent`; new router branches; cron step; manual anchor-trigger endpoint.
- **`api/openapi.yaml`** + **`docs/SPECIFICATION.md`** / **`docs/TRUST-SCORE.md`** — schemas + governance section.
- **`api/test/audit.test.mjs`** (NEW) + **root `package.json`** (`test:api` must list the new file).

---

# PHASE A — Core hash chain

### Task 1: Extract `sha256Hex` + `jcsCanonicalize` to a shared module

**Files:** Create `api/src/crypto-utils.mjs`; Modify `api/src/index.js`.

- [ ] **Step 1:** Create `api/src/crypto-utils.mjs` by MOVING the two functions verbatim from `index.js` (currently `sha256Hex` at ~460, `jcsCanonicalize` at ~526), each `export`ed:
```js
// Hashing + canonical-JSON primitives shared by the worker and audit.mjs.
export async function sha256Hex(text) { /* ...exact body moved from index.js... */ }
export function jcsCanonicalize(obj) { /* ...exact body moved from index.js... */ }
```
- [ ] **Step 2:** In `index.js`, delete the two original definitions and add to the top imports:
```js
import { sha256Hex, jcsCanonicalize } from "./crypto-utils.mjs";
```
- [ ] **Step 3:** Verify nothing else broke: `node --check api/src/index.js && npm run test:api` → all existing tests pass; `cd api && npx wrangler deploy --dry-run` → clean bundle.
- [ ] **Step 4:** Commit: `git add api/src/crypto-utils.mjs api/src/index.js && git commit -m "refactor(api): extract sha256Hex + jcsCanonicalize to crypto-utils.mjs"`

### Task 2: Migration `0006` — `agent_audit_log` table

**Files:** Create `api/migrations/0006_add_agent_audit_log.sql`, `api/migrations/rollbacks/0006_add_agent_audit_log_rollback.sql`; Test in `api/test/audit.test.mjs`.

- [ ] **Step 1: Write the failing test** (create `api/test/audit.test.mjs`):
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTestD1 } from "./helpers/d1.mjs";

test("0006: agent_audit_log table exists with UNIQUE(prev_hash)", async () => {
  const db = makeTestD1();
  // insert one row
  await db.prepare(`INSERT INTO agent_audit_log (air_id, event, changed_fields, actor, created_at, prev_hash, entry_hash)
    VALUES ('AIR-TEST-0001-AAAA','registered',NULL,'registrant','2026-01-01T00:00:00Z','GENESIS','h1')`).bind().run();
  const row = await db.prepare("SELECT air_id, event, actor, prev_hash FROM agent_audit_log WHERE entry_hash='h1'").first();
  assert.equal(row.air_id, "AIR-TEST-0001-AAAA");
  assert.equal(row.prev_hash, "GENESIS");
  // UNIQUE(prev_hash): a second row with the same prev_hash must fail
  await assert.rejects(db.prepare(`INSERT INTO agent_audit_log (air_id, event, actor, created_at, prev_hash, entry_hash)
    VALUES ('AIR-TEST-0002-BBBB','updated','owner','2026-01-01T00:01:00Z','GENESIS','h2')`).bind().run());
});
```
- [ ] **Step 2: Run → FAIL** (`node --test api/test/audit.test.mjs`): table doesn't exist.
- [ ] **Step 3: Write the migration** `0006_add_agent_audit_log.sql`:
```sql
-- Append-only, hash-chained audit log of agent-record changes (registry #5).
-- Single global chain: each entry's prev_hash = previous entry's entry_hash.
-- UNIQUE(prev_hash) makes the chain linear + race-safe (concurrent fork → one
-- insert fails + its batch rolls back). Genesis uses the literal 'GENESIS'
-- (not NULL) so the constraint also covers the first entries.
CREATE TABLE IF NOT EXISTS agent_audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  air_id         TEXT NOT NULL,
  event          TEXT NOT NULL CHECK (event IN ('registered','updated','deleted','redacted')),
  changed_fields TEXT,
  actor          TEXT NOT NULL CHECK (actor IN ('registrant','owner','admin','system')),
  created_at     TEXT NOT NULL,
  prev_hash      TEXT NOT NULL UNIQUE,
  entry_hash     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_air_id ON agent_audit_log (air_id);
```
And the rollback `rollbacks/0006_add_agent_audit_log_rollback.sql`: `DROP TABLE IF EXISTS agent_audit_log;`
- [ ] **Step 4: Run → PASS** (`node --test api/test/audit.test.mjs`).
- [ ] **Step 5: Wire the test runner** — in root `package.json`, change `test:api` to include the new file:
```json
"test:api": "node --test api/test/trust.test.mjs api/test/did-keys.test.mjs api/test/audit.test.mjs"
```
Run `npm run test:api` → all pass (this proves the new file actually runs — guards the H4a silent-green trap).
- [ ] **Step 6: Commit:** `git add api/migrations/0006_add_agent_audit_log.sql api/migrations/rollbacks/0006_add_agent_audit_log_rollback.sql api/test/audit.test.mjs package.json && git commit -m "feat(audit): agent_audit_log table (migration 0006) + test wiring"`

### Task 3: Pure chain primitives in `audit.mjs` (`canonicalizeChangedFields`, `auditEntryHash`)

**Files:** Create `api/src/audit.mjs`; Test in `api/test/audit.test.mjs`.

- [ ] **Step 1: Write failing tests** (append to `audit.test.mjs`):
```js
import { canonicalizeChangedFields, auditEntryHash, GENESIS } from "../src/audit.mjs";

test("canonicalizeChangedFields: sorted + JCS array; empty → ''", () => {
  assert.equal(canonicalizeChangedFields(null), "");
  assert.equal(canonicalizeChangedFields([]), "");
  // sorted ascending regardless of input order, deterministic bytes
  assert.equal(canonicalizeChangedFields(["description","capabilities"]),
               canonicalizeChangedFields(["capabilities","description"]));
  assert.equal(canonicalizeChangedFields(["b","a"]), '["a","b"]');
});

test("auditEntryHash: deterministic + genesis-aware + chains on prev_hash", async () => {
  const content = { air_id: "AIR-TEST-0001-AAAA", event: "registered", changedFields: null, actor: "registrant", created_at: "2026-01-01T00:00:00Z" };
  const h1 = await auditEntryHash(content, GENESIS);
  const h1again = await auditEntryHash(content, GENESIS);
  assert.equal(h1, h1again);                       // deterministic
  const h2 = await auditEntryHash(content, h1);    // different prev → different hash
  assert.notEqual(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);              // sha256 hex
});
```
- [ ] **Step 2: Run → FAIL** (module missing).
- [ ] **Step 3: Implement** `api/src/audit.mjs`:
```js
// AIR Registry — agent-record audit chain (registry #5). Isolated + testable.
import { sha256Hex, jcsCanonicalize } from "./crypto-utils.mjs";

export const GENESIS = "GENESIS"; // sentinel prev_hash for the first entry (non-NULL so UNIQUE covers it)

// Deterministic, third-party-reproducible serialization of the changed-field set.
// Sort ascending FIRST (jcsCanonicalize sorts object keys but NOT array elements),
// then JCS-serialize. Empty / null → "".
export function canonicalizeChangedFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return "";
  return jcsCanonicalize([...fields].sort());
}

// entry_hash = sha256Hex(canonicalContent + "\n" + prevHash). `id` deliberately excluded.
export async function auditEntryHash(content, prevHash) {
  const canonical = [
    content.air_id,
    content.event,
    canonicalizeChangedFields(content.changedFields),
    content.actor,
    content.created_at,
  ].join("\n");
  return sha256Hex(canonical + "\n" + prevHash);
}
```
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit:** `git add api/src/audit.mjs api/test/audit.test.mjs && git commit -m "feat(audit): deterministic chain hash primitives"`

### Task 4: DB chain functions — `recordAuditEvent`, `computeChainTip`, `verifyAuditChain`

**Files:** Modify `api/src/audit.mjs`; Test in `api/test/audit.test.mjs`.

- [ ] **Step 1: Write failing tests** (append):
```js
import { recordAuditEvent, computeChainTip, verifyAuditChain } from "../src/audit.mjs";

async function record(db, e) {
  const stmt = await recordAuditEvent(db, e);
  await stmt.run();
}
test("chain: record events → verify valid; tamper → first_broken_id", async () => {
  const db = makeTestD1();
  await record(db, { airId: "AIR-AAAA-AAAA-AAAA", event: "registered", changedFields: null, actor: "registrant", now: "2026-01-01T00:00:00Z" });
  await record(db, { airId: "AIR-AAAA-AAAA-AAAA", event: "updated", changedFields: ["description"], actor: "owner", now: "2026-01-01T00:01:00Z" });
  let v = await verifyAuditChain(db, {});
  assert.equal(v.valid, true);
  assert.equal(v.count, 2);
  // tamper: change a stored field without recomputing the hash
  await db.prepare("UPDATE agent_audit_log SET actor='admin' WHERE id=1").bind().run();
  v = await verifyAuditChain(db, {});
  assert.equal(v.valid, false);
  assert.equal(v.first_broken_id, 1);
});
test("chain: UNIQUE(prev_hash) blocks a fork", async () => {
  const db = makeTestD1();
  await record(db, { airId: "AIR-AAAA-AAAA-AAAA", event: "registered", changedFields: null, actor: "registrant", now: "2026-01-01T00:00:00Z" });
  const tip = await computeChainTip(db);
  assert.equal(tip.count, 1);
  // two inserts both reading the same tip → second must violate UNIQUE(prev_hash)
  const a = await recordAuditEvent(db, { airId: "AIR-BBBB-BBBB-BBBB", event: "updated", changedFields: ["description"], actor: "owner", now: "t2" });
  const b = await recordAuditEvent(db, { airId: "AIR-CCCC-CCCC-CCCC", event: "updated", changedFields: ["description"], actor: "owner", now: "t3" });
  await a.run();
  await assert.rejects(b.run()); // same prev_hash → UNIQUE violation
});
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** (append to `audit.mjs`):
```js
export async function computeChainTip(db) {
  const row = await db.prepare("SELECT entry_hash FROM agent_audit_log ORDER BY id DESC LIMIT 1").first();
  const cnt = await db.prepare("SELECT COUNT(*) AS n FROM agent_audit_log").first();
  return { tip_hash: row?.entry_hash ?? GENESIS, count: cnt?.n ?? 0 };
}

// Reads the current tip, computes this entry's hash, and RETURNS the bound INSERT
// statement (so the caller can run it inside the same db.batch() as the mutation).
export async function recordAuditEvent(db, { airId, event, changedFields, actor, now }) {
  const { tip_hash: prevHash } = await computeChainTip(db);
  const content = { air_id: airId, event, changedFields, actor, created_at: now };
  const entryHash = await auditEntryHash(content, prevHash);
  return db.prepare(
    `INSERT INTO agent_audit_log (air_id, event, changed_fields, actor, created_at, prev_hash, entry_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(airId, event, changedFields ? jcsCanonicalize([...changedFields].sort()) : null, actor, now, prevHash, entryHash);
}

// Bounded walk: recompute each hash + check linkage. Returns the integrity verdict.
export async function verifyAuditChain(db, { fromId = 0, toId = null } = {}) {
  const rows = (await db.prepare(
    "SELECT * FROM agent_audit_log WHERE id > ? AND (? IS NULL OR id <= ?) ORDER BY id ASC"
  ).bind(fromId, toId, toId).all()).results ?? [];
  let prev = fromId === 0 ? GENESIS : (await db.prepare("SELECT entry_hash FROM agent_audit_log WHERE id = ?").bind(fromId).first())?.entry_hash;
  for (const r of rows) {
    const changedFields = r.changed_fields ? JSON.parse(r.changed_fields) : null;
    const expect = await auditEntryHash(
      { air_id: r.air_id, event: r.event, changedFields, actor: r.actor, created_at: r.created_at }, prev);
    if (r.prev_hash !== prev || r.entry_hash !== expect) {
      return { valid: false, first_broken_id: r.id, entries_checked: rows.indexOf(r), count: rows.length };
    }
    prev = r.entry_hash;
  }
  const tip = await computeChainTip(db);
  return { valid: true, first_broken_id: null, entries_checked: rows.length, count: tip.count, tip_hash: tip.tip_hash };
}
```
Note: `changed_fields` is stored as the SAME canonical JSON the hash used (so verify re-parses + re-canonicalizes identically). `jcsCanonicalize([...].sort())` is used both in `recordAuditEvent` storage and inside `canonicalizeChangedFields` — keep them identical.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit:** `git add api/src/audit.mjs api/test/audit.test.mjs && git commit -m "feat(audit): record/verify chain + UNIQUE-fork protection"`

### Task 5: Hook the chain into the three mutation handlers (audit-or-fail, atomic batch)

**Files:** Modify `api/src/index.js`.

- [ ] **Step 1:** Import in `index.js`: `import { recordAuditEvent } from "./audit.mjs";`
- [ ] **Step 2: `registerAgent`** — its two sequential INSERTs (~`index.js:1108`,`1125`) + the audit insert go in one batch. Build `now` once, build `const auditStmt = await recordAuditEvent(db, { airId, event: "registered", changedFields: null, actor: "registrant", now });` then replace the two `.run()`s with `await db.batch([insert1, insert2, auditStmt]);`. Wrap in try/catch: on a `UNIQUE`/`prev_hash` constraint error, return `json({ error: "audit chain contention, retry", air_id: airId }, 409)`.
- [ ] **Step 3: `updateAgent`** — it already computes the changed `updates`. Derive the field-NAME list (the human names, e.g. map `transparency_open_source`→`open_source`); build `const auditStmt = await recordAuditEvent(db, { airId, event: "updated", changedFields: fieldNames, actor: "owner", now });` and replace the single `UPDATE` `.run()` with `await db.batch([updateStmt, auditStmt]);` (keep the best-effort `recomputeTrustScore` AFTER the batch, unchanged). UNIQUE error → 409 as above.
- [ ] **Step 4: `deleteAgent`** — replace the soft-delete `.run()` with `await db.batch([deleteStmt, await recordAuditEvent(db, { airId, event: "deleted", changedFields: null, actor: "admin", now })]);` (keep `recomputeDependentsOf` after, unchanged). UNIQUE error → 409.
- [ ] **Step 5: Verify** `node --check api/src/index.js && npm run test:api && (cd api && npx wrangler deploy --dry-run)` → all green/clean.
- [ ] **Step 6: Commit:** `git add api/src/index.js && git commit -m "feat(audit): record register/update/delete in same atomic batch (audit-or-fail)"`

### Task 6: Public endpoints — `/history` + bounded `/audit/verify`

**Files:** Modify `api/src/index.js`.

- [ ] **Step 1:** Add router branches (copy the attestation-route regex pattern). For `GET /api/v1/agents/{air_id}/history`: `const airId = path.split("/")[4]; response = await getAgentHistory(airId, url, env.DB);`. For `GET /api/v1/audit/verify`: `response = await getAuditVerify(url, env.DB);`.
- [ ] **Step 2:** Implement `getAgentHistory(airId, url, db)` — paginated (`limit` ≤100 default 50, `offset`), `SELECT id,event,changed_fields,actor,created_at,prev_hash,entry_hash FROM agent_audit_log WHERE air_id=? ORDER BY id ASC LIMIT ? OFFSET ?`; parse `changed_fields` back to an array; return `{ air_id, history: [...], total, note: "history tracked since 2026-06-09 (audit log launch)" }`.
- [ ] **Step 3:** Implement `getAuditVerify(url, db)` — read `from`/`to` query params (default `from=0`); call `verifyAuditChain(db, { fromId, toId })`; return its result as JSON.
- [ ] **Step 4: Verify** `node --check` + dry-run clean.
- [ ] **Step 5: Commit:** `git add api/src/index.js && git commit -m "feat(audit): GET /history + bounded GET /audit/verify"`

### Task 7: OpenAPI + governance docs (HONEST interim claim)

**Files:** Modify `api/openapi.yaml`, `docs/TRUST-SCORE.md`, `docs/SPECIFICATION.md`.

- [ ] **Step 1:** Add `AuditEntry` + `AuditVerifyResult` schemas to `openapi.yaml` (`components/schemas`) and the two paths (`/agents/{air_id}/history`, `/audit/verify`) under `/api/v1`, mirroring existing path/parameter style. Document the canonical hash recipe (sorted JCS `changed_fields`; `entry_hash = sha256(content\nprev_hash)`; genesis = `"GENESIS"`).
- [ ] **Step 2:** Add an "Agent-Record Audit Log" section to `docs/SPECIFICATION.md` + `docs/TRUST-SCORE.md`. **Interim claim wording (Phase A only):** "Tamper-evident against accidental corruption and partial edits; verifiable by re-deriving every hash. Operator-level tamper-evidence is delivered by the weekly external anchor (see below) once Phase B ships — until then, do NOT claim trustlessness against AIR." Document actor semantics + the genesis-from-deploy note.
- [ ] **Step 3:** Validate `python3 -c "import yaml; yaml.safe_load(open('api/openapi.yaml')); print('valid')"`; commit: `git add api/openapi.yaml docs/SPECIFICATION.md docs/TRUST-SCORE.md && git commit -m "docs(api): document audit log + schemas (interim integrity claim)"`

---

# PHASE B — External anchor (delivers the trustless claim)

### Task 8: Anchor record + publisher (injectable for tests)

**Files:** Modify `api/src/audit.mjs`; Test in `api/test/audit.test.mjs`.

- [ ] **Step 1: Failing test** (append): a `buildAnchor(db)` returns `{ anchored_at, tip_hash, entry_count }`; `publishAnchor(anchor, { putFile })` calls the injected `putFile` with a deterministic path + JSON body and returns its result. Test with a fake `putFile` that records args.
```js
import { buildAnchor, publishAnchor } from "../src/audit.mjs";
test("buildAnchor returns tip + count; publishAnchor calls the injected sink", async () => {
  const db = makeTestD1();
  await record(db, { airId:"AIR-AAAA-AAAA-AAAA", event:"registered", changedFields:null, actor:"registrant", now:"2026-01-01T00:00:00Z" });
  const a = await buildAnchor(db, "2026-01-07T03:00:00Z");
  assert.equal(a.entry_count, 1);
  assert.match(a.tip_hash, /^[0-9a-f]{64}$/);
  let captured; const fake = async (args) => { captured = args; return { ok: true }; };
  await publishAnchor(a, { putFile: fake });
  assert.ok(captured.path.includes("2026-01-07"));
  assert.deepEqual(JSON.parse(captured.content), a);
});
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** `buildAnchor(db, now)` (uses `computeChainTip`) and `publishAnchor(anchor, { putFile })` (constructs path `anchors/<date>.json` + `JSON.stringify(anchor)`, delegates the actual write to the injected `putFile` — no network in the module). Real GitHub wiring is injected at the call site (Task 10).
- [ ] **Step 4: Run → PASS; Commit.**

### Task 9: (Deferrable) Sign the anchor with a registry Ed25519 key

**Files:** Modify `api/src/audit.mjs`; setup in Task 11. **NOTE: the registry has NO signing key today** — this task REQUIRES generating one + storing `REGISTRY_SIGNING_KEY` as a worker secret + publishing the public key. Because only AIR's GitHub token can write to the anchor repo (authorship) and the repo's commit history is immutable (witness), the unsigned anchor already delivers operator-tamper-evidence; the signature adds cryptographic attribution. **Decision point for Peter: ship Phase B unsigned now, add signing as a fast-follow, or include now.** If included:
- [ ] Add `signAnchor(anchor, privateKeyBytes)` (Ed25519 over the canonical anchor JSON) + include `signature` + `key_id` in the published record; publish the public key in `openapi.yaml` / a `.well-known` doc. TDD with a fixed test keypair.

### Task 10: Wire the cron + manual trigger + verify cross-check + `/audit/anchor`

**Files:** Modify `api/src/index.js`.

- [ ] **Step 1:** A `githubPutFile(env)` adapter that PUTs to `https://api.github.com/repos/AgentIdentityRegistry/audit-anchors/contents/<path>` using `env.AUDIT_ANCHOR_TOKEN` (Bearer), base64 content, a commit message; returns `{ ok }`. (Real network; not unit-tested — exercised by the manual trigger.)
- [ ] **Step 2:** In the `scheduled` handler (`index.js:134`), after the existing did-wba step, add (in `ctx.waitUntil`): `const a = await buildAnchor(env.DB, new Date().toISOString()); await publishAnchor(a, { putFile: githubPutFile(env) });` with try/catch + `console.error` (anchor failure must not crash the cron).
- [ ] **Step 3:** Add a manual admin trigger `POST /api/v1/admin/cron/publish-anchor` (admin-key gated, mirrors the existing `did-wba-resolve` trigger) that runs the same publish — for testing without waiting for Sunday.
- [ ] **Step 4:** Add `GET /api/v1/audit/anchor` → returns the latest anchor (fetched from the public repo, or the last one this worker published — fetch from the repo so it reflects the external source of truth). Extend `getAuditVerify` to also fetch the last anchor and add `last_anchor: { anchored_at, tip_hash, entry_count, matches: <live tip_hash===anchor.tip_hash && live count>=anchor.entry_count> }`.
- [ ] **Step 5:** Verify `node --check` + dry-run; commit.

### Task 11: One-time setup (PETER-GATED — external resources)

- [ ] Create the PUBLIC repo `AgentIdentityRegistry/audit-anchors` (append-only by convention; protected branch).
- [ ] Mint a fine-grained GitHub token scoped to `contents:write` on ONLY that repo; `cd api && npx wrangler secret put AUDIT_ANCHOR_TOKEN`.
- [ ] (If Task 9) generate the Ed25519 keypair; `wrangler secret put REGISTRY_SIGNING_KEY`; publish the public key.
- [ ] Document all of this in the governance docs + `air/session-start-protocol` (so the secret/repo aren't mysteries next session).

### Task 12: Deploy + smoke + final review (PETER-GATED prod change)

- [ ] **Step 1:** `npm run test:api` green; `cd api && npx wrangler deploy --dry-run` clean.
- [ ] **Step 2:** Independent final review of the whole diff (`git diff main...feat/audit-log`) — fresh subagent; confirm no over-claim in public copy, determinism test present, audit-or-fail + 409 path, GDPR tombstone wording, paths under `/api/v1`.
- [ ] **Step 3:** Apply migration to remote D1: `cd api && npx wrangler d1 migrations apply air-registry --remote`.
- [ ] **Step 4 (CONFIRM WITH PETER):** `cd api && npx wrangler deploy`; note the version.
- [ ] **Step 5:** Smoke: register/update a demo agent → `GET /api/v1/agents/{id}/history` shows the entries; `GET /api/v1/audit/verify` → `{valid:true}`; hit `POST /admin/cron/publish-anchor` → confirm a commit appears in the `audit-anchors` repo; `GET /api/v1/audit/anchor` returns it; re-run verify → `last_anchor.matches: true`.
- [ ] **Step 6:** Update the HONEST claim in docs from the Phase-A interim wording to the full "tamper-evident against the operator back to the last weekly anchor; verify against the public audit-anchors repo." Push branch + open PR.

---

## Self-Review (against the spec)

**Spec coverage:** §1 events → T2/T5 · §2 table → T2 · §3 chain/determinism/UNIQUE/GENESIS → T3/T4 · §4 external anchor → T8/T10 (+T9 signing) · §5 reuse → T1 · §6 audit-or-fail batch → T5 · §7 endpoints (corrected paths) → T6/T10 · §8 GDPR tombstone → T7 docs + the `redacted` event in the 0006 CHECK (T2); **note:** the tombstone WRITE path (admin redaction endpoint) is documented as policy but not built in v1 — the `redacted` event value + docs exist; an actual redaction-trigger endpoint is out of v1 scope (flagged). §9 actor/backfill/created_at → T2/T5/T6/T7 · §10 tests/test:api/rollout → T2 (test:api), T11/T12. 

**Gap flagged for Peter:** §8's tombstone is *enabled* (the `redacted` event exists + policy documented) but the admin redaction endpoint that WRITES a tombstone is not in v1 — added only if/when a real erasure request arrives. Called out so it's a conscious deferral, not a silent miss.

**Placeholder scan:** Task 1 moves exact existing bodies (engineer copies them verbatim from the cited lines) — not a placeholder. No TBD/TODO elsewhere; all code steps show code.

**Type consistency:** `recordAuditEvent({airId,event,changedFields,actor,now})`, `auditEntryHash(content,prevHash)`, `verifyAuditChain(db,{fromId,toId})`, `computeChainTip`→`{tip_hash,count}`, `GENESIS`, `buildAnchor`/`publishAnchor({putFile})` — names consistent across Tasks 3–10. `changed_fields` stored as `jcsCanonicalize([...].sort())` in both storage (T4) and hashing (T3) — identical recipe.
