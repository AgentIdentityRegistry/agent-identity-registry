-- AIR Registry Database Schema

CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  air_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  creator_did TEXT NOT NULL,
  creator_name TEXT,
  creator_type TEXT DEFAULT 'individual',
  capabilities TEXT DEFAULT '[]',
  security_certifications TEXT DEFAULT '[]',
  transparency_open_source INTEGER DEFAULT 0,
  transparency_code_repo TEXT,
  transparency_docs_url TEXT,
  verification_level TEXT DEFAULT 'self-verified',
  verified INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- Demo flag: seed/demo agents flagged so they can be filtered out of stats
  is_demo INTEGER DEFAULT 0,
  -- Ed25519 public key (base64url-encoded) for agents that sign their own attestations
  -- Required for BossClaw + did:wba-compatible agents; NULL for legacy demo agents
  public_key TEXT,
  -- SHA-256 hash of per-agent secret used for PUT auth on this agent's record
  -- NULL for legacy agents; populated at registration for new agents
  agent_secret_hash TEXT,
  -- did:wba resolution status — see migrations/0001_add_did_wba_status.sql
  -- NULL when creator isn't a did:wba; 1/0 when it is.
  did_wba_resolved INTEGER,
  did_wba_last_checked_at TEXT,
  -- Per-agent service endpoints for the DID document's service[] array.
  -- JSON array of {type, serviceEndpoint, id?} objects. NULL when the agent
  -- has not declared any; getDidDocument still returns the hardcoded
  -- AIRTrustScore entry on top of whatever this column adds.
  -- See migrations/0003_add_service_endpoints.sql (Phase 3 Stage 3.0.1a).
  service_endpoints TEXT,
  -- Unique published @handle (Milestone G). NULL for legacy / un-claimed agents.
  -- Stored normalized (NFKC + lowercased); case-insensitive uniqueness via
  -- uq_agents_username. See migrations/0007_add_username.sql.
  username TEXT
);

CREATE TABLE IF NOT EXISTS trust_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  air_id TEXT UNIQUE NOT NULL,
  total_score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  provenance INTEGER NOT NULL,
  behavioral INTEGER NOT NULL,
  transparency INTEGER NOT NULL,
  security INTEGER NOT NULL,
  peer_attestations INTEGER NOT NULL,
  calculated_at TEXT NOT NULL,
  FOREIGN KEY (air_id) REFERENCES agents(air_id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_air_id ON agents(air_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_trust_scores_air_id ON trust_scores(air_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON rate_limits(ip, endpoint, created_at);

-- Unique published @handle (Milestone G) — case-folded uniqueness, NULL legacy rows excluded.
CREATE UNIQUE INDEX IF NOT EXISTS uq_agents_username ON agents(LOWER(username)) WHERE username IS NOT NULL;

-- Released handles reserved during their cooldown window (changeable + cooldown policy).
CREATE TABLE IF NOT EXISTS username_tombstones (
  username_normalized TEXT PRIMARY KEY,
  released_by_air_id  TEXT NOT NULL,
  released_at         TEXT NOT NULL,
  username_display    TEXT
);
