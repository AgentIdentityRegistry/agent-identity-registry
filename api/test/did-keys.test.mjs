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
