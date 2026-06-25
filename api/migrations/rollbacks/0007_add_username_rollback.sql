-- Rollback for 0007_add_username.
-- D1/SQLite cannot ALTER TABLE ... DROP COLUMN, so `agents.username` is left in place
-- (harmless: NULL-able, no default). The removable artifacts are the index + table.

DROP INDEX IF EXISTS uq_agents_username;
DROP TABLE IF EXISTS username_tombstones;
