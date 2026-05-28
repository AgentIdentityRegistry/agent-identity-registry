# Introduction to the Decentralized Identity Foundation

**To:** membership@identity.foundation / Trusted AI Agents Working Group
**From:** Agent Identity Registry Foundation
**Subject:** AIR — A W3C DID/VC-Native Trust Registry for AI Agents
**Date:** April 2026

---

Dear DIF members and Trusted AI Agents Working Group participants,

I am writing to introduce the Agent Identity Registry (AIR) and to explore how we can contribute to DIF's work on decentralized identity for AI agents.

## Who We Are

AIR is a 501(c)(3) nonprofit building neutral identity verification, trust scoring, and verifiable credential infrastructure for AI agents. Our technical architecture is built natively on the W3C Decentralized Identifiers (DID) and Verifiable Credentials (VC) specifications — the same standards at the core of DIF's mission.

We are independently governed (no corporate board seats), fully open source, and focused on the public interest. Our specification, governance charter, and trust methodology are available at:

- Website: https://agentidentityregistry.org
- GitHub: https://github.com/AgentIdentityRegistry/agent-identity-registry

## Why DIF Matters to AIR

DIF's Trusted AI Agents Working Group is addressing precisely the questions that motivated AIR's creation: How do you apply the DID/VC stack to autonomous AI agents? How do you preserve privacy while establishing trust? How do you build interoperable credential ecosystems that work across platforms and jurisdictions?

AIR is not building these primitives from scratch. We are building on top of the DID/VC infrastructure that DIF and its members have developed. Our contribution is the operational layer — a live, neutral registry that puts these standards to work for AI agent identity at scale.

## Technical Architecture — DID/VC Foundation

**AIR IDs and DIDs:**
Every AIR identity is linked to a W3C DID. Our cryptographic identifiers (AIR-XXXX-XXXX-XXXX) serve as human-readable handles that resolve to full DID documents. This means AIR identities are natively interoperable with any system that supports DID resolution.

**Verifiable Credentials:**
All AIR attestations — identity verification results, trust score components, behavioral assessments, security certifications — are issued as W3C Verifiable Credentials. Third-party verifiers issue VCs that the AIR registry aggregates into composite trust scores. This architecture means:

- Credentials are portable. An agent's AIR credentials can be verified by any VC-compatible system, not just the AIR registry.
- Verification is decentralized. AIR certifies verifiers, but the verification itself is performed by independent third parties who issue their own VCs.
- Privacy is preserved. Selective disclosure allows agents to share specific credentials without revealing their entire identity profile.

**Agent Identity Documents:**
AIR's Agent Identity Documents are JSON-LD structures that include DID references, capability declarations, creator information, and links to issued VCs. They are designed for semantic interoperability with other DID-based systems.

## What We Can Contribute to DIF

1. **Real-world implementation feedback.** AIR is actively building a registry that issues and verifies W3C VCs for AI agents. We can provide concrete implementation experience — what works, what is underspecified, where the gaps are — to inform DIF's specifications.

2. **Trust scoring as a VC use case.** AIR's five-component trust model (Provenance, Behavioral, Transparency, Security, Peer Attestations) represents a novel application of VCs. We can contribute a use case study or reference implementation showing how composite trust scores can be constructed from individual VC attestations.

3. **Interoperability testing.** We are committed to ensuring AIR credentials work with existing DIF-aligned wallets, verifiers, and registries. We can participate in interoperability testing efforts and report results.

4. **Privacy-preserving trust.** AIR's verification tiers (self-verified through enhanced) create natural boundaries for selective disclosure. We can contribute to discussions on how trust assessment and privacy preservation interact in agent identity systems.

5. **Independent governance perspective.** As a nonprofit with explicit anti-capture governance provisions, AIR can contribute to discussions about how decentralized identity governance should work for AI agents — a question with different considerations than human identity.

## Interoperability Goals

AIR's design philosophy is "complement, don't compete." Specifically:

- **DIF defines the DID/VC primitives** that make decentralized agent identity possible. AIR uses them.
- **DIF's Trusted AI Agents WG defines best practices** for applying these primitives to AI agents. AIR implements and extends them.
- **AIR provides the operational trust layer** — the live registry, the trust scores, the verifier certification — that turns standards into a running system people can use today.

We see this as a natural division of labor: DIF focuses on the standards, AIR focuses on neutral implementation and operation.

## Membership and Participation

We understand DIF offers free individual membership. We would like to:

- Join DIF as an organizational or individual member
- Participate actively in the Trusted AI Agents Working Group
- Present AIR's architecture and gather feedback from WG members
- Contribute to any relevant specification work or use case documentation

## Next Steps

We are available to discuss AIR's work in more detail at the next Trusted AI Agents WG meeting or via a separate call. We are also happy to provide a written technical overview tailored to DIF's specific areas of interest.

Thank you for the foundational work DIF has done on decentralized identity. We are glad to be building on it.

Respectfully,

**Agent Identity Registry Foundation**
501(c)(3) Nonprofit | agentidentityregistry.org
foundation@agentidentityregistry.org
GitHub: github.com/AgentIdentityRegistry/agent-identity-registry
