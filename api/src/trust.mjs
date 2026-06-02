// AIR Registry — trust + scoring logic (extracted from index.js for isolation
// and testability). DB-touching functions take a D1-style `db` parameter.

// ---- Peer-attestation sub-score (security TODO #3) ------------------------
// Earned trust derived from the REAL attestation graph, using FROZEN
// attester_trust_at_issue × tenure_multiplier_at_issue weights (loop-safe).
export const PEER_ATTEST_BASE = 300;   // sub-score with zero active attestations (unchanged)
export const PEER_ATTEST_SCALE = 18;   // diminishing-returns steepness
export const PEER_ATTEST_CAP = 1000;   // ceiling ("meaningful lever")

// weightSum = Σ (attester_trust_at_issue × tenure_multiplier_at_issue) over
// ACTIVE attestations from ACTIVE attesters (== computeVerifiedStatus.verification_score).
export function peerAttestationsSubscore(weightSum) {
  // Clamp: Math.sqrt(<0)=NaN would poison total_score + flip grade. Treat any
  // non-finite / non-positive input as 0 → base 300.
  const w = Number.isFinite(weightSum) && weightSum > 0 ? weightSum : 0;
  return Math.min(
    PEER_ATTEST_BASE + Math.round(PEER_ATTEST_SCALE * Math.sqrt(w)),
    PEER_ATTEST_CAP
  );
}

// ---- Grade + initial/recomputed score -------------------------------------
export function computeGrade(score) {
  if (score >= 950) return "AAA";
  if (score >= 850) return "AA";
  if (score >= 700) return "A";
  if (score >= 600) return "BBB";
  if (score >= 500) return "BB";
  if (score >= 400) return "B";
  return "C";
}

// peerSubscore defaults to the no-attestations base, so registration is byte-identical.
export function calculateInitialTrustScore(agent, peerSubscore = PEER_ATTEST_BASE) {
  let provenance = 300;
  if (agent.creator_did) provenance += 100;
  if (agent.creator_name) provenance += 100;
  if (agent.creator_type === "organization") provenance += 100;
  provenance = Math.min(provenance, 600);

  const behavioral = 500;

  let transparency = 300;
  if (agent.transparency_open_source) transparency += 150;
  if (agent.transparency_code_repo) transparency += 100;
  if (agent.transparency_docs_url) transparency += 100;
  transparency = Math.min(transparency, 650);

  let security = 300;
  const certs = JSON.parse(agent.security_certifications || "[]");
  security += Math.min(certs.length * 100, 300);
  security = Math.min(security, 600);

  const peer_attestations = peerSubscore;

  const total = Math.round(
    provenance * 0.25 +
    behavioral * 0.25 +
    transparency * 0.20 +
    security * 0.15 +
    peer_attestations * 0.15
  );

  return {
    total_score: total,
    grade: computeGrade(total),
    provenance,
    behavioral,
    transparency,
    security,
    peer_attestations,
  };
}
