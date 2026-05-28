# Module 07: Where AIR Fits

## The Ecosystem Map

There are many players working on pieces of the AI agent identity puzzle. Here's where each one sits, and where AIR fits in.

```
                    ┌─────────────────────────────────┐
                    │         POLICY LAYER             │
                    │  NIST, EU AI Act, US Executive   │
                    │  "Agents need identity & trust"  │
                    └──────────────┬──────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌──────────▼────────┐
│  IDENTITY FORMAT   │  │  AUTHENTICATION   │  │  CONTENT PROVENANCE│
│  W3C (DIDs, VCs)   │  │  IETF (AIMS,      │  │  C2PA + CAWG       │
│                    │  │  WIMSE, OAuth)     │  │                    │
│  "What does an     │  │  "Prove you are    │  │  "Who made this    │
│   identity look    │  │   who you claim"   │  │   content?"        │
│   like?"           │  │                    │  │                    │
└─────────┬─────────┘  └─────────┬─────────┘  └──────────┬────────┘
          │                      │                        │
          └──────────────────────┼────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    IMPLEMENTATION       │
                    │    DIF Working Groups   │
                    │    "Build real systems" │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │         ★ AIR ★          │
                    │   Neutral Registry       │
                    │   Trust Scoring          │
                    │   Identity Provider      │
                    │   "The passport office   │
                    │    for AI agents"        │
                    └─────────────────────────┘
```

## AIR's Unique Position

No one else occupies this exact spot:

| What Others Do | What AIR Does Differently |
|---------------|--------------------------|
| W3C defines identity FORMATS (DIDs, VCs) | AIR OPERATES a registry that uses those formats |
| IETF defines AUTHENTICATION protocols | AIR provides TRUST SCORING on top of authentication |
| C2PA/CAWG tracks CONTENT provenance | AIR provides AGENT identity that gets embedded in content |
| DIF RESEARCHES decentralized identity | AIR IMPLEMENTS it for AI agents specifically |
| Platforms build PROPRIETARY agent identity | AIR is NEUTRAL — not owned by any platform |

## The "Layer Cake"

Think of agent trust like a layered system. Each layer answers a different question:

```
Layer 4: TRUST ASSESSMENT  ← AIR lives here
  "Should I trust this agent?"
  (Trust scores, behavioral history, verification tiers)

Layer 3: IDENTITY VERIFICATION
  "Is this agent who it claims to be?"
  (DIDs, VCs, domain verification)

Layer 2: AUTHENTICATION
  "Can this agent prove its identity right now?"
  (AIMS, OAuth, API keys, tokens)

Layer 1: COMMUNICATION
  "Can this agent talk to me?"
  (MCP, A2A, HTTP, WebSocket)
```

Most of the industry is building Layers 1 and 2. CAWG is building Layer 3 for content. **AIR is the only project building Layer 4 — trust assessment — as a neutral, independent service.**

## Complementary, Not Competitive

This is critical to understand and communicate. AIR is NOT competing with anyone:

| Partner | We Need Them For | They Need Us For |
|---------|-----------------|-----------------|
| W3C | DID/VC standards we build on | Implementation feedback, proof the standards work |
| IETF/AIMS | Authentication protocols | Trust layer on top of auth |
| CAWG/C2PA | Content provenance framework | Agent identity provider |
| DIF | Community, credibility, spec review | Working implementation to reference |
| Platforms (OpenAI, Anthropic, Google) | Agents that need identity | Neutral identity that works across platforms |

**Analogy:** A passport office doesn't compete with airlines, border control, or hotels. It provides a foundational service that all of them need.

## The Network Effect

AIR's value increases with adoption:

```
1 agent registered → proof of concept
10 agents → working demo
100 agents → emerging standard
1,000 agents → platforms start paying attention
10,000 agents → becomes the default
100,000 agents → critical infrastructure
```

Every agent that registers makes the registry more valuable for every other agent. This is the same network effect that made DNS, email, and SSL certificates ubiquitous.

## Strategic Advantages

### 1. We're Early
No one else has a working, neutral agent identity registry. Being first matters in standards — the first credible implementation often becomes the reference.

### 2. We're Neutral
Every platform would rather adopt a neutral standard than a competitor's. Google won't adopt OpenAI's identity system. But they might adopt a nonprofit's.

### 3. We're Built on Open Standards
W3C DIDs and VCs are already widely adopted. We're not asking anyone to learn something new — we're applying existing standards to a new domain.

### 4. We Have a Working System
Standards bodies value implementers. Having a live API with real endpoints matters more than a 100-page theoretical paper.

### 5. Regulators Want This
NIST, EU AI Act, and other regulatory frameworks are pushing for agent identity. When regulation mandates it, someone has to provide it.
