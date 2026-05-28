# AIR — Agent Identity Registry
## The Neutral Trust Layer for the Agentic Era

**Executive Summary | March 2026**
**agentidentityregistry.org**

---

## The Problem: AI Agents Without Identity

AI agents are proliferating at an unprecedented rate. They answer emails, process invoices, execute trades, manage infrastructure, and interact with other agents on behalf of their operators. By 2027, autonomous agents will handle a significant share of digital economic activity — from scheduling meetings to negotiating contracts.

Yet today, there is no universal way to answer a basic question: **Who is this agent, and can I trust it?**

The current landscape is fragmented across 17+ initiatives — standards bodies drafting protocols (NIST, IETF, W3C), corporations building proprietary solutions (Microsoft Entra Agent ID, Okta Auth0 for AI Agents), open-source projects with corporate governance (AGNTCY under the Linux Foundation, backed by Cisco, Dell, Google, Oracle), blockchain registries (ERC-8004), and academic research projects (MIT NANDA, Stanford Loyal Agents).

What is missing is a **neutral, independent, consumer-facing registry** that provides a unified identity, trust scoring, and credential framework for AI agents — governed in the public interest, not by the companies that build or deploy those agents.

---

## The Solution: AIR

The **Agent Identity Registry (AIR)** is a 501(c)(3) nonprofit providing identity verification, trust scoring, and verifiable credentials for AI agents. We are building the ICANN for agents — neutral infrastructure that serves the entire ecosystem.

### What Makes AIR Different

AIR occupies a unique position that no other organization in this space combines:

**1. True Independence**
AIR has zero corporate governance influence. Unlike AGNTCY (governed by a board including Cisco, Dell, Google, Oracle, and Red Hat) or enterprise solutions (Microsoft, Okta), AIR's 7-member board is composed entirely of independent experts in AI ethics, decentralized identity, nonprofit governance, AI security, and global AI policy. No corporate representative holds a board seat.

**2. Consumer-Facing Design**
Every other initiative in this space builds for developers — APIs, protocols, and SDKs invisible to end users. AIR makes agent trust *visible* through a Trust Score (0–1000) with letter grades (AAA to C) that anyone can understand. When you interact with an AI agent, you should be able to check its credentials — like looking at a passport.

**3. Comprehensive Stack**
The landscape is fragmented by design layer: OWASP ANS handles naming, Google A2A handles communication, ERC-8004 handles on-chain reputation, IETF handles authentication. AIR integrates identity, trust scoring, and verifiable credentials in a single, coherent framework built on W3C open standards.

**4. Global Nonprofit Governance**
AIR's governance charter includes rotating board terms, a Technical Steering Committee elected by the community, conflict-of-interest policies, whistleblower protections, and an explicit prohibition on pay-to-play influence. This is not a corporate open-source project with a foundation wrapper — it is a public-interest institution designed to resist capture.

---

## What AIR Has Built

AIR is not a concept paper. We have published detailed, open documentation that demonstrates the substance behind our vision:

**Technical Specification (v0.1 Draft)**
A complete specification defining the AIR ID format (cryptographic identifiers using base32 encoding with checksums), Agent Identity Documents (JSON-LD with W3C context), verification protocols (self-verification and four-level third-party verification), and a REST API with core endpoints for registration, lookup, credential verification, and trust score retrieval.

**Trust Score Methodology (v1.0)**
A five-component trust model scoring agents from 0 to 1000:
- Provenance (25%) — Where did this agent come from? Who built it?
- Behavioral (25%) — How has it actually performed in practice?
- Transparency (20%) — How openly is it documented?
- Security (15%) — How secure is its infrastructure?
- Peer Attestations (15%) — What do verified third parties say about it?

Each component has detailed scoring rubrics, evidence requirements, and dispute resolution procedures. Scores map to letter grades (AAA through C) with clear interpretations for different use cases.

**Governance Charter (v1.0)**
A comprehensive governance framework including board structure, committee charters (Technical Steering, Trust & Verification, Community & Ethics), decision-making processes with public comment periods, financial controls, succession planning, and conflict-of-interest policies.

**Working Demo**
A proof-of-concept demonstrating the AIR ID lookup and trust score display at agentidentityregistry.org/lookup.

All documentation is open source and available at github.com/AgentIdentityRegistry/agent-identity-registry.

---

## The Path Forward

### Immediate Actions (Q2 2026)

AIR has submitted a public comment to the **NIST Center for AI Standards and Innovation (CAISI)** in response to their concept paper on "Accelerating the Adoption of Software and AI Agent Identity and Authorization." This positions AIR in the official record of the most significant US government initiative on AI agent identity standards.

Simultaneously, AIR is engaging with the **W3C AI Agent Protocol Community Group**, the **IETF WIMSE Working Group**, and the **DIF Trusted AI Agents Working Group** as a participant contributing our neutral perspective on agent identity interoperability.

### Standards Engagement Strategy

AIR does not seek to replace existing standards efforts. We seek to *complement* them:

- **NIST** sets the policy frameworks → AIR provides a neutral operational implementation
- **IETF/WIMSE** defines authentication protocols → AIR uses them as infrastructure
- **W3C** maintains DID and VC standards → AIR builds on them natively
- **AGNTCY** operates agent directories → AIR provides the trust verification that makes those directories trustworthy

The analogy: AGNTCY is the phone book. **AIR is the passport office.**

### 90-Day Milestones

1. **NIST CAISI public comment submitted** with working demo link
2. **Active participation in 3+ standards body working groups**
3. **Advisory board formed** with 2-3 independent experts
4. **GitHub repository launched** with full specification, governance docs, and contributing guide
5. **Virtual roundtable hosted** on the topic of neutral agent identity infrastructure

### Long-Term Vision (2026–2028)

- **Production registry launch** with 100+ registered agents (Q3 2026)
- **Verifier certification program** with 8+ certified third-party verifiers (Q3 2026)
- **Platform integrations** with 5+ major AI platforms (Q4 2026)
- **International expansion** with multilingual support and regional verifiers (Q4 2026)
- **Financial sustainability** through diversified grants, membership, and certification revenue

---

## How You Can Help

### For Standards Body Leaders
Review our technical specification and consider AIR's perspective in your working groups. We bring a unique combination of independence and technical depth. We are ready to contribute substantively, not just observe.

**Contact:** foundation@agentidentityregistry.org

### For Potential Advisors
Join AIR's advisory council to help shape the governance and technical direction of neutral agent identity infrastructure. We seek experts in AI governance, decentralized identity, nonprofit management, and international standards.

**Contact:** foundation@agentidentityregistry.org

### For Developers & Researchers
Star and contribute to our GitHub repository. Review our specification. Build integrations. Report issues. The agent identity problem is too important to be solved by any single organization — we need the community.

**GitHub:** github.com/AgentIdentityRegistry/agent-identity-registry

### For Funders & Foundations
AIR is a 501(c)(3) nonprofit building critical digital infrastructure. We are seeking grant funding to scale from proof-of-concept to production — without compromising our independence.

**Contact:** foundation@agentidentityregistry.org

---

## Competitive Landscape Summary

| Category | Key Players | AIR's Relationship |
|---|---|---|
| Government Standards | NIST CAISI, IETF AIMS | AIR contributes to and implements these frameworks |
| Open Standards | W3C, DIF, OWASP ANS, OpenID Foundation | AIR participates in and builds on these standards |
| Corporate Open Source | AGNTCY (Linux Foundation), Google A2A | AIR complements with trust verification layer |
| Enterprise Products | Microsoft Entra Agent ID, Okta, Credo AI | AIR provides cross-platform, vendor-neutral alternative |
| Blockchain | ERC-8004, SingularityNET + Privado ID | AIR offers standards-based approach without blockchain dependency |
| Academic | MIT NANDA, Stanford Loyal Agents | AIR partners on research, translates into operational infrastructure |

---

**Agent Identity Registry Foundation**
501(c)(3) Nonprofit | agentidentityregistry.org
*Neutral. Verifiable. Trusted.*

**Contact:** foundation@agentidentityregistry.org
**GitHub:** github.com/AgentIdentityRegistry/agent-identity-registry
