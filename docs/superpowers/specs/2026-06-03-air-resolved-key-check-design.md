# Design Spec — #4 Resolved-Key Check (Lock 1 did:wba key binding)

- **Date:** 2026-06-03
- **Status:** Approved design (pre-implementation)
- **Component:** AIR registry worker — `api/src/index.js` (+ new `api/src/did-keys.mjs`)
- **Related:** [air/trust-graph-coldstart-2026-06-02] (GBrain) — security TODO #4. Sibling item #3 (trust feedback loop) shipped on branch `feat/trust-feedback-loop` (PR #1); #4 branches from there and deploys together.
- **Migration required:** none (schema unchanged; `did_wba_resolved` already exists)
- **Base branch:** `feat/trust-feedback-loop` (so the worker already carries #3); PR base = `feat/trust-feedback-loop` (stacked).

## Problem

`resolveDidWba` (`api/src/index.js:333`) proves an external did:wba document is reachable and is valid JSON, then **discards the parsed body** (`api/src/index.js:421-426` — `try { JSON.parse(text); } catch {…}`, result thrown away). The attestation signature is later verified against the **DB-stored** `public_key` (`verifyEd25519Signature`, `api/src/index.js:1559`), never the key published in the freshly-resolved `did.json`.

**The hole:** an external did:wba attester could serve a perfectly valid `did.json` at the right URL while that document advertises a *different* key than the one AIR has on file. Resolution "succeeds," the signature still checks against AIR's stored key, and the vouch counts — even though AIR never confirmed the agent still controls / publishes that key. The Lock 1 "live resolution" check proves *existence*, not *key binding*.

**Not affected: AIR-minted DIDs.** For `did:wba:agentidentityregistry.org:agents:{id}`, `resolveDidWba` short-circuits to a direct DB check (no HTTP), and the did-document endpoint generates `publicKeyMultibase` *from* `agent.public_key` (`api/src/index.js:888`). Resolved key == DB key by construction, so the binding is tautologically satisfied. #4 only adds teeth for **external** did:wba attesters.

## Decision summary

| Axis | Decision | Why |
|---|---|---|
| Mismatch policy | **Reject, fail-closed** | Whoever controls the agent's website/DID host must NEVER be able to silently change which key AIR trusts. The published document must match AIR's record, not override it. (Auto-rotation would make the website the root of trust — rejected.) |
| Enforcement points | **Attestation Lock 1** (hard reject) + **weekly did:wba cron** (flag `did_wba_resolved=0` on drift) | Lock 1 is the trust-critical path (a vouch's weight depends on key control). The cron already resolves every DID weekly — flagging drift there is near-free and surfaces tampering even for agents not currently vouching. |
| AIR-minted DIDs | **No-op** | Self-consistent by construction; no `document` returned from the direct-DB path → binding skipped. |
| Key format | **`publicKeyMultibase`** (Ed25519VerificationKey2020), byte-compared | The form AIR itself publishes and the dominant external Ed25519 form. JWK-only docs are treated as unsupported → reject (fail-closed). |
| Match rule | DB key (raw 32 bytes) ∈ the Ed25519 keys decoded from the document's `verificationMethod[]` | Presence in the published document proves the agent advertises AIR's key. |
| Schema | **No change** | `did_wba_resolved` already exists for the cron flag. |

## Design

### New module `api/src/did-keys.mjs`

Mirrors #3's `trust.mjs` extraction: move the existing DID-key encoding helpers out of the 2242-line `index.js` so the binding logic is a small, pure, independently testable unit. The module is self-contained (no `index.js` imports, no DB, no fetch).

**Moved from index.js (unchanged behavior):**
- `base58Encode` (`api/src/index.js:448`)
- `base58Decode` (used by `verifyEd25519Signature`)
- `ed25519ToMultibase` (`api/src/index.js:476`)
- `base64urlToBytes` (used by `verifyEd25519Signature`)

`index.js` imports these back: `import { base58Encode, base58Decode, ed25519ToMultibase, base64urlToBytes, multibaseToEd25519Bytes, didDocumentEd25519Keys, documentContainsKey } from "./did-keys.mjs";` (only the names index.js actually uses).

**New pure functions:**

```js
// Inverse of ed25519ToMultibase: "z6Mk…" → 32 raw key bytes, or null if not a
// valid Ed25519 multibase value (wrong multibase prefix, bad base58, wrong
// multicodec, or wrong length).
export function multibaseToEd25519Bytes(multibase) {
  if (typeof multibase !== "string" || !multibase.startsWith("z")) return null;
  let decoded;
  try { decoded = base58Decode(multibase.slice(1)); } catch { return null; }
  // multicodec 0xed 0x01 + 32 key bytes
  if (decoded.length !== 34 || decoded[0] !== 0xed || decoded[1] !== 0x01) return null;
  return decoded.slice(2);
}

// Extract every Ed25519 key (as raw bytes) from a parsed DID document's
// verificationMethod[]. Ignores non-multibase / non-Ed25519 entries (v1).
export function didDocumentEd25519Keys(parsedDoc) {
  const methods = Array.isArray(parsedDoc?.verificationMethod) ? parsedDoc.verificationMethod : [];
  const keys = [];
  for (const m of methods) {
    const bytes = multibaseToEd25519Bytes(m?.publicKeyMultibase);
    if (bytes) keys.push(bytes);
  }
  return keys;
}

// Does the published document advertise the DB key? Byte-compare.
export function documentContainsKey(parsedDoc, dbPublicKeyBase64url) {
  let dbBytes;
  try { dbBytes = base64urlToBytes(dbPublicKeyBase64url); } catch { return false; }
  if (dbBytes.length !== 32) return false;
  return didDocumentEd25519Keys(parsedDoc).some((k) => bytesEqual(k, dbBytes));
}
```
(`bytesEqual` is a small local Uint8Array comparison helper — not timing-sensitive; these are public keys.)

### `resolveDidWba` — return the document instead of discarding it

External path only: replace the throwaway `JSON.parse(text)` (`api/src/index.js:421-426`) with a parse that keeps the object and returns it. New return on success: `{ resolved: true, url, document }`. On parse failure: unchanged (`{ resolved: false, url, error: "response is not valid JSON" }`). The AIR-minted branch returns `{ resolved: true, url }` (no `document`) — unchanged. All existing fetch/redirect/content-type/byte-cap guards stay exactly as they are.

### `getAttesterEligibility` — enforce the binding at Lock 1

After the existing `const wba = await resolveDidWba(attester.creator_did, db);` / `if (!wba.resolved) reject` (`api/src/index.js:~750`), add:

```js
// Lock 1 key binding (#4): for an EXTERNAL did:wba, the freshly-resolved
// document must advertise the key we verify signatures against. AIR-minted
// DIDs return no `document` (self-consistent) and skip this.
if (wba.document && !documentContainsKey(wba.document, attester.public_key)) {
  return { eligible: false, reason: "Lock 1: published did.json does not advertise the registered public key" };
}
```
A document that fetched fine but lacks the key → Lock 1 ineligible (a clean 403 from `createAttestation`, not a 500).

### Weekly cron `reResolveAllDidWba` — flag drift

When resolving an external did:wba agent, if `wba.resolved` but `wba.document` does not contain the agent's `public_key`, record `did_wba_resolved = 0` (treat a key-binding failure as not-resolved) and include the reason in the cron run summary (the existing `sample_errors` aggregation). AIR-minted agents (no `document`) keep their current direct-DB resolution result.

## Data flow

```
vouch → createAttestation → getAttesterEligibility(attester)
  → resolveDidWba(creator_did, db)
       external → {resolved:true, url, document}   |   AIR-minted → {resolved:true, url}
  → if document present: documentContainsKey(document, attester.public_key) ? pass : Lock1-reject
  → (later) verifyEd25519Signature(attester.public_key, …)

weekly cron → for each did:wba agent → resolveDidWba
  → external doc missing the key ⇒ did_wba_resolved = 0 + summary reason
```

## Error handling

- Document fetched but missing the key → Lock 1 ineligible (403 via createAttestation), NOT a 500.
- Document with no parseable Ed25519 `verificationMethod` (e.g. JWK-only, empty) → `documentContainsKey` returns false → reject ("does not advertise the registered public key"). Fail-closed.
- Malformed `publicKeyMultibase` entries are skipped individually (don't throw); if none match → reject.
- `documentContainsKey` never throws on bad input (bad base64url DB key → false). Defensive by contract.
- All existing resolution guards (redirect/content-type/byte-cap/timeout) unchanged.

## Testing (node:sqlite harness reused for any DB bits; pure-function tests for the core)

Pure (no DB, no fetch) — the security core:
1. `multibaseToEd25519Bytes(ed25519ToMultibase(k)) === k` (round-trip) for a known 32-byte key; returns null for non-`z`, bad base58, wrong multicodec, wrong length.
2. `documentContainsKey`: true when the doc's `verificationMethod` includes the DB key; false when it advertises a DIFFERENT key; false for a JWK-only doc; false for an empty/absent `verificationMethod`; true when the key is one of several methods.
3. `didDocumentEd25519Keys`: extracts N keys, skips malformed/non-Ed25519 entries.
4. A realistic AIR-style did.json fixture (the exact shape `getDidDocument` emits) → `documentContainsKey` true for that agent's key.

**Coverage boundary (stated honestly, as in #3):** `resolveDidWba`'s `fetch()` branch and `getAttesterEligibility`'s external path are not unit-tested by the node:sqlite harness (no HTTP mock). The pure binding logic is exhaustively tested; the HTTP wiring is thin and verified by `wrangler deploy --dry-run` + a manual live probe + the weekly cron exercising it. No HTTP-handler test harness is introduced.

## Out of scope (YAGNI)

- `publicKeyJwk` key extraction (v1 = `publicKeyMultibase` only; JWK-only → fail-closed).
- Requiring the matched key be referenced specifically by `assertionMethod`/`authentication` (v1 accepts presence in `verificationMethod[]`).
- Auto-rotation / accepting the published key as authoritative.
- Registration-time enforcement (Lock 1 already blocks any vouch before it counts).
- Any schema change.

## Deploy

- No migration. Logic-only.
- Deploys together with #3 in a single `wrangler deploy` (after #3's pre-deploy backfill guard). The key-binding only affects external did:wba attesters at vouch time + the weekly cron; there are no live external attesters today, so this is a no-regression change for current data (the only real agent is AIR-minted, which the binding skips).

## Post-deploy verification

```bash
curl https://agentidentityregistry.org/api/v1/health
# AIR-minted DID still resolves (binding skipped):
curl https://agentidentityregistry.org/api/v1/agents/AIR-2JE0-EM7W-JNBK/did-document | head -5
# Cron summary surfaces any external key-drift on its next Sunday run.
```
