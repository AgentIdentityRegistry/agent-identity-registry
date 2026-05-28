# Introduction to IETF AIMS / WIMSE Working Group

**To:** wimse@ietf.org
**From:** Agent Identity Registry Foundation
**Subject:** AIR — Independent Implementation of Agent Identity Standards; Offering Technical Contribution
**Date:** April 2026

---

Dear working group participants,

I am writing to introduce the Agent Identity Registry (AIR) and to express our interest in contributing to the IETF's work on agent identity and management, particularly the AIMS framework (draft-klrc-aiagent-auth-00) and the WIMSE Working Group's efforts on workload identity.

## Context

We have reviewed the AIMS draft with considerable interest. The framework's approach — composing WIMSE, SPIFFE, and OAuth 2.0 into a coherent agent authentication system — addresses a critical gap in the standards landscape. AIR's work is designed to operate on top of exactly this kind of authentication infrastructure.

## Who We Are

AIR is a 501(c)(3) nonprofit providing identity verification, trust scoring, and verifiable credentials for AI agents. We are governed independently — no corporate representatives sit on our board — and our technical specification, governance charter, and trust methodology are fully open source.

Website: https://agentidentityregistry.org
Specification: https://github.com/AgentIdentityRegistry/agent-identity-registry

## Technical Alignment with IETF Standards

AIR's architecture is designed to complement, not duplicate, IETF work:

**1. Authentication vs. Trust Verification**

The AIMS draft solves agent authentication: proving that an agent is who it claims to be. AIR addresses the next question: given a verified identity, how trustworthy is this agent? Our Trust Score (0-1000) aggregates five components — provenance, behavioral history, transparency, security posture, and peer attestations — into a single, auditable metric.

The relationship is analogous to PKI certificates (authentication) and credit scores (trust assessment). Both are necessary; neither replaces the other.

**2. Identity Format Compatibility**

AIR's cryptographic identifiers (AIR IDs) use base32 encoding with checksums and are designed to be resolvable through standard infrastructure. Our Agent Identity Documents are JSON-LD structures that can carry SPIFFE IDs, OAuth client identifiers, and other IETF-standard identity claims as nested properties. We explicitly avoid requiring agents to adopt a new identity system — AIR layers on top of existing identifiers.

**3. Verification Protocol Architecture**

AIR defines a four-level verification hierarchy (self-verified, basic, standard, enhanced) that maps naturally to the trust levels implicit in AIMS. A self-verified AIR identity is analogous to a self-asserted SPIFFE ID; an enhanced-verified identity involves independent third-party attestation with audit trails.

**4. WIMSE Compatibility**

AIR's credential framework uses W3C Verifiable Credentials, which can encapsulate WIMSE workload identity tokens. An agent operating in a multi-service environment could carry both a WIMSE workload identity (for infrastructure-level authentication) and an AIR trust score (for application-level trust decisions).

## What We Can Contribute

1. **Implementation experience.** AIR is actively building a registry that consumes and issues identity credentials for AI agents. We can provide feedback on the AIMS draft from the perspective of a real-world implementer building trust infrastructure on top of agent authentication.

2. **Trust layer specification.** We can contribute text on how trust scoring and verification tiers interact with the authentication mechanisms defined in AIMS and WIMSE. This could take the form of an informational draft or a section in the existing framework.

3. **Interoperability testing.** As AIR's registry moves toward production, we are prepared to implement AIMS-compatible authentication flows and report on interoperability findings.

4. **Independent perspective.** As a nonprofit with no commercial stake in any particular authentication vendor or cloud platform, AIR can provide feedback that is free from competitive considerations.

## Our Position in the Ecosystem

We recently submitted a public comment to NIST CAISI on their concept paper on AI agent identity and authorization, where we advocated for neutral, standards-based identity infrastructure. We are also engaging with the W3C AI Agent Protocol Community Group and the DIF Trusted AI Agents Working Group. Our goal is to be a constructive participant across the standards ecosystem, not a competing standards body.

## Next Steps

We would welcome the opportunity to:

- Subscribe to the mailing list and begin contributing to discussions
- Review and provide written feedback on draft-klrc-aiagent-auth-00
- Present AIR's trust verification architecture at a future session, if appropriate
- Collaborate on an interoperability analysis between AIMS authentication and AIR trust scoring

We are available to discuss any of the above at the group's convenience.

Respectfully,

**Agent Identity Registry Foundation**
501(c)(3) Nonprofit | agentidentityregistry.org
foundation@agentidentityregistry.org
GitHub: github.com/AgentIdentityRegistry/agent-identity-registry
