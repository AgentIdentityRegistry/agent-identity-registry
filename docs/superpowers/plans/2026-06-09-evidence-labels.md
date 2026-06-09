# Evidence Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a factual, neutral evidence label (Verified / Attested / Self-declared / Registered) to the agent + trust-score API responses and the badge, describing *what evidence exists* — never a verdict.

**Architecture:** A pure `computeEvidenceLabel(verifiedStatus, components)` function in `api/src/trust.mjs` (unit-tested) is the single source of label logic. Three worker handlers (`getAgent`, `getTrustScore`, `getBadgeSvg`) call it and surface the result. No schema migration — labels derive from existing `trust_scores` components + the attestation graph. OpenAPI + docs are updated so the contract doesn't silently rot.

**Tech Stack:** Cloudflare Worker (`api/src/index.js`), `api/src/trust.mjs`, `node:test` + `node:assert/strict` (`api/test/trust.test.mjs`, run via `npm run test:api`), `openapi.yaml` (wrangler Text-module bundle), `wrangler` for deploy.

**Spec:** `docs/superpowers/specs/2026-06-09-evidence-labels-design.md`

---

## File Structure

- **`api/src/trust.mjs`** — add `computeEvidenceLabel` + 3 constants (`EVIDENCE_LABELS_VERSION`, `EVIDENCE_LABEL_DISCLAIMER`, `EVIDENCE_CRITERIA_URL`). Sole owner of label logic.
- **`api/test/trust.test.mjs`** — add unit tests for `computeEvidenceLabel`.
- **`api/src/index.js`** — modify the import line; add the `evidence` object to `getAgent` and `getTrustScore`; rework `getBadgeSvg` (query + label→look + `?format=score`) and its route call.
- **`api/openapi.yaml`** — add `EvidenceLabel` schema; `$ref` it from `Agent` and `TrustScore`.
- **`docs/SPECIFICATION.md`, `docs/TRUST-SCORE.md`** — add the "Evidence Labels" governance section.

Note: handlers in `index.js` have no unit-test harness (only `trust.mjs` does). The label *logic* is fully unit-tested in Task 1; handler wiring is verified by `node --check` + `wrangler deploy --dry-run` (catches syntax/import/bundle errors) and by production curl in Task 7. This matches the project's existing verification pattern (unit tests + dry-run + post-deploy curl).

---

### Task 1: `computeEvidenceLabel` + constants (pure function, TDD)

**Files:**
- Modify: `api/src/trust.mjs` (append after `computeGrade`)
- Test: `api/test/trust.test.mjs` (append)

- [ ] **Step 1: Write the failing tests** — append to `api/test/trust.test.mjs`:

```js
import {
  computeEvidenceLabel,
  EVIDENCE_LABELS_VERSION,
  EVIDENCE_LABEL_DISCLAIMER,
  EVIDENCE_CRITERIA_URL,
} from "../src/trust.mjs";

test("computeEvidenceLabel: Verified wins over everything", () => {
  assert.equal(computeEvidenceLabel({ verified: true, attestation_count: 0 }, {}), "Verified");
  assert.equal(
    computeEvidenceLabel({ verified: true, attestation_count: 5 }, { provenance: 600 }),
    "Verified"
  );
});

test("computeEvidenceLabel: Attested when not verified but has attestations", () => {
  assert.equal(
    computeEvidenceLabel({ verified: false, attestation_count: 1 }, { provenance: 300 }),
    "Attested"
  );
});

test("computeEvidenceLabel: Self-declared when a component exceeds the 300 baseline", () => {
  assert.equal(computeEvidenceLabel({ verified: false, attestation_count: 0 }, { provenance: 500, transparency: 300, security: 300 }), "Self-declared");
  assert.equal(computeEvidenceLabel({ verified: false, attestation_count: 0 }, { provenance: 300, transparency: 450, security: 300 }), "Self-declared");
  assert.equal(computeEvidenceLabel({ verified: false, attestation_count: 0 }, { provenance: 300, transparency: 300, security: 400 }), "Self-declared");
});

test("computeEvidenceLabel: Registered at bare baseline", () => {
  assert.equal(
    computeEvidenceLabel({ verified: false, attestation_count: 0 }, { provenance: 300, transparency: 300, security: 300 }),
    "Registered"
  );
});

test("computeEvidenceLabel: non-finite/missing components → Registered (when not verified/attested)", () => {
  assert.equal(computeEvidenceLabel({ verified: false, attestation_count: 0 }, {}), "Registered");
  assert.equal(computeEvidenceLabel({ verified: false, attestation_count: 0 }, { provenance: null, transparency: undefined, security: NaN }), "Registered");
  assert.equal(computeEvidenceLabel({}, {}), "Registered");
});

test("evidence label governance constants are present", () => {
  assert.equal(EVIDENCE_LABELS_VERSION, "2026-06-09");
  assert.match(EVIDENCE_LABEL_DISCLAIMER, /not an endorsement/i);
  assert.ok(EVIDENCE_CRITERIA_URL.startsWith("https://"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:api`
Expected: FAIL — `computeEvidenceLabel`/constants are not exported (`SyntaxError` or `undefined`).

- [ ] **Step 3: Implement** — append to `api/src/trust.mjs` after `computeGrade`:

```js
// ---- Evidence labels (item #6) --------------------------------------------
// A FACTUAL label describing WHAT evidence exists for an agent — never a verdict.
// Definitions are a versioned, published governance artifact (see docs/TRUST-SCORE.md
// "Evidence Labels"); bump EVIDENCE_LABELS_VERSION + update the docs when criteria change.
export const EVIDENCE_LABELS_VERSION = "2026-06-09";
export const EVIDENCE_LABEL_DISCLAIMER =
  "Derived mechanically from published criteria; not an endorsement or certification by AIR.";
export const EVIDENCE_CRITERIA_URL =
  "https://agentidentityregistry.org/api/v1/openapi.yaml";

// verifiedStatus: { verified, attestation_count } from computeVerifiedStatus().
// components:      { provenance, transparency, security } from the trust_scores row
//                  (300 is each one's anonymous baseline; behavioral + peer are excluded).
export function computeEvidenceLabel(verifiedStatus = {}, components = {}) {
  if (verifiedStatus.verified) return "Verified";
  if (Number(verifiedStatus.attestation_count) > 0) return "Attested";
  const above = (v) => Number.isFinite(v) && v > 300;
  if (above(components.provenance) || above(components.transparency) || above(components.security)) {
    return "Self-declared";
  }
  return "Registered";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:api`
Expected: PASS (all existing trust + did-keys tests plus the 6 new ones).

- [ ] **Step 5: Commit**

```bash
git add api/src/trust.mjs api/test/trust.test.mjs
git commit -m "feat(trust): computeEvidenceLabel + governance constants"
```

---

### Task 2: Surface `evidence` in `getAgent`

**Files:**
- Modify: `api/src/index.js` (import line; `getAgent` return object)

- [ ] **Step 1: Extend the trust.mjs import** — replace line 9:

```js
import { calculateInitialTrustScore, computeVerifiedStatus, recomputeTrustScore, recomputeDependentsOf } from "./trust.mjs";
```
with:
```js
import { calculateInitialTrustScore, computeVerifiedStatus, recomputeTrustScore, recomputeDependentsOf, computeEvidenceLabel, EVIDENCE_LABELS_VERSION, EVIDENCE_LABEL_DISCLAIMER, EVIDENCE_CRITERIA_URL } from "./trust.mjs";
```

- [ ] **Step 2: Add the `evidence` object to `getAgent`** — in the `return json({ ... })` of `getAgent`, immediately after the `components: { ... },` block (the one ending with `peer_attestations: agent.peer_attestations,\n    },`), insert:

```js
    evidence: {
      label: computeEvidenceLabel(verifiedStatus, {
        provenance: agent.provenance,
        transparency: agent.transparency,
        security: agent.security,
      }),
      definition_version: EVIDENCE_LABELS_VERSION,
      basis: EVIDENCE_LABEL_DISCLAIMER,
      criteria_url: EVIDENCE_CRITERIA_URL,
    },
```
(`verifiedStatus` is already computed earlier in `getAgent`; `agent.provenance/transparency/security` come from the existing `trust_scores` join.)

- [ ] **Step 3: Verify it bundles**

Run: `node --check api/src/index.js && cd api && npx wrangler deploy --dry-run && cd ..`
Expected: `node --check` silent (valid syntax); dry-run prints "Total Upload …" with no import/bundle errors.

- [ ] **Step 4: Commit**

```bash
git add api/src/index.js
git commit -m "feat(api): add evidence label to GET /agents/{id}"
```

---

### Task 3: Surface `evidence` in `getTrustScore`

**Files:**
- Modify: `api/src/index.js` (`getTrustScore`)

- [ ] **Step 1: Compute Verified status + add `evidence`** — in `getTrustScore`, after the `if (!score) { return json(...404...) }` guard and before the `return json({ ... })`, add:

```js
  // Label needs Verified status; getTrustScore otherwise reads only trust_scores.
  // If this throws, let it propagate (→ 500) — never silently mislabel.
  const verifiedStatus = await computeVerifiedStatus(airId, db);
```
Then in the `return json({ ... })`, after `calculated_at: score.calculated_at,`, insert:

```js
    evidence: {
      label: computeEvidenceLabel(verifiedStatus, {
        provenance: score.provenance,
        transparency: score.transparency,
        security: score.security,
      }),
      definition_version: EVIDENCE_LABELS_VERSION,
      basis: EVIDENCE_LABEL_DISCLAIMER,
      criteria_url: EVIDENCE_CRITERIA_URL,
    },
```

- [ ] **Step 2: Verify it bundles**

Run: `node --check api/src/index.js && cd api && npx wrangler deploy --dry-run && cd ..`
Expected: valid + clean dry-run.

- [ ] **Step 3: Commit**

```bash
git add api/src/index.js
git commit -m "feat(api): add evidence label to GET /agents/{id}/trust-score"
```

---

### Task 4: Badge shows the label word + `?format=score` fallback

**Files:**
- Modify: `api/src/index.js` (badge route call ~line 72-74; `getBadgeSvg`)

- [ ] **Step 1: Pass the `format` query param into the handler** — in the badge route branch (the `path.match(/.../badge\.svg$/)` block near line 72), change the `getBadgeSvg` call to pass the format param. Replace:

```js
        const airId = path.split("/")[4];
        response = await getBadgeSvg(airId, env.DB);
```
with:
```js
        const airId = path.split("/")[4];
        response = await getBadgeSvg(airId, env.DB, url.searchParams.get("format"));
```
(`url` is already in router scope — `listAgents(url, ...)` uses it.)

- [ ] **Step 2: Rework `getBadgeSvg`** — change its signature and body. Replace the signature line `async function getBadgeSvg(airId, db) {` with `async function getBadgeSvg(airId, db, format) {`. Replace the query (the `SELECT a.air_id, a.status, t.total_score ...` block) with one that also selects the components:

```js
  const agent = await db.prepare(`
    SELECT a.air_id, a.status, t.total_score, t.provenance, t.transparency, t.security
    FROM agents a LEFT JOIN trust_scores t ON a.air_id = t.air_id
    WHERE a.air_id = ?
  `).bind(airId).first();
```
Then replace the label/color block (the `let leftLabel, rightLabel, rightColor; if (!agent) { ... } else { ... }`) with:

```js
  let leftLabel, rightLabel, rightColor;
  if (!agent) {
    leftLabel = "AIR";
    rightLabel = "not found";
    rightColor = "#9f9f9f";
  } else if (format === "score") {
    // Legacy numeric badge for existing embedders.
    leftLabel = "AIR Trust";
    rightLabel = agent.total_score != null ? String(agent.total_score) : "no score";
    rightColor = agent.total_score != null ? "#007ec6" : "#9f9f9f";
  } else {
    const status = await computeVerifiedStatus(airId, db);
    const label = computeEvidenceLabel(status, {
      provenance: agent.provenance,
      transparency: agent.transparency,
      security: agent.security,
    });
    leftLabel = "AIR";
    if (label === "Verified") {
      rightLabel = "Verified ✓";
      rightColor = "#4c1";
    } else if (label === "Attested") {
      rightLabel = "Attested";
      rightColor = "#007ec6";
    } else {
      rightLabel = label; // "Self-declared" | "Registered"
      rightColor = "#9f9f9f";
    }
  }
```
Then update the SVG `aria-label`/`<title>` to carry the disclaimer. Change the `<svg ... aria-label="..."> <title>...</title>` lines so the title reads:

```js
  <title>${escape(leftLabel)}: ${escape(rightLabel)} — ${escape(EVIDENCE_LABEL_DISCLAIMER)}</title>
```
(Leave the rest of the SVG rendering — widths, gradient, text scaling — unchanged.)

- [ ] **Step 3: Verify it bundles**

Run: `node --check api/src/index.js && cd api && npx wrangler deploy --dry-run && cd ..`
Expected: valid + clean dry-run.

- [ ] **Step 4: Commit**

```bash
git add api/src/index.js
git commit -m "feat(api): badge shows evidence label word; ?format=score keeps legacy number"
```

---

### Task 5: OpenAPI — `EvidenceLabel` schema + `$ref`s

**Files:**
- Modify: `api/openapi.yaml`

- [ ] **Step 1: Add the `EvidenceLabel` schema** — under `components:` → `schemas:` (starts ~line 832), add a new schema (place it alphabetically near `Agent`/before `TrustScore`):

```yaml
    EvidenceLabel:
      type: object
      description: >
        Factual classification of WHAT evidence exists for an agent — never a verdict
        or endorsement. Definitions are versioned (see docs/TRUST-SCORE.md "Evidence Labels").
      properties:
        label:
          type: string
          enum: [Verified, Attested, Self-declared, Registered]
          description: >
            Verified = >=3 independent attesters across >=3 WHOIS roots;
            Attested = some independent attestation, below the Verified bar;
            Self-declared = score from self-reported data, no independent check;
            Registered = anonymous baseline, no enrichment, no attestations.
        definition_version:
          type: string
          description: Version of the published label criteria these results were computed under.
          examples: ["2026-06-09"]
        basis:
          type: string
          description: Standard disclaimer — mechanically derived, not an endorsement.
        criteria_url:
          type: string
          format: uri
      required: [label, definition_version, basis, criteria_url]
```

- [ ] **Step 2: Reference it from `Agent`** — in the `Agent` schema (description "Full agent record returned by `GET /agents/{air_id}`", ~line 949), under its `properties:`, add (near `verification_status`):

```yaml
        evidence:
          $ref: "#/components/schemas/EvidenceLabel"
```

- [ ] **Step 3: Reference it from `TrustScore`** — in the `TrustScore` schema (~line 883), under its `properties:`, add:

```yaml
        evidence:
          $ref: "#/components/schemas/EvidenceLabel"
```

- [ ] **Step 4: Validate the YAML parses**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('api/openapi.yaml')); print('openapi.yaml: valid YAML')"`
Expected: `openapi.yaml: valid YAML` (no traceback). If `pyyaml` is unavailable, run `cd api && npx wrangler deploy --dry-run` — the text bundle must still build.

- [ ] **Step 5: Commit**

```bash
git add api/openapi.yaml
git commit -m "docs(api): add EvidenceLabel schema to openapi.yaml"
```

---

### Task 6: Docs sync — governance section

**Files:**
- Modify: `docs/SPECIFICATION.md`, `docs/TRUST-SCORE.md`

- [ ] **Step 1: Add an "Evidence Labels" section to `docs/TRUST-SCORE.md`** — after the "Current ceiling" note (~line 49), add:

```markdown
## Evidence Labels (v2026-06-09)

Every agent carries one **factual** label describing *what evidence exists* — never a verdict. Surfaced in `GET /agents/{id}` and `GET /agents/{id}/trust-score` (the `evidence` object) and on `badge.svg`.

| Label | Criteria |
|---|---|
| **Verified** | Verified status: ≥3 independent attesters across ≥3 distinct WHOIS roots |
| **Attested** | Not Verified, but ≥1 active independent attestation exists |
| **Self-declared** | No attestations; score raised above the anonymous baseline by self-reported provenance/transparency/security data (any component > 300) |
| **Registered** | Anonymous baseline; no enrichment, no attestations |

Labels are mechanically derived and are **not an endorsement or certification by AIR**. The criteria are versioned (`definition_version` in the API echoes the version above); changes are announced and changelogged. Disputes follow the [trust-score dispute process](#disputes) (see below). `badge.svg?format=score` returns the legacy numeric badge.
```
(Adjust the `#disputes` anchor to match the actual heading slug of the existing dispute/appeals section in this file.)

- [ ] **Step 2: Add the same section reference to `docs/SPECIFICATION.md`** — after the "Current ceiling" subsection (~line 281-283), add:

```markdown
### Evidence Labels

In addition to the numeric score and letter grade, every agent carries a factual **evidence label** — `Verified` / `Attested` / `Self-declared` / `Registered` — describing what independent evidence exists, never a verdict. It is the canonical human-facing classification; the numeric score + components are the transparent detail, and the legacy letter grade is retained for backward compatibility only. Full criteria + versioning: see `docs/TRUST-SCORE.md` → "Evidence Labels". Exposed in the `evidence` object on `GET /agents/{air_id}` and `/trust-score`, and on `badge.svg`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/SPECIFICATION.md docs/TRUST-SCORE.md
git commit -m "docs: document Evidence Labels + versioning + disclaimer"
```

---

### Task 7: Full verification + production deploy (CONFIRM BEFORE DEPLOYING)

**Files:** none (verification + deploy)

- [ ] **Step 1: Full unit suite green**

Run: `npm run test:api`
Expected: PASS (all trust + did-keys + new evidence tests).

- [ ] **Step 2: Bundle dry-run**

Run: `cd api && npx wrangler deploy --dry-run && cd ..`
Expected: clean bundle, no errors.

- [ ] **Step 3: Independent review pass (do NOT self-approve)** — dispatch a code-reviewer/verifier on the diff (`git diff main...feat/evidence-labels`) before deploying. Confirm: no verdict-words leaked in, `evidence` object identical across both endpoints, badge `?format=score` works, OpenAPI matches the actual response shapes.

- [ ] **Step 4: Deploy the worker** (⚠️ production — get Peter's explicit go first)

Run: `cd api && npx wrangler deploy && cd ..`
Then confirm the serving version: `cd api && npx wrangler deployments list | head` (note the new version hash for the handoff).

- [ ] **Step 5: Production smoke tests**

```bash
# A self-declared or registered demo agent — expect an "evidence" object with a factual label
curl -s https://agentidentityregistry.org/api/v1/agents/AIR-WBA1-DEMO-AGT0 | python3 -m json.tool | grep -A6 '"evidence"'
curl -s https://agentidentityregistry.org/api/v1/agents/AIR-WBA1-DEMO-AGT0/trust-score | python3 -m json.tool | grep -A6 '"evidence"'
# Badge: default shows the label word; ?format=score shows the legacy number
curl -s "https://agentidentityregistry.org/api/v1/agents/AIR-WBA1-DEMO-AGT0/badge.svg" | grep -o 'aria-label="[^"]*"'
curl -s "https://agentidentityregistry.org/api/v1/agents/AIR-WBA1-DEMO-AGT0/badge.svg?format=score" | grep -o 'aria-label="[^"]*"'
# Served OpenAPI carries the new schema
curl -s https://agentidentityregistry.org/api/v1/openapi.yaml | grep -c "EvidenceLabel"
```
Expected: both JSON endpoints return an identical `evidence` object; default badge aria-label contains the label word + disclaimer; `?format=score` badge shows the number; openapi grep ≥ 1.

- [ ] **Step 6: Push the branch + open PR**

```bash
git push -u origin feat/evidence-labels
gh pr create --title "feat: agent evidence labels (#6, reworked)" --body "Implements docs/superpowers/specs/2026-06-09-evidence-labels-design.md"
```

---

## Self-Review (against the spec)

**Spec coverage:** ✅ pure function + constants (T1) · ✅ getAgent (T2) · ✅ getTrustScore + computeVerifiedStatus call + throw→500 (T3) · ✅ badge word + `?format=score` + disclaimer in title (T4) · ✅ OpenAPI EvidenceLabel + refs (T5) · ✅ governance/versioning + disclaimer + appeals link in docs (T6) · ✅ deploy + identical-across-endpoints check + review pass (T7). Signal-hierarchy + "grade kept for compat" documented in T6 Step 2.

**Placeholder scan:** none — every code/command step has concrete content. The only adjust-at-edit note is the `#disputes` anchor slug in T6 (real heading exists; slug confirmed at edit time).

**Type consistency:** `computeEvidenceLabel(verifiedStatus, components)` signature + return strings (`"Verified"|"Attested"|"Self-declared"|"Registered"`) and the three constant names are identical across T1–T6. `verifiedStatus` fields (`verified`, `attestation_count`) match `computeVerifiedStatus`'s return shape in `trust.mjs`.

**No schema migration** — confirmed; labels derive from existing data.
