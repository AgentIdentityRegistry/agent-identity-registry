-- Migration 0007 — unique published username / @handle (Milestone G).
-- Adds a globally-unique, case-folded handle to agent records, claimed via the
-- authenticated PUT (X-Agent-Secret). First-come is enforced by the UNIQUE index
-- itself (no read-then-write TOCTOU). Legacy rows keep username = NULL and the partial
-- index excludes them so they never collide. A released handle is reserved for a
-- cooldown window via username_tombstones (changeable + cooldown policy: the original
-- owner may re-claim within the window; nobody else can claim it until it expires).

ALTER TABLE agents ADD COLUMN username TEXT;

-- Case-insensitive uniqueness — a bare UNIQUE is case-sensitive and would let
-- Alice/alice both be claimed. Partial WHERE skips the NULL legacy rows.
-- (Mirrors the partial-unique-index pattern in 0005.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_agents_username
  ON agents (LOWER(username)) WHERE username IS NOT NULL;

-- Released handles, reserved during the cooldown window.
-- username_normalized is the lowercased handle; PRIMARY KEY = unique + indexed.
CREATE TABLE IF NOT EXISTS username_tombstones (
  username_normalized TEXT PRIMARY KEY,
  released_by_air_id  TEXT NOT NULL,
  released_at         TEXT NOT NULL,
  username_display    TEXT
);
