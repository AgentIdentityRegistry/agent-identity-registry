-- Migration 0003 — add service_endpoints column to agents table.
-- Phase 3 / Stage 3.0.1a — enables A2A endpoint discovery via DID document.
--
-- Numbering note: we deliberately jump 0001 → 0003 to reserve 0002 for any
-- Kenny-in-flight migration work landing in parallel. Don't reuse 0002 here.
--
-- Column: service_endpoints
--   NULL  = no per-agent service endpoints; getDidDocument returns just the
--           hardcoded AIRTrustScore entry (pre-Phase-3 behavior, unchanged)
--   TEXT  = JSON array of {type, serviceEndpoint, id?} objects appended to
--           the DID document's service[] array (used by A2A discovery for
--           things like A2AInbox endpoints)
--
-- Forward-only. Rollback path lives in 0003_add_service_endpoints_rollback.sql
-- and is destructive (D1 lacks DROP COLUMN — see that file's header).

ALTER TABLE agents ADD COLUMN service_endpoints TEXT;
