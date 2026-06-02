import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTestD1 } from "./helpers/d1.mjs";
import { peerAttestationsSubscore, calculateInitialTrustScore, computeGrade, computeVerifiedStatus, recomputeTrustScore, recomputeDependentsOf } from "../src/trust.mjs";

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

let _sigSeq = 0;
async function insertAttestation(db, { subject, attester, root, trust, tenure = 1.0, revokedAt = null }) {
  await db.prepare(
    `INSERT INTO agent_attestations
       (subject_air_id, attester_air_id, attester_whois_root, attestation_type,
        statement, signed_payload, signature_multibase, signed_at,
        attester_trust_at_issue, tenure_multiplier_at_issue, revoked_at, created_at)
     VALUES (?, ?, ?, 'identity_verification', '', '{}', ?, ?, ?, ?, ?, ?)`
  ).bind(subject, attester, root,
         `sig-${attester}-${subject}-${_sigSeq++}`, "2026-02-01T00:00:00.000Z",
         trust, tenure, revokedAt, "2026-02-01T00:00:00.000Z").run();
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

test("computeVerifiedStatus: excludes deleted attesters and revoked rows", async () => {
  const db = makeTestD1();
  await insertAgent(db, "AIR-SUBJ-0000-0000");
  await insertAgent(db, "AIR-ATT1-0000-0000", { status: "active" });
  await insertAgent(db, "AIR-ATT2-0000-0000", { status: "active" });
  await insertAgent(db, "AIR-ATT3-0000-0000", { status: "deleted" }); // gone
  await insertAttestation(db, { subject: "AIR-SUBJ-0000-0000", attester: "AIR-ATT1-0000-0000", root: "a1.com", trust: 500 });
  await insertAttestation(db, { subject: "AIR-SUBJ-0000-0000", attester: "AIR-ATT2-0000-0000", root: "a2.com", trust: 400 });
  await insertAttestation(db, { subject: "AIR-SUBJ-0000-0000", attester: "AIR-ATT3-0000-0000", root: "a3.com", trust: 500 }); // active row, dead attester
  await insertAgent(db, "AIR-ATT4-0000-0000", { status: "active" });
  // ATT4 is an ACTIVE attester but its attestation is REVOKED → excluded by `revoked_at IS NULL`.
  await insertAttestation(db, { subject: "AIR-SUBJ-0000-0000", attester: "AIR-ATT4-0000-0000", root: "a4.com", trust: 500, revokedAt: "2026-03-01T00:00:00.000Z" });

  const v = await computeVerifiedStatus("AIR-SUBJ-0000-0000", db);
  assert.equal(v.attestation_count, 2);             // ATT3 excluded
  assert.equal(v.distinct_whois_roots, 2);          // a1, a2 only
  assert.equal(v.verification_score, 900);          // 500*1 + 400*1
  assert.equal(v.verified, false);                  // needs ≥3 roots; ATT3's would-be 3rd root is dead
});

// Insert the registration-time trust_scores row (peer = 300) for an agent.
async function seedTrustRow(db, agent) {
  const s = calculateInitialTrustScore(agent);
  await db.prepare(
    `INSERT INTO trust_scores (air_id, total_score, grade, provenance, behavioral, transparency, security, peer_attestations, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(agent.air_id, s.total_score, s.grade, s.provenance, s.behavioral, s.transparency, s.security, s.peer_attestations, "2026-01-01T00:00:00.000Z").run();
}

async function peerOf(db, airId) {
  const r = await db.prepare("SELECT peer_attestations FROM trust_scores WHERE air_id = ?").bind(airId).first();
  return r?.peer_attestations;
}

test("recomputeTrustScore: peer rises, reverts, stays frozen, no-ops when no row", async () => {
  const db = makeTestD1();
  const subj = await insertAgent(db, "AIR-SUBJ-0000-0001");
  await seedTrustRow(db, subj);
  await insertAgent(db, "AIR-ATTA-0000-0001");
  await insertAgent(db, "AIR-ATTB-0000-0001");

  // Two active vouches, weightSum = 500 + 500 = 1000 → peer 869.
  await insertAttestation(db, { subject: subj.air_id, attester: "AIR-ATTA-0000-0001", root: "a.com", trust: 500 });
  await insertAttestation(db, { subject: subj.air_id, attester: "AIR-ATTB-0000-0001", root: "b.com", trust: 500 });
  await recomputeTrustScore(subj.air_id, db);
  assert.equal(await peerOf(db, subj.air_id), 869);

  // Frozen: bumping an attester's LIVE trust doesn't move the subject's score.
  await seedTrustRow(db, { air_id: "AIR-ATTA-0000-0001", creator_did: "x", security_certifications: "[]" });
  await db.prepare("UPDATE trust_scores SET total_score = 999 WHERE air_id = ?").bind("AIR-ATTA-0000-0001").run();
  await recomputeTrustScore(subj.air_id, db);
  assert.equal(await peerOf(db, subj.air_id), 869); // unchanged — uses attester_trust_at_issue

  // Revoke one → weightSum 500 → peer 702.
  await db.prepare("UPDATE agent_attestations SET revoked_at = '2026-03-01T00:00:00.000Z' WHERE attester_air_id = ?")
    .bind("AIR-ATTB-0000-0001").run();
  await recomputeTrustScore(subj.air_id, db);
  assert.equal(await peerOf(db, subj.air_id), 702);

  // No trust_scores row → no throw, no insert.
  await insertAgent(db, "AIR-NONE-0000-0001");
  await recomputeTrustScore("AIR-NONE-0000-0001", db);
  assert.equal(await peerOf(db, "AIR-NONE-0000-0001"), undefined);
});

test("recomputeDependentsOf: rescores every subject the attester vouched for", async () => {
  const db = makeTestD1();
  const s1 = await insertAgent(db, "AIR-DEP1-0000-0001");
  const s2 = await insertAgent(db, "AIR-DEP2-0000-0001");
  await seedTrustRow(db, s1);
  await seedTrustRow(db, s2);
  await insertAgent(db, "AIR-XATT-0000-0001");
  // X vouches for both S1 and S2 (weightSum 500 each → peer 702).
  await insertAttestation(db, { subject: s1.air_id, attester: "AIR-XATT-0000-0001", root: "x.com", trust: 500 });
  await insertAttestation(db, { subject: s2.air_id, attester: "AIR-XATT-0000-0001", root: "x.com", trust: 500 });

  await recomputeDependentsOf("AIR-XATT-0000-0001", db);
  assert.equal(await peerOf(db, s1.air_id), 702);
  assert.equal(await peerOf(db, s2.air_id), 702);

  // Simulate X being deleted: its vouches stop counting; recompute drops them to 300.
  await db.prepare("UPDATE agents SET status = 'deleted' WHERE air_id = ?").bind("AIR-XATT-0000-0001").run();
  await recomputeDependentsOf("AIR-XATT-0000-0001", db);
  assert.equal(await peerOf(db, s1.air_id), 300);
  assert.equal(await peerOf(db, s2.air_id), 300);
});

// exported for reuse by later test tasks
export { insertAgent, insertAttestation };
