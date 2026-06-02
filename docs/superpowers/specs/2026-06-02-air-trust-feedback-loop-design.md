# Design Spec — #3 Trust Feedback Loop (earned trust from peer attestations)

- **Date:** 2026-06-02
- **Status:** Approved design (pre-implementation) — incorporates independent critic review (verdict: APPROVE-WITH-CHANGES, 2026-06-02)
- **Component:** AIR registry worker — `api/src/index.js`
- **Related:** [air/trust-graph-coldstart-2026-06-02] (GBrain) — security TODO #3. Sibling item #4 (resolved-key check) is a separate spec/session.
- **Migration required:** none (schema unchanged)

## Problem

A subject's trust score has a `peer_attestations` sub-score, weighted 0.15 of the total. Today it is a **hardcoded `300`** (`calculateInitialTrustScore`, `api/src/index.js:856`). Receiving real attestations therefore **never** raises a subject's trust — "earned trust" is decorative.

Meanwhile `computeVerifiedStatus` (`api/src/index.js:804`) already aggregates the real attestation graph into `verification_score = Σ(attester_trust_at_issue × tenure_multiplier_at_issue)` over active attestations — but that signal only feeds the **Verified badge** (`score ≥ 300 AND distinct_whois_roots ≥ 3`), never the trust score.

Three further facts established by reading the live code:
- Trust is only recomputed on **agent edit** (`updateAgent`, `api/src/index.js:1394`), never on attestation create/revoke.
- `computeVerifiedStatus` counts an attestation as long as it is not revoked — it **never checks whether the attester is still active** (`api/src/index.js:804-809`). A deleted/deactivated attester's vouch counts forever, toward both the trust score and the Verified badge.
- The public leaderboard (`listAgents`, `api/src/index.js:1116`) reads the stored `total_score` directly (`ORDER BY total_score DESC`), so any staleness in stored trust is **user-visible in ranking**, not just on a detail endpoint.

## Decision summary

| Axis | Decision | Why |
|---|---|---|
| Attester weight | **Frozen** (`attester_trust_at_issue × tenure_multiplier_at_issue`, already stored per row; tenure bracket also frozen at issue) | Breaks the recursive pump-loop (a later trust bump to an attester never retroactively re-amplifies old vouches). Reuses persisted data. |
| Curve shape | **Diminishing returns** (`√`) | First honest vouches matter most; a large ring cannot run the score to infinity. |
| Ceiling | **~1000** ("meaningful lever") | Earned trust becomes a top-tier signal. Bounded: peer-only earning tops out at total 645 / grade BBB — it can never mint a top-grade agent. |
| Dead vouches | **Counted only while attester `status='active'`** | A vouch from a deleted/deactivated identity must not prop up trust or Verified. Closes the "aged fake domains vouch → then delete them" trick. Liveness is bounded to account status; did:wba-resolution-liveness is out of scope (the weekly cron handles re-resolution). |
| Recompute | **Synchronous** on attestation create/revoke, agent edit, and **attester deletion** (recompute its dependents) | Stored value stays fresh; low write volume; no on-read complexity. |
| Schema | **No change** | `peer_attestations INTEGER NOT NULL` already exists (`api/schema.sql:50`). |

## Design

### 1. Formula (pure function, named constants — no magic numbers, input clamped)

```js
const PEER_ATTEST_BASE  = 300;   // sub-score with zero active attestations (identical to today)
const PEER_ATTEST_SCALE = 18;    // diminishing-returns steepness
const PEER_ATTEST_CAP   = 1000;  // ceiling ("meaningful lever")

// weightSum is computeVerifiedStatus().verification_score:
//   Σ (attester_trust_at_issue × tenure_multiplier_at_issue) over ACTIVE attestations
//   whose attester is ALSO active. Frozen-at-issue values ⇒ loop-safe.
function peerAttestationsSubscore(weightSum) {
  // Defensive clamp: a self-contained helper must never emit NaN into a NOT NULL column.
  // Math.sqrt(<0) = NaN → would poison total_score + flip grade to "C". Treat any
  // non-finite / non-positive input as 0 (→ base 300).
  const w = Number.isFinite(weightSum) && weightSum > 0 ? weightSum : 0;
  return Math.min(
    PEER_ATTEST_BASE + Math.round(PEER_ATTEST_SCALE * Math.sqrt(w)),
    PEER_ATTEST_CAP
  );
}
```

**Curve (mature attester ≈ trust 500 × tenure 1.0 = 500 per vouch):**

| Active vouches (distinct domains, by Lock 2) | weightSum | peer sub-score | Δ total (×0.15) |
|---|---|---|---|
| 0 | 0 | 300 | +0 (unchanged) |
| 1 | 500 | ~703 | +60 |
| 2 | 1000 | ~869 | +85 |
| 3 | 1500 | ~997 ≈ cap | +105 |

~3 strong distinct-domain vouches ≈ caps the sub-score — the same "≥3 roots" bar as the Verified badge. A weak/young vouch (tenure 0.5) is worth half. Peer earning moves the grade by at most one tier (verified by the critic: max total 645 = BBB).

### 2. Code units (each independently testable)

- **`peerAttestationsSubscore(weightSum) → int`** — pure; the clamped formula above.
- **`calculateInitialTrustScore(agent, peerSubscore = PEER_ATTEST_BASE)`** — replace the hardcoded `const peer_attestations = 300` with the parameter. Default `300` keeps registration behavior byte-identical.
- **`recomputeTrustScore(airId, db)`** — self-contained: load the agent row; if it has no `trust_scores` row, no-op (registration always inserts one first); derive `weightSum` from `computeVerifiedStatus(airId, db).verification_score`; compute `peerSubscore = peerAttestationsSubscore(weightSum)`; `score = calculateInitialTrustScore(agent, peerSubscore)`; write the existing `trust_scores` UPDATE. Idempotent; one helper called identically everywhere.
- **`computeVerifiedStatus(subjectAirId, db)` — modified** — its SELECT joins `agents` and filters `attester.status = 'active'`, so deleted/deactivated attesters drop out of BOTH the Verified badge and the peer sub-score:
  ```sql
  SELECT a.attester_whois_root, a.attester_trust_at_issue, a.tenure_multiplier_at_issue
  FROM agent_attestations a
  JOIN agents ag ON ag.air_id = a.attester_air_id
  WHERE a.subject_air_id = ? AND a.revoked_at IS NULL AND ag.status = 'active'
  ```
  This is an intentional behavior change to the Verified badge (it now reflects live backers).

### 3. Trigger points (wire `recomputeTrustScore` in)

- **`createAttestation`** — after the insert succeeds, beside the existing `computeVerifiedStatus` call (`api/src/index.js:1675`).
- **`revokeAttestation`** — after the revoke UPDATE, beside the existing `computeVerifiedStatus` call (`api/src/index.js:1827`).
- **`updateAgent`** — replace the inline recompute block (`api/src/index.js:1392-1398`) with a call to `recomputeTrustScore`. **Required in this same change:** otherwise the new earn path would be silently erased to 300 on the next agent edit (the inline block hardcodes 300). This is not a pre-existing bug — today peer is always 300, so writing 300 is correct — it is a bug this change would *introduce* if `updateAgent` were left untouched.
- **`deleteAgent`** — after flipping the agent to `status='deleted'`, recompute every subject it actively vouched for, so their trust + Verified drop immediately rather than going silently stale (recall: leaderboard ranking reads stored `total_score`):
  ```sql
  SELECT DISTINCT subject_air_id FROM agent_attestations WHERE attester_air_id = ? AND revoked_at IS NULL
  ```
  then `recomputeTrustScore(subject_air_id, db)` for each. (General rule: any future code path that changes an agent's `status` must recompute its dependents. Today `deleteAgent` is the only such path.)

### 4. Data flow

```
attestation created/revoked  |  attester deleted  |  agent edited
  → recomputeTrustScore(affected subject)
     → computeVerifiedStatus(subject): weightSum over ACTIVE rows from ACTIVE attesters
     → peerAttestationsSubscore(weightSum)
     → calculateInitialTrustScore(agent, peerSubscore)
     → UPDATE trust_scores (total_score, grade, …, peer_attestations, calculated_at)
GET /agents/{id} and the leaderboard read the stored, now-fresh trust_scores row (no on-read compute)
```

### 5. Loop-safety + integrity argument

Frozen weights mean the only thing that changes a subject's stored peer sub-score is an attestation **on that subject** being added/removed, or one of its attesters being **deleted** — never a downstream live-trust change to an attester. The recursion that would make this dangerous (live re-pricing) is explicitly rejected. Combined with the existing eligibility locks:
- **Lock 2** — each active attester on a subject is a distinct WHOIS root (so "count" = "distinct domains").
- **Lock 3a** — attester tenure ≥30 days; `tenure_multiplier(<30d)=0`.
- **Lock 3b** — attester's own trust ≥50 (`api/src/index.js:767`): a Sybil cannot bootstrap a zero-trust attester to start vouching.
- **Lock 5** — ≤10 issuances per attester per rolling 7 days. Self-attestation blocked.

A mutual-pump ring therefore requires N distinct real domains, each aged ≥30 days with trust ≥50, and still tops out at the diminishing-returns cap (BBB). The dead-vouch filter additionally prevents manufacturing Verified on identities that are then deleted.

## Edge cases

- **Zero attestations** → `weightSum=0` → 300. Identical to today; no existing agent drifts.
- **All attestations revoked, or all attesters deleted** → `weightSum=0` → reverts to 300 (via the revoke / delete triggers).
- **Negative / NaN / non-finite weightSum** → clamped to 0 → 300. (Unreachable in normal flow — both source columns are NOT NULL and non-negative — but the helper must be safe by contract.)
- **Missing `trust_scores` row** → `recomputeTrustScore` no-ops (registration always inserts one first).
- **`tenure_multiplier_at_issue = 0`** rows contribute 0 to `weightSum`. Harmless.
- **Attester reactivation** (if ever added) → must recompute its dependents, same as deletion. Not a path today.
- **Rounding** — integer sub-score, matching the `INTEGER NOT NULL` column.

## Error handling

`recomputeTrustScore` runs **after** the attestation insert/revoke has already committed (no transaction wraps them in the current code). Wrap the recompute call in try/catch and **log-but-don't-fail**: a recompute hiccup must not 500 a successful attestation. Staleness self-heals on the subject's next event. (Same "a best-effort side-effect must never shadow a successful user-facing operation" rule as the messaging archive.)

## Testing (synthetic data — no live attestations exist)

Unit/integration against a test D1:
1. Subject with 0 attestations → peer 300, total unchanged from registration.
2. Add 1 / 2 / 3 attestations from distinct roots → peer ~703 / ~869 / ~997, monotonic + diminishing.
3. Cap holds: many strong vouches never exceed 1000 (total never exceeds 645).
4. Revoke an attestation → peer drops to the recomputed value (→ 300 when all revoked).
5. **Frozen:** raise an attester's *live* trust after issuing → subject's stored peer does **not** move until a new event.
6. **`updateAgent` reroute (against the NEW code):** edit an agent that has earned trust → peer is preserved, not reset to 300.
7. **Dead vouch:** delete an attester → the subject it vouched for loses that weight (peer + Verified drop). Distinct-root subject can fall below the Verified threshold.
8. Weak vs strong vouch: a 0.5-tenure vouch contributes ~half a 1.0-tenure vouch.
9. **Clamp:** `peerAttestationsSubscore(-1)` and `(NaN)` → 300.

## Out of scope (YAGNI)

- Time-decay / fading of old attestations.
- Live / PageRank / eigenvector weighting; re-evaluating a frozen tenure bracket as an attester ages.
- **did:wba-resolution liveness** as an input to counting (an attester whose DID stops resolving) — the weekly cron handles re-resolution separately; only account `status` gates counting here.
- Changes to Verified thresholds or to the weights of the other four sub-scores.
- Schema change. **Backfill is also not required, but only while zero attestations predate this deploy** (see below).

## Migration & deploy

- **No schema migration.** Logic-only change.
- **Pre-deploy precondition for "no backfill":** every existing agent's stored `peer=300` equals `peerAttestationsSubscore(0)`, so no backfill is needed **iff** no active attestation predates the deploy. Verify immediately before deploy:
  ```sql
  SELECT COUNT(*) FROM agent_attestations WHERE revoked_at IS NULL;  -- expect 0
  ```
  If `>0`, run a one-time `recomputeTrustScore` over each distinct active `subject_air_id` after deploy.

## Post-deploy verification

```bash
curl https://agentidentityregistry.org/api/v1/health
curl https://agentidentityregistry.org/api/v1/agents/<AIR-ID>/trust-score
```
(No live attestation data today, so this primarily proves no regression; the behavioral proof is the synthetic test suite above.)
