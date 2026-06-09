# Design — Agent Evidence Labels (Registry item #6, reworked)

**Date:** 2026-06-09
**Status:** Approved design, pending spec review → implementation plan
**Supersedes:** the "5 trust-word tier" approach (Verified/Trusted/Established/Listed/Provisional), which an independent neutrality review returned **REWORK** on. See "Why this was reworked" below.

## Goal

Deliver the "cognitive simplification" intent of roadmap item #6 — a small, human-readable label for an agent's standing — **without compromising AIR's neutrality**. AIR aspires to be neutral global governance infrastructure, so it may publish *facts about evidence*, never *verdicts about agents*.

## Why this was reworked (the constraints that killed the original)

An independent Opus critic review (2026-06-09) found three issues, two of them blockers, all independently verified:

1. **Unreachable tier (verified bug).** The implemented score caps at **645** today (`docs/SPECIFICATION.md:283`, `docs/TRUST-SCORE.md:49`; behavioral is a flat 500). The original design put "Trusted" at ≥700 — a label no agent could ever earn.
2. **Editorial value-words break neutrality.** "Trusted / Established / Provisional" are endorsements. A neutral body stamping a third party's agent "Trusted" (or "Provisional") invites "who appointed AIR judge?", favoritism claims, and defamation exposure. Only "Verified" is a factual cryptographic claim.
3. **Vetting-word on unchecked data.** An agent reaches 540 ("Established") on pure self-declaration + the flat-500 behavioral, with zero independent verification.

**Design principle adopted:** every public label must describe *what evidence exists*, not *whether the agent is good*. (Library analogy: "Reviewed by 3 experts" / "Author's own description" — never "Great book".)

## The four evidence labels

A label states the strongest evidence basis that exists for the agent. Ordered by evidence strength, **not** by a verdict:

| Label | Factual meaning | Criteria |
|---|---|---|
| **Verified** | ≥3 independent attesters across ≥3 WHOIS roots cryptographically vouched for it | `computeVerifiedStatus().verified === true` |
| **Attested** | Has independent attestation(s), but below the Verified bar | not Verified AND `attestation_count > 0` |
| **Self-declared** | Score derives from data the agent supplied about itself; no outside check | not Attested AND any of `provenance`/`transparency`/`security` > 300 (its anonymous baseline) |
| **Registered** | Anonymous baseline registration; no self-declared enrichment, no attestations | none of the above |

Notes:
- **Verified always wins** (checked first); a Verified agent with a modest numeric score is still "Verified" — correct, since Verified is the factual apex.
- The Self-declared/Registered split keys off the **score components** (which both endpoints already have), not the raw agent row — so `getTrustScore` does not need to re-read the agents table. `behavioral` (flat 500) and `peer_attestations` are excluded from the self-declared check (attestations are already captured by `attestation_count`).
- This is a ranking of **evidence strength**, which is factual and is exactly what the registry measures — not a ranking of the agents' worth.

## Components

### 1. `computeEvidenceLabel(...)` — pure function in `api/src/trust.mjs`

Lives beside `computeGrade` for isolation + unit-testability. Signature:

```js
computeEvidenceLabel(verifiedStatus, components) → { label, definition_version }
// verifiedStatus: { verified: bool, attestation_count: number }   (from computeVerifiedStatus)
// components:      { provenance, transparency, security }          (from trust_scores)
```

Logic (first match wins):
1. `verifiedStatus.verified` → `"Verified"`
2. `verifiedStatus.attestation_count > 0` → `"Attested"`
3. `provenance > 300 || transparency > 300 || security > 300` → `"Self-declared"`
4. else → `"Registered"`

Guards: non-finite / null / undefined component values are treated as the baseline (not `> 300`), so a missing `trust_scores` row maps to `"Registered"` (unless Verified/Attested). `verified` is checked first so a Verified agent never falls through on a transient component glitch.

Exports added to `trust.mjs`:
- `EVIDENCE_LABELS_VERSION = "2026-06-09"` — bumped whenever the criteria change (governance artifact, see §Governance).
- `EVIDENCE_LABEL_DISCLAIMER` — the standard "not an endorsement" string (single source of truth).

### 2. API surface — the `evidence` object (additive, nothing removed)

Both responses gain:
```json
"evidence": {
  "label": "Self-declared",
  "definition_version": "2026-06-09",
  "basis": "Derived mechanically from published criteria; not an endorsement or certification by AIR.",
  "criteria_url": "https://agentidentityregistry.org/api/v1/openapi.yaml"
  // ^ points at a guaranteed-served artifact that documents the EvidenceLabel schema.
  // If a human-readable label-definitions page is published on the site, prefer that
  // URL instead — confirm the served path at implementation.
}
```

- **`GET /agents/{id}`** (`index.js:716`) — already calls `computeVerifiedStatus` (729) and has `components` from the join. Just add the `evidence` object. Effectively free.
- **`GET /agents/{id}/trust-score`** (`index.js:921`) — currently reads **only** `trust_scores` and does **not** compute Verified status. It MUST add one `computeVerifiedStatus(airId, db)` call (an indexed JOIN on `subject_air_id`), then build the same `evidence` object. **Failure semantics:** if `computeVerifiedStatus` throws, let it propagate (→ 500), matching `getAgent`'s existing behavior — never silently mislabel. Both endpoints MUST return an identical `evidence` object for the same agent.

Out of scope: the agents **list** endpoint (`listAgents`, 945) is NOT changed (YAGNI; avoids N× verified-status queries per list page).

### 3. `badge.svg` (`index.js:1705`)

The badge shows the **label word**. Its query gains the component columns:
`SELECT a.air_id, a.status, t.total_score, t.provenance, t.transparency, t.security ...`. It already calls `computeVerifiedStatus` (1718). Map label → look:

| Label | Right text | Color |
|---|---|---|
| Verified | `Verified ✓` | green `#4c1` (unchanged look) |
| Attested | `Attested` | blue `#007ec6` |
| Self-declared | `Self-declared` | gray `#9f9f9f` |
| Registered | `Registered` | gray `#9f9f9f` |
| not found (404 agent) | `not found` | gray (unchanged) |

Left label = `AIR` for all states.

**Backward-compat (addresses the critic's badge-regression finding):** support `GET /agents/{id}/badge.svg?format=score` to render the legacy numeric badge (`AIR Trust | <score>`, blue) for existing embedders who want the raw number. Default (no param) = the label word. The SVG `<title>`/`aria-label` includes the disclaimer phrase ("…not an endorsement").

### 4. OpenAPI contract (`api/openapi.yaml`)

- Add an `EvidenceLabel` schema: `{ label: enum[Verified,Attested,Self-declared,Registered], definition_version: string, basis: string, criteria_url: string }`.
- Reference it from the agent GET response schema and the trust-score response schema.
- `openapi.yaml` is a wrangler **Text-module bundle** → prose/schema change requires `wrangler deploy` (not the site deploy). (Project rule: contracts rot silently if the schema isn't updated.)

### 5. Governance / versioning (addresses ungoverned-threshold finding)

The label definitions are a **published, versioned governance artifact**, not magic numbers:
- `docs/SPECIFICATION.md` + `docs/TRUST-SCORE.md` gain an **"Evidence Labels"** section: the four labels, exact criteria, the `definition_version`, the disclaimer, and a link to the **existing dispute/appeals process** (`TRUST-SCORE.md:422`).
- The API echoes `definition_version` so any consumer can tie a label to the exact published criteria.
- Changing criteria = bump `EVIDENCE_LABELS_VERSION` + update the doc + changelog note. The code constant traces to the published spec, never the reverse.

## Tests (`npm run test:api`, the trust.mjs harness)

Unit tests for `computeEvidenceLabel`:
- Verified=true (regardless of components/attestation_count) → "Verified"
- not verified, attestation_count > 0 → "Attested"
- not verified, count 0, `provenance` 500 (or `transparency`/`security` > 300) → "Self-declared"
- not verified, count 0, all components at baseline 300 → "Registered"
- null/undefined/NaN components, not verified, count 0 → "Registered"
- Verified=true wins over a components-only / attested input (ordering assertion)
- `definition_version` is returned and equals `EVIDENCE_LABELS_VERSION`

(Handler-level wiring is covered by the existing endpoint tests; add an assertion that `/trust-score` and `/agents/{id}` return the same `evidence.label` for a fixture agent.)

## Deploy

- `cd api && npx wrangler deploy --dry-run` (bundle check) → `npx wrangler deploy` (ships worker logic + badge + the openapi text bundle in one go).
- `npm run test:api` green first.
- Docs (`SPECIFICATION.md`, `TRUST-SCORE.md`) are repo files; if the site serves a docs/criteria page that `criteria_url` points at, a `./scripts/deploy-site.sh` may be needed to publish it — confirm the served path during implementation.

## Signal hierarchy (addresses signal-proliferation finding)

Documented relationship so the four trust expressions don't read as four competing verdicts:
- **`evidence.label`** — the canonical human-facing classification (what to show users).
- **`verified`** (bool) — the factual core the top label rests on.
- **`trust_score` + `components`** — the transparent "show our work" detail.
- **`trust_grade`** (7 letters) — retained for backward-compat only; documented as a raw/legacy detail, NOT a co-equal public verdict. (Not removed — removing it would break the existing OpenAPI contract.)

## Scope guardrails (YAGNI)

In: the pure function, the two endpoints, the badge (+ `?format=score`), OpenAPI, docs, tests.
Out: list-endpoint label, a dedicated `/labels` or `/tiers` endpoint, slashing/decay, removing the letter grade, localization machinery (the enum string is the stable key; display localization is a client concern).

## Resolved decisions
- Composite-of-evidence, not score-bands → fixes unreachable-tier + neutrality.
- Factual labels, never verdicts → neutrality.
- `getTrustScore` gains a `computeVerifiedStatus` call; throw → 500; both endpoints identical.
- Badge shows the word; `?format=score` preserves the legacy number.
- Definitions are a versioned published artifact echoed via `definition_version`.
