# #3 Trust Feedback Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make *receiving* peer attestations actually raise a subject's trust score (today `peer_attestations` is hardcoded 300), loop-safely, with no DB schema change — and stand up the worker's first test harness to prove it.

**Architecture:** Extract the trust/scoring logic out of the 2242-line `api/src/index.js` into a focused ESM module `api/src/trust.mjs` (DB is already passed in as a parameter, so it's dependency-injected and testable). Compute `peer_attestations` from the real, frozen-weight attestation graph via a diminishing-returns curve capped at 1000, counting only vouches from still-active attesters. Recompute synchronously on attestation create/revoke, agent edit, and attester deletion. Test against an in-memory `node:sqlite` database loaded with the real `schema.sql` + migrations through a tiny Cloudflare-D1-compatible shim.

**Tech Stack:** Cloudflare Workers (ESM) + D1 (SQLite); Node 25 built-in `node:sqlite` + `node:test`; wrangler for bundle verification. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-02-air-trust-feedback-loop-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `api/src/trust.mjs` | All trust/scoring units: `PEER_ATTEST_*` constants, `computeGrade`, `peerAttestationsSubscore`, `calculateInitialTrustScore`, `computeVerifiedStatus`, `recomputeTrustScore`, `recomputeDependentsOf`. Pure functions + DB-injected functions. | **Create** |
| `api/src/index.js` | Worker entry. Loses the moved definitions; gains a `./trust.mjs` import + four recompute trigger calls. | **Modify** |
| `api/test/helpers/d1.mjs` | `makeTestD1()` — node:sqlite-backed D1 shim that loads the real schema. | **Create** |
| `api/test/trust.test.mjs` | The test suite. | **Create** |
| `package.json` (root) | Add a `test:api` script. | **Modify** |

**Naming note:** the extracted module is `trust.mjs` (NOT `.js`). The root `package.json` declares `"type": "commonjs"`, which would make a `.js` file CommonJS and break the ESM `export`/`import`. The `.mjs` extension forces ESM; wrangler bundles `.mjs` imports fine.

**node:sqlite note:** Node 25 exposes `node:sqlite`. If a run errors with an unknown-builtin/flag message, prepend `--experimental-sqlite` to the `node` command. The SuperClaw messaging stack already uses `node:sqlite` on this machine, so the bare command is expected to work.

---

## Task 1: Test harness — D1 shim + schema loader

Stand up the first worker test harness. A smoke test proves the shim round-trips against the real schema before any trust logic exists.

**Files:**
- Create: `api/test/helpers/d1.mjs`
- Create: `api/test/trust.test.mjs`

- [ ] **Step 1: Write the failing smoke test**

Create `api/test/trust.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTestD1 } from "./helpers/d1.mjs";

// Minimal agent-row inserter used across tests.
async function insertAgent(db, airId, overrides = {}) {
  const a = {
    air_id: airId,
    name: airId,
    creator_did: `did:wba:example-${airId}.com:agents:${airId}`,
    creator_name: "Tester",
    creator_type: "individual",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    security_certifications: "[]",
    transparency_open_source: 0,
    ...overrides,
  };
  await db.prepare(
    `INSERT INTO agents (air_id, name, creator_did, creator_name, creator_type, status,
       created_at, updated_at, security_certifications, transparency_open_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(a.air_id, a.name, a.creator_did, a.creator_name, a.creator_type, a.status,
         a.created_at, a.updated_at, a.security_certifications, a.transparency_open_source).run();
  return a;
}

test("harness: round-trips an agent against the real schema", async () => {
  const db = makeTestD1();
  await insertAgent(db, "AIR-TEST-0001-AAAA");
  const row = await db.prepare("SELECT air_id, status FROM agents WHERE air_id = ?")
    .bind("AIR-TEST-0001-AAAA").first();
  assert.equal(row.air_id, "AIR-TEST-0001-AAAA");
  assert.equal(row.status, "active");
  // agent_attestations table must exist (comes from migration 0004)
  const empty = await db.prepare("SELECT COUNT(*) AS n FROM agent_attestations").bind().first();
  assert.equal(empty.n, 0);
});

export { insertAgent };
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test api/test/trust.test.mjs`
Expected: FAIL — cannot find module `./helpers/d1.mjs`.

- [ ] **Step 3: Implement the D1 shim + schema loader**

Create `api/test/helpers/d1.mjs`:

```js
// Minimal Cloudflare-D1-compatible shim over Node's built-in node:sqlite, so the
// worker's trust functions (which use db.prepare(sql).bind(...).first()/.all()/.run())
// can be unit-tested on a laptop against the REAL schema. No external deps.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const API_DIR = join(HERE, "..", "..");          // api/
const SCHEMA = join(API_DIR, "schema.sql");
const MIGRATIONS = join(API_DIR, "migrations");

// Strip full-line `--` comments, split on `;`, return non-empty statements.
// (schema.sql + migrations have no `;` inside string literals or triggers.)
function statements(sql) {
  const noComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return noComments.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
}

// Apply a SQL blob one statement at a time. node:sqlite prepares a single
// statement at a time, so we must split. We use prepare().run() (NOT .exec()) —
// matches the messaging-stack pattern and avoids the repo's `.exec(` security hook.
// schema.sql is a full snapshot that already contains columns migrations 0001/0003
// ALTER in, so tolerate "duplicate column name" from that overlap.
function apply(sqlite, sql) {
  for (const stmt of statements(sql)) {
    try {
      sqlite.prepare(stmt).run();
    } catch (e) {
      const msg = String(e.message ?? e);
      if (/duplicate column name/i.test(msg)) continue;
      throw new Error(`DDL failed on: ${stmt.slice(0, 70)}… → ${msg}`);
    }
  }
}

class D1Statement {
  constructor(stmt) { this._stmt = stmt; this._params = []; }
  bind(...params) { this._params = params; return this; }
  async first() { const row = this._stmt.get(...this._params); return row ?? null; }
  async all() { return { results: this._stmt.all(...this._params) }; }
  async run() {
    const r = this._stmt.run(...this._params);
    return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } };
  }
}

class D1Database {
  constructor(sqlite) { this._sqlite = sqlite; }
  prepare(sql) { return new D1Statement(this._sqlite.prepare(sql)); }
}

export function makeTestD1() {
  const sqlite = new DatabaseSync(":memory:");
  apply(sqlite, readFileSync(SCHEMA, "utf8"));
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    apply(sqlite, readFileSync(join(MIGRATIONS, f), "utf8"));
  }
  return new D1Database(sqlite);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test api/test/trust.test.mjs`
Expected: PASS (1 test). If `node:sqlite` errors, retry with `node --experimental-sqlite --test api/test/trust.test.mjs`.

- [ ] **Step 5: Commit**

```bash
git add api/test/helpers/d1.mjs api/test/trust.test.mjs
git commit -m "test(api): D1-over-node:sqlite test harness loading real schema+migrations"
```

---

## Task 2: `peerAttestationsSubscore` — the clamped diminishing-returns formula

**Files:**
- Create: `api/src/trust.mjs`
- Modify: `api/test/trust.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `api/test/trust.test.mjs`:

```js
import { peerAttestationsSubscore } from "../src/trust.mjs";

test("peerAttestationsSubscore: curve, cap, and clamp", () => {
  // 300 + round(18 * sqrt(weightSum)), capped at 1000.
  assert.equal(peerAttestationsSubscore(0), 300);
  assert.equal(peerAttestationsSubscore(500), 702);    // 18*22.3607=402.49 → 402
  assert.equal(peerAttestationsSubscore(1000), 869);   // 18*31.6228=569.21 → 569
  assert.equal(peerAttestationsSubscore(1500), 997);   // 18*38.7298=697.14 → 697
  assert.equal(peerAttestationsSubscore(1512), 1000);  // ≈ where it caps
  assert.equal(peerAttestationsSubscore(2000), 1000);  // beyond cap → pinned
  // Defensive clamp: never emit NaN/garbage into a NOT NULL column.
  assert.equal(peerAttestationsSubscore(-1), 300);
  assert.equal(peerAttestationsSubscore(NaN), 300);
  assert.equal(peerAttestationsSubscore(Infinity), 300);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test api/test/trust.test.mjs`
Expected: FAIL — cannot find module `../src/trust.mjs`.

- [ ] **Step 3: Create `api/src/trust.mjs` with the formula**

```js
// AIR Registry — trust + scoring logic (extracted from index.js for isolation
// and testability). DB-touching functions take a D1-style `db` parameter.

// ---- Peer-attestation sub-score (security TODO #3) ------------------------
// Earned trust derived from the REAL attestation graph, using FROZEN
// attester_trust_at_issue × tenure_multiplier_at_issue weights (loop-safe).
export const PEER_ATTEST_BASE = 300;   // sub-score with zero active attestations (unchanged)
export const PEER_ATTEST_SCALE = 18;   // diminishing-returns steepness
export const PEER_ATTEST_CAP = 1000;   // ceiling ("meaningful lever")

// weightSum = Σ (attester_trust_at_issue × tenure_multiplier_at_issue) over
// ACTIVE attestations from ACTIVE attesters (== computeVerifiedStatus.verification_score).
export function peerAttestationsSubscore(weightSum) {
  // Clamp: Math.sqrt(<0)=NaN would poison total_score + flip grade. Treat any
  // non-finite / non-positive input as 0 → base 300.
  const w = Number.isFinite(weightSum) && weightSum > 0 ? weightSum : 0;
  return Math.min(
    PEER_ATTEST_BASE + Math.round(PEER_ATTEST_SCALE * Math.sqrt(w)),
    PEER_ATTEST_CAP
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test api/test/trust.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/src/trust.mjs api/test/trust.test.mjs
git commit -m "feat(api): peerAttestationsSubscore — clamped diminishing-returns curve (cap 1000)"
```

---

## Task 3: Move `computeGrade` + `calculateInitialTrustScore` into trust.mjs, parameterized

The grade helper and the score builder move into the module. `calculateInitialTrustScore` gains a `peerSubscore` parameter (default 300 → registration behavior is byte-identical).

**Files:**
- Modify: `api/src/trust.mjs`
- Modify: `api/src/index.js` (remove defs at `:190-198` and `:830-876`; add import)
- Modify: `api/test/trust.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `api/test/trust.test.mjs`:

```js
import { calculateInitialTrustScore, computeGrade } from "../src/trust.mjs";

const sampleAgent = {
  creator_did: "did:wba:example.com:agents:AIR-X",
  creator_name: "Tester",
  creator_type: "individual",
  transparency_open_source: 0,
  transparency_code_repo: null,
  transparency_docs_url: null,
  security_certifications: "[]",
};

test("computeGrade: tier boundaries", () => {
  assert.equal(computeGrade(950), "AAA");
  assert.equal(computeGrade(645), "BBB");
  assert.equal(computeGrade(400), "B");
  assert.equal(computeGrade(399), "C");
});

test("calculateInitialTrustScore: default peer is 300 (registration unchanged)", () => {
  const s = calculateInitialTrustScore(sampleAgent);
  // provenance 500, behavioral 500, transparency 300, security 300, peer 300
  assert.equal(s.peer_attestations, 300);
  assert.equal(s.total_score, 400); // round(125+125+60+45+45)
  assert.equal(s.grade, "B");
});

test("calculateInitialTrustScore: a high peerSubscore lifts the total by ~+105", () => {
  const s = calculateInitialTrustScore(sampleAgent, 1000);
  assert.equal(s.peer_attestations, 1000);
  assert.equal(s.total_score, 505); // 400 + (1000-300)*0.15
  assert.equal(s.grade, "BB");
});

test("calculateInitialTrustScore: fully-maxed agent tops out at 645/BBB", () => {
  const maxed = {
    creator_did: "did:wba:example.com:agents:AIR-X",
    creator_name: "Tester",
    creator_type: "organization",
    transparency_open_source: 1,
    transparency_code_repo: "https://x",
    transparency_docs_url: "https://x",
    security_certifications: JSON.stringify(["a", "b", "c"]),
  };
  const s = calculateInitialTrustScore(maxed, 1000);
  assert.equal(s.total_score, 645);
  assert.equal(s.grade, "BBB");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test api/test/trust.test.mjs`
Expected: FAIL — `computeGrade` / `calculateInitialTrustScore` not exported from trust.mjs.

- [ ] **Step 3: Move both functions into `api/src/trust.mjs`**

Append to `api/src/trust.mjs`:

```js
// ---- Grade + initial/recomputed score -------------------------------------
export function computeGrade(score) {
  if (score >= 950) return "AAA";
  if (score >= 850) return "AA";
  if (score >= 700) return "A";
  if (score >= 600) return "BBB";
  if (score >= 500) return "BB";
  if (score >= 400) return "B";
  return "C";
}

// peerSubscore defaults to the no-attestations base, so registration is byte-identical.
export function calculateInitialTrustScore(agent, peerSubscore = PEER_ATTEST_BASE) {
  let provenance = 300;
  if (agent.creator_did) provenance += 100;
  if (agent.creator_name) provenance += 100;
  if (agent.creator_type === "organization") provenance += 100;
  provenance = Math.min(provenance, 600);

  const behavioral = 500;

  let transparency = 300;
  if (agent.transparency_open_source) transparency += 150;
  if (agent.transparency_code_repo) transparency += 100;
  if (agent.transparency_docs_url) transparency += 100;
  transparency = Math.min(transparency, 650);

  let security = 300;
  const certs = JSON.parse(agent.security_certifications || "[]");
  security += Math.min(certs.length * 100, 300);
  security = Math.min(security, 600);

  const peer_attestations = peerSubscore;

  const total = Math.round(
    provenance * 0.25 +
    behavioral * 0.25 +
    transparency * 0.20 +
    security * 0.15 +
    peer_attestations * 0.15
  );

  return {
    total_score: total,
    grade: computeGrade(total),
    provenance,
    behavioral,
    transparency,
    security,
    peer_attestations,
  };
}
```

- [ ] **Step 4: Remove the originals from index.js and add the import**

In `api/src/index.js`, delete the `computeGrade` definition (`:190-198`) and the entire `calculateInitialTrustScore` definition (`:830-876`, including the `// TRUST SCORE CALCULATION` banner comment directly above it if it only headed that function — keep the banner if it heads a section).

Add directly below the `import OPENAPI_YAML from "../openapi.yaml";` line (`:8`):

```js
import {
  calculateInitialTrustScore,
  computeVerifiedStatus,
  recomputeTrustScore,
  recomputeDependentsOf,
} from "./trust.mjs";
```

(Note: `computeVerifiedStatus`, `recomputeTrustScore`, `recomputeDependentsOf` are added to trust.mjs in Tasks 4–6. Importing them now is fine — they resolve once those tasks land, and this task's verification is the unit tests + `node --check`, not a bundle. The bundle gate runs in Task 7 after all exports exist.)

- [ ] **Step 5: Run tests + syntax check**

Run: `node --test api/test/trust.test.mjs`
Expected: PASS (7 tests).
Run: `node --check api/src/index.js && node --check api/src/trust.mjs`
Expected: no output (syntax OK).

- [ ] **Step 6: Commit**

```bash
git add api/src/trust.mjs api/src/index.js api/test/trust.test.mjs
git commit -m "refactor(api): move computeGrade + calculateInitialTrustScore to trust.mjs (peerSubscore param)"
```

---

## Task 4: Move `computeVerifiedStatus` into trust.mjs + add the dead-vouch filter

The shared aggregator moves into the module and now JOINs `agents` to count only vouches from **active** attesters (this also tightens the Verified badge).

**Files:**
- Modify: `api/src/trust.mjs`
- Modify: `api/src/index.js` (remove def at `:804-824`)
- Modify: `api/test/trust.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `api/test/trust.test.mjs`:

```js
import { computeVerifiedStatus } from "../src/trust.mjs";

async function insertAttestation(db, { subject, attester, root, trust, tenure = 1.0, revokedAt = null }) {
  await db.prepare(
    `INSERT INTO agent_attestations
       (subject_air_id, attester_air_id, attester_whois_root, attestation_type,
        statement, signed_payload, signature_multibase, signed_at,
        attester_trust_at_issue, tenure_multiplier_at_issue, revoked_at, created_at)
     VALUES (?, ?, ?, 'identity_verification', '', '{}', ?, ?, ?, ?, ?, ?)`
  ).bind(subject, attester, root,
         `sig-${attester}-${subject}`, "2026-02-01T00:00:00.000Z",
         trust, tenure, revokedAt, "2026-02-01T00:00:00.000Z").run();
}

test("computeVerifiedStatus: excludes deleted attesters and revoked rows", async () => {
  const db = makeTestD1();
  await insertAgent(db, "AIR-SUBJ-0000-0000");
  await insertAgent(db, "AIR-ATT1-0000-0000", { status: "active" });
  await insertAgent(db, "AIR-ATT2-0000-0000", { status: "active" });
  await insertAgent(db, "AIR-ATT3-0000-0000", { status: "deleted" }); // gone
  await insertAttestation(db, { subject: "AIR-SUBJ-0000-0000", attester: "AIR-ATT1-0000-0000", root: "a1.com", trust: 500 });
  await insertAttestation(db, { subject: "AIR-SUBJ-0000-0000", attester: "AIR-ATT2-0000-0000", root: "a2.com", trust: 400 });
  await insertAttestation(db, { subject: "AIR-SUBJ-0000-0000", attester: "AIR-ATT3-0000-0000", root: "a3.com", trust: 500 }); // active row, dead attester

  const v = await computeVerifiedStatus("AIR-SUBJ-0000-0000", db);
  assert.equal(v.attestation_count, 2);             // ATT3 excluded
  assert.equal(v.distinct_whois_roots, 2);          // a1, a2 only
  assert.equal(v.verification_score, 900);          // 500*1 + 400*1
  assert.equal(v.verified, false);                  // needs ≥3 roots; ATT3's would-be 3rd root is dead
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test api/test/trust.test.mjs`
Expected: FAIL — `computeVerifiedStatus` not exported from trust.mjs.

- [ ] **Step 3: Move `computeVerifiedStatus` into trust.mjs with the status filter**

Append to `api/src/trust.mjs`:

```js
// ---- Verified status + earned-trust aggregate -----------------------------
// Counts ACTIVE attestations whose ATTESTER is also active (dead-vouch filter,
// security TODO #3): a vouch from a deleted/deactivated identity must not prop
// up trust or Verified. Returns the frozen-weight aggregate used by BOTH the
// Verified badge and the peer sub-score.
export async function computeVerifiedStatus(subjectAirId, db) {
  const result = await db.prepare(`
    SELECT a.attester_whois_root, a.attester_trust_at_issue, a.tenure_multiplier_at_issue
    FROM agent_attestations a
    JOIN agents ag ON ag.air_id = a.attester_air_id
    WHERE a.subject_air_id = ? AND a.revoked_at IS NULL AND ag.status = 'active'
  `).bind(subjectAirId).all();

  const list = result?.results ?? [];
  let score = 0;
  const roots = new Set();
  for (const row of list) {
    score += row.attester_trust_at_issue * row.tenure_multiplier_at_issue;
    roots.add(row.attester_whois_root);
  }
  return {
    verified: score >= 300 && roots.size >= 3,
    verification_score: Math.round(score),
    distinct_whois_roots: roots.size,
    attestation_count: list.length,
  };
}
```

- [ ] **Step 4: Remove the original from index.js**

In `api/src/index.js`, delete the `computeVerifiedStatus` definition (`:804-824`). All call sites (`getAgent`, `createAttestation`, `revokeAttestation`, badge, etc.) keep working — the name now resolves via the Task-3 import.

- [ ] **Step 5: Run tests + syntax check**

Run: `node --test api/test/trust.test.mjs`
Expected: PASS (8 tests).
Run: `node --check api/src/index.js`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add api/src/trust.mjs api/src/index.js api/test/trust.test.mjs
git commit -m "feat(api): dead-vouch filter — computeVerifiedStatus counts only active attesters"
```

---

## Task 5: `recomputeTrustScore(airId, db)` — write the earned score to trust_scores

**Files:**
- Modify: `api/src/trust.mjs`
- Modify: `api/test/trust.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `api/test/trust.test.mjs`:

```js
import { recomputeTrustScore } from "../src/trust.mjs";

// Insert the registration-time trust_scores row (peer = 300) for an agent.
async function seedTrustRow(db, agent) {
  const s = calculateInitialTrustScore(agent);
  await db.prepare(
    `INSERT INTO trust_scores (air_id, total_score, grade, provenance, behavioral, transparency, security, peer_attestations, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(agent.air_id, s.total_score, s.grade, s.provenance, s.behavioral, s.transparency, s.security, s.peer_attestations, "2026-01-01T00:00:00.000Z").run();
}

async function peerOf(db, airId) {
  const r = await db.prepare("SELECT peer_attestations FROM trust_scores WHERE air_id = ?").bind(airId).first();
  return r?.peer_attestations;
}

test("recomputeTrustScore: peer rises, reverts, stays frozen, no-ops when no row", async () => {
  const db = makeTestD1();
  const subj = await insertAgent(db, "AIR-SUBJ-0000-0001");
  await seedTrustRow(db, subj);
  await insertAgent(db, "AIR-ATTA-0000-0001");
  await insertAgent(db, "AIR-ATTB-0000-0001");

  // Two active vouches, weightSum = 500 + 500 = 1000 → peer 869.
  await insertAttestation(db, { subject: subj.air_id, attester: "AIR-ATTA-0000-0001", root: "a.com", trust: 500 });
  await insertAttestation(db, { subject: subj.air_id, attester: "AIR-ATTB-0000-0001", root: "b.com", trust: 500 });
  await recomputeTrustScore(subj.air_id, db);
  assert.equal(await peerOf(db, subj.air_id), 869);

  // Frozen: bumping an attester's LIVE trust doesn't move the subject's score.
  await seedTrustRow(db, { air_id: "AIR-ATTA-0000-0001", creator_did: "x", security_certifications: "[]" });
  await db.prepare("UPDATE trust_scores SET total_score = 999 WHERE air_id = ?").bind("AIR-ATTA-0000-0001").run();
  await recomputeTrustScore(subj.air_id, db);
  assert.equal(await peerOf(db, subj.air_id), 869); // unchanged — uses attester_trust_at_issue

  // Revoke one → weightSum 500 → peer 702.
  await db.prepare("UPDATE agent_attestations SET revoked_at = '2026-03-01T00:00:00.000Z' WHERE attester_air_id = ?")
    .bind("AIR-ATTB-0000-0001").run();
  await recomputeTrustScore(subj.air_id, db);
  assert.equal(await peerOf(db, subj.air_id), 702);

  // No trust_scores row → no throw, no insert.
  await insertAgent(db, "AIR-NONE-0000-0001");
  await recomputeTrustScore("AIR-NONE-0000-0001", db);
  assert.equal(await peerOf(db, "AIR-NONE-0000-0001"), undefined);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test api/test/trust.test.mjs`
Expected: FAIL — `recomputeTrustScore` not exported.

- [ ] **Step 3: Implement `recomputeTrustScore`**

Append to `api/src/trust.mjs`:

```js
// ---- Recompute triggers (security TODO #3) --------------------------------
// Recompute one subject's stored trust_scores row from its current attestation
// graph. Idempotent. No-ops if the agent or its trust_scores row is missing
// (registration always inserts the row first).
export async function recomputeTrustScore(airId, db) {
  const agent = await db.prepare("SELECT * FROM agents WHERE air_id = ?").bind(airId).first();
  if (!agent) return;
  const existing = await db.prepare("SELECT air_id FROM trust_scores WHERE air_id = ?").bind(airId).first();
  if (!existing) return;

  const verified = await computeVerifiedStatus(airId, db);
  const peerSubscore = peerAttestationsSubscore(verified.verification_score);
  const score = calculateInitialTrustScore(agent, peerSubscore);
  const now = new Date().toISOString();

  await db.prepare(
    "UPDATE trust_scores SET total_score = ?, grade = ?, provenance = ?, behavioral = ?, transparency = ?, security = ?, peer_attestations = ?, calculated_at = ? WHERE air_id = ?"
  ).bind(score.total_score, score.grade, score.provenance, score.behavioral, score.transparency, score.security, score.peer_attestations, now, airId).run();
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test api/test/trust.test.mjs`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add api/src/trust.mjs api/test/trust.test.mjs
git commit -m "feat(api): recomputeTrustScore — earned trust from frozen attestation graph"
```

---

## Task 6: `recomputeDependentsOf(attesterAirId, db)` — for attester deletion

**Files:**
- Modify: `api/src/trust.mjs`
- Modify: `api/test/trust.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `api/test/trust.test.mjs`:

```js
import { recomputeDependentsOf } from "../src/trust.mjs";

test("recomputeDependentsOf: rescores every subject the attester vouched for", async () => {
  const db = makeTestD1();
  const s1 = await insertAgent(db, "AIR-DEP1-0000-0001");
  const s2 = await insertAgent(db, "AIR-DEP2-0000-0001");
  await seedTrustRow(db, s1);
  await seedTrustRow(db, s2);
  await insertAgent(db, "AIR-XATT-0000-0001");
  // X vouches for both S1 and S2 (weightSum 500 each → peer 702).
  await insertAttestation(db, { subject: s1.air_id, attester: "AIR-XATT-0000-0001", root: "x.com", trust: 500 });
  await insertAttestation(db, { subject: s2.air_id, attester: "AIR-XATT-0000-0001", root: "x.com", trust: 500 });

  await recomputeDependentsOf("AIR-XATT-0000-0001", db);
  assert.equal(await peerOf(db, s1.air_id), 702);
  assert.equal(await peerOf(db, s2.air_id), 702);

  // Simulate X being deleted: its vouches stop counting; recompute drops them to 300.
  await db.prepare("UPDATE agents SET status = 'deleted' WHERE air_id = ?").bind("AIR-XATT-0000-0001").run();
  await recomputeDependentsOf("AIR-XATT-0000-0001", db);
  assert.equal(await peerOf(db, s1.air_id), 300);
  assert.equal(await peerOf(db, s2.air_id), 300);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test api/test/trust.test.mjs`
Expected: FAIL — `recomputeDependentsOf` not exported.

- [ ] **Step 3: Implement `recomputeDependentsOf`**

Append to `api/src/trust.mjs`:

```js
// When an attester's status changes (today: deletion), every subject it
// actively vouches for must be rescored so dead vouches stop counting.
export async function recomputeDependentsOf(attesterAirId, db) {
  const rows = await db.prepare(
    "SELECT DISTINCT subject_air_id FROM agent_attestations WHERE attester_air_id = ? AND revoked_at IS NULL"
  ).bind(attesterAirId).all();
  for (const row of (rows?.results ?? [])) {
    await recomputeTrustScore(row.subject_air_id, db);
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test api/test/trust.test.mjs`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add api/src/trust.mjs api/test/trust.test.mjs
git commit -m "feat(api): recomputeDependentsOf — rescore a deleted attester's subjects"
```

---

## Task 7: Wire the four triggers into index.js handlers

Glue the recompute calls into the live handlers. Each runs **after** its DB write has committed, so it is best-effort: a recompute hiccup must never undo a successful attestation (it self-heals on the next event).

**Files:**
- Modify: `api/src/index.js` (createAttestation `:1675`, revokeAttestation `:1825`, updateAgent `:1392-1398`, deleteAgent `:1424`)
- Modify: `api/test/trust.test.mjs`

- [ ] **Step 1: Write the failing integration test (mirrors the handler DB sequence)**

Append to `api/test/trust.test.mjs`. This proves the exact DB sequence the handlers now perform (we can't invoke the HTTP handlers without a request harness — see the coverage note at the end of this task).

```js
test("integration: create→recompute raises trust; delete-attester→recompute drops it", async () => {
  const db = makeTestD1();
  const subj = await insertAgent(db, "AIR-INTG-0000-0001");
  await seedTrustRow(db, subj);
  await insertAgent(db, "AIR-IATT-0000-0001");
  assert.equal(await peerOf(db, subj.air_id), 300);

  // createAttestation: insert row, then recomputeTrustScore(subject).
  await insertAttestation(db, { subject: subj.air_id, attester: "AIR-IATT-0000-0001", root: "i.com", trust: 500 });
  await recomputeTrustScore(subj.air_id, db);
  assert.equal(await peerOf(db, subj.air_id), 702);

  // deleteAgent(attester): mark deleted, then recomputeDependentsOf(attester).
  await db.prepare("UPDATE agents SET status = 'deleted' WHERE air_id = ?").bind("AIR-IATT-0000-0001").run();
  await recomputeDependentsOf("AIR-IATT-0000-0001", db);
  assert.equal(await peerOf(db, subj.air_id), 300);
});
```

- [ ] **Step 2: Run it to verify it passes against the module (logic already exists)**

Run: `node --test api/test/trust.test.mjs`
Expected: PASS (11 tests). This test exercises the module functions the handlers will call; Steps 3–6 wire those calls into the handlers themselves (verified by `node --check` + the wrangler bundle gate, since the HTTP layer has no unit harness).

- [ ] **Step 3: createAttestation — recompute the subject after insert**

In `api/src/index.js`, find the line (`:1675`):

```js
  // ---- 8. Updated verified status (so caller knows the threshold delta) -
  const verifiedStatus = await computeVerifiedStatus(subjectAirId, db);
```

Insert immediately **before** it:

```js
  // Earned-trust feedback (#3): the new vouch may raise the subject's trust.
  // Best-effort — the attestation is already committed; staleness self-heals.
  try {
    await recomputeTrustScore(subjectAirId, db);
  } catch (e) {
    console.error("recomputeTrustScore (createAttestation) failed:", e);
  }
```

- [ ] **Step 4: revokeAttestation — recompute the subject after revoke**

In `api/src/index.js`, find (`:1827`):

```js
  const verifiedStatus = await computeVerifiedStatus(subjectAirId, db);
  return json({
    revoked: true,
```

Insert immediately **before** the `const verifiedStatus` line:

```js
  // Earned-trust feedback (#3): removing a vouch may lower the subject's trust.
  try {
    await recomputeTrustScore(subjectAirId, db);
  } catch (e) {
    console.error("recomputeTrustScore (revokeAttestation) failed:", e);
  }
```

- [ ] **Step 5: updateAgent — replace the inline hardcoded-300 recompute**

In `api/src/index.js`, replace the block (`:1392-1398`):

```js
  // Recalculate trust score with updated data
  const updated = await db.prepare("SELECT * FROM agents WHERE air_id = ?").bind(airId).first();
  const score = calculateInitialTrustScore(updated);

  await db.prepare(
    "UPDATE trust_scores SET total_score = ?, grade = ?, provenance = ?, behavioral = ?, transparency = ?, security = ?, peer_attestations = ?, calculated_at = ? WHERE air_id = ?"
  ).bind(score.total_score, score.grade, score.provenance, score.behavioral, score.transparency, score.security, score.peer_attestations, now, airId).run();
```

with:

```js
  // Recalculate trust score with updated data. Routes through recomputeTrustScore
  // so an agent edit preserves earned trust instead of wiping peer back to 300 (#3).
  try {
    await recomputeTrustScore(airId, db);
  } catch (e) {
    console.error("recomputeTrustScore (updateAgent) failed:", e);
  }
```

- [ ] **Step 6: deleteAgent — recompute the deleted attester's dependents**

In `api/src/index.js`, find in `deleteAgent` (`:1424`):

```js
  await db.prepare(
    "UPDATE agents SET status = 'deleted', updated_at = ? WHERE air_id = ?"
  ).bind(now, airId).run();

  return json({
```

Insert between the `.run();` and the `return json({`:

```js
  // Dead-vouch filter (#3): this agent's vouches no longer count — rescore everyone
  // it vouched for so their trust + Verified drop immediately.
  try {
    await recomputeDependentsOf(airId, db);
  } catch (e) {
    console.error("recomputeDependentsOf (deleteAgent) failed:", e);
  }

```

- [ ] **Step 7: Verify — full tests, syntax, and the real worker bundle**

Run: `node --test api/test/trust.test.mjs`
Expected: PASS (11 tests).
Run: `node --check api/src/index.js`
Expected: no output.
Run: `cd api && npx wrangler deploy --dry-run; cd ..`
Expected: a successful bundle (`Total Upload: … KiB`) with NO unresolved-import errors — this proves index.js + trust.mjs + the `../openapi.yaml` text import all wire together. (Dry-run does not touch production.)

> **Coverage note (be honest):** the four handler insertions are one-line glue. Their *logic* is unit-tested via `recomputeTrustScore`/`recomputeDependentsOf` (Tasks 5–6) and the integration test (Step 1); the *wiring* is verified by `node --check` + the wrangler bundle + the post-deploy curl. There is no HTTP-level handler test by the chosen (node:sqlite) harness.

- [ ] **Step 8: Commit**

```bash
git add api/src/index.js api/test/trust.test.mjs
git commit -m "feat(api): wire #3 recompute triggers into create/revoke/update/delete handlers"
```

---

## Task 8: Convenience script, full-suite green, deploy runbook note

**Files:**
- Modify: `package.json` (root)
- Modify: `docs/superpowers/specs/2026-06-02-air-trust-feedback-loop-design.md` (status bump only)

- [ ] **Step 1: Add a `test:api` script**

In root `package.json`, replace the placeholder `"test": "echo \"Error: no test specified\" && exit 1"` scripts block so it includes:

```json
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "test:api": "node --test api/test/trust.test.mjs"
  },
```

- [ ] **Step 2: Run the full suite via the script**

Run: `npm run test:api`
Expected: all tests PASS (11).

- [ ] **Step 3: Record the pre-deploy backfill guard (runbook, do NOT deploy here)**

This is a deploy-time check, not code. Before the eventual `wrangler deploy`, confirm the "no backfill" precondition from the spec holds:

```bash
# Expect 0 — every existing agent's stored peer=300 already equals the formula's value for weightSum=0.
npx wrangler d1 execute air-registry --remote --command \
  "SELECT COUNT(*) AS active_attestations FROM agent_attestations WHERE revoked_at IS NULL"
# If > 0: after deploy, run recomputeTrustScore over each distinct active subject_air_id.
```

Bump the spec status line to `Status: Implemented (pending deploy)`.

- [ ] **Step 4: Commit**

```bash
git add package.json docs/superpowers/specs/2026-06-02-air-trust-feedback-loop-design.md
git commit -m "chore(api): add test:api script; mark #3 spec implemented (pending deploy)"
```

---

## Done criteria

- `npm run test:api` → 11 passing tests covering: the curve+clamp, grade tiers, registration-unchanged default, dead-vouch filter, recompute rise/revert/frozen/no-row, dependents rescore on delete, and the create→delete integration sequence.
- `cd api && npx wrangler deploy --dry-run` bundles cleanly.
- No schema migration. `peer_attestations` now reflects the real frozen-weight attestation graph; deleting an attester drops its subjects; editing an agent no longer wipes earned trust.
- **Deployment is a separate, explicit step** (run the Task 8 Step 3 guard first), not part of this plan.

## Spec coverage check

| Spec item | Task |
|---|---|
| Frozen-weight aggregate | 4 (uses `attester_trust_at_issue`), 5 (frozen test) |
| Diminishing-returns curve + cap 1000 | 2 |
| NaN/negative clamp | 2 |
| `calculateInitialTrustScore(peerSubscore=300)` default | 3 |
| Dead-vouch filter (active attesters only) | 4 |
| `recomputeTrustScore` + 3 triggers | 5, 7 |
| `deleteAgent` dependents trigger | 6, 7 |
| `updateAgent` reroute (no wipe-to-300) | 7 |
| Best-effort try/catch on after-commit recompute | 7 |
| No schema migration | (none) |
| Pre-deploy backfill guard | 8 |
| Module isolation (`trust.mjs`) + first test harness | 1–3 |
