-- Migration 0001 — persist did:wba resolution status on the agents table.
-- Created 2026-05-28 for SDK v0.3 work.
--
-- Before this migration, `did_wba_resolved` was computed at registration but
-- only echoed in the response and then discarded — no DB column existed.
-- That made it impossible for read endpoints to surface freshness, and made
-- it impossible to refresh the status over time. This migration adds the
-- column plus a `last_checked_at` timestamp; both populated at registration
-- (for did:wba creators) and refreshed weekly by the scheduled cron handler.
--
-- Semantics:
--   did_wba_resolved        NULL  = creator isn't a did:wba (field is N/A)
--                           1     = the agent's did.json was reachable at last check
--                           0     = it wasn't
--   did_wba_last_checked_at NULL  = never checked (creator isn't did:wba)
--                           ISO   = timestamp of the most recent attempt

ALTER TABLE agents ADD COLUMN did_wba_resolved INTEGER;
ALTER TABLE agents ADD COLUMN did_wba_last_checked_at TEXT;
