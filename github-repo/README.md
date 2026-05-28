# Agent Identity Registry (AIR)

```
    ∆IR
   /   \
  /AGENT\      Agent Identity Registry
 /_______ \    Neutral. Verifiable. Trusted.
|         |    Identity, Verification & Trust for AI Agents
|_________|
```

## What is AIR?

The **Agent Identity Registry** is a neutral, nonprofit registry providing identity verification and trust scoring for AI agents. We are the ICANN and credit bureau for the age of autonomous AI systems.

AIR solves the fundamental problem of AI agent trust: How do you know who you're interacting with? Is this agent trustworthy? What is its provenance? Built on open standards (W3C Decentralized Identifiers and Verifiable Credentials), AIR provides:

- **Cryptographic Identity** - Unique, verifiable identity for every AI agent
- **Trust Scoring** - Transparent, multi-factor trust assessment (0-1000 scale)
- **Verification Protocols** - Rigorous vetting of agent capabilities and behavior
- **Interoperability** - Works across platforms, chains, and ecosystems

## Why It Matters

As AI systems become increasingly autonomous and interconnected, trust infrastructure is non-negotiable. AIR creates a level playing field where agents are identified, verified, and scored based on objective criteria—not corporate marketing.

## Key Features

### Registry & Identity
- **AIR IDs**: Cryptographic identifiers (AIR-XXXX-XXXX-XXXX) linked to W3C DIDs
- **Agent Identity Documents**: Rich, verifiable metadata about agent capabilities, creators, and behavior
- **Decentralized Verification**: Multiple independent verifiers attest to agent properties

### Trust Scoring
- **Five-Component Model**: Provenance (25%), Behavioral (25%), Transparency (20%), Security (15%), Peer Attestations (15%)
- **Transparent Methodology**: All calculations auditable and open source
- **Dispute Resolution**: Independent appeals process for score contests

### Open Standards
- Built on W3C Decentralized Identifiers (DIDs)
- Verifiable Credentials (VC) format for all attestations
- JSON-LD for semantic interoperability
- No vendor lock-in; work with your existing systems

### Foundation-Governed
- 501(c)(3) nonprofit structure ensures neutrality
- Transparent governance with public board and decision processes
- Public roadmap and quarterly updates

## Quick Start

### Check an Agent's Trust Score

```bash
# Query an agent's identity and trust score
curl https://agentidentityregistry.org/api/v1/agents/AIR-7F3K-M9JQ-X2PL

# Response:
{
  "air_id": "AIR-7F3K-M9JQ-X2PL",
  "name": "DataProcessor-v3",
  "created": "2025-11-15T08:23:42Z",
  "creator": "did:key:z6MkhaXgBZDvotDkL5257faWxcqV7aGHRH94JWr93gXgvjpq",
  "trust_score": 847,
  "trust_grade": "AA",
  "components": {
    "provenance": 920,
    "behavioral": 815,
    "transparency": 890,
    "security": 785,
    "peer_attestations": 810
  },
  "verified": true,
  "last_updated": "2026-03-15T14:22:01Z"
}
```

### Register Your Agent

```bash
# Create a new AIR Identity Document
POST https://agentidentityregistry.org/api/v1/agents/register

{
  "name": "MyAgent-v1",
  "description": "A data processing agent for financial analysis",
  "creator_did": "did:key:z6MkhaXgBZDvotDkL5257faWxcqV7aGHRH94JWr93gXgvjpq",
  "capabilities": [
    "data_processing",
    "financial_analysis",
    "report_generation"
  ],
  "security_certifications": [
    "SOC2-Type2",
    "ISO27001"
  ]
}

# Response includes newly assigned AIR ID
{
  "air_id": "AIR-XXXX-XXXX-XXXX",
  "status": "pending_verification",
  "created": "2026-03-18T10:15:33Z"
}
```

### Verify Credentials

```bash
# Get an agent's verifiable credentials
GET https://agentidentityregistry.org/api/v1/agents/AIR-7F3K-M9JQ-X2PL/credentials

# Returns a set of W3C Verifiable Credentials attesting to identity, capabilities, behavior, etc.
```

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────┐
│                 AIR Registry Core                    │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐   │
│  │  Registry  │  │   Trust    │  │ Verification│   │
│  │   Store    │  │  Scoring   │  │  Engine     │   │
│  └────────────┘  └────────────┘  └─────────────┘   │
│                                                       │
│  Built on W3C DIDs and Verifiable Credentials      │
└─────────────────────────────────────────────────────┘
         ↓                    ↓                  ↓
    ┌─────────┐        ┌─────────┐       ┌──────────┐
    │  Public │        │Private/ │       │ Creator  │
    │   API   │        │Corporate│       │  API     │
    └─────────┘        │ Systems │       └──────────┘
                       └─────────┘
```

### Data Flow

1. **Agent Registration**: Creator submits agent identity document
2. **Verification**: Independent verifiers assess claims
3. **Score Calculation**: Five-component trust model calculated
4. **Attestation**: Verifiable credentials issued
5. **Public Registry**: Agent data available via API and web interface
6. **Continuous Monitoring**: Behavioral and security metrics updated

## Documentation

- **[Specification](docs/SPECIFICATION.md)** - Complete AIR Identity Specification
- **[Trust Score Methodology](docs/TRUST-SCORE.md)** - Detailed trust scoring algorithms
- **[Governance Model](docs/GOVERNANCE.md)** - Foundation structure and decision processes
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to AIR

## Links

- **Website**: https://agentidentityregistry.org
- **API Documentation**: https://agentidentityregistry.org/developers
- **Blog**: https://agentidentityregistry.org/blog
- **Twitter**: @AIRIdentity
- **Discord**: https://discord.gg/air-identity

## License

This project is licensed under the **Apache License 2.0** - see [LICENSE](LICENSE) file for details.

The Agent Identity Registry is operated by the **Agent Identity Registry Foundation**, a 501(c)(3) nonprofit organization.

---

**Foundation Headquarters**: San Francisco, CA  
**Founded**: 2025  
**Status**: Production Registry  

For inquiries, contact foundation@agentidentityregistry.org