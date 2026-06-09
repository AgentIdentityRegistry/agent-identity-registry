import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTestD1 } from "./helpers/d1.mjs";

test("0006: agent_audit_log table exists with UNIQUE(prev_hash)", async () => {
  const db = makeTestD1();
  await db.prepare(`INSERT INTO agent_audit_log (air_id, event, changed_fields, actor, created_at, prev_hash, entry_hash)
    VALUES ('AIR-TEST-0001-AAAA','registered',NULL,'registrant','2026-01-01T00:00:00Z','GENESIS','h1')`).bind().run();
  const row = await db.prepare("SELECT air_id, event, actor, prev_hash FROM agent_audit_log WHERE entry_hash='h1'").first();
  assert.equal(row.air_id, "AIR-TEST-0001-AAAA");
  assert.equal(row.prev_hash, "GENESIS");
  await assert.rejects(db.prepare(`INSERT INTO agent_audit_log (air_id, event, actor, created_at, prev_hash, entry_hash)
    VALUES ('AIR-TEST-0002-BBBB','updated','owner','2026-01-01T00:01:00Z','GENESIS','h2')`).bind().run());
});
