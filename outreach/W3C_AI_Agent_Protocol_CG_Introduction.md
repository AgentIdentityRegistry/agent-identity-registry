# Introduction to W3C AI Agent Protocol Community Group

**To:** public-agentprotocol@w3.org
**From:** Agent Identity Registry Foundation
**Subject:** Introducing AIR — Neutral Trust Infrastructure for AI Agents
**Date:** April 2026

---

Dear colleagues,

I am writing to introduce the Agent Identity Registry (AIR) and our interest in contributing substantively to the AI Agent Protocol Community Group's work on agent discovery, identification, and collaboration protocols.

## Who We Are

AIR is a 501(c)(3) nonprofit building neutral, open identity and trust infrastructure for AI agents. We are governed by a 7-member board composed entirely of independent experts — no corporate representatives hold board seats. Our mission is to provide the "passport office" for AI agents: a registry where any agent can obtain a verifiable identity, earn a transparent trust score, and present credentials that other systems can independently verify.

Our full specification, governance charter, and trust score methodology are open source: https://github.com/AgentIdentityRegistry/agent-identity-registry

## How AIR Relates to This Group's Work

We have been following the Community Group's progress on WebMCP and agent discovery protocols with great interest. AIR's work is complementary to, not competitive with, the protocols being developed here:

- **Your group defines how agents discover and communicate with each other.** AIR provides the trust and identity layer that answers "should I communicate with this agent?" — a question that becomes critical as agent-to-agent interactions scale.

- **AIR builds natively on W3C standards.** Our Agent Identity Documents use JSON-LD with W3C context. Our credential framework is built on W3C Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs). We chose these standards deliberately because they represent the most mature, interoperable approach to decentralized identity.

- **AIR IDs are designed for interoperability.** Our cryptographic identifiers (AIR-XXXX-XXXX-XXXX) are linked to W3C DIDs and can be resolved through standard DID resolution infrastructure. Agent discovery protocols could reference AIR trust scores to enable trust-informed routing decisions.

## What We Can Contribute

We would like to offer the following to the group:

1. **A presentation on our Trust Score Methodology.** AIR uses a five-component model — Provenance (25%), Behavioral (25%), Transparency (20%), Security (15%), and Peer Attestations (15%) — to score agents from 0 to 1000. We believe this methodology could inform the group's thinking on how trust metadata should be represented in agent protocols.

2. **Technical review and feedback.** We are prepared to review current drafts and provide detailed, constructive feedback from the perspective of an independent implementer focused on trust and verification.

3. **Interoperability analysis.** We can document how AIR's identity framework maps to the group's emerging specifications, identifying gaps and alignment opportunities.

## Our Standards Engagement Philosophy

AIR does not seek to replace or compete with existing standards efforts. We participate as contributors and implementers. Our view is that this group defines the communication layer, while AIR provides the trust verification layer — together, they create a more complete picture of agent interoperability.

We recently submitted a public comment to the NIST CAISI initiative on AI agent identity and authorization, reinforcing our commitment to working within the broader standards ecosystem rather than building in isolation.

## Next Steps

We would welcome the opportunity to:

- Join the next Community Group call and introduce ourselves briefly
- Present our trust scoring methodology at a future session (15-20 minutes)
- Review any current drafts where trust/identity considerations are relevant

We are happy to answer questions about AIR's approach, governance, or technical architecture. All of our documentation is publicly available for review.

Thank you for your work on this critical infrastructure. We look forward to contributing.

Respectfully,

**Agent Identity Registry Foundation**
501(c)(3) Nonprofit | agentidentityregistry.org
foundation@agentidentityregistry.org
GitHub: github.com/AgentIdentityRegistry/agent-identity-registry
