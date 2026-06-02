# #4 Resolved-Key Check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind the attestation signature-verification key to the freshly-resolved `did.json` — an external did:wba attester's vouch counts only if the published document advertises the key AIR has on file (fail-closed on mismatch). Enforced at attestation Lock 1 + flagged by the weekly cron; non-canonical AIR-domain DIDs hard-rejected at the source.

**Architecture:** Extract the existing base58/multibase key-encoding helpers from the 2242-line `index.js` into a new focused, pure, dependency-free `api/src/did-keys.mjs` (mirrors #3's `trust.mjs`), and add the new key-decode + document-match functions there so the security core is exhaustively unit-testable with plain `node:test`. Wire those functions into `index.js` at three points (resolveDidWba, getAttesterEligibility Lock 1, the weekly cron). No DB schema change.

**Tech Stack:** Cloudflare Workers (ESM) + D1; Node 25 `node:test`; wrangler for bundle verification. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-03-air-resolved-key-check-design.md`
**Branch:** `feat/resolved-key-check` (off `feat/trust-feedback-loop`; deploys with #3).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `api/src/did-keys.mjs` | DID key encoding: `base58Encode/Decode`, `base64urlToBytes`, `ed25519ToMultibase` (moved from index.js) + new `multibaseToEd25519Bytes`, `didDocumentEd25519Keys`, `documentContainsKey`, `bytesEqual`. Pure, no DB, no fetch. | **Create** |
| `api/src/index.js` | Imports the encoding helpers back; loses the moved defs; gains the canonical-domain reject + document return in `resolveDidWba`, the Lock 1 binding in `getAttesterEligibility`, and the cron drift check. | **Modify** |
| `api/test/did-keys.test.mjs` | Pure-function tests for the new module. | **Create** |
| `package.json` | Add `did-keys.test.mjs` to `test:api`. | **Modify** |

**ESM note:** `.mjs` (root `package.json` is `"type":"commonjs"`; `.mjs` forces ESM, wrangler bundles it). **Syntax check** an ESM `.js`/`.mjs` via stdin: `node --check --input-type=module < <file>`.

**Coverage boundary (honest, as in #3):** `resolveDidWba`/`getAttesterEligibility`/the cron live in `index.js`, which imports `../openapi.yaml` (a wrangler text module node can't resolve), so they are NOT importable by `node:test`. The security-critical *decision* logic (key decode + document match) lives in `did-keys.mjs` and IS exhaustively unit-tested. The `index.js` wiring (Task 4) is verified by `node --check` + `wrangler deploy --dry-run` + a manual live probe + the weekly cron — no HTTP-handler unit harness is introduced.

---

## Task 1: Extract `did-keys.mjs` + test harness

Move the existing key-encoding helpers into a new module (behavior-preserving) and stand up the pure test file.

**Files:** Create `api/src/did-keys.mjs`, `api/test/did-keys.test.mjs`; Modify `api/src/index.js`.

- [ ] **Step 1: Write the failing test**

Create `api/test/did-keys.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { base58Encode, base58Decode, base64urlToBytes, ed25519ToMultibase } from "../src/did-keys.mjs";

// 32-byte key 0x00..0x1f as base64url (no padding). Self-checked below.
const KEY_A = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

test("did-keys: moved encoders round-trip and fixture is valid", () => {
  const aBytes = base64urlToBytes(KEY_A);
  assert.equal(aBytes.length, 32, "KEY_A must decode to 32 bytes");
  // base58 round-trip
  assert.deepEqual([...base58Decode(base58Encode(aBytes))], [...aBytes]);
  // ed25519ToMultibase yields a 'z' multibase string
  const mb = ed25519ToMultibase(KEY_A);
  assert.ok(mb.startsWith("z"));
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `node --test api/test/did-keys.test.mjs`
Expected: FAIL — cannot find module `../src/did-keys.mjs`.

- [ ] **Step 3: Create `api/src/did-keys.mjs` by MOVING the helpers from index.js**

Create `api/src/did-keys.mjs`. **Cut these definitions verbatim from `api/src/index.js` and paste them here, adding `export` to each** (do not retype — copy the exact bodies to avoid transcription errors):
- `BASE58_ALPHABET` (`api/src/index.js:443`) — keep as a module const (no export needed).
- `base58Encode` (`api/src/index.js:445-471` — the comment + function) → `export function base58Encode`.
- `ed25519ToMultibase` (`api/src/index.js:473-491`) → `export function ed25519ToMultibase`.
- `base64urlToBytes` (`api/src/index.js:567-574`) → `export function base64urlToBytes`.
- `BASE58_DECODE_LUT` (`api/src/index.js:576-581`) — module const (no export).
- `base58Decode` (`api/src/index.js:582-608`) → `export function base58Decode`.

Put a header comment at the top:
```js
// AIR Registry — DID key encoding + did:wba document key-binding (extracted from
// index.js for isolation and testability). Pure: no DB, no fetch, no Worker globals.
```

- [ ] **Step 4: Remove the moved defs from index.js and import them back**

In `api/src/index.js`, DELETE the six definitions listed above (match by content). Add, directly below the `import OPENAPI_YAML from "../openapi.yaml";` line:

```js
import { base58Decode, base64urlToBytes, ed25519ToMultibase } from "./did-keys.mjs";
```
(Only these three are referenced in index.js — `verifyEd25519Signature` uses `base58Decode`+`base64urlToBytes`; the did-document endpoint uses `ed25519ToMultibase`. `base58Encode`/the LUT/`BASE58_ALPHABET` are internal to did-keys.mjs.)

Verify nothing else in index.js still defines them: `grep -n "function base58Encode\|function base58Decode\|function base64urlToBytes\|function ed25519ToMultibase\|BASE58_ALPHABET\|BASE58_DECODE_LUT" api/src/index.js` → only the import line should reference these names; no `function`/`const` definitions remain.

- [ ] **Step 5: Verify — tests, syntax, and the real bundle**

Run: `node --test api/test/did-keys.test.mjs` → 1 block passes.
Run: `node --check --input-type=module < api/src/did-keys.mjs && node --check --input-type=module < api/src/index.js` → exit 0.
Run: `cd api && npx wrangler deploy --dry-run 2>&1 | tail -6; cd ..` → clean bundle (proves index.js + did-keys.mjs + the yaml import all resolve). Dry-run only; no deploy.

- [ ] **Step 6: Commit**

```bash
git add api/src/did-keys.mjs api/src/index.js api/test/did-keys.test.mjs
git commit -m "refactor(api): extract base58/multibase key encoders into did-keys.mjs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `multibaseToEd25519Bytes` (decode + guards)

**Files:** Modify `api/src/did-keys.mjs`, `api/test/did-keys.test.mjs`.

- [ ] **Step 1: Write the failing test**

Append to `api/test/did-keys.test.mjs` (add `multibaseToEd25519Bytes` to the existing top import line):

```js
test("multibaseToEd25519Bytes: round-trip + all reject paths", () => {
  const mb = ed25519ToMultibase(KEY_A);
  // round-trip equals the raw 32 bytes
  assert.deepEqual([...multibaseToEd25519Bytes(mb)], [...base64urlToBytes(KEY_A)]);
  // reject paths → null
  assert.equal(multibaseToEd25519Bytes("Q" + mb.slice(1)), null);   // not 'z'-prefixed
  assert.equal(multibaseToEd25519Bytes("z"), null);                  // empty body → 0 bytes
  assert.equal(multibaseToEd25519Bytes("z0OIl"), null);             // invalid base58 chars
  assert.equal(multibaseToEd25519Bytes(123), null);                 // not a string
  assert.equal(multibaseToEd25519Bytes("z" + "1".repeat(70)), null); // > 64 chars (length guard)
  // wrong multicodec: encode a 32-byte payload WITHOUT the 0xed01 prefix
  const noPrefix = "z" + base58Encode(base64urlToBytes(KEY_A));
  assert.equal(multibaseToEd25519Bytes(noPrefix), null);
});
```

- [ ] **Step 2: Run it, verify it FAILS** (`multibaseToEd25519Bytes` not exported).

- [ ] **Step 3: Implement** — append to `api/src/did-keys.mjs`:

```js
// Inverse of ed25519ToMultibase: "z6Mk…" → 32 raw key bytes, or null if not a
// valid Ed25519 multibase value (wrong prefix, bad base58, wrong multicodec, wrong length).
export function multibaseToEd25519Bytes(multibase) {
  if (typeof multibase !== "string" || !multibase.startsWith("z")) return null;
  // base58Decode is O(n²); an Ed25519 multibase value is ~48 chars. Cap input length
  // BEFORE decoding so a crafted long string can't burn CPU (defense even if the
  // DID_WBA_MAX_RESPONSE_BYTES cap is later raised).
  if (multibase.length > 64) return null;
  let decoded;
  try { decoded = base58Decode(multibase.slice(1)); } catch { return null; }
  // multicodec 0xed 0x01 + 32 key bytes
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) return null;
  return decoded.slice(2);
}
```

- [ ] **Step 4: Run it, verify it PASSES** → 2 blocks pass.

- [ ] **Step 5: Commit**

```bash
git add api/src/did-keys.mjs api/test/did-keys.test.mjs
git commit -m "feat(api): multibaseToEd25519Bytes — decode published did.json keys (guarded)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `didDocumentEd25519Keys` + `documentContainsKey` (the binding core)

**Files:** Modify `api/src/did-keys.mjs`, `api/test/did-keys.test.mjs`.

- [ ] **Step 1: Write the failing test**

Append to `api/test/did-keys.test.mjs` (add `didDocumentEd25519Keys, documentContainsKey` to the top import line):

```js
// A second, distinct 32-byte key (0x20..0x3f) as base64url. Self-checked below.
const KEY_B = "ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8";

// Build a did.json exactly like getDidDocument emits (api/src/index.js:~888-924).
function airStyleDoc(keyB64) {
  const did = "did:wba:example.com:agents:AIR-XXXX-XXXX-XXXX";
  return {
    "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"],
    id: did,
    verificationMethod: [{
      id: `${did}#key-1`,
      type: "Ed25519VerificationKey2020",
      controller: did,
      publicKeyMultibase: ed25519ToMultibase(keyB64),
    }],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
  };
}

test("documentContainsKey: fixtures are valid", () => {
  assert.equal(base64urlToBytes(KEY_A).length, 32);
  assert.equal(base64urlToBytes(KEY_B).length, 32);
  assert.notDeepEqual([...base64urlToBytes(KEY_A)], [...base64urlToBytes(KEY_B)]);
});

test("documentContainsKey: matches the published key, rejects everything else", () => {
  // matches: AIR-style doc advertising KEY_A, DB key is KEY_A
  assert.equal(documentContainsKey(airStyleDoc(KEY_A), KEY_A), true);
  // DIFFERENT key: doc advertises KEY_B, DB key is KEY_A
  assert.equal(documentContainsKey(airStyleDoc(KEY_B), KEY_A), false);
  // empty / absent verificationMethod
  assert.equal(documentContainsKey({ verificationMethod: [] }, KEY_A), false);
  assert.equal(documentContainsKey({}, KEY_A), false);
  // JWK-only method (no publicKeyMultibase)
  assert.equal(documentContainsKey({ verificationMethod: [{ type: "JsonWebKey2020", publicKeyJwk: { kty: "OKP" } }] }, KEY_A), false);
  // bare-string ref entries → skipped
  assert.equal(documentContainsKey({ verificationMethod: ["did:wba:x#k"] }, KEY_A), false);
  // multiple methods, one of which is KEY_A → true
  const multi = { verificationMethod: [
    { type: "Ed25519VerificationKey2020", publicKeyMultibase: ed25519ToMultibase(KEY_B) },
    { type: "Ed25519VerificationKey2020", publicKeyMultibase: ed25519ToMultibase(KEY_A) },
  ] };
  assert.equal(documentContainsKey(multi, KEY_A), true);
  // bad DB key input → false, never throws
  assert.equal(documentContainsKey(airStyleDoc(KEY_A), "!!!not-base64url!!!"), false);
});

test("didDocumentEd25519Keys: extracts valid keys, skips junk", () => {
  const doc = { verificationMethod: [
    { publicKeyMultibase: ed25519ToMultibase(KEY_A) },
    "bare-ref",
    { publicKeyJwk: { kty: "OKP" } },
    { publicKeyMultibase: "z-not-valid" },
  ] };
  assert.equal(didDocumentEd25519Keys(doc).length, 1);
});
```

- [ ] **Step 2: Run it, verify it FAILS** (`documentContainsKey`/`didDocumentEd25519Keys` not exported).

- [ ] **Step 3: Implement** — append to `api/src/did-keys.mjs`:

```js
// Constant-time-not-required equality for two Uint8Arrays (public keys).
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Every Ed25519 key (raw bytes) advertised in a parsed DID document's
// verificationMethod[]. Non-object entries (bare refs) and non-multibase /
// non-Ed25519 methods are skipped (fail-closed). v1: publicKeyMultibase only.
export function didDocumentEd25519Keys(parsedDoc) {
  const methods = Array.isArray(parsedDoc?.verificationMethod) ? parsedDoc.verificationMethod : [];
  const keys = [];
  for (const m of methods) {
    const bytes = multibaseToEd25519Bytes(m?.publicKeyMultibase);
    if (bytes) keys.push(bytes);
  }
  return keys;
}

// Does the published document advertise the DB key (base64url Ed25519)? Byte-compare.
// Never throws on bad input.
export function documentContainsKey(parsedDoc, dbPublicKeyBase64url) {
  let dbBytes;
  try { dbBytes = base64urlToBytes(dbPublicKeyBase64url); } catch { return false; }
  if (dbBytes.length !== 32) return false;
  return didDocumentEd25519Keys(parsedDoc).some((k) => bytesEqual(k, dbBytes));
}
```

- [ ] **Step 4: Run it, verify it PASSES** → 5 blocks pass.

- [ ] **Step 5: Commit**

```bash
git add api/src/did-keys.mjs api/test/did-keys.test.mjs
git commit -m "feat(api): documentContainsKey — bind DB key to published did.json verificationMethod

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire the binding into index.js (resolveDidWba + Lock 1 + cron)

Integration task — three sites in `index.js`. The decision logic is already unit-tested (Tasks 2–3); these are the wirings, gated by `node --check` + the wrangler bundle.

**Files:** Modify `api/src/index.js`.

- [ ] **Step 1: Widen the did-keys import**

Change the Task-1 import line to add the two binding functions used by the wiring:
```js
import { base58Decode, base64urlToBytes, ed25519ToMultibase, documentContainsKey } from "./did-keys.mjs";
```
(`didDocumentEd25519Keys` is only used internally by `documentContainsKey`, so index.js doesn't import it.)

- [ ] **Step 2: `resolveDidWba` — canonical-domain hard-reject + return document**

(a) Find the AIR-domain branch (`api/src/index.js:345-364`), currently:
```js
  if (
    parsed.domain === "agentidentityregistry.org" &&
    parsed.pathSegments.length === 2 &&
    parsed.pathSegments[0] === "agents"
  ) {
```
Replace that condition + add a non-canonical reject at the top of the branch, so the structure becomes:
```js
  if (parsed.domain === "agentidentityregistry.org") {
    // Any did:wba on OUR domain MUST be the canonical agents:{air_id} shape, resolved
    // via direct DB check — never an HTTP self-fetch. Reject anything else at the source
    // so a future catch-all/SPA route on this domain can't become a key-substitution vector.
    if (parsed.pathSegments.length !== 2 || parsed.pathSegments[0] !== "agents") {
      return { resolved: false, url: "(local)", error: "non-canonical AIR-domain did:wba (expected agents:{air_id})" };
    }
    // …KEEP the existing body unchanged: if (!db) …; const airId = …; SELECT public_key,status …;
    //   the not-found/inactive/no-public_key guards; and the final:
    //   return { resolved: true, url: `(local: /api/v1/agents/${airId}/did-document)` };
  }
```
(Preserve every line inside the existing branch body; only the outer `if` condition changed and the non-canonical guard was prepended.)

(b) Find the external-path JSON discard (`api/src/index.js:421-426`):
```js
    // Best-effort JSON parse — contents not validated in v1
    try {
      JSON.parse(text);
    } catch {
      return { resolved: false, url, error: "response is not valid JSON" };
    }
    return { resolved: true, url };
```
Replace with (keep the parsed object, return it as `document`):
```js
    // Parse the DID document and KEEP it — the caller binds the published key to
    // AIR's record (#4 resolved-key check). A non-JSON body still fails closed.
    let document;
    try {
      document = JSON.parse(text);
    } catch {
      return { resolved: false, url, error: "response is not valid JSON" };
    }
    return { resolved: true, url, document };
```

- [ ] **Step 3: `getAttesterEligibility` — Lock 1 key binding**

Find (`api/src/index.js:741-753` — the Lock 1 resolve), currently:
```js
  const wba = await resolveDidWba(attester.creator_did, db);
  if (!wba.resolved) {
    return { eligible: false, reason: `Lock 1: did:wba live resolution failed (${wba.error})` };
  }
```
Insert immediately AFTER that block:
```js
  // Lock 1 key binding (#4): for an EXTERNAL did:wba, the freshly-resolved document
  // must advertise the key we verify signatures against. AIR-minted DIDs return no
  // `document` (self-consistent by construction) and skip this.
  if (wba.document && !documentContainsKey(wba.document, attester.public_key)) {
    return { eligible: false, reason: "Lock 1: published did.json does not advertise the registered public key" };
  }
```

- [ ] **Step 4: Cron — add `public_key` to the SELECT + flag drift**

(a) In `reResolveAllDidWba`, the SELECT (`api/src/index.js:2103-2107`):
```js
  const { results: agents } = await db.prepare(
    `SELECT air_id, creator_did
     FROM agents
     WHERE status = 'active' AND creator_did LIKE 'did:wba:%'`
  ).all();
```
Add `public_key`:
```js
  const { results: agents } = await db.prepare(
    `SELECT air_id, creator_did, public_key
     FROM agents
     WHERE status = 'active' AND creator_did LIKE 'did:wba:%'`
  ).all();
```

(b) Replace the per-agent resolved/error computation (`api/src/index.js:2132-2146`):
```js
      const settled = results[j];
      const resolvedBool =
        settled.status === "fulfilled" ? !!settled.value.resolved : false;
      if (resolvedBool) {
        summary.resolved++;
      } else {
        summary.unresolved++;
        if (errorSamples.size < 5) {
          errorSamples.add(
            settled.status === "fulfilled"
              ? (settled.value.error || "unknown")
              : "threw: " + ((settled.reason && settled.reason.message) || settled.reason)
          );
        }
      }
```
with (factor a `reason`, and treat a resolved-but-key-drifted external doc as unresolved):
```js
      const settled = results[j];
      let resolvedBool =
        settled.status === "fulfilled" ? !!settled.value.resolved : false;
      let reason = settled.status === "fulfilled"
        ? (settled.value.error || "unknown")
        : "threw: " + ((settled.reason && settled.reason.message) || settled.reason);
      // #4 key-binding drift: a resolved EXTERNAL doc that does not advertise the
      // agent's registered key is flagged (distinct from an unreachable host).
      if (resolvedBool && settled.status === "fulfilled" && settled.value.document &&
          !documentContainsKey(settled.value.document, agent.public_key)) {
        resolvedBool = false;
        reason = "did:wba key drift (published did.json does not advertise the registered key)";
      }
      if (resolvedBool) {
        summary.resolved++;
      } else {
        summary.unresolved++;
        if (errorSamples.size < 5) errorSamples.add(reason);
      }
```

- [ ] **Step 5: Verify — syntax, grep, and the real bundle**

Run: `node --check --input-type=module < api/src/index.js` → exit 0.
Run: `grep -n "documentContainsKey\|non-canonical AIR-domain\|key drift\|public_key" api/src/index.js | head` → confirm: the import; the resolveDidWba non-canonical reject; the Lock 1 `documentContainsKey`; the cron SELECT `public_key` + the cron `documentContainsKey`.
Run: `node --test api/test/did-keys.test.mjs` → still 5 blocks pass (the pure module is unchanged).
Run: `cd api && npx wrangler deploy --dry-run 2>&1 | tail -8; cd ..` → clean bundle (the real integration gate — all three wirings + the import resolve).

> **Coverage note:** these three wirings touch `index.js`'s fetch/DB paths, which aren't unit-testable via the node harness. The decision they call (`documentContainsKey`) is exhaustively tested in Task 3. Verified here by `node --check` + the wrangler bundle; behavior proven post-deploy by the live cron + a manual external-DID probe.

- [ ] **Step 6: Commit**

```bash
git add api/src/index.js
git commit -m "feat(api): wire #4 key binding — Lock 1 + cron drift + canonical-domain reject

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `test:api` script + full suite + spec bump

**Files:** Modify `package.json`, `docs/superpowers/specs/2026-06-03-air-resolved-key-check-design.md`.

- [ ] **Step 1: Add did-keys.test.mjs to the test script**

In root `package.json`, change the `test:api` script to run both test files (node 25 supports multiple explicit file paths; `node --test <dir>` is broken on node 25, so list files):
```json
    "test:api": "node --test api/test/trust.test.mjs api/test/did-keys.test.mjs"
```

- [ ] **Step 2: Run the whole suite**

Run: `npm run test:api`
Expected: all blocks pass (10 from trust.test.mjs + 5 from did-keys.test.mjs = 15), 0 fail.

- [ ] **Step 3: Bump the spec status**

In `docs/superpowers/specs/2026-06-03-air-resolved-key-check-design.md`, change the `- **Status:**` line's leading phrase from `Approved design (pre-implementation) —` to `Implemented on branch feat/resolved-key-check (pending deploy) —` (keep the rest of the line).

- [ ] **Step 4: Commit**

```bash
git add package.json docs/superpowers/specs/2026-06-03-air-resolved-key-check-design.md
git commit -m "chore(api): run did-keys tests in test:api; mark #4 spec implemented (pending deploy)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Done criteria

- `npm run test:api` → 15 passing blocks (trust + did-keys).
- `cd api && npx wrangler deploy --dry-run` bundles cleanly.
- External did:wba attester whose published `did.json` doesn't advertise its registered key → Lock 1 ineligible (403); weekly cron flags `did_wba_resolved=0` with a distinct "key drift" reason. Non-canonical `agentidentityregistry.org` did:wba → rejected at the source. AIR-minted (canonical) DIDs unaffected. No schema migration.
- **Deploy is separate** — #3+#4 ship together in one `wrangler deploy` after #3's pre-deploy backfill guard.

## Spec coverage check

| Spec item | Task |
|---|---|
| `did-keys.mjs` extraction (base58/multibase) | 1 |
| `multibaseToEd25519Bytes` + length guard | 2 |
| `didDocumentEd25519Keys` + `documentContainsKey` (presence-in-verificationMethod, JWK/ref skip) | 3 |
| `resolveDidWba` return document | 4.2b |
| Canonical-AIR-domain hard-reject | 4.2a |
| Lock 1 binding (fail-closed) | 4.3 |
| Cron `public_key` SELECT + drift flag (distinct reason) | 4.4 |
| Test script + suite | 5 |
| No schema migration | (none) |
