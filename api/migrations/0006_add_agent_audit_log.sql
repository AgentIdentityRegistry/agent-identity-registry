-- Append-only, hash-chained audit log of agent-record changes (registry #5).
-- Single global chain: each entry's prev_hash = previous entry's entry_hash.
-- UNIQUE(prev_hash) makes the chain linear + race-safe (concurrent fork -> one
-- insert fails + its batch rolls back). Genesis uses the literal 'GENESIS'
-- (not NULL) so the constraint also covers the first entries.
CREATE TABLE IF NOT EXISTS agent_audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  air_id         TEXT NOT NULL,
  event          TEXT NOT NULL CHECK (event IN ('registered','updated','deleted','redacted')),
  changed_fields TEXT,
  actor          TEXT NOT NULL CHECK (actor IN ('registrant','owner','admin','system')),
  created_at     TEXT NOT NULL,
  prev_hash      TEXT NOT NULL UNIQUE,
  entry_hash     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_air_id ON agent_audit_log (air_id);
