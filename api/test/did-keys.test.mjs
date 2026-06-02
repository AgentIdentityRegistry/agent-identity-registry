import { test } from "node:test";
import assert from "node:assert/strict";
import { base58Encode, base58Decode, base64urlToBytes, ed25519ToMultibase, multibaseToEd25519Bytes, didDocumentEd25519Keys, documentContainsKey } from "../src/did-keys.mjs";

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

test("multibaseToEd25519Bytes: round-trip + all reject paths", () => {
  const mb = ed25519ToMultibase(KEY_A);
  // round-trip equals the raw 32 bytes
  assert.deepEqual([...multibaseToEd25519Bytes(mb)], [...base64urlToBytes(KEY_A)]);
  // reject paths → null
  assert.equal(multibaseToEd25519Bytes("Q" + mb.slice(1)), null);    // not 'z'-prefixed
  assert.equal(multibaseToEd25519Bytes("z"), null);                  // empty body → 0 bytes
  assert.equal(multibaseToEd25519Bytes("z0OIl"), null);             // invalid base58 chars (0,O,I,l)
  assert.equal(multibaseToEd25519Bytes(123), null);                 // not a string
  assert.equal(multibaseToEd25519Bytes("z" + "1".repeat(70)), null); // > 64 chars (length guard)
  // wrong multicodec: encode the 32-byte payload WITHOUT the 0xed01 prefix
  const noPrefix = "z" + base58Encode(base64urlToBytes(KEY_A));
  assert.equal(multibaseToEd25519Bytes(noPrefix), null);
  // correct length (34) but WRONG multicodec (X25519 0xec01, not Ed25519 0xed01) → null
  const wrongCodec = "z" + base58Encode(Uint8Array.from([0xec, 0x01, ...base64urlToBytes(KEY_A)]));
  assert.equal(multibaseToEd25519Bytes(wrongCodec), null);
});

// A second, distinct 32-byte key (0x20..0x3f) as base64url. Self-checked below.
const KEY_B = "ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8";

// Build a did.json exactly like getDidDocument emits (api/src/index.js verificationMethod).
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
  assert.equal(documentContainsKey(airStyleDoc(KEY_A), KEY_A), true);     // matches
  assert.equal(documentContainsKey(airStyleDoc(KEY_B), KEY_A), false);    // DIFFERENT key
  assert.equal(documentContainsKey({ verificationMethod: [] }, KEY_A), false); // empty
  assert.equal(documentContainsKey({}, KEY_A), false);                    // absent verificationMethod
  assert.equal(documentContainsKey({ verificationMethod: [{ type: "JsonWebKey2020", publicKeyJwk: { kty: "OKP" } }] }, KEY_A), false); // JWK-only
  assert.equal(documentContainsKey({ verificationMethod: ["did:wba:x#k"] }, KEY_A), false); // bare-string ref
  const multi = { verificationMethod: [
    { type: "Ed25519VerificationKey2020", publicKeyMultibase: ed25519ToMultibase(KEY_B) },
    { type: "Ed25519VerificationKey2020", publicKeyMultibase: ed25519ToMultibase(KEY_A) },
  ] };
  assert.equal(documentContainsKey(multi, KEY_A), true);                  // one of several
  assert.equal(documentContainsKey(airStyleDoc(KEY_A), "!!!not-base64url!!!"), false); // bad DB key → false, no throw
  // null / undefined document → false (Task 4 passes wba.document, which may be null)
  assert.equal(documentContainsKey(null, KEY_A), false);
  assert.equal(documentContainsKey(undefined, KEY_A), false);
  // cryptographic exactness: a doc advertising KEY_A with ONE byte flipped → false
  const aBytes = base64urlToBytes(KEY_A);
  const offByOne = new Uint8Array(aBytes);
  offByOne[0] ^= 0x01;
  const offB64 = btoa(String.fromCharCode(...offByOne)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  assert.equal(documentContainsKey(airStyleDoc(offB64), KEY_A), false);
});

test("didDocumentEd25519Keys: extracts valid keys, skips junk", () => {
  const doc = { verificationMethod: [
    { publicKeyMultibase: ed25519ToMultibase(KEY_A) },
    "bare-ref",
    { publicKeyJwk: { kty: "OKP" } },
    { publicKeyMultibase: "z-not-valid" },
  ] };
  assert.equal(didDocumentEd25519Keys(doc).length, 1);
  assert.deepEqual([...didDocumentEd25519Keys(doc)[0]], [...base64urlToBytes(KEY_A)]);
});
