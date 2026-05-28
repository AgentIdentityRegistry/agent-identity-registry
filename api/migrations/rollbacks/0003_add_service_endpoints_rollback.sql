-- Rollback for migration 0003 — remove service_endpoints column.
--
-- ⚠️  DESTRUCTIVE: D1 (SQLite-based) does NOT support `ALTER TABLE … DROP COLUMN`,
-- so the only way to remove a column is to recreate the table without it.
-- This loses:
--   • The auto-increment counter state for `id` (resets / drifts).
--   • Any indexes / triggers attached to the original `agents` table — they
--     MUST be recreated from schema.sql after running this script.
--   • Any column added by a migration that landed AFTER 0003 (this rollback
--     hard-codes the column list as of 0003). If migrations 0004+ exist,
--     update the SELECT below to include their columns before running.
--
-- Only run this if migration 0003 must be reversed and you've taken a backup.

CREATE TABLE agents_rollback AS SELECT
  id,
  air_id,
  name,
  description,
  creator_did,
  creator_name,
  creator_type,
  capabilities,
  security_certifications,
  transparency_open_source,
  transparency_code_repo,
  transparency_docs_url,
  verification_level,
  verified,
  status,
  created_at,
  updated_at,
  is_demo,
  public_key,
  agent_secret_hash,
  did_wba_resolved,
  did_wba_last_checked_at
FROM agents;

DROP TABLE agents;
ALTER TABLE agents_rollback RENAME TO agents;

-- Recreate indexes that schema.sql defines on the agents table.
CREATE INDEX IF NOT EXISTS idx_agents_air_id ON agents(air_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
