# AIR Trust Score Methodology

**Version**: 1.0  
**Last Updated**: 2026-06-03  
**Effective Date**: 2026-04-01

---

## Overview

The AIR Trust Score provides a standardized, transparent assessment of AI agent trustworthiness on a scale of 0-1000. This document details the methodology, scoring rubrics, evidence requirements, and dispute resolution procedures.

The methodology below has two layers, clearly separated throughout:

- **Implemented today** — the exact scoring the deployed engine computes right now (`api/src/trust.mjs`). These are the numbers a real agent receives.
- **Target rubric (not yet implemented)** — the richer aspirational criteria we are building toward. These describe future inputs (behavioral telemetry, third-party audits, etc.) and do **not** affect live scores.

## Trust Score Formula

Each component is scored 0-1000, then combined as a **weighted sum** (not an equally-weighted average):

```
Trust Score = round( 0.25·P + 0.25·B + 0.20·T + 0.15·S + 0.15·A )

where components are each scored 0-1000:
  P = Provenance Score        (weight: 25%)
  B = Behavioral Score        (weight: 25%)
  T = Transparency Score      (weight: 20%)
  S = Security Score          (weight: 15%)
  A = Peer Attestation Score  (weight: 15%)

Result: 0-1000 points (rounded to the nearest integer)
```

The five weights sum to 1.0, so the result stays on the 0-1000 scale.

## Trust Grades

| Score | Grade | Description | Use Cases |
|-------|-------|-------------|-----------|
| ≥ 950 | AAA | Exceptional | Critical infrastructure, high-security operations |
| ≥ 850 | AA | High trust | Production systems, regulated industries |
| ≥ 700 | A | Good trust | General production use |
| ≥ 600 | BBB | Moderate trust | Non-critical production, with monitoring |
| ≥ 500 | BB | Lower trust | Secondary systems, controlled environments |
| ≥ 400 | B | Low trust | Limited production, primarily testing |
| < 400 | C | Minimal | Research, testing, sandboxed only |

> **Current ceiling**: With today's implemented scoring, a maximally-favourable agent (Provenance 600, Behavioral 500, Transparency 650, Security 600, Peer Attestations capped at 1000) reaches a total of **645 — grade BBB**. Grades A, AA, and AAA are therefore reserved until behavioral telemetry and higher-confidence inputs ship; no live agent can reach them yet.

## Evidence Labels (v2026-06-09)

Every agent carries one **factual** label describing *what evidence exists* — never a verdict. Surfaced in `GET /agents/{id}` and `GET /agents/{id}/trust-score` (the `evidence` object) and on `badge.svg`.

| Label | Criteria |
|---|---|
| **Verified** | Verified status: verification_score ≥ 300 across ≥3 distinct WHOIS roots |
| **Attested** | Not Verified, but ≥1 active independent attestation exists |
| **Self-declared** | No attestations; score raised above the anonymous baseline by self-reported provenance/transparency/security data (any component > 300) |
| **Registered** | Anonymous baseline; no enrichment, no attestations |

Labels are mechanically derived and are **not an endorsement or certification by AIR**. The criteria are versioned (`definition_version` in the API echoes the version above); changes are announced and changelogged. Disputes follow the [trust-score dispute process](#dispute--appeals-process). `badge.svg?format=score` returns the legacy numeric badge.

## Component Rubrics

### 1. Provenance Score (25% weight)

**Purpose**: Verify the agent's origins, creator credibility, and development practices.

#### Implemented today

Base **300**, plus signals from the registration record, **capped at 600**:

- Creator DID present: **+100**
- Creator name present: **+100**
- Creator type is `organization`: **+100**

So an anonymous registration scores 300; a fully-identified organization caps at 600.

#### Target rubric (not yet implemented)

The detailed criteria below describe the richer provenance signals we are building toward (independent code review, training-data provenance, etc.). They are **not** part of the live score today.

**Creator Identity & Verification** (Max 200 points)
- Creator DID registered and verifiable: +50
- Creator organization identified: +50
- Creator has established history (2+ years): +50
- Creator has published other agents: +50

**Source Transparency** (Max 250 points)
- Source code publicly available: +100
- Code licensed under open-source license: +50
- Git history available and complete: +50
- Code reviewed by independent parties: +50

**Development Practices** (Max 300 points)
- Development process documented: +75
- Tested with explicit test suite: +75
- Security review conducted: +75
- Version control with clear release process: +75

**Training & Data Provenance** (Max 250 points)
- Training data sources documented: +75
- Data licenses verified: +50
- Training methodology published: +75
- Model card or similar documentation: +50

#### Evidence Requirements

**For 900+ Provenance Score:**
- Creator must provide evidence checklist
- Public GitHub repository with full history
- Published security audit report (third-party)
- Clear version tags with release notes
- Training data provenance documentation

**For 800-899:**
- Code repository (GitHub, GitLab, or similar)
- Creator identified with organizational affiliation
- Basic documentation of training approach
- Some evidence of testing practices

**For 700-799:**
- Creator claims verifiable (via DID or email)
- Code available upon request
- Basic documentation exists

**Below 700:**
- Creator claims unverified
- Code not publicly available
- No training documentation

### 2. Behavioral Score (25% weight)

**Purpose**: Assess actual agent behavior and performance in practice.

#### Implemented today

Behavioral scoring is a **flat 500 placeholder** for every agent. Signed action history and live telemetry are future work, so this component does not yet differentiate agents.

#### Target rubric (not yet implemented)

The metrics below describe the behavioral signals (uptime, error rate, drift detection, incident history) we intend to fold in once verifiable telemetry is available. They are **not** part of the live score today.

**Performance Metrics** (Max 300 points)
- 99.0%+ uptime: +100
- Mean response time < 1 second: +75
- Latency consistency (std dev < 100ms): +50
- 99%+ successful request completion: +75

**Error & Failure Analysis** (Max 250 points)
- Error rate < 0.1%: +100
- No unrecoverable failures in 30 days: +75
- Graceful degradation when overloaded: +50
- Clear error messages and logging: +25

**Consistency & Drift Detection** (Max 300 points)
- Output consistency check: agent behaves consistently: +100
- No behavioral drift detected: +100
- Predicted behavior matches actual behavior: +100
- Handles edge cases gracefully: +0-50 (subjective)

**Security Incident History** (Max 150 points)
- No reported security incidents: +150
- Incidents handled transparently: +0-100 (if incidents exist)
- Rapid patching of vulnerabilities: +50

#### Evidence Requirements

**For 900+ Behavioral Score:**
- 90+ days of production traffic data
- Third-party monitoring reports
- Public uptime dashboard
- Documented response to any incidents
- Load testing results available

**For 800-899:**
- 30+ days of production data
- Performance metrics available
- Error logs reviewed
- Response time baselines established

**For 700-799:**
- 14+ days of operational data
- Basic uptime data
- Error rate information
- No major incidents

**Below 700:**
- Less than 14 days data, OR
- Error rate > 5%, OR
- Unresolved critical incidents, OR
- Unknown behavior

### 3. Transparency Score (20% weight)

**Purpose**: Measure how openly creators communicate about their agent.

#### Implemented today

Base **300**, plus signals declared at registration, **capped at 650**:

- Open-source flag set: **+150**
- Code repository URL provided: **+100**
- Documentation URL provided: **+100**

A fully-transparent registration caps at 650.

#### Target rubric (not yet implemented)

The criteria below describe the broader transparency signals (transparency reports, community engagement, openness to audits) we are building toward. They are **not** part of the live score today.

**Documentation** (Max 300 points)
- Public documentation exists: +100
- API documentation complete: +75
- Examples and tutorials provided: +50
- Documentation maintained and current: +75

**Limitations & Capabilities** (Max 250 points)
- Known limitations documented: +100
- Capabilities clearly defined: +75
- Failure modes identified: +50
- Edge cases documented: +25

**Communication** (Max 250 points)
- Public issue tracking (GitHub, JIRA): +75
- Regular blog posts or updates: +50
- Community engagement/response: +75
- Transparency reports published: +50

**Openness to Scrutiny** (Max 200 points)
- Open to independent audits: +100
- Security disclosure program: +50
- Responds to vulnerability reports: +50

#### Evidence Requirements

**For 900+ Transparency Score:**
- Comprehensive public documentation
- Regular blog updates (monthly or more)
- Public bug tracker with active engagement
- Published limitation statement
- Quarterly transparency reports
- Published security policy

**For 800-899:**
- Complete documentation with examples
- Regular updates (quarterly or better)
- Responsive to public questions
- Known limitations documented

**For 700-799:**
- Basic documentation available
- Creator responds to inquiries
- Some limitations noted

**Below 700:**
- Minimal documentation, OR
- Unresponsive to questions, OR
- Hidden limitations discovered

### 4. Security Score (15% weight)

**Purpose**: Assess security posture and incident response.

#### Implemented today

Base **300**, plus **+100 per declared certification** (up to **+300**, i.e. 3 certifications), **capped at 600**:

- 0 certs → 300
- 1 cert → 400
- 2 certs → 500
- 3 or more certs → 600 (cap)

Certifications are taken from the agent's declared `security_certifications` list; they are self-declared at registration and not yet independently verified.

#### Target rubric (not yet implemented)

The criteria below describe the deeper security signals (verified SOC 2 / ISO 27001 audits, infrastructure controls, incident-response maturity) we are building toward. They are **not** part of the live score today.

**Certifications & Frameworks** (Max 300 points)
- SOC 2 Type II certification: +100
- ISO 27001 certification: +100
- NIST Cybersecurity Framework compliance: +50
- CIS Controls Level 2: +50

**Infrastructure & Operations** (Max 350 points)
- Encryption in transit (TLS 1.3+): +75
- Encryption at rest: +75
- Access controls and RBAC: +75
- Regular security audits (annual): +75
- Vulnerability scanning (automated): +50

**Incident Response** (Max 200 points)
- Formal incident response plan: +75
- Security disclosure program: +75
- MTTR for critical issues < 24h: +50

**Additional Security Measures** (Max 150 points)
- Rate limiting and DDoS protection: +50
- Input validation and sanitization: +50
- Security headers and CORS policy: +50

#### Evidence Requirements

**For 900+ Security Score:**
- Current SOC 2 Type II or ISO 27001
- Third-party security audit (past 12 months)
- Published security policy
- Active CVE monitoring
- Documented incident response procedures
- Regular penetration testing

**For 800-899:**
- Clear security practices
- Evidence of encryption and access controls
- Audit history available
- Vulnerability disclosure program

**For 700-799:**
- Basic security measures in place
- Some certification or audit evidence
- Responsive to security concerns

**Below 700:**
- Minimal security measures, OR
- No certifications, OR
- No incident response plan, OR
- Unpatched known vulnerabilities

### 5. Peer Attestation Score (15% weight)

**Purpose**: Incorporate attestations from verified external parties.

#### Implemented today

Driven by the real attestation graph with **diminishing returns**:

```
A = min( 300 + round(18 · √W), 1000 )
```

where **W** is the frozen-weight sum over *active* attestations from *active* attesters — each attestation contributes `attester_trust_at_issue × tenure_multiplier_at_issue`, frozen at issue time. With no attestations, `W = 0` and the sub-score is the baseline **300**; the square-root curve means each additional vouch adds less than the last, with a hard ceiling of **1000**.

Only attestations from active attesters count. A vouch from a deleted or deactivated identity is dropped (the **dead-vouch filter**), so trust cannot be propped up by vanished attesters.

#### AIR Verified badge

Separate from the numeric sub-score, an agent earns the **AIR Verified** badge when **both** hold:

- **verification_score ≥ 300** — the same frozen-weight sum `W` described above, AND
- **≥ 3 distinct WHOIS roots** among its attesters — i.e. endorsements rooted in at least three independent domains.

Only active attestations from active attesters are counted toward both thresholds (the dead-vouch filter applies here too). This prevents a single domain, or a cluster of dead identities, from manufacturing a Verified badge.

#### Target rubric (not yet implemented)

The detailed count/diversity/tier scheme below describes a richer attestation model (per-organization diversity bonuses, verifier tiers, negative-attestation deductions) we are exploring. It is **not** the live formula today — the implemented score is the square-root curve above.

**Attestation Count & Quality** (Max 1000 points)
- Each unique verified attestation: +50 (max 500 from count alone)
- Bonus for diversity:
  - 2+ different organizations: +100
  - 5+ different organizations: +200
  - 10+ different organizations: +300
  - 20+ different organizations: +500
  - Cap: 1000 total

**Attestation Verifier Tier** (Additional scoring)
- Foundation-verified verifier attestation: +100 each (max 2)
- Organization with AAA trust score: +50 each (max 2)
- Established organization attestation: +25 each (max 4)

**Negative Attestations** (Deductions)
- Each credible negative attestation: -200
- Multiple negatives from same source: -50 each additional
- Floor: Cannot go below 0

#### Evidence Requirements

**For 900+ Attestation Score:**
- 10+ diverse attestations from established organizations
- Includes attestations from Foundation-verified verifiers
- Diverse geographic and industry representation
- Multiple independent confirmations of capabilities
- No negative attestations

**For 800-899:**
- 5+ attestations from different organizations
- Mix of organization types
- Specific capability attestations
- Recent attestations (within 12 months)

**For 700-799:**
- 2+ distinct attestations
- From recognized organizations
- Related to specific capabilities

**Below 700:**
- No independent attestations, OR
- Attestations from unverified sources, OR
- Credible negative attestations present

## Score Calculation Example

**Agent: AnalyticsBot-v2** (using the implemented formula)

| Component | Score | How it was earned |
|-----------|-------|-------------------|
| Provenance (P) | 400 | Creator DID present (+100); no org type or creator name → 300 + 100 |
| Behavioral (B) | 500 | Flat placeholder (telemetry not yet implemented) |
| Transparency (T) | 550 | Open-source (+150); no repo/docs URL → 300 + 150 |
| Security (S) | 400 | One declared certification (+100) → 300 + 100 |
| Peer Attestations (A) | 300 | Baseline; no active attestations yet (W = 0) |

**Trust Score Calculation:**
```
Score = round( 0.25·P + 0.25·B + 0.20·T + 0.15·S + 0.15·A )
      = round( 0.25·400 + 0.25·500 + 0.20·550 + 0.15·400 + 0.15·300 )
      = round( 100 + 125 + 110 + 60 + 45 )
      = round( 440 )
      = 440
```

**Grade**: B (≥ 400)

## Recalculation Frequency

Scores are recomputed from the live attestation graph and registration record. There is **no quarterly cadence**.

- **Event-driven**: Recalculated immediately when an attestation is created or revoked, when an agent record is edited, or when an attester is deleted (which rescores every subject that attester vouched for, via the dead-vouch filter).
- **Weekly cron**: A scheduled sweep runs every Sunday at 03:00 UTC (`0 3 * * SUN`) to catch any drift and re-derive scores from current data.
- **Dispute**: An agent may request a manual recalculation if evidence is reviewed (see below).

## Dispute & Appeals Process

### Initial Dispute

An agent creator can dispute a score within 30 days of publication by:

1. Submitting detailed explanation of disagreement
2. Providing new evidence or corrections
3. Identifying factual errors in methodology application

**Filing**: File via https://agentidentityregistry.org/disputes with supporting documentation

### Review Process

1. **Intake** (1-2 days): Dispute logged, preliminary check for completeness
2. **Investigation** (5-10 days): Independent reviewer examines evidence and calculations
3. **Preliminary Determination** (2-3 days): Reviewer provides written explanation
4. **Appeal** (1 week): If unsatisfied, escalate to Foundation Disputes Committee
5. **Final Decision** (10 days): Committee reviews and issues final ruling

### Potential Outcomes

- **Score upheld**: No change; explanation provided
- **Score adjusted**: Evidence accepted; new calculation provided
- **Methodology concern**: If systematic error identified, may recalculate all agents
- **Credential retraction**: If fraudulent evidence discovered, credential removed

### Committee Composition

- 3 voting members from Foundation board
- 1 independent subject matter expert (rotated quarterly)
- Agent may request written statement included in final decision
- Process is transparent and documented publicly

## Transparency & Auditing

### Public Data

All scores and supporting evidence are publicly available:
- https://agentidentityregistry.org/agents - Full registry search
- Scores recomputed on-event and by a weekly cron (see Recalculation Frequency)
- Score histories available (last 24 months)
- Calculation components publicly displayed

### External Auditing

- Annual independent audit of methodology
- Sample verification of score calculations
- Audit reports published publicly
- Community can file methodology concerns as GitHub issues

## Agent-Record Audit Log

Every create, update, and delete operation on an agent record is written to a public, append-only, hash-linked log. The log records the **fact** of each change — which field names changed, when, and which actor type performed it — never the old or new field values.

### What is logged

| Event | Trigger |
|-------|---------|
| `registered` | Agent registration |
| `updated` | `PUT /agents/{air_id}` (owner) |
| `deleted` | `DELETE /agents/{air_id}` (admin) |
| `redacted` | GDPR erasure tombstone (see below) |

### Hash recipe

Each entry's `entry_hash` is:

```
sha256hex(
  [air_id, event, sortedJCS(changed_fields) or "", actor, created_at].join("\n")
  + "\n" + prev_hash
)
```

- `changed_fields` is serialized as **sorted JCS** (RFC 8785) so the hash is deterministic regardless of field order.
- For events where `changed_fields` is `null` (register/delete/redact), the empty string `""` is used in the hash input.
- The genesis entry uses the literal string `"GENESIS"` as `prev_hash`.

### Actor semantics

| Actor | Meaning |
|-------|---------|
| `registrant` | Self-asserted registrant at registration — **not** an authenticated owner |
| `owner` | Holder of the agent secret at update time |
| `admin` | Admin-key deletion |
| `system` | Reserved for cron-driven changes |

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /agents/{air_id}/history` | Paginated history for one agent |
| `GET /audit/verify?from=&to=` | Bounded integrity check of the global audit chain |

### Integrity claim (Phase A — honest interim statement)

Tamper-evident against accidental corruption and partial edits — anyone can re-derive every hash and check the `prev_hash` linkage. Operator-level tamper-evidence (resistance to AIR itself rewriting or truncating history) is delivered by a forthcoming weekly external anchor; until that ships, this log is **NOT a trustless guarantee against the operator**.

### GDPR and erasure

The chain stores only pseudonymous data (AIR ID, field names, timing). Legal erasure is handled by a `redacted` tombstone event — silent removal would break the hash chain. Legal review is recommended before any GDPR-scope production launch.

### Backfill note

History is tracked from the audit-log launch date (2026-06-09). Agents registered before that date have no `registered` entry in the log.

---

## Special Cases

### New Agents (< 30 days operational)

- Behavioral is a flat 500 for *every* agent today (telemetry not yet implemented), so new agents are not penalised on that component.
- Provenance, Transparency, Security, and Peer Attestations are calculated normally from the registration record and attestation graph.
- Maximum achievable total today is **645** (grade BBB); see the current-ceiling note under Trust Grades.

### Major Version Updates

- A version bump will reset behavioral history *once behavioral telemetry ships* (today behavioral is a flat placeholder, so there is no per-version history yet).
- Previous version history preserved in registry
- New AIR ID generated for significant updates
- Previous version available for reference

### Inactive Agents (> 90 days no activity)

- Score automatically flagged "inactive"
- Behavioral freezing applies once behavioral telemetry ships; today behavioral is a flat 500 placeholder for active and inactive agents alike.
- Reactivation reverses flag and resumes scoring
- Inactive longer than 2 years: may be archived

## Future Enhancements

Planned improvements for v2.0:
- Machine learning-assisted anomaly detection
- Real behavioral scoring from signed action history (replacing today's flat-500 placeholder)
- Fine-grained capability attestations
- Domain-specific scoring (e.g., medical, financial)
- Privacy-preserving score verification

---

For questions about methodology, contact: trust-score@agentidentityregistry.org