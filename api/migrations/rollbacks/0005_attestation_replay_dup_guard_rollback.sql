-- Rollback for migration 0005 — drop the replay/duplicate-vouch hardening indexes.
DROP INDEX IF EXISTS uq_attestations_signature;
DROP INDEX IF EXISTS uq_attestations_subject_attester_active;
