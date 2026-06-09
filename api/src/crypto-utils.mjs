// Hashing + canonical-JSON primitives shared by the worker and audit.mjs.

// SHA-256 hash of a UTF-8 string, returned as 64-char hex.
// Used to store agent_secret_hash without retaining the plaintext.
export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Canonical JSON per RFC 8785 (JCS). Matches the A2A draft-1 _jcs_exact()
// pattern in the conformance harness — no float coercion, exact integers.
// Used so Rust/Python/Go implementations can byte-match our signed payloads.
export function jcsCanonicalize(obj) {
  if (obj === null) return "null";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "number") {
    if (!Number.isFinite(obj)) throw new Error("non-finite number in JCS payload");
    if (!Number.isInteger(obj) && Math.abs(obj) > Number.MAX_SAFE_INTEGER) {
      throw new Error("large float canonicalization not implemented");
    }
    return JSON.stringify(obj);
  }
  if (typeof obj === "string") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(jcsCanonicalize).join(",") + "]";
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + jcsCanonicalize(obj[k])).join(",") + "}";
  }
  throw new Error("unsupported JCS type: " + typeof obj);
}
