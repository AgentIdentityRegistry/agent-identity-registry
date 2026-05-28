# AIR Identity Specification v0.1 (Draft)

**Version**: 0.1 Draft  
**Status**: Proposed for Foundation Review  
**Last Updated**: 2026-03-18  
**Authors**: Agent Identity Registry Foundation, Technical Steering Committee

---

## Table of Contents

1. [Introduction](#introduction)
2. [Motivation](#motivation)
3. [AIR ID Format](#air-id-format)
4. [Agent Identity Document](#agent-identity-document)
5. [Trust Score Methodology](#trust-score-methodology)
6. [Verification Protocols](#verification-protocols)
7. [Verifiable Credentials](#verifiable-credentials)
8. [API Overview](#api-overview)
9. [Security Considerations](#security-considerations)
10. [Governance Model](#governance-model)
11. [Glossary](#glossary)

---

## Introduction

The Agent Identity Specification (AIR-SPEC) defines the standard format, protocols, and procedures for creating, verifying, and maintaining cryptographic identities for AI agents. This specification enables interoperable identity infrastructure across different platforms, organizations, and jurisdictions.

### Scope

This specification covers:
- Format for unique agent identifiers
- Structure of agent identity documents
- Trust scoring methodology
- Verification protocols
- Credential format for identity attestations
- API contracts for registry operations
- Security and privacy requirements

### Design Principles

- **Openness**: Built on W3C standards; implementations are openly reviewed
- **Neutrality**: No organization has privileged access or decision-making power
- **Transparency**: All algorithms and criteria are publicly documented
- **Interoperability**: Works across platforms, chains, and systems
- **Privacy**: Minimal collection of personal data; support for privacy-preserving verification
- **Decentralization**: Multiple independent verifiers; no single point of failure

---

## Motivation

As AI systems become increasingly autonomous, the ability to verify agent identity and trustworthiness becomes essential. Current approaches are ad-hoc:

- Agents claim identities with no cryptographic proof
- Trust is subjective and opaque
- No standardized way to compare agents across platforms
- Malicious actors can impersonate legitimate agents

AIR solves these problems through:

1. **Cryptographic Proof**: Each agent has a unique, verifiable identity backed by cryptographic keys
2. **Standardized Trust Assessment**: Objective trust scores based on measurable criteria
3. **Interoperability**: Works with any platform that adopts the standard
4. **Transparency**: All scoring components are auditable and public
5. **Neutral Governance**: Operated by nonprofit foundation, not commercial interests

---

## AIR ID Format

### Syntax

```
AIR-XXXX-XXXX-XXXX
```

Where each `X` is a base32 character (excluding I, L, O, U to avoid confusion with similar-looking letters).

**Valid characters**: `A-H`, `J-N`, `P-Z`, `2-7` (26 letters + 10 digits - 4 ambiguous = 32 characters)

### Structure

```
┌─────────────────────────────────────────┐
│  AIR-7F3K-M9JQ-X2PL                     │
│  └──┬──┘ └──┬──┘ └──┬──┘                │
│     │      │       │                     │
│     │      │       └── Checksum (4 chars)│
│     │      └─────────── Hash tail (4 chars)
│     └───────────────── Hash head (4 chars)
│                                          │
│  Total: 19 characters (AIR + 3x4 + 2x1) │
└─────────────────────────────────────────┘
```

### Generation Algorithm

1. Create agent identity document (JSON)
2. Serialize with canonical JSON encoding (RFC 8785)
3. Compute SHA-256 hash of document
4. Extract first 8 bytes → base32 encode → XXXX-XXXX (head-tail)
5. Compute CRC32 checksum on full hash → base32 encode → XXXX (checksum)
6. Format: `AIR-HEAD-TAIL-CHECKSUM`

### Verification

Recipients can verify AIR ID integrity:
```python
def verify_air_id(air_id, identity_doc):
    # Extract components
    head, tail, checksum = parse_air_id(air_id)
    
    # Recompute hash
    hash_obj = compute_hash(identity_doc)
    computed_head = base32_encode(hash_obj[:8])
    computed_tail = base32_encode(hash_obj[8:16])
    computed_checksum = base32_encode(crc32(hash_obj))
    
    # Verify
    return (head == computed_head and 
            tail == computed_tail and 
            checksum == computed_checksum)
```

---

## Agent Identity Document

### JSON Structure

```json
{
  "@context": "https://agentidentityregistry.org/v1",
  "type": "AgentIdentity",
  "air_id": "AIR-7F3K-M9JQ-X2PL",
  "name": "DataProcessor-v3",
  "description": "Processes and analyzes financial data with high security standards",
  "created": "2025-11-15T08:23:42Z",
  "updated": "2026-03-15T14:22:01Z",
  "creator": {
    "did": "did:key:z6MkhaXgBZDvotDkL5257faWxcqV7aGHRH94JWr93gXgvjpq",
    "name": "DataTech Inc.",
    "type": "organization"
  },
  "capabilities": [
    {
      "name": "data_processing",
      "description": "Processes structured and semi-structured data",
      "verified": true
    },
    {
      "name": "financial_analysis",
      "description": "Performs financial ratio analysis and forecasting",
      "verified": true
    },
    {
      "name": "report_generation",
      "description": "Generates formatted reports in PDF, HTML formats",
      "verified": true
    }
  ],
  "security": {
    "certifications": ["SOC2-Type2", "ISO27001"],
    "frameworks": ["NIST-CSF", "CIS-Controls"],
    "last_audit": "2026-01-15",
    "vulnerability_disclosure_program": "https://security.datatech.io/disclosure"
  },
  "transparency": {
    "open_source": true,
    "code_repository": "https://github.com/datatech/processor",
    "documentation_url": "https://docs.datatech.io/processor",
    "limitations": "Designed for financial data; not suitable for medical/legal analysis"
  },
  "deployment": {
    "platforms": ["AWS", "GCP", "Azure", "on-premises"],
    "api_endpoint": "https://api.datatech.io/agent/v1",
    "uptime_sla": 0.999
  },
  "attestations": [
    {
      "issuer": "did:key:z6Mkj5VAgoR9mAFvDtGTVdVrwbJkfvAf6HnNbqBJSZGi5",
      "type": "capability_verification",
      "subject": "data_processing",
      "date": "2026-02-01"
    }
  ]
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `@context` | String | JSON-LD context URL |
| `type` | String | Always "AgentIdentity" |
| `air_id` | String | Unique AIR identifier |
| `name` | String | Human-readable agent name |
| `creator` | Object | Identity and details of agent creator |
| `created` | ISO 8601 | Original creation timestamp |

### Optional but Recommended

- `capabilities`: List of verified capabilities
- `security`: Certifications, frameworks, audit info
- `transparency`: Open source status, documentation links
- `deployment`: Platforms, API endpoints, SLA info
- `attestations`: Verifiable credentials from third parties

### Versioning

Documents are versioned via their hash (which generates the AIR ID). Updates create new documents:
- Old documents remain discoverable
- New document created with new AIR ID
- Metadata can indicate version relationships

---

## Trust Score Methodology

### Overview

Trust scores range from **0 to 1000**, with five equally-weighted components:

```
Trust Score = 200 × (P + B + T + S + A) / 5

where:
  P = Provenance score (0-1000)
  B = Behavioral score (0-1000)
  T = Transparency score (0-1000)
  S = Security score (0-1000)
  A = Peer Attestation score (0-1000)
```

### Component Definitions

#### 1. Provenance (25%)

**What it measures**: Where did this agent come from? Who created it? How was it built?

**Scoring criteria**:
- Creator identity verified: +200
- Creator has history of trustworthy agents: +150
- Published source code available: +150
- Code reviewed by third parties: +200
- Training data provenance documented: +100
- **Maximum**: 1000

#### 2. Behavioral (25%)

**What it measures**: How has this agent actually behaved in practice?

**Scoring criteria**:
- Successful interactions reported: +150
- Mean request completion time meets SLA: +150
- Error/failure rate < 1%: +200
- No reported security incidents: +200
- Behavioral consistency over time: +150
- No detected drift from original specs: +150
- **Maximum**: 1000

#### 3. Transparency (20%)

**What it measures**: How openly does the creator explain the agent?

**Scoring criteria**:
- Public documentation available: +150
- Known limitations documented: +150
- Algorithm/model details disclosed: +200
- Usage examples provided: +150
- Open issue tracking: +100
- Regular updates to documentation: +100
- **Maximum**: 1000

#### 4. Security (15%)

**What it measures**: How secure is the agent and its infrastructure?

**Scoring criteria**:
- No known vulnerabilities: +200
- Security certifications (SOC2, ISO27001): +200
- Regular security audits: +150
- Vulnerability disclosure program: +150
- Encryption in transit and at rest: +150
- Access controls and rate limiting: +150
- **Maximum**: 1000

#### 5. Peer Attestations (15%)

**What it measures**: What do other verified parties say about this agent?

**Scoring criteria**:
- Each verified attestation: +50 (max 1000)
- Attestations from different organizations: +bonus 50 per unique org
- Attestations from trusted verifiers: +100 each (limited)
- Negative attestations: -200 each

**Example**: 10 attestations from 5 different organizations = 500 + 250 = 750

### Trust Grades

Scores map to letter grades:

| Score | Grade | Interpretation |
|-------|-------|-----------------|
| 950-1000 | AAA | Exceptional trust; suitable for critical operations |
| 900-949 | AA | High trust; suitable for production |
| 850-899 | A | Good trust; suitable for most uses |
| 800-849 | BBB | Moderate trust; monitor performance |
| 700-799 | BB | Lower trust; use with caution |
| 600-699 | B | Low trust; limited production use |
| < 600 | C | Minimal trust; testing/research only |

### Calculation Details

See [docs/TRUST-SCORE.md](TRUST-SCORE.md) for detailed methodology including:
- Exact scoring rubrics
- Evidence requirements for each criterion
- Dispute resolution process
- Score recalculation frequency (quarterly)

---

## Verification Protocols

### Self-Verification

Agents can prove their own identity:

```
Agent → Registry: Prove identity for AIR-7F3K-M9JQ-X2PL
Registry: Computes SHA-256 of stored identity document
Agent: Provides private key signature of challenge nonce
Registry: Verifies signature against public key
Registry → Agent: Identity verified
```

### Third-Party Verification

Independent verifiers audit and attest to agent properties:

1. **Scope Definition**: Verifier and creator agree on what to verify
2. **Examination**: Verifier examines code, documentation, behavior
3. **Attestation**: Verifier issues W3C Verifiable Credential
4. **Registration**: Credential registered in AIR registry
5. **Scoring**: Credential contributions counted in trust score

### Verification Levels

**Level 1 - Self-Attested**: Agent claims capabilities
**Level 2 - Organization Verified**: Creator's organization verifies
**Level 3 - Third-Party Verified**: Independent auditor verifies
**Level 4 - Foundation Verified**: AIR Foundation conducts formal audit

---

## Verifiable Credentials

### Credential Format

Credentials use W3C Verifiable Credentials Data Model 1.0:

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://agentidentityregistry.org/api/v1/credentials"
  ],
  "type": ["VerifiableCredential", "AgentCapabilityCredential"],
  "issuer": "did:key:z6Mkj5VAgoR9mAFvDtGTVdVrwbJkfvAf6HnNbqBJSZGi5",
  "issued": "2026-02-01T10:15:33Z",
  "valid_until": "2027-02-01T10:15:33Z",
  "credentialSubject": {
    "id": "AIR-7F3K-M9JQ-X2PL",
    "property": "data_processing_capability",
    "claim": "Agent can process structured data with 99.5% accuracy",
    "evidence": {
      "test_results": "https://audit-server.org/reports/12345",
      "data_points": 10000,
      "methodology": "Held-out test set validation"
    }
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-01T10:15:33Z",
    "verificationMethod": "did:key:z6Mkj5VAgoR9mAFvDtGTVdVrwbJkfvAf6HnNbqBJSZGi5#z6MksVxXTnvwL7a3p6U",
    "signatureValue": "..."
  }
}
```

### Credential Types

- **Capability Credential**: Attests agent can perform specific task
- **Security Credential**: Auditor attests security properties
- **Behavior Credential**: Platform attests behavioral metrics
- **Lineage Credential**: Attests training data or code provenance

---

## API Overview

### Core Endpoints

```
GET    /v1/agents/:air_id              Get agent identity
POST   /v1/agents/register             Register new agent
PUT    /v1/agents/:air_id              Update agent identity
GET    /v1/agents/:air_id/credentials  Get all credentials
GET    /v1/agents/:air_id/trust-score  Get trust score
POST   /v1/credentials/verify          Verify a credential
GET    /v1/verifiers                   List approved verifiers
```

Full API documentation at https://agentidentityregistry.org/api/v1/openapi.yaml

---

## Security Considerations

### Key Management
- Private keys must be kept secure (hardware wallet recommended)
- Key rotation protocols defined in [SECURITY.md](SECURITY.md)
- No private keys transmitted or stored on registry

### Cryptography
- EdDSA (Ed25519) for signatures
- BLAKE2b for hashing (for future-proofing)
- SHA-256 for AIR ID generation (FIPS compliance)

### Privacy
- Minimal PII collection
- No personal data linked to agents without explicit consent
- Privacy-preserving verification methods preferred

---

## Governance Model

See [GOVERNANCE.md](GOVERNANCE.md) for complete governance structure.

**Key points**:
- Foundation board oversees spec evolution
- Quarterly reviews with stakeholder feedback
- Major changes require 2/3 board approval + community comment period

---

## Glossary

**Agent**: An autonomous software system capable of independent action and decision-making

**Verifier**: Organization or individual authorized to audit and attest to agent properties

**Credential**: W3C Verifiable Credential attesting to a property or capability

**Trust Score**: Composite score (0-1000) indicating overall agent trustworthiness

**DID**: Decentralized Identifier (W3C standard) for self-sovereign identity

**Attestation**: A verified claim about an agent's properties or capabilities

---

## Document Status

This specification is a **DRAFT** submitted for Foundation Technical Steering Committee review. Community feedback is welcomed. Please submit comments as GitHub issues with label `spec-feedback`.

**Next review date**: 2026-06-18

---

**Agent Identity Registry Foundation**  
*Building neutral infrastructure for AI agent trust*