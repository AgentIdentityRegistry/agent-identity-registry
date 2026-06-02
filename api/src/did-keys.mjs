// AIR Registry — DID key encoding + did:wba document key-binding (extracted from
// index.js for isolation and testability). Pure: no DB, no fetch, no Worker globals.

// base58btc alphabet per RFC draft-msporny-base58. Excludes 0, O, I, l (look-alikes).
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Base58btc encoder. Used to produce W3C DID Core publicKeyMultibase values.
// Treats input as big-endian integer; repeatedly divides by 58. Leading zero
// bytes in input become leading '1' chars in output (per Bitcoin base58 convention).
export function base58Encode(bytes) {
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) leadingZeros++;

  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8; // multiply existing digits by 256
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  let result = "";
  for (let i = 0; i < leadingZeros; i++) result += "1";
  for (let i = digits.length - 1; i >= 0; i--) result += BASE58_ALPHABET[digits[i]];
  return result;
}

// Convert a base64url-encoded Ed25519 public key (32 bytes) to W3C
// publicKeyMultibase format: multicodec prefix 0xed 0x01 + key bytes, then
// base58btc encoded with "z" multibase prefix. Output looks like "z6Mk...".
// This is the same encoding did:key uses for Ed25519 keys.
export function ed25519ToMultibase(base64urlKey) {
  // base64url → base64 → byte string
  let b64 = base64urlKey.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  const binary = atob(b64);
  const keyBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) keyBytes[i] = binary.charCodeAt(i);

  // Prepend Ed25519 multicodec: 0xed 0x01 (varint encoding of code 0xed)
  const prefixed = new Uint8Array(2 + keyBytes.length);
  prefixed[0] = 0xed;
  prefixed[1] = 0x01;
  prefixed.set(keyBytes, 2);

  return "z" + base58Encode(prefixed);
}

// Decode a base64url string to raw Uint8Array bytes.
export function base64urlToBytes(s) {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

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

// ---------------------------------------------------------------------------
// DID document key binding — security core of AIR plan #4
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Inverse of base58Encode() defined earlier. Decodes base58btc → raw bytes.
const BASE58_DECODE_LUT = (() => {
  const m = new Int8Array(128).fill(-1);
  for (let i = 0; i < BASE58_ALPHABET.length; i++) m[BASE58_ALPHABET.charCodeAt(i)] = i;
  return m;
})();
export function base58Decode(s) {
  if (typeof s !== "string" || s.length === 0) return new Uint8Array(0);
  // Count leading "1"s — these encode leading zero bytes.
  let leadingOnes = 0;
  while (leadingOnes < s.length && s[leadingOnes] === "1") leadingOnes++;
  // base58 → base256 (little-endian during accumulation, reversed at end)
  const bytes = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 128) throw new Error("invalid base58 character");
    const value = BASE58_DECODE_LUT[c];
    if (value === -1) throw new Error("invalid base58 character: " + s[i]);
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const out = new Uint8Array(leadingOnes + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[leadingOnes + i] = bytes[bytes.length - 1 - i];
  return out;
}
