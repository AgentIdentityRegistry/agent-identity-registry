import { test } from "node:test";
import assert from "node:assert/strict";
import { base58Encode, base58Decode, base64urlToBytes, ed25519ToMultibase, multibaseToEd25519Bytes } from "../src/did-keys.mjs";

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
});
