-- AIR A2A relay — initial schema (Phase 3 Stage 3b / W3-1)
--
-- Purpose: transient store-and-forward queue for cross-internet
-- agent-to-agent messages. Per A2A spec Principle 3, the relay is a
-- pure byte pipe — it does NOT verify signatures. Recipients verify
-- on pull. Storage layer holds raw bytes only, untouched between
-- POST /inbox and GET /pull.
--
-- This is Layer 1 (transient). Persistent chat history is Layer 2
-- and lives client-side per agent (their local SQLite + their own
-- cloud backup). The relay never holds permanent history.
--
-- Architecture decisions baked in:
--   * `seq` auto-increment PK — monotonic cursor for `since` polling.
--     Cleaner than UUIDv7 because sender-side envelope_id is random
--     and useless for ordering.
--   * `envelope_body` stored as BLOB — preserves exact JCS-canonical
--     bytes so recipient signature verification matches. Storing as
--     TEXT could let SQLite normalize whitespace / encoding and break
--     the wax seal.
--   * `UNIQUE(recipient_did, envelope_id)` — catches accidental
--     duplicate-sends from the same sender to the same recipient
--     within the retention window. Returns 409 from POST /inbox.
--   * Retention via GC cron (see comment block below).

CREATE TABLE queued_messages (
  -- Monotonic insertion order — used as the `since` cursor on /pull.
  -- AUTOINCREMENT guarantees seq never reuses old values even after
  -- DELETE (SQLite would otherwise recycle gaps).
  seq            INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Recipient agent's DID. Shard key for all per-recipient queries.
  recipient_did  TEXT    NOT NULL,

  -- Sender agent's DID. Stored for rate-limit + audit. Note: the
  -- relay does NOT cryptographically verify this matches the envelope
  -- signer — that's the recipient's job (Principle 3).
  sender_did     TEXT    NOT NULL,

  -- Envelope's own UUID, assigned by sender. Recipient uses this in
  -- POST /ack/{did} body to confirm receipt. NOT the relay's primary
  -- key — see `seq` above.
  envelope_id    TEXT    NOT NULL,

  -- Raw JCS-canonical envelope bytes. MUST NOT be re-serialized,
  -- normalized, or mutated by the relay. Hand back to recipient
  -- byte-for-byte identical to what sender posted.
  envelope_body  BLOB    NOT NULL,

  -- Unix epoch seconds when the relay received this envelope.
  queued_at      INTEGER NOT NULL,

  -- Unix epoch seconds of the FIRST /pull that returned this message
  -- to the recipient. NULL until first delivery. Used for the
  -- "fetched-but-unacked" GC sweep.
  fetched_at     INTEGER,

  -- Unix epoch seconds when the recipient confirmed receipt via
  -- POST /ack. NULL until acked. Used to drop messages from /pull
  -- results AND to drive the "acked + safety buffer" GC sweep.
  acked_at       INTEGER,

  -- Prevent duplicate-send. Sender re-sending the same envelope_id
  -- to the same recipient within the retention window returns 409
  -- from /inbox (idempotent insert semantics).
  UNIQUE (recipient_did, envelope_id)
);

-- Polling cursor query: WHERE recipient_did = ? AND seq > ? AND acked_at IS NULL
-- Hot path — every /pull hits this index.
CREATE INDEX idx_recipient_seq ON queued_messages (recipient_did, seq);

-- GC sweep: WHERE acked_at IS NOT NULL AND acked_at < cutoff_24h.
-- Partial index keeps it small (only includes acked rows).
CREATE INDEX idx_acked_at ON queued_messages (acked_at)
  WHERE acked_at IS NOT NULL;

-- GC sweep: WHERE fetched_at IS NOT NULL AND acked_at IS NULL AND fetched_at < cutoff_7d.
-- Partial index — only "fetched but never acked" rows.
CREATE INDEX idx_fetched_unacked ON queued_messages (fetched_at)
  WHERE fetched_at IS NOT NULL AND acked_at IS NULL;

-- GC sweep: WHERE fetched_at IS NULL AND queued_at < cutoff_30d.
-- Covers "never fetched" stale messages (recipient offline > 30d).
CREATE INDEX idx_never_fetched ON queued_messages (queued_at)
  WHERE fetched_at IS NULL;

-- Retention policy (enforced by daily Cron Trigger, NOT by this schema):
--
--   acked_at IS NOT NULL AND acked_at < (now - 24h)
--     → DELETE. 24h buffer protects recipients whose local DB lost the
--       message and need to re-fetch.
--
--   fetched_at IS NOT NULL AND acked_at IS NULL AND fetched_at < (now - 7d)
--     → DELETE. Recipient picked it up but never confirmed; assume
--       their downstream flow died. 7d gives generous retry window.
--
--   fetched_at IS NULL AND queued_at < (now - 30d)
--     → DELETE. Recipient was offline > 30d — message is stale.
--
-- The Cron Trigger fires once per day at a low-traffic time and runs
-- these three DELETEs in a single transaction.
