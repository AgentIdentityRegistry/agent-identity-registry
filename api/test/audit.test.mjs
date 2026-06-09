import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTestD1 } from "./helpers/d1.mjs";
import { canonicalizeChangedFields, auditEntryHash, GENESIS, recordAuditEvent, computeChainTip, verifyAuditChain, buildAnchor, publishAnchor } from "../src/audit.mjs";

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

test("canonicalizeChangedFields: sorted + JCS array; empty → ''", () => {
  assert.equal(canonicalizeChangedFields(null), "");
  assert.equal(canonicalizeChangedFields([]), "");
  assert.equal(canonicalizeChangedFields(["description","capabilities"]),
               canonicalizeChangedFields(["capabilities","description"]));
  assert.equal(canonicalizeChangedFields(["b","a"]), '["a","b"]');
});

test("auditEntryHash: deterministic + genesis-aware + chains on prev_hash", async () => {
  const content = { air_id: "AIR-TEST-0001-AAAA", event: "registered", changedFields: null, actor: "registrant", created_at: "2026-01-01T00:00:00Z" };
  const h1 = await auditEntryHash(content, GENESIS);
  const h1again = await auditEntryHash(content, GENESIS);
  assert.equal(h1, h1again);
  const h2 = await auditEntryHash(content, h1);
  assert.notEqual(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

async function record(db, e) {
  const stmt = await recordAuditEvent(db, e);
  await stmt.run();
}
test("chain: record events → verify valid; tamper → first_broken_id", async () => {
  const db = makeTestD1();
  await record(db, { airId: "AIR-AAAA-AAAA-AAAA", event: "registered", changedFields: null, actor: "registrant", now: "2026-01-01T00:00:00Z" });
  await record(db, { airId: "AIR-AAAA-AAAA-AAAA", event: "updated", changedFields: ["description"], actor: "owner", now: "2026-01-01T00:01:00Z" });
  let v = await verifyAuditChain(db, {});
  assert.equal(v.valid, true);
  assert.equal(v.count, 2);
  await db.prepare("UPDATE agent_audit_log SET actor='admin' WHERE id=1").bind().run();
  v = await verifyAuditChain(db, {});
  assert.equal(v.valid, false);
  assert.equal(v.first_broken_id, 1);
});
test("chain: UNIQUE(prev_hash) blocks a fork", async () => {
  const db = makeTestD1();
  await record(db, { airId: "AIR-AAAA-AAAA-AAAA", event: "registered", changedFields: null, actor: "registrant", now: "2026-01-01T00:00:00Z" });
  const tip = await computeChainTip(db);
  assert.equal(tip.count, 1);
  const a = await recordAuditEvent(db, { airId: "AIR-BBBB-BBBB-BBBB", event: "updated", changedFields: ["description"], actor: "owner", now: "t2" });
  const b = await recordAuditEvent(db, { airId: "AIR-CCCC-CCCC-CCCC", event: "updated", changedFields: ["description"], actor: "owner", now: "t3" });
  await a.run();
  await assert.rejects(b.run());
});

test("buildAnchor returns tip + count for the current chain", async () => {
  const db = makeTestD1();
  await record(db, { airId: "AIR-AAAA-AAAA-AAAA", event: "registered", changedFields: null, actor: "registrant", now: "2026-01-01T00:00:00Z" });
  const a = await buildAnchor(db, "2026-01-07T03:00:00Z");
  assert.equal(a.entry_count, 1);
  assert.equal(a.anchored_at, "2026-01-07T03:00:00Z");
  assert.match(a.tip_hash, /^[0-9a-f]{64}$/);
});

test("publishAnchor delegates to the injected putFile with a dated path + JSON body", async () => {
  let captured;
  const fakePutFile = async (args) => { captured = args; return { ok: true, commit: "abc123" }; };
  const anchor = { anchored_at: "2026-01-07T03:00:00Z", tip_hash: "deadbeef", entry_count: 5 };
  const res = await publishAnchor(anchor, { putFile: fakePutFile });
  assert.equal(res.ok, true);
  assert.ok(captured.path.includes("2026-01-07"));      // dated path
  assert.deepEqual(JSON.parse(captured.content), anchor); // exact JSON body
  assert.ok(typeof captured.message === "string" && captured.message.length > 0); // commit message
});

test("publishAnchor throws if no putFile is provided", async () => {
  await assert.rejects(publishAnchor({ anchored_at:"x", tip_hash:"y", entry_count:0 }, {}));
});
