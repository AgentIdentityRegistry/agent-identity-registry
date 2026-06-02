-- Migration 0005 — attestation replay + duplicate-vouch hardening.
--
-- Surfaced by the 2026-06-02 trust-graph cold-start security review
-- (see [[air/trust-graph-coldstart-2026-06-02]]). Two DB-level guarantees that
-- back up the application-layer checks in createAttestation():
--
--   1. UNIQUE(signature_multibase): an Ed25519 signature (which covers a unique
--      JCS payload incl. signed_at) can be stored AT MOST ONCE. Blocks exact
--      signature replay even if an upstream application check ever regresses.
--   2. UNIQUE(subject_air_id, attester_air_id) WHERE revoked_at IS NULL: at most
--      one ACTIVE attestation per (subject, attester) pair, so one attester can't
--      stack weight on a subject. Re-attesting AFTER revocation is still allowed
--      (the revoked row has revoked_at set, so it falls outside this partial index).
--
-- Idempotent (IF NOT EXISTS) and safe to apply: agent_attestations has 0 rows
-- as of 2026-06-02, so no existing data can violate the new constraints.

CREATE UNIQUE INDEX IF NOT EXISTS uq_attestations_signature
  ON agent_attestations(signature_multibase);

CREATE UNIQUE INDEX IF NOT EXISTS uq_attestations_subject_attester_active
  ON agent_attestations(subject_air_id, attester_air_id)
  WHERE revoked_at IS NULL;
