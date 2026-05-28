// AIR Registry API — Cloudflare Worker + D1
// Agent Identity Registry Foundation

// OpenAPI 3.1 spec bundled as a text module. See ../openapi.yaml for the
// hand-maintained source. Wrangler's [[rules]] type="Text" config in
// wrangler.toml turns the .yaml import into a string at build time.
import OPENAPI_YAML from "../openapi.yaml";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    // HEAD requests must return identical headers to GET per HTTP spec.
    // Cloudflare Workers don't auto-alias these, so we treat HEAD as GET
    // for routing and strip the body before returning. Matters for tools
    // that probe endpoints with HEAD before downloading (curl -I,
    // monitoring, some openapi-generator versions).
    const isHead = request.method === "HEAD";
    const method = isHead ? "GET" : request.method;

    // CORS headers. Most endpoints are restricted to our own origin, but
    // the OpenAPI spec endpoint allows ANY origin — so browser-based
    // tooling (Swagger UI playgrounds, openapi-generator, Stoplight, etc.)
    // can fetch the spec without a CORS-proxy hop.
    const isPublicSpecEndpoint = path === "/api/v1/openapi.yaml";
    const corsHeaders = {
      "Access-Control-Allow-Origin": isPublicSpecEndpoint
        ? "*"
        : "https://agentidentityregistry.org",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, X-Agent-Secret",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      let response;

      // Route matching
      if (path === "/api/v1/agents" && method === "GET") {
        response = await listAgents(url, env.DB);
      } else if (path.match(/^\/api\/v1\/agents\/AIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\/trust-score$/) && method === "GET") {
        const airId = path.split("/")[4];
        response = await getTrustScore(airId, env.DB);
      } else if (path.match(/^\/api\/v1\/agents\/AIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}\/did-document$/) && method === "GET") {
        const airId = path.split("/")[4];
        response = await getDidDocument(airId, env.DB);
      } else if (path.match(/^\/api\/v1\/agents\/AIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/) && method === "GET") {
        const airId = path.split("/")[4];
        response = await getAgent(airId, env.DB);
      } else if (path.match(/^\/api\/v1\/agents\/AIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/) && method === "PUT") {
        const airId = path.split("/")[4];
        response = await updateAgent(request, airId, env.DB);
      } else if (path.match(/^\/api\/v1\/agents\/AIR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/) && method === "DELETE") {
        const airId = path.split("/")[4];
        response = await adminAuth(request, env) || await deleteAgent(airId, env.DB);
      } else if (path === "/api/v1/agents/register" && method === "POST") {
        response = await registerAgent(request, env.DB);
      } else if (path === "/api/v1/agents/check-name" && method === "GET") {
        response = await checkName(url, env.DB);
      } else if (path === "/api/v1/admin/stats" && method === "GET") {
        response = await adminAuth(request, env) || await adminStats(env.DB);
      } else if (path === "/api/v1/admin/recent" && method === "GET") {
        response = await adminAuth(request, env) || await adminRecent(url, env.DB);
      } else if (path === "/api/v1/admin/cron/did-wba-resolve" && method === "POST") {
        // Manual trigger for the weekly did:wba re-resolution. Two real uses:
        //   (a) Backfilling existing agents right after the column migration,
        //       since the cron only runs Sundays — without this you'd wait days.
        //   (b) Verifying the cron handler actually works without waiting.
        response = await adminAuth(request, env) || await runDidWbaResolveCron(env.DB);
      } else if (path === "/api/v1/health" && method === "GET") {
        response = json({ status: "ok", version: "0.1.0", registry: "AIR" });
      } else if (path === "/api/v1/openapi.yaml" && method === "GET") {
        // Hand-maintained OpenAPI 3.1 spec, served verbatim. 5-min edge cache.
        response = new Response(OPENAPI_YAML, {
          status: 200,
          headers: {
            "Content-Type": "application/yaml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      } else {
        response = json({ error: "Not found" }, 404);
      }

      // Attach CORS headers to every response
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(corsHeaders)) {
        headers.set(k, v);
      }
      // HEAD: identical headers to GET, no body.
      const body = isHead ? null : response.body;
      return new Response(body, { status: response.status, headers });

    } catch (err) {
      return json({ error: "Internal server error", message: err.message }, 500);
    }
  },

  // Workers Cron entrypoint — fires per the [triggers] crons schedule in
  // wrangler.toml. Currently used to re-check did:wba resolution weekly so
  // the registry's freshness data doesn't go stale post-registration.
  //
  // ctx.waitUntil keeps the work alive past this function's return — the
  // scheduled event handler can return immediately, but the promise inside
  // waitUntil continues executing until completion (or the scheduled-event
  // wall-clock limit, currently many minutes for paid plans).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      reResolveAllDidWba(env.DB).catch((err) => {
        // Surface in `wrangler tail` logs without crashing the invocation.
        console.error("[did-wba-cron] FAILED:", err && err.stack || err);
      })
    );
  },
};

// ============================================================
// RATE LIMITING
// ============================================================

const RATE_LIMIT_MAX = 5;        // max requests
const RATE_LIMIT_WINDOW = 3600;  // per hour (seconds)

async function checkRateLimit(request, db, endpoint) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW * 1000).toISOString();

  // Count recent requests from this IP
  const count = await db.prepare(
    "SELECT COUNT(*) as cnt FROM rate_limits WHERE ip = ? AND endpoint = ? AND created_at > ?"
  ).bind(ip, endpoint, windowStart).first();

  if (count.cnt >= RATE_LIMIT_MAX) {
    return json({
      error: "Rate limit exceeded",
      message: "Maximum " + RATE_LIMIT_MAX + " registrations per hour. Please try again later.",
      retry_after_seconds: RATE_LIMIT_WINDOW,
    }, 429);
  }

  // Log this request
  await db.prepare(
    "INSERT INTO rate_limits (ip, endpoint, created_at) VALUES (?, ?, ?)"
  ).bind(ip, endpoint, now.toISOString()).run();

  // Clean up old entries (older than 24 hours) — async, don't block
  db.prepare("DELETE FROM rate_limits WHERE created_at < ?")
    .bind(new Date(now.getTime() - 86400000).toISOString()).run();

  return null; // null means allowed
}

// ============================================================
// HELPERS
// ============================================================

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function computeGrade(score) {
  if (score >= 950) return "AAA";
  if (score >= 850) return "AA";
  if (score >= 700) return "A";
  if (score >= 600) return "BBB";
  if (score >= 500) return "BB";
  if (score >= 400) return "B";
  return "C";
}

// ============================================================
// AIR ID GENERATION (per spec: SHA-256 → base32 → CRC32)
// ============================================================

// Crockford's Base32 alphabet — 32 characters, excludes I, L, O, U to avoid
// look-alike confusion with 1, 0. Matches SPECIFICATION.md line 79.
// Previous version was only 29 chars, which produced "undefined" segments
// in ~32% of new AIR IDs whenever lookup index landed in [29, 31]. Fixed 2026-05-23.
const BASE32_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function base32Encode(bytes, length) {
  let result = "";
  let bits = 0;
  let value = 0;
  for (let i = 0; i < bytes.length && result.length < length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5 && result.length < length) {
      bits -= 5;
      result += BASE32_CHARS[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0 && result.length < length) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }
  return result;
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function generateAirId(identityDoc) {
  // 1. Canonical JSON
  const canonical = JSON.stringify(identityDoc, Object.keys(identityDoc).sort());

  // 2. SHA-256 hash
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
  const hashBytes = new Uint8Array(hashBuffer);

  // 3. First 8 bytes → base32 → HEAD (4) + TAIL (4)
  const head = base32Encode(hashBytes.slice(0, 4), 4);
  const tail = base32Encode(hashBytes.slice(4, 8), 4);

  // 4. CRC32 of full hash → base32 → CHECKSUM (4)
  const crcValue = crc32(hashBytes);
  const crcBytes = new Uint8Array([
    (crcValue >>> 24) & 0xff,
    (crcValue >>> 16) & 0xff,
    (crcValue >>> 8) & 0xff,
    crcValue & 0xff,
  ]);
  const checksum = base32Encode(crcBytes, 4);

  // 5. Format
  return `AIR-${head}-${tail}-${checksum}`;
}

// ============================================================
// did:wba VALIDATION & RESOLUTION
// ============================================================
// Validates and resolves did:wba (Web-Based Authentication) DIDs per
// the W3C AI Agent Protocol CG spec. did:wba is a DNS-anchored DID
// method that doesn't require blockchain or central registry.
//
// Format:
//   did:wba:DOMAIN                  → https://DOMAIN/.well-known/agent.json
//   did:wba:DOMAIN:path:segments    → https://DOMAIN/path/segments/did.json
//
// Validation policy: STRICT (hard-reject on bad format).
// did:wba is opt-in — agents without a domain can use did:key instead.

const DID_WBA_PREFIX = "did:wba:";
const DID_WBA_TIMEOUT_MS = 3000;
const DID_WBA_MAX_RESPONSE_BYTES = 1024;

function isDidWba(did) {
  return typeof did === "string" && did.startsWith(DID_WBA_PREFIX);
}

function validateDidWba(did) {
  if (!isDidWba(did)) {
    return { valid: false, error: "not a did:wba" };
  }
  const rest = did.slice(DID_WBA_PREFIX.length);
  if (rest.length === 0) {
    return { valid: false, error: "missing domain after did:wba:" };
  }

  // Split into [domain, ...pathSegments]
  const parts = rest.split(":");
  const domain = parts[0];
  const pathSegments = parts.slice(1);

  // Domain length per RFC 1035 (min 4 = a.bc; max 253 = full hostname)
  if (domain.length < 4 || domain.length > 253) {
    return { valid: false, error: "domain length must be 4-253 chars" };
  }
  // Domain charset: ASCII letters/digits/dots/hyphens, must include a dot
  if (!/^[a-z0-9.-]+$/i.test(domain)) {
    return { valid: false, error: "domain has invalid characters (ASCII letters/digits/dots/hyphens only)" };
  }
  if (!domain.includes(".")) {
    return { valid: false, error: "domain must include at least one dot (e.g. example.com)" };
  }
  // SSRF guard: reject IPv4 literals
  if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    return { valid: false, error: "domain cannot be a raw IPv4 address" };
  }
  // SSRF guard: reject localhost variants
  if (domain.toLowerCase() === "localhost" || domain.toLowerCase().endsWith(".localhost")) {
    return { valid: false, error: "domain cannot be localhost" };
  }

  // Path segments must be safe identifiers (alphanumeric + hyphen + underscore)
  for (const seg of pathSegments) {
    if (seg.length === 0 || !/^[a-zA-Z0-9_-]+$/.test(seg)) {
      return { valid: false, error: "path segment '" + seg + "' has invalid characters" };
    }
  }

  return { valid: true, domain, pathSegments };
}

function didWbaResolutionUrl(parsed) {
  if (parsed.pathSegments.length === 0) {
    return `https://${parsed.domain}/.well-known/agent.json`;
  }
  return `https://${parsed.domain}/${parsed.pathSegments.join("/")}/did.json`;
}

async function resolveDidWba(did) {
  const parsed = validateDidWba(did);
  if (!parsed.valid) {
    return { resolved: false, error: parsed.error };
  }

  const url = didWbaResolutionUrl(parsed);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DID_WBA_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      redirect: "error", // no redirects, security
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return { resolved: false, url, error: "HTTP " + response.status };
    }

    // Stream-read with 1KB cap (truncate, don't reject)
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (received < DID_WBA_MAX_RESPONSE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
    }
    try { reader.cancel(); } catch {}

    // Concatenate up to 1KB
    const merged = new Uint8Array(Math.min(received, DID_WBA_MAX_RESPONSE_BYTES));
    let offset = 0;
    for (const chunk of chunks) {
      const remaining = DID_WBA_MAX_RESPONSE_BYTES - offset;
      if (remaining <= 0) break;
      const slice = chunk.subarray(0, remaining);
      merged.set(slice, offset);
      offset += slice.length;
    }
    const text = new TextDecoder().decode(merged);

    // Best-effort JSON parse — contents not validated in v1
    try {
      JSON.parse(text);
    } catch {
      return { resolved: false, url, error: "response is not valid JSON" };
    }
    return { resolved: true, url };
  } catch (e) {
    clearTimeout(timeoutId);
    const error = e.name === "AbortError" ? "timeout after " + DID_WBA_TIMEOUT_MS + "ms" : e.message || "network error";
    return { resolved: false, url, error };
  }
}

// ============================================================
// CRYPTO UTILITIES
// ============================================================
// Validation helpers for cryptographic material submitted by clients.
// Currently: Ed25519 public keys (base64url, 32 bytes after decode).
// Future: signature verification, key rotation helpers, etc.

// base58btc alphabet per RFC draft-msporny-base58. Excludes 0, O, I, l (look-alikes).
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Base58btc encoder. Used to produce W3C DID Core publicKeyMultibase values.
// Treats input as big-endian integer; repeatedly divides by 58. Leading zero
// bytes in input become leading '1' chars in output (per Bitcoin base58 convention).
function base58Encode(bytes) {
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
function ed25519ToMultibase(base64urlKey) {
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

// Generate a 32-char hex agent secret (16 random bytes = 128 bits of entropy).
// Plaintext is shown to the user once at registration and never stored or recoverable.
function generateAgentSecret() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// SHA-256 hash of a UTF-8 string, returned as 64-char hex.
// Used to store agent_secret_hash without retaining the plaintext.
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string equality (timing-safe). Returns true if and only if
// both strings have identical length and contents. Iterates the full length
// regardless of mismatch position, preventing timing-side-channel attacks
// during agent secret verification.
function constantTimeEquals(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function validatePublicKey(key) {
  if (typeof key !== "string" || key.length === 0) {
    return { valid: false, error: "must be a non-empty string" };
  }
  // Ed25519 public keys are 32 bytes → 43 chars base64url (no pad) or 44 (with pad)
  if (key.length !== 43 && key.length !== 44) {
    return { valid: false, error: "must be 43 or 44 base64url chars (Ed25519 is 32 bytes)" };
  }
  // base64url charset: A-Z, a-z, 0-9, -, _, optional = padding
  if (!/^[A-Za-z0-9_-]+=*$/.test(key)) {
    return { valid: false, error: "contains invalid base64url characters" };
  }
  // Decode: base64url → base64 → atob → byte string
  try {
    let b64 = key.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const binary = atob(b64);
    if (binary.length !== 32) {
      return { valid: false, error: "decoded key must be exactly 32 bytes (got " + binary.length + ")" };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: "is not valid base64url" };
  }
}

// ============================================================
// TRUST SCORE CALCULATION
// ============================================================

function calculateInitialTrustScore(agent) {
  // Provenance: based on creator info completeness
  let provenance = 300; // base
  if (agent.creator_did) provenance += 100;
  if (agent.creator_name) provenance += 100;
  if (agent.creator_type === "organization") provenance += 100;
  // cap at 600 for new registrations (no history)
  provenance = Math.min(provenance, 600);

  // Behavioral: starts at 500 (no history yet)
  const behavioral = 500;

  // Transparency: based on openness
  let transparency = 300;
  if (agent.transparency_open_source) transparency += 150;
  if (agent.transparency_code_repo) transparency += 100;
  if (agent.transparency_docs_url) transparency += 100;
  transparency = Math.min(transparency, 650);

  // Security: based on certifications
  let security = 300;
  const certs = JSON.parse(agent.security_certifications || "[]");
  security += Math.min(certs.length * 100, 300);
  security = Math.min(security, 600);

  // Peer attestations: starts at 300 (no attestations yet)
  const peer_attestations = 300;

  // Weighted total
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

// ============================================================
// ROUTE HANDLERS
// ============================================================

async function getAgent(airId, db) {
  const agent = await db.prepare(
    "SELECT a.*, t.total_score, t.grade, t.provenance, t.behavioral, t.transparency, t.security, t.peer_attestations, t.calculated_at FROM agents a LEFT JOIN trust_scores t ON a.air_id = t.air_id WHERE a.air_id = ?"
  ).bind(airId).first();

  if (!agent) {
    return json({ error: "Agent not found", air_id: airId }, 404);
  }

  return json({
    "@context": "https://agentidentityregistry.org/v1",
    type: "AgentIdentity",
    air_id: agent.air_id,
    name: agent.name,
    description: agent.description,
    creator: {
      did: agent.creator_did,
      name: agent.creator_name,
      type: agent.creator_type,
      public_key: agent.public_key, // null for agents registered without one
    },
    capabilities: JSON.parse(agent.capabilities || "[]"),
    security: {
      certifications: JSON.parse(agent.security_certifications || "[]"),
    },
    transparency: {
      open_source: !!agent.transparency_open_source,
      code_repository: agent.transparency_code_repo,
      documentation_url: agent.transparency_docs_url,
    },
    verified: !!agent.verified,
    verification_level: agent.verification_level,
    // Persisted result of the most recent did:wba resolution check.
    // null = creator isn't a did:wba (the field is N/A). For did:wba creators,
    // true/false reflects whether the agent's did.json was fetchable at the
    // last check. Refreshed weekly by the scheduled cron.
    did_wba_resolved: agent.did_wba_resolved === null ? null : !!agent.did_wba_resolved,
    did_wba_last_checked_at: agent.did_wba_last_checked_at,
    is_demo: !!agent.is_demo,
    status: agent.status,
    created: agent.created_at,
    updated: agent.updated_at,
    trust_score: agent.total_score,
    trust_grade: agent.grade,
    components: {
      provenance: agent.provenance,
      behavioral: agent.behavioral,
      transparency: agent.transparency,
      security: agent.security,
      peer_attestations: agent.peer_attestations,
    },
  });
}

// W3C DID Core-shaped DID document for an AIR-registered agent.
// Returns 404 if the agent has no public_key on file (no key = nothing to publish).
// The "id" is AIR's minted DID for this agent; if the agent registered with a
// different creator_did (e.g. did:key, did:wba on their own domain), that DID
// is included under "alsoKnownAs" — W3C-standard way to link equivalent DIDs.
// Public, no auth, cacheable for 5 minutes at the edge.
async function getDidDocument(airId, db) {
  const agent = await db.prepare(
    "SELECT air_id, creator_did, public_key, name FROM agents WHERE air_id = ? AND status = 'active'"
  ).bind(airId).first();

  if (!agent) {
    return json({ error: "Agent not found", air_id: airId }, 404);
  }
  if (!agent.public_key) {
    return json({
      error: "Agent has no public key on file; DID document not available.",
      air_id: airId,
      hint: "Register with a public_key field (Ed25519, base64url) to enable DID document resolution.",
    }, 404);
  }

  const airDid = `did:wba:agentidentityregistry.org:agents:${airId}`;
  const publicKeyMultibase = ed25519ToMultibase(agent.public_key);
  const trustScoreUrl = `https://agentidentityregistry.org/api/v1/agents/${airId}/trust-score`;

  // alsoKnownAs only included if the agent's creator_did differs from the AIR-minted DID.
  const alsoKnownAs = agent.creator_did && agent.creator_did !== airDid ? [agent.creator_did] : undefined;

  const doc = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: airDid,
    alsoKnownAs,
    verificationMethod: [
      {
        id: `${airDid}#key-1`,
        type: "Ed25519VerificationKey2020",
        controller: airDid,
        publicKeyMultibase,
      },
    ],
    authentication: [`${airDid}#key-1`],
    assertionMethod: [`${airDid}#key-1`],
    service: [
      {
        id: `${airDid}#trust-score`,
        type: "AIRTrustScore",
        serviceEndpoint: trustScoreUrl,
      },
    ],
  };

  // Cache at the edge for 5 minutes (DID docs are slow-changing).
  return json(doc, 200, { "Cache-Control": "public, max-age=300" });
}

async function getTrustScore(airId, db) {
  const score = await db.prepare(
    "SELECT * FROM trust_scores WHERE air_id = ?"
  ).bind(airId).first();

  if (!score) {
    return json({ error: "Trust score not found", air_id: airId }, 404);
  }

  return json({
    air_id: airId,
    total_score: score.total_score,
    grade: score.grade,
    components: {
      provenance: score.provenance,
      behavioral: score.behavioral,
      transparency: score.transparency,
      security: score.security,
      peer_attestations: score.peer_attestations,
    },
    calculated_at: score.calculated_at,
  });
}

async function listAgents(url, db) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const { results } = await db.prepare(
    "SELECT a.air_id, a.name, a.description, a.verified, a.verification_level, a.is_demo, a.created_at, t.total_score, t.grade FROM agents a LEFT JOIN trust_scores t ON a.air_id = t.air_id WHERE a.status = 'active' ORDER BY t.total_score DESC LIMIT ? OFFSET ?"
  ).bind(limit, offset).all();

  const countRow = await db.prepare(
    "SELECT COUNT(*) as total FROM agents WHERE status = 'active'"
  ).first();

  return json({
    agents: results.map((r) => ({
      air_id: r.air_id,
      name: r.name,
      description: r.description,
      verified: !!r.verified,
      verification_level: r.verification_level,
      is_demo: !!r.is_demo,
      trust_score: r.total_score,
      trust_grade: r.grade,
      created: r.created_at,
    })),
    total: countRow.total,
    limit,
    offset,
  });
}

async function registerAgent(request, db) {
  // Rate limit check
  const rateLimited = await checkRateLimit(request, db, "register");
  if (rateLimited) return rateLimited;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Validate required fields
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return json({ error: "Field 'name' is required" }, 400);
  }
  // Either creator_did OR public_key is required (Step 6).
  // - creator_did present: caller controls the DID elsewhere (did:key, did:wba, did:web, etc.)
  // - creator_did absent + public_key present: AIR mints a did:wba pointing at this registry
  // - both absent: 400 — we need at least one identity anchor
  const hasCreatorDid = body.creator_did && typeof body.creator_did === "string" && body.creator_did.trim().length > 0;
  const hasPublicKey = body.public_key && typeof body.public_key === "string" && body.public_key.trim().length > 0;
  if (!hasCreatorDid && !hasPublicKey) {
    return json({
      error: "Either 'creator_did' or 'public_key' is required. If you don't have a domain, omit creator_did and AIR will mint a did:wba for you (your public_key anchors the identity).",
    }, 400);
  }

  // Sanitize inputs
  const name = body.name.trim().slice(0, 200);
  const description = (body.description || "").trim().slice(0, 2000);
  // creatorDid is `let` (not const) so it can be reassigned later when AIR mints a did:wba
  // for keyless agents (when the caller omitted creator_did but provided public_key).
  let creatorDid = hasCreatorDid ? body.creator_did.trim().slice(0, 500) : "";
  const creatorName = (body.creator_name || "").trim().slice(0, 200);
  const creatorType = ["individual", "organization"].includes(body.creator_type) ? body.creator_type : "individual";
  const capabilities = JSON.stringify((body.capabilities || []).slice(0, 20));
  const securityCerts = JSON.stringify((body.security_certifications || []).slice(0, 10));
  const openSource = body.open_source ? 1 : 0;
  const codeRepo = (body.code_repository || "").trim().slice(0, 500);
  const docsUrl = (body.documentation_url || "").trim().slice(0, 500);

  // did:wba validation + resolution (Strict Mom policy)
  // - If creator_did is a did:wba, format MUST be valid (hard-reject on bad format)
  // - Resolution is best-effort: never blocks registration on resolution failure
  // - Non-did:wba creator_did (did:key, did:web, etc.) is unaffected
  let didWbaResolved; // undefined for non-did:wba registrations
  if (isDidWba(creatorDid)) {
    const validation = validateDidWba(creatorDid);
    if (!validation.valid) {
      return json({ error: "Invalid did:wba: " + validation.error }, 400);
    }
    const resolution = await resolveDidWba(creatorDid);
    didWbaResolved = resolution.resolved;
  }

  // Public key validation (optional field, required when creator is did:wba)
  // - If provided: must be valid Ed25519 (base64url, 32 bytes decoded)
  // - If creator is did:wba: public_key is REQUIRED (did:wba IDs don't embed
  //   keys; without one, signatures cannot be verified)
  // - did:key creators may omit this — their key is encoded in the DID itself
  const publicKey = body.public_key ? String(body.public_key).trim() : null;
  if (publicKey) {
    const keyValidation = validatePublicKey(publicKey);
    if (!keyValidation.valid) {
      return json({ error: "Invalid public_key: " + keyValidation.error }, 400);
    }
  }
  if (isDidWba(creatorDid) && !publicKey) {
    return json({
      error: "did:wba creator_did requires a public_key field (Ed25519, base64url-encoded). did:key creators can omit this.",
    }, 400);
  }

  // Check for duplicate names (warn, don't block)
  const nameMatch = await db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE LOWER(name) = LOWER(?) AND status = 'active'"
  ).bind(name).first();
  const duplicateNameCount = nameMatch.count;

  // Generate AIR ID
  // AIR ID generation. The identity hash anchors on creator_did when present, or on
  // public_key when creator_did is absent (we still need a uniqueness contributor
  // beyond name + timestamp to avoid collision on rapid registrations).
  const identityDoc = creatorDid
    ? { name, description, creator_did: creatorDid, timestamp: new Date().toISOString() }
    : { name, description, public_key: publicKey, timestamp: new Date().toISOString() };
  const airId = await generateAirId(identityDoc);

  // Step 6: AIR-issued did:wba for keyless agents.
  // If creator_did was not supplied, mint one now that we have the AIR ID.
  // The minted DID points back at this registry and resolves at /agents/{air_id}/did-document.
  // The agent's identity is anchored by their public_key, which the DID document publishes.
  const airMintedDid = !creatorDid;
  if (airMintedDid) {
    creatorDid = `did:wba:agentidentityregistry.org:agents:${airId}`;
  }

  // Check for collision (extremely unlikely)
  const existing = await db.prepare("SELECT air_id FROM agents WHERE air_id = ?").bind(airId).first();
  if (existing) {
    return json({ error: "ID collision, please retry" }, 409);
  }

  const now = new Date().toISOString();

  // Generate per-agent secret for future PUT auth.
  // Plaintext is returned in the 201 response below and never stored — only its SHA-256
  // hash is persisted. If the caller loses the secret, the only recovery path is admin
  // DELETE + re-register. This matches the "API key shown once" pattern from Stripe, OpenAI, etc.
  const agentSecret = generateAgentSecret();
  const agentSecretHash = await sha256Hex(agentSecret);

  // Insert agent
  // did_wba_resolved is persisted only when the creator IS a did:wba (otherwise
  // the field is meaningless — NULL). did_wba_last_checked_at mirrors it: NULL
  // unless we actually checked. The weekly cron refreshes both for did:wba rows.
  const didWbaResolvedCol = isDidWba(creatorDid) ? (didWbaResolved ? 1 : 0) : null;
  const didWbaCheckedAtCol = isDidWba(creatorDid) ? now : null;
  await db.prepare(
    `INSERT INTO agents (air_id, name, description, creator_did, creator_name, creator_type, capabilities, security_certifications, transparency_open_source, transparency_code_repo, transparency_docs_url, verification_level, verified, status, created_at, updated_at, public_key, agent_secret_hash, did_wba_resolved, did_wba_last_checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'self-verified', 0, 'active', ?, ?, ?, ?, ?, ?)`
  ).bind(airId, name, description, creatorDid, creatorName, creatorType, capabilities, securityCerts, openSource, codeRepo, docsUrl, now, now, publicKey, agentSecretHash, didWbaResolvedCol, didWbaCheckedAtCol).run();

  // Calculate and insert trust score
  const agentRow = {
    creator_did: creatorDid,
    creator_name: creatorName,
    creator_type: creatorType,
    transparency_open_source: openSource,
    transparency_code_repo: codeRepo,
    transparency_docs_url: docsUrl,
    security_certifications: securityCerts,
  };
  const score = calculateInitialTrustScore(agentRow);

  await db.prepare(
    `INSERT INTO trust_scores (air_id, total_score, grade, provenance, behavioral, transparency, security, peer_attestations, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(airId, score.total_score, score.grade, score.provenance, score.behavioral, score.transparency, score.security, score.peer_attestations, now).run();

  const warnings = [];
  if (duplicateNameCount > 0) {
    warnings.push("An agent named '" + name + "' already exists (" + duplicateNameCount + " existing). Your agent has been assigned a unique AIR ID.");
  }

  return json({
    air_id: airId,
    name,
    creator_did: creatorDid, // echoed for clarity; may be AIR-minted (see air_minted_did flag)
    air_minted_did: airMintedDid || undefined, // true when AIR generated the did:wba; omitted otherwise
    status: "active",
    verification_level: "self-verified",
    trust_score: score.total_score,
    trust_grade: score.grade,
    created: now,
    public_key: publicKey || undefined, // omit from response when not provided
    did_wba_resolved: didWbaResolved, // undefined for non-did:wba creators; true/false otherwise
    agent_secret: agentSecret, // SAVE THIS — shown only at registration, required for PUT updates
    agent_secret_note: "Store agent_secret securely. It is required to update this agent's record (PUT /agents/" + airId + ") via the X-Agent-Secret header. This value is not retrievable later — if lost, the only recovery is admin DELETE + re-register.",
    warnings: warnings.length > 0 ? warnings : undefined,
    message: "Agent registered successfully. Submit verification documents to upgrade trust level.",
  }, 201);
}

// ============================================================
// UPDATE AGENT
// ============================================================

async function updateAgent(request, airId, db) {
  // Verify agent exists
  const existing = await db.prepare("SELECT * FROM agents WHERE air_id = ? AND status = 'active'").bind(airId).first();
  if (!existing) {
    return json({ error: "Agent not found", air_id: airId }, 404);
  }

  // Authentication: require X-Agent-Secret matching the stored hash.
  // Constant-time comparison prevents timing-side-channel attacks.
  const providedSecret = request.headers.get("X-Agent-Secret");
  if (!providedSecret) {
    return json({ error: "Missing X-Agent-Secret header. Updates require the secret returned at registration." }, 401);
  }
  if (!existing.agent_secret_hash) {
    // Legacy seed agents predate Step 4 — no stored secret to compare against.
    return json({ error: "Agent has no PUT auth secret on file (legacy agent). Contact admin." }, 401);
  }
  const providedHash = await sha256Hex(providedSecret);
  if (!constantTimeEquals(providedHash, existing.agent_secret_hash)) {
    return json({ error: "Invalid agent secret" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Only allow updating specific fields
  const updates = [];
  const binds = [];

  if (body.description !== undefined) {
    updates.push("description = ?");
    binds.push(String(body.description).trim().slice(0, 2000));
  }
  if (body.capabilities !== undefined && Array.isArray(body.capabilities)) {
    updates.push("capabilities = ?");
    binds.push(JSON.stringify(body.capabilities.slice(0, 20)));
  }
  if (body.security_certifications !== undefined && Array.isArray(body.security_certifications)) {
    updates.push("security_certifications = ?");
    binds.push(JSON.stringify(body.security_certifications.slice(0, 10)));
  }
  if (body.open_source !== undefined) {
    updates.push("transparency_open_source = ?");
    binds.push(body.open_source ? 1 : 0);
  }
  if (body.code_repository !== undefined) {
    updates.push("transparency_code_repo = ?");
    binds.push(String(body.code_repository).trim().slice(0, 500));
  }
  if (body.documentation_url !== undefined) {
    updates.push("transparency_docs_url = ?");
    binds.push(String(body.documentation_url).trim().slice(0, 500));
  }
  if (updates.length === 0) {
    return json({ error: "No valid fields to update. Updatable fields: description, capabilities, security_certifications, open_source, code_repository, documentation_url" }, 400);
  }

  const now = new Date().toISOString();
  updates.push("updated_at = ?");
  binds.push(now);
  binds.push(airId);

  await db.prepare(
    "UPDATE agents SET " + updates.join(", ") + " WHERE air_id = ?"
  ).bind(...binds).run();

  // Recalculate trust score with updated data
  const updated = await db.prepare("SELECT * FROM agents WHERE air_id = ?").bind(airId).first();
  const score = calculateInitialTrustScore(updated);

  await db.prepare(
    "UPDATE trust_scores SET total_score = ?, grade = ?, provenance = ?, behavioral = ?, transparency = ?, security = ?, peer_attestations = ?, calculated_at = ? WHERE air_id = ?"
  ).bind(score.total_score, score.grade, score.provenance, score.behavioral, score.transparency, score.security, score.peer_attestations, now, airId).run();

  return json({
    air_id: airId,
    updated_fields: updates.length - 1, // exclude updated_at
    trust_score: score.total_score,
    trust_grade: score.grade,
    updated: now,
    message: "Agent updated successfully.",
  });
}

// ============================================================
// DELETE AGENT (admin only)
// ============================================================

async function deleteAgent(airId, db) {
  const existing = await db.prepare("SELECT air_id, name FROM agents WHERE air_id = ? AND status = 'active'").bind(airId).first();
  if (!existing) {
    return json({ error: "Agent not found", air_id: airId }, 404);
  }

  // Soft delete — set status to 'deleted' rather than removing the row
  const now = new Date().toISOString();
  await db.prepare(
    "UPDATE agents SET status = 'deleted', updated_at = ? WHERE air_id = ?"
  ).bind(now, airId).run();

  return json({
    air_id: airId,
    name: existing.name,
    status: "deleted",
    deleted_at: now,
    message: "Agent deleted (soft delete). Data retained for audit purposes.",
  });
}

// ============================================================
// NAME CHECK
// ============================================================

async function checkName(url, db) {
  const name = (url.searchParams.get("name") || "").trim();
  if (!name) return json({ error: "Query parameter 'name' is required" }, 400);

  const match = await db.prepare(
    "SELECT air_id, name FROM agents WHERE LOWER(name) = LOWER(?) AND status = 'active' LIMIT 5"
  ).bind(name).all();

  return json({
    name: name,
    exists: match.results.length > 0,
    count: match.results.length,
    existing_agents: match.results.map(function(r) { return { air_id: r.air_id, name: r.name }; }),
  });
}

// ADMIN ENDPOINTS (API key protected)
// ============================================================

async function adminAuth(request, env) {
  const key = new URL(request.url).searchParams.get("key") ||
    request.headers.get("X-Admin-Key");
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return json({ error: "Unauthorized" }, 401);
  }
  return null; // null means auth passed
}

async function adminStats(db) {
  const total = await db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'active'").first();
  const verified = await db.prepare("SELECT COUNT(*) as count FROM agents WHERE verified = 1").first();
  const unverified = await db.prepare("SELECT COUNT(*) as count FROM agents WHERE verified = 0").first();
  const demoCount = await db.prepare("SELECT COUNT(*) as count FROM agents WHERE is_demo = 1").first();
  const realCount = await db.prepare("SELECT COUNT(*) as count FROM agents WHERE is_demo = 0 AND status = 'active'").first();

  const gradeDistribution = await db.prepare(
    "SELECT t.grade, COUNT(*) as count FROM trust_scores t JOIN agents a ON t.air_id = a.air_id WHERE a.status = 'active' GROUP BY t.grade ORDER BY t.total_score DESC"
  ).all();

  const recentCount = await db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE created_at > datetime('now', '-7 days')"
  ).first();

  const avgScore = await db.prepare(
    "SELECT ROUND(AVG(t.total_score)) as avg_score FROM trust_scores t JOIN agents a ON t.air_id = a.air_id WHERE a.status = 'active'"
  ).first();

  return json({
    total_agents: total.count,
    real_agents: realCount.count,
    demo_agents: demoCount.count,
    verified: verified.count,
    unverified: unverified.count,
    registered_last_7_days: recentCount.count,
    average_trust_score: avgScore.avg_score,
    grade_distribution: (gradeDistribution.results || []).reduce((acc, r) => {
      acc[r.grade] = r.count;
      return acc;
    }, {}),
  });
}

async function adminRecent(url, db) {
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

  const { results } = await db.prepare(
    `SELECT a.air_id, a.name, a.creator_did, a.creator_name, a.creator_type,
            a.verification_level, a.verified, a.is_demo, a.created_at,
            t.total_score, t.grade
     FROM agents a
     LEFT JOIN trust_scores t ON a.air_id = t.air_id
     WHERE a.status = 'active'
     ORDER BY a.created_at DESC
     LIMIT ?`
  ).bind(limit).all();

  return json({
    recent_registrations: results.map((r) => ({
      air_id: r.air_id,
      name: r.name,
      creator_did: r.creator_did,
      creator_name: r.creator_name || "(none)",
      creator_type: r.creator_type,
      verified: !!r.verified,
      is_demo: !!r.is_demo,
      verification_level: r.verification_level,
      trust_score: r.total_score,
      trust_grade: r.grade,
      registered: r.created_at,
    })),
    count: results.length,
  });
}

// ============================================================
// WEEKLY did:wba RE-RESOLUTION
// ============================================================
// Runs from two places:
//   * `scheduled()` — fires every Sunday 03:00 UTC per wrangler.toml's
//     [triggers] crons. No request, no caller, no laptop required.
//   * `POST /api/v1/admin/cron/did-wba-resolve` (admin auth) — manual
//     trigger for backfills + testing.
//
// Walks every active agent whose creator_did is a did:wba, re-resolves
// the agent's did.json over HTTP, and updates `did_wba_resolved` +
// `did_wba_last_checked_at` in the DB. Best-effort: failures on one
// agent never sink the batch.
//
// Concurrency: small batches via Promise.allSettled. Avoids fanning out
// hundreds of fetches simultaneously while keeping wall-clock reasonable.

const DID_WBA_CRON_BATCH = 5;

async function reResolveAllDidWba(db) {
  const startedAt = Date.now();

  const { results: agents } = await db.prepare(
    `SELECT air_id, creator_did
     FROM agents
     WHERE status = 'active' AND creator_did LIKE 'did:wba:%'`
  ).all();

  const summary = {
    total: agents.length,
    resolved: 0,
    unresolved: 0,
    write_errors: 0,
  };

  for (let i = 0; i < agents.length; i += DID_WBA_CRON_BATCH) {
    const batch = agents.slice(i, i + DID_WBA_CRON_BATCH);
    // allSettled because resolveDidWba returns {resolved: false, ...} on
    // failure — it shouldn't throw, but defensive: a rejected promise here
    // would otherwise crash the whole cron run.
    const results = await Promise.allSettled(
      batch.map((a) => resolveDidWba(a.creator_did))
    );

    const now = new Date().toISOString();
    for (let j = 0; j < batch.length; j++) {
      const agent = batch[j];
      const settled = results[j];
      const resolvedBool =
        settled.status === "fulfilled" ? !!settled.value.resolved : false;
      if (resolvedBool) summary.resolved++;
      else summary.unresolved++;

      try {
        await db.prepare(
          `UPDATE agents
           SET did_wba_resolved = ?, did_wba_last_checked_at = ?
           WHERE air_id = ?`
        ).bind(resolvedBool ? 1 : 0, now, agent.air_id).run();
      } catch (err) {
        // Don't let one bad row sink the run; surface in summary for the
        // operator (visible via `wrangler tail` or the admin endpoint).
        summary.write_errors++;
        console.error(
          `[did-wba-cron] DB write failed for ${agent.air_id}:`,
          err && err.message || err
        );
      }
    }
  }

  summary.duration_ms = Date.now() - startedAt;
  summary.completed_at = new Date().toISOString();
  console.log(
    `[did-wba-cron] ${summary.total} agents in ${summary.duration_ms}ms ` +
    `— resolved=${summary.resolved} unresolved=${summary.unresolved} ` +
    `write_errors=${summary.write_errors}`
  );
  return summary;
}

// Admin-endpoint wrapper around the cron — returns the run summary as JSON
// so operators can verify the trigger fired correctly.
async function runDidWbaResolveCron(db) {
  const summary = await reResolveAllDidWba(db);
  return json({
    triggered: "manual",
    ...summary,
  });
}
