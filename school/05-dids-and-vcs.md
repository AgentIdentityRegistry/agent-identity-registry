# Module 05: Building Blocks — DIDs and VCs

## Why This Module Matters

These two W3C standards are the foundation AIR is built on. If someone asks "what technology does AIR use?", the answer is DIDs and VCs. You need to understand what they are well enough to explain them simply.

## DIDs (Decentralized Identifiers)

### The Simple Explanation

A DID is like an email address, but:
- You OWN it (no company can take it away)
- It's VERIFIABLE (you can cryptographically prove it's yours)
- It works EVERYWHERE (not tied to one platform)

### What One Looks Like

```
did:web:yourdomain.com
did:key:z6MkhaXgBZDvotDkL5257faWxcqV7aGHRH94JWr93gXgvjpq
```

The format is: `did:METHOD:SPECIFIC-ID`

- `did:web:` — your identity is tied to a domain you control (like `did:web:agentidentityregistry.org`)
- `did:key:` — your identity is a cryptographic key pair (more technical, no domain needed)

### How It Relates to AIR

When someone registers an agent in AIR, they provide a creator DID:

```json
{
  "name": "DataProcessor-v3",
  "creator_did": "did:web:datatech.io"
}
```

This DID says: "The creator of this agent controls the domain datatech.io, and you can verify that."

### The Key Insight

Normal identifiers (usernames, email addresses) are controlled by the platform that issued them. Google controls your @gmail.com. Twitter controls your @handle.

DIDs are controlled by YOU. That's why they're called "decentralized" — no single company owns the system.

### What You Need to Say About DIDs

> "AIR uses W3C Decentralized Identifiers as the foundation for agent identity. Every AIR agent is linked to a DID, which means the identity is portable and verifiable — not locked into any one platform."

## VCs (Verifiable Credentials)

### The Simple Explanation

A Verifiable Credential is a digital version of a real-world credential — like a driver's license, diploma, or professional certification — but with three superpowers:

1. **Cryptographically signed** — you can verify it hasn't been tampered with
2. **Machine-readable** — software can automatically check it
3. **Selective disclosure** — you can show just the parts you want (like proving you're over 21 without showing your exact birthday)

### Real-World Analogy

| Physical World | Verifiable Credential |
|---------------|----------------------|
| Driver's license | "This person can drive" credential |
| University diploma | "This person has a CS degree" credential |
| Security clearance | "This person has Top Secret clearance" credential |

### How It Relates to AIR

In AIR's design, trust scores and verification results are meant to be issued as VCs:

**Example (conceptual):**
```
"AIR Registry says:
  Agent AIR-7F3K-M9JQ-X2PL
  has Trust Score: 942 (Grade AAA)
  verified by: Agent Identity Registry Foundation
  on: 2026-03-15
  
  [cryptographic signature proving AIR actually issued this]"
```

Anyone who receives this credential can:
1. Check that AIR really signed it (cryptographic verification)
2. See the trust score without asking AIR's API (the credential carries the data)
3. Trust it hasn't been modified (the signature would break if anything changed)

### The Three Parties

Every VC involves three parties:

```
ISSUER ──── issues credential to ────► HOLDER ──── presents to ────► VERIFIER
(AIR)                                  (Agent)                       (Anyone)
```

- **Issuer:** AIR (we vouch for the agent's identity and trust score)
- **Holder:** The agent (it carries the credential)
- **Verifier:** Anyone who wants to check the agent's trustworthiness

### What We've Built vs. What's Planned

**Built today:**
- Agent identity documents follow a JSON-LD structure (the same format VCs use)
- Trust scores are stored and served via API

**Shipped:**
- DID document endpoint: `GET /agents/{air_id}/did-document` — AIR-minted `did:wba` documents are served directly (self-hosted DB lookup, no external fetch needed)

**Not built yet:**
- Actual W3C Verifiable Credential issuance (the formal VC format with cryptographic signatures)
- Selective disclosure (showing partial credentials)

This is one of the things that will come from the CAWG/DIF engagement — understanding exactly what format they need.

### What You Need to Say About VCs

> "AIR's attestations — identity verification, trust scores, behavioral assessments — are designed as W3C Verifiable Credentials. This means they're cryptographically signed, tamper-evident, and portable. An agent's AIR credentials can be verified by any VC-compatible system, not just our registry."

## How DIDs and VCs Work Together

```
1. Agent registers with AIR
   Creator provides: did:web:datatech.io
   AIR generates: AIR-7F3K-M9JQ-X2PL

2. AIR issues a Verifiable Credential
   "Agent AIR-7F3K has trust score 942"
   Signed by: AIR's DID (did:web:agentidentityregistry.org)

3. Agent presents the VC to a third party
   "Here's proof of my trust score"
   Third party verifies the signature
   Third party checks AIR's DID to confirm it's real

4. Trust established — no phone call to AIR needed
   The VC carries all the proof within itself
```

This is powerful because it's DECENTRALIZED. The agent doesn't need AIR to be online every time someone checks its credentials. The VC is self-contained proof.

## The Jargon Decoder

| Term | Plain English |
|------|-------------|
| DID | A self-owned digital identifier (like a domain name you fully control) |
| DID Document | A file that describes the DID — its public keys, how to verify it |
| DID Resolution | Looking up a DID to get its document (like DNS for identifiers) |
| VC | A tamper-proof digital certificate |
| VP (Verifiable Presentation) | A VC packaged for showing to someone (can include just the parts you want) |
| JSON-LD | A format for structuring data that machines can understand context (AIR uses this) |
| Issuer | Who creates the credential (AIR) |
| Holder | Who carries it (the agent) |
| Verifier | Who checks it (anyone) |
