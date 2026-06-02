import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTestD1 } from "./helpers/d1.mjs";
import { peerAttestationsSubscore, calculateInitialTrustScore, computeGrade } from "../src/trust.mjs";

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

test("peerAttestationsSubscore: curve, cap, and clamp", () => {
  // 300 + round(18 * sqrt(weightSum)), capped at 1000.
  assert.equal(peerAttestationsSubscore(0), 300);
  assert.equal(peerAttestationsSubscore(500), 702);    // 18*22.3607=402.49 → 402
  assert.equal(peerAttestationsSubscore(1000), 869);   // 18*31.6228=569.21 → 569
  assert.equal(peerAttestationsSubscore(1500), 997);   // 18*38.7298=697.14 → 697
  assert.equal(peerAttestationsSubscore(1512), 1000);  // cap point: floor(((CAP-BASE)/SCALE)^2)=floor((700/18)^2)=1512
  assert.equal(peerAttestationsSubscore(2000), 1000);  // beyond cap → pinned
  // Defensive clamp: never emit NaN/garbage into a NOT NULL column.
  assert.equal(peerAttestationsSubscore(-1), 300);
  assert.equal(peerAttestationsSubscore(NaN), 300);
  assert.equal(peerAttestationsSubscore(Infinity), 300);
});

const sampleAgent = {
  creator_did: "did:wba:example.com:agents:AIR-X",
  creator_name: "Tester",
  creator_type: "individual",
  transparency_open_source: 0,
  transparency_code_repo: null,
  transparency_docs_url: null,
  security_certifications: "[]",
};

test("computeGrade: tier boundaries", () => {
  assert.equal(computeGrade(950), "AAA");
  assert.equal(computeGrade(645), "BBB");
  assert.equal(computeGrade(400), "B");
  assert.equal(computeGrade(399), "C");
});

test("calculateInitialTrustScore: default peer is 300 (registration unchanged)", () => {
  const s = calculateInitialTrustScore(sampleAgent);
  assert.equal(s.peer_attestations, 300);
  assert.equal(s.total_score, 400); // round(125+125+60+45+45)
  assert.equal(s.grade, "B");
});

test("calculateInitialTrustScore: a high peerSubscore lifts the total by ~+105", () => {
  const s = calculateInitialTrustScore(sampleAgent, 1000);
  assert.equal(s.peer_attestations, 1000);
  assert.equal(s.total_score, 505); // 400 + (1000-300)*0.15
  assert.equal(s.grade, "BB");
});

test("calculateInitialTrustScore: fully-maxed agent tops out at 645/BBB", () => {
  const maxed = {
    creator_did: "did:wba:example.com:agents:AIR-X",
    creator_name: "Tester",
    creator_type: "organization",
    transparency_open_source: 1,
    transparency_code_repo: "https://x",
    transparency_docs_url: "https://x",
    security_certifications: JSON.stringify(["a", "b", "c"]),
  };
  const s = calculateInitialTrustScore(maxed, 1000);
  assert.equal(s.total_score, 645);
  assert.equal(s.grade, "BBB");
});

// exported for reuse by later test tasks
export { insertAgent };
