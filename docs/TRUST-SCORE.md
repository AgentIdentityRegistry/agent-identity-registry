# AIR Trust Score Methodology

**Version**: 1.0  
**Last Updated**: 2026-03-18  
**Effective Date**: 2026-04-01

---

## Overview

The AIR Trust Score provides a standardized, transparent assessment of AI agent trustworthiness on a scale of 0-1000. This document details the methodology, scoring rubrics, evidence requirements, and dispute resolution procedures.

## Trust Score Formula

```
Trust Score = 200 × (P + B + T + S + A) / 5

where components are each scored 0-1000:
  P = Provenance Score (weight: 25%)
  B = Behavioral Score (weight: 25%)  
  T = Transparency Score (weight: 20%)
  S = Security Score (weight: 15%)
  A = Peer Attestation Score (weight: 15%)

Result: 0-1000 points
```

## Trust Grades

| Score Range | Grade | Description | Use Cases |
|-----------|-------|-------------|-----------|
| 950-1000 | AAA | Exceptional | Critical infrastructure, high-security operations |
| 900-949 | AA | High trust | Production systems, regulated industries |
| 850-899 | A | Good trust | General production use |
| 800-849 | BBB | Moderate trust | Non-critical production, with monitoring |
| 700-799 | BB | Lower trust | Secondary systems, controlled environments |
| 600-699 | B | Low trust | Limited production, primarily testing |
| 0-599 | C | Minimal | Research, testing, sandboxed only |

## Component Rubrics

### 1. Provenance Score (25% weight)

**Purpose**: Verify the agent's origins, creator credibility, and development practices.

#### Scoring Breakdown

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

#### Scoring Breakdown

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

#### Scoring Breakdown

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

#### Scoring Breakdown

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

#### Scoring Breakdown

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

**Agent: AnalyticsBot-v2**

| Component | Score | Calculation |
|-----------|-------|-------------|
| Provenance | 875 | Creator verified, code public, security audit available |
| Behavioral | 820 | 99.2% uptime, 0.3% error rate, 30 days data |
| Transparency | 900 | Complete docs, active issue tracking, quarterly updates |
| Security | 850 | ISO 27001, TLS 1.3, regular audits, no incidents |
| Peer Attestations | 750 | 6 independent attestations from 4 organizations |

**Trust Score Calculation:**
```
Score = 200 × (875 + 820 + 900 + 850 + 750) / 5
      = 200 × 4195 / 5
      = 200 × 839
      = 838
```

**Grade**: BBB (800-849 range)

## Recalculation Frequency

- **Automatic**: Quarterly (every 90 days) with latest behavioral data
- **On-Demand**: When new attestations added or security incidents reported
- **Accelerated**: If component score drops > 50 points, recalculated within 5 days
- **Dispute**: Agent can request recalculation if evidence reviewed

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
- Scores updated quarterly
- Score histories available (last 24 months)
- Calculation components publicly displayed

### External Auditing

- Annual independent audit of methodology
- Sample verification of score calculations
- Audit reports published publicly
- Community can file methodology concerns as GitHub issues

## Special Cases

### New Agents (< 30 days operational)

- Behavioral score capped at 500 until 30 days data available
- Provenance and Transparency scores calculated normally
- Maximum achievable score: ~750

### Major Version Updates

- Version bump resets behavioral history
- Previous version history preserved in registry
- New AIR ID generated for significant updates
- Previous version available for reference

### Inactive Agents (> 90 days no activity)

- Score automatically flagged "inactive"
- Behavioral component frozen at last active value
- Reactivation reverses flag and resumes scoring
- Inactive longer than 2 years: may be archived

## Future Enhancements

Planned improvements for v2.0:
- Machine learning-assisted anomaly detection
- Continuous behavioral scoring (vs. quarterly)
- Fine-grained capability attestations
- Domain-specific scoring (e.g., medical, financial)
- Privacy-preserving score verification

---

For questions about methodology, contact: trust-score@agentidentityregistry.org