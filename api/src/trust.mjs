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
