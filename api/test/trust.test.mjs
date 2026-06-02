import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTestD1 } from "./helpers/d1.mjs";

// Minimal agent-row inserter used across tests.
async function insertAgent(db, airId, overrides = {}) {
  const a = {
    air_id: airId,
    name: airId,
    creator_did: `did:wba:example-${airId}.com:agents:${airId}`,
    creator_name: "Tester",
    creator_type: "individual",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    security_certifications: "[]",
    transparency_open_source: 0,
    ...overrides,
  };
  await db.prepare(
    `INSERT INTO agents (air_id, name, creator_did, creator_name, creator_type, status,
       created_at, updated_at, security_certifications, transparency_open_source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(a.air_id, a.name, a.creator_did, a.creator_name, a.creator_type, a.status,
         a.created_at, a.updated_at, a.security_certifications, a.transparency_open_source).run();
  return a;
}

test("harness: round-trips an agent against the real schema", async () => {
  const db = makeTestD1();
  await insertAgent(db, "AIR-TEST-0001-AAAA");
  const row = await db.prepare("SELECT air_id, status FROM agents WHERE air_id = ?")
    .bind("AIR-TEST-0001-AAAA").first();
  assert.equal(row.air_id, "AIR-TEST-0001-AAAA");
  assert.equal(row.status, "active");
  // agent_attestations table must exist (comes from migration 0004)
  const empty = await db.prepare("SELECT COUNT(*) AS n FROM agent_attestations").bind().first();
  assert.equal(empty.n, 0);
});

export { insertAgent };
