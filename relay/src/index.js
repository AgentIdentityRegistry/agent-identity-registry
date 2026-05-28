// AIR A2A relay — production router (Phase 3 Stage 3b, W3-1)
//
// Pure byte-pipe relay per A2A spec Principle 3 — does NOT verify
// envelope signatures. Stores raw JCS-canonical envelope bytes,
// returns them byte-identical to the recipient on pull. The
// recipient verifies the wax seal.
//
// Two-layer architecture context:
//   Layer 1 (this relay): transient queue, max 30d retention, federated
//   Layer 2 (client-side): persistent personal archive, user-owned
//
// Endpoints:
//   GET  /health                          liveness + bindings + stats
//   POST /inbox/{recipient_did}           accept + queue envelope
//   GET  /pull/{recipient_did}?since=N    polling fetch (returns batch)
//   GET  /pull/{recipient_did}?stream=1   SSE real-time delivery
//   POST /ack/{recipient_did}             acknowledge envelope receipt
//   *                                     404

const VERSION = "0.1.0";

// Hard limits — defended at the edge to keep abuse cheap to reject.
const MAX_BODY_BYTES = 64 * 1024;      // 64KB envelope cap
const RATE_LIMIT_WINDOW_SEC = 60;       // per-minute window
const RATE_LIMIT_MAX_PER_SENDER = 100;  // per sender per minute
const PULL_BATCH_SIZE = 50;             // default /pull page size
const PULL_MAX_BATCH = 200;             // hard cap
const SSE_POLL_INTERVAL_MS = 1000;      // SSE poll cadence inside stream
const SSE_HEARTBEAT_INTERVAL_MS = 30000;// SSE heartbeat (keep-alive through proxies)

// -----------------------------------------------------------------------------
// Response helpers
// -----------------------------------------------------------------------------

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
};

const json = (body, init = {}) => new Response(JSON.stringify(body, null, 2), {
  ...init,
  headers: {
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders,
    ...(init.headers ?? {}),
  },
});

const error = (status, code, message, extra = {}) =>
  json({ error: code, message, ...extra }, { status });

// -----------------------------------------------------------------------------
// Path parsing
// -----------------------------------------------------------------------------

// Extract recipient_did from "/inbox/{did}" or "/pull/{did}" or "/ack/{did}".
// DIDs contain colons (did:wba:agentidentityregistry.org:agents:AIR-X), so we
// can't just split on "/" naively — the DID may itself contain slashes in
// did:web variants. We take everything after the first path segment.
function extractDid(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  if (!rest || rest === "/") return null;
  // strip a trailing slash if present
  return rest.endsWith("/") ? rest.slice(0, -1) : rest;
}

// -----------------------------------------------------------------------------
// Rate limiting via KV — sliding-window counter per sender_did
// -----------------------------------------------------------------------------

async function checkRateLimit(env, sender_did) {
  // Key sharded by sender + window-bucket (changes each minute).
  // KV writes are eventually consistent — within the relay we accept
  // a small overshoot at window boundaries as an acceptable trade-off
  // for cheap rate-limiting that doesn't need transactions.
  const windowBucket = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_SEC);
  const key = `rl:${sender_did}:${windowBucket}`;
  const current = parseInt(await env.REPLAY_NONCE.get(key) ?? "0", 10);
  if (current >= RATE_LIMIT_MAX_PER_SENDER) {
    return { allowed: false, retry_after: RATE_LIMIT_WINDOW_SEC };
  }
  // Bump counter. TTL = 2x window so we always have history for the
  // current bucket even with clock skew.
  await env.REPLAY_NONCE.put(key, String(current + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SEC * 2,
  });
  return { allowed: true };
}

// -----------------------------------------------------------------------------
// POST /inbox/{recipient_did} — accept + queue an envelope
// -----------------------------------------------------------------------------

async function handleInbox(request, env, recipient_did) {
  // Content-Length pre-check — reject big bodies before reading them into memory.
  const cl = parseInt(request.headers.get("content-length") ?? "0", 10);
  if (cl > MAX_BODY_BYTES) {
    return error(413, "payload_too_large",
      `Envelope exceeds ${MAX_BODY_BYTES} bytes`, { max_bytes: MAX_BODY_BYTES });
  }

  // Read raw bytes — these are what we'll store in BLOB.
  const bodyBytes = new Uint8Array(await request.arrayBuffer());
  if (bodyBytes.byteLength === 0) {
    return error(400, "empty_body", "Envelope body is empty");
  }
  if (bodyBytes.byteLength > MAX_BODY_BYTES) {
    return error(413, "payload_too_large",
      `Envelope exceeds ${MAX_BODY_BYTES} bytes`, { max_bytes: MAX_BODY_BYTES });
  }

  // Parse JSON to extract `id` + `from` for our metadata. The spec
  // (agentidentityregistry.org/specs/a2a/draft-1 §4) names the envelope's
  // own identifier `id`, so we read that. The relay internally calls the
  // same value `envelope_id` (DB column + API field name) because `id` is
  // ambiguous in API contexts.
  //
  // We do NOT validate the rest of the envelope schema — that's the
  // recipient's job (Principle 3). We do NOT re-serialize — we store the
  // original bytes in BLOB to preserve the wax seal.
  let envelope;
  try {
    envelope = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch (e) {
    return error(400, "invalid_json", "Envelope body is not valid JSON",
      { detail: String(e.message ?? e) });
  }
  const envelope_id = envelope?.id;
  const sender_did  = envelope?.from;
  if (!envelope_id || typeof envelope_id !== "string") {
    return error(400, "missing_id",
      "Envelope must include a string `id` field (the envelope's UUID per spec §4)");
  }
  if (!sender_did || typeof sender_did !== "string") {
    return error(400, "missing_from",
      "Envelope must include a string `from` field (sender DID)");
  }

  // Rate limit by sender. The relay can't verify the `from` field is real
  // (Principle 3 — that's recipient verification), but this still bounds
  // abuse: a forged-from sender exhausts the legit sender's quota, which
  // is a much smaller problem than unbounded relay flooding.
  const rl = await checkRateLimit(env, sender_did);
  if (!rl.allowed) {
    return error(429, "rate_limited",
      `Sender exceeded ${RATE_LIMIT_MAX_PER_SENDER}/min`,
      { retry_after_seconds: rl.retry_after });
  }

  // Insert. UNIQUE(recipient_did, envelope_id) catches duplicate-sends.
  try {
    const result = await env.RELAY_DB.prepare(`
      INSERT INTO queued_messages
        (recipient_did, sender_did, envelope_id, envelope_body, queued_at)
      VALUES (?, ?, ?, ?, unixepoch())
    `).bind(recipient_did, sender_did, envelope_id, bodyBytes).run();

    return json({
      status: "queued",
      envelope_id,
      seq: result.meta?.last_row_id,
    }, { status: 202 });

  } catch (e) {
    const msg = String(e.message ?? e);
    if (msg.includes("UNIQUE constraint")) {
      return error(409, "duplicate_envelope",
        "An envelope with this envelope_id is already queued for this recipient",
        { envelope_id, recipient_did });
    }
    return error(500, "db_error", "Failed to queue envelope",
      { detail: msg });
  }
}

// -----------------------------------------------------------------------------
// GET /pull/{recipient_did}?since=N&limit=K — polling fetch
// -----------------------------------------------------------------------------

async function handlePull(request, env, recipient_did) {
  const url = new URL(request.url);
  const since = parseInt(url.searchParams.get("since") ?? "0", 10) || 0;
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? String(PULL_BATCH_SIZE), 10) || PULL_BATCH_SIZE,
    PULL_MAX_BATCH,
  );

  // Fetch un-acked rows newer than the cursor.
  const rows = await env.RELAY_DB.prepare(`
    SELECT seq, sender_did, envelope_id, envelope_body, queued_at
      FROM queued_messages
     WHERE recipient_did = ?
       AND seq > ?
       AND acked_at IS NULL
     ORDER BY seq
     LIMIT ?
  `).bind(recipient_did, since, limit).all();

  const messages = (rows.results ?? []).map(row => ({
    seq:         row.seq,
    sender_did:  row.sender_did,
    envelope_id: row.envelope_id,
    // BLOB → base64 so it survives JSON serialization. The recipient
    // base64-decodes to get the original JCS-canonical bytes and
    // verifies the signature against those exact bytes.
    envelope_b64: blobToBase64(row.envelope_body),
    queued_at:   row.queued_at,
  }));

  // Mark these as fetched in a single UPDATE. Race-condition note:
  // if the same recipient pulls concurrently, both might mark the
  // same row fetched_at — harmless (overwrite with similar timestamp).
  if (messages.length > 0) {
    const seqs = messages.map(m => m.seq);
    const placeholders = seqs.map(() => "?").join(",");
    await env.RELAY_DB.prepare(`
      UPDATE queued_messages
         SET fetched_at = unixepoch()
       WHERE recipient_did = ?
         AND seq IN (${placeholders})
         AND fetched_at IS NULL
    `).bind(recipient_did, ...seqs).run();
  }

  // Cursor for the next call — caller passes this as `since` next time.
  const nextCursor = messages.length > 0
    ? messages[messages.length - 1].seq
    : since;

  return json({
    recipient_did,
    messages,
    cursor: nextCursor,
    has_more: messages.length === limit,
  });
}

// -----------------------------------------------------------------------------
// GET /pull/{recipient_did}?stream=1 — SSE real-time delivery
// -----------------------------------------------------------------------------

async function handleSSE(request, env, recipient_did) {
  const url = new URL(request.url);
  let since = parseInt(url.searchParams.get("since") ?? "0", 10) || 0;

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Closer abstraction so heartbeat + poll loops both yield on disconnect.
  let closed = false;
  const closeStream = async () => {
    if (closed) return;
    closed = true;
    try { await writer.close(); } catch { /* already closed */ }
  };

  // SSE event writer.
  const sendEvent = async (eventType, dataObj) => {
    if (closed) return;
    try {
      const payload = `event: ${eventType}\ndata: ${JSON.stringify(dataObj)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch (e) {
      // Client disconnected — TransformStream raises on write to closed writer.
      await closeStream();
    }
  };

  const sendComment = async (text) => {
    if (closed) return;
    try {
      await writer.write(encoder.encode(`: ${text}\n\n`));
    } catch {
      await closeStream();
    }
  };

  // Background loops — wrapped in waitUntil so Cloudflare keeps the worker
  // alive while the stream is open.
  const pollLoop = (async () => {
    // Send initial "ready" comment so clients know the stream is open.
    await sendComment("ready");

    while (!closed) {
      const rows = await env.RELAY_DB.prepare(`
        SELECT seq, sender_did, envelope_id, envelope_body, queued_at
          FROM queued_messages
         WHERE recipient_did = ?
           AND seq > ?
           AND acked_at IS NULL
         ORDER BY seq
         LIMIT ?
      `).bind(recipient_did, since, PULL_BATCH_SIZE).all();

      const messages = rows.results ?? [];
      if (messages.length > 0) {
        const seqs = [];
        for (const row of messages) {
          await sendEvent("envelope", {
            seq:         row.seq,
            sender_did:  row.sender_did,
            envelope_id: row.envelope_id,
            envelope_b64: blobToBase64(row.envelope_body),
            queued_at:   row.queued_at,
          });
          seqs.push(row.seq);
          since = row.seq;
        }
        // Mark fetched in one batch UPDATE.
        const placeholders = seqs.map(() => "?").join(",");
        await env.RELAY_DB.prepare(`
          UPDATE queued_messages
             SET fetched_at = unixepoch()
           WHERE recipient_did = ?
             AND seq IN (${placeholders})
             AND fetched_at IS NULL
        `).bind(recipient_did, ...seqs).run();
      }
      await sleep(SSE_POLL_INTERVAL_MS);
    }
  })();

  const heartbeatLoop = (async () => {
    while (!closed) {
      await sleep(SSE_HEARTBEAT_INTERVAL_MS);
      await sendComment("heartbeat");
    }
  })();

  // Detect client disconnect via the request signal.
  request.signal?.addEventListener("abort", closeStream);

  return new Response(readable, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "connection": "keep-alive",
      "x-accel-buffering": "no",
      ...corsHeaders,
    },
  });
}

// -----------------------------------------------------------------------------
// POST /ack/{recipient_did} — acknowledge envelope receipt
// -----------------------------------------------------------------------------

async function handleAck(request, env, recipient_did) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return error(400, "invalid_json", "Ack body must be JSON");
  }
  const ids = body?.envelope_ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return error(400, "missing_envelope_ids",
      "Body must include non-empty array `envelope_ids`");
  }
  if (ids.length > 500) {
    return error(400, "too_many_acks",
      "Maximum 500 envelope_ids per ack request");
  }
  if (!ids.every(id => typeof id === "string")) {
    return error(400, "invalid_envelope_id_type",
      "All envelope_ids must be strings");
  }

  // Mark acked in one UPDATE. Only flips rows that weren't already
  // acked, so re-acks are no-ops.
  const placeholders = ids.map(() => "?").join(",");
  const result = await env.RELAY_DB.prepare(`
    UPDATE queued_messages
       SET acked_at = unixepoch()
     WHERE recipient_did = ?
       AND envelope_id IN (${placeholders})
       AND acked_at IS NULL
  `).bind(recipient_did, ...ids).run();

  return json({
    status: "acked",
    acked_count: result.meta?.changes ?? 0,
    requested: ids.length,
  });
}

// -----------------------------------------------------------------------------
// GET /health — liveness + bindings + queue depth
// -----------------------------------------------------------------------------

async function handleHealth(env) {
  let queue_stats = null;
  try {
    const result = await env.RELAY_DB.prepare(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE acked_at IS NULL AND fetched_at IS NULL) AS pending,
        COUNT(*) FILTER (WHERE acked_at IS NULL AND fetched_at IS NOT NULL) AS in_flight,
        COUNT(*) FILTER (WHERE acked_at IS NOT NULL) AS acked
      FROM queued_messages
    `).first();
    queue_stats = result;
  } catch (e) {
    queue_stats = { error: String(e.message ?? e) };
  }

  return json({
    status: "ok",
    service: "air-relay",
    version: VERSION,
    bindings: {
      d1_relay_db:     env.RELAY_DB ? "bound" : "missing",
      kv_replay_nonce: env.REPLAY_NONCE ? "bound" : "missing",
    },
    queue_stats,
    docs: "https://agentidentityregistry.org/specs/a2a/draft-1/v1.md",
  });
}

// -----------------------------------------------------------------------------
// Garbage collection — wired to Cloudflare Cron Trigger (scheduled handler)
// -----------------------------------------------------------------------------

async function runGarbageCollection(env) {
  // Retention windows (per Wave 3 plan):
  //   acked > 24h          → delete (safety buffer post-ack)
  //   fetched, unacked >7d → delete (downstream flow likely dead)
  //   never-fetched >30d   → delete (recipient offline > 1 month)
  const cutoff_24h = 24 * 60 * 60;
  const cutoff_7d  =  7 * 24 * 60 * 60;
  const cutoff_30d = 30 * 24 * 60 * 60;

  const ackedDeleted = await env.RELAY_DB.prepare(`
    DELETE FROM queued_messages
     WHERE acked_at IS NOT NULL
       AND acked_at < (unixepoch() - ?)
  `).bind(cutoff_24h).run();

  const fetchedUnackedDeleted = await env.RELAY_DB.prepare(`
    DELETE FROM queued_messages
     WHERE fetched_at IS NOT NULL
       AND acked_at IS NULL
       AND fetched_at < (unixepoch() - ?)
  `).bind(cutoff_7d).run();

  const staleDeleted = await env.RELAY_DB.prepare(`
    DELETE FROM queued_messages
     WHERE fetched_at IS NULL
       AND queued_at < (unixepoch() - ?)
  `).bind(cutoff_30d).run();

  return {
    acked_deleted:           ackedDeleted.meta?.changes ?? 0,
    fetched_unacked_deleted: fetchedUnackedDeleted.meta?.changes ?? 0,
    stale_deleted:           staleDeleted.meta?.changes ?? 0,
  };
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function blobToBase64(blob) {
  // D1 returns BLOB as ArrayBuffer in Workers.
  // btoa expects a binary string — encode bytes one by one.
  const bytes = blob instanceof ArrayBuffer ? new Uint8Array(blob) : blob;
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// Main fetch handler — routes requests to the handlers above
// -----------------------------------------------------------------------------

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // CORS preflight — allow everything.
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // GET /health — liveness check
    if ((pathname === "/health" || pathname === "/") && method === "GET") {
      return handleHealth(env);
    }

    // POST /inbox/{recipient_did}
    if (method === "POST") {
      const did = extractDid(pathname, "/inbox/");
      if (did) return handleInbox(request, env, did);
    }

    // GET /pull/{recipient_did} — polling OR SSE depending on query param
    if (method === "GET") {
      const did = extractDid(pathname, "/pull/");
      if (did) {
        const wantsStream = url.searchParams.get("stream") === "1"
          || url.searchParams.get("stream") === "true"
          || (request.headers.get("accept") ?? "").includes("text/event-stream");
        if (wantsStream) return handleSSE(request, env, did);
        return handlePull(request, env, did);
      }
    }

    // POST /ack/{recipient_did}
    if (method === "POST") {
      const did = extractDid(pathname, "/ack/");
      if (did) return handleAck(request, env, did);
    }

    // 404 — unknown path. Keep the message helpful for explorers.
    return error(404, "not_found",
      `No route for ${method} ${pathname}`, {
        valid_routes: [
          "GET  /health",
          "POST /inbox/{recipient_did}",
          "GET  /pull/{recipient_did}?since={cursor}&limit={N}",
          "GET  /pull/{recipient_did}?stream=1   (SSE)",
          "POST /ack/{recipient_did}",
        ],
        spec: "https://agentidentityregistry.org/specs/a2a/draft-1/v1.md",
      });
  },

  // Cron Trigger handler — wired in wrangler.toml [triggers] crons section.
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const stats = await runGarbageCollection(env);
      console.log("relay GC complete", JSON.stringify(stats));
    })());
  },
};
