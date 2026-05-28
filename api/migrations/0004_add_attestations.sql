-- Migration 0004 — multi-signature attestations for AIR Verified status.
-- Phase 4 / AIR-Verified — Six-lock cryptographic defense for peer vouching.
--
-- See [[air/strategic-borrowings-from-opena2a-2026-05-28]] for the design memo.
-- See [[air/lessons-learned-canonical]] for the PRIME DIRECTIVE on git records.
--
-- The six locks an attestation must pass to count toward Verified:
--   Lock 1: Live did:wba resolution at issue time + Ed25519 signature check
--   Lock 2: WHOIS-root domain distinct from subject + from other attesters
--   Lock 3: Attester tenure ≥30 days + attester own trust ≥50
--   Lock 4: Weighted by attester_trust × tenure_multiplier
--   Lock 5: Attester rate limit ≤10 issuances per 7-day rolling window
--   Lock 6: Public, signed, queryable forever — audit trail IS part of the security
--
-- Verified formula:
--   For each non-revoked attestation:
--     weight = attester_trust_at_issue × tenure_multiplier_at_issue
--   verification_score = sum(weight)
--   distinct_whois_roots = count(distinct attester_whois_root)
--   verified = (verification_score >= 300) AND (distinct_whois_roots >= 3)
--
-- Numbering note: 0001 → 0003 → 0004. 0002 reserved for any Kenny-in-flight
-- migration; not used here.

CREATE TABLE IF NOT EXISTS agent_attestations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- The agent being vouched for
  subject_air_id TEXT NOT NULL,
  -- The agent doing the vouching
  attester_air_id TEXT NOT NULL,
  -- WHOIS root extracted from attester's creator_did at issue time.
  -- Cached so the Verified computation doesn't have to re-extract on every read.
  -- E.g. "steinberger.io" for did:wba:agent.steinberger.io:agents:AIR-X.
  attester_whois_root TEXT NOT NULL,
  -- Structured type. Enum values:
  --   identity_verification — I confirm this agent's claimed identity is real
  --   operator_confirmation — I confirm this agent is operated by its claimed creator
  --   dependency            — I depend on this agent in production
  --   safety_review         — I have reviewed and trust this agent's safety
  attestation_type TEXT NOT NULL,
  -- Free-form human-readable statement. May be empty string.
  statement TEXT NOT NULL DEFAULT '',
  -- The JCS-canonical JSON that was signed. Stored verbatim so any third
  -- party can re-verify the signature byte-for-byte without re-canonicalizing.
  signed_payload TEXT NOT NULL,
  -- Ed25519 signature over signed_payload, multibase z-prefix base58btc encoded.
  signature_multibase TEXT NOT NULL,
  -- ISO timestamp inside the signed payload (also stored here for indexing).
  signed_at TEXT NOT NULL,
  -- Attester's trust score AT ISSUE TIME. Locked in so retroactive trust
  -- drift doesn't change historical attestations' weight.
  attester_trust_at_issue INTEGER NOT NULL,
  -- Tenure multiplier at issue time:
  --   tenure  <30d → 0.0 (not eligible, won't be stored)
  --   30-90d        → 0.5
  --   90-365d       → 1.0
  --   >365d         → 1.5
  tenure_multiplier_at_issue REAL NOT NULL,
  -- Soft delete via revocation. NULL = active. ISO timestamp = revoked.
  revoked_at TEXT,
  -- When the attestation was inserted into our DB (may differ slightly from signed_at).
  created_at TEXT NOT NULL,
  FOREIGN KEY (subject_air_id) REFERENCES agents(air_id),
  FOREIGN KEY (attester_air_id) REFERENCES agents(air_id)
);

-- The most common query: active attestations for a given subject (used by
-- Verified computation + GET /agents/{air_id}/attestations).
CREATE INDEX IF NOT EXISTS idx_attestations_subject_active
  ON agent_attestations(subject_air_id, revoked_at);

-- Rate-limit lookup: count recent attestations from one attester.
CREATE INDEX IF NOT EXISTS idx_attestations_attester_issued
  ON agent_attestations(attester_air_id, signed_at DESC);

-- Recent firehose (GET /attestations/recent).
CREATE INDEX IF NOT EXISTS idx_attestations_recent
  ON agent_attestations(signed_at DESC) WHERE revoked_at IS NULL;
