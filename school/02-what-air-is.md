# Module 02: What AIR Is

## The Elevator Pitch (2 minutes)

"AIR is a neutral, open registry that gives AI agents verifiable identity and transparent trust scores. Think of it as the passport office plus credit bureau for AI agents. Any agent, from any platform, can register, get a unique ID, and earn a trust score based on objective criteria. It's built on open standards so it works everywhere — no vendor lock-in."

## The Analogy

| Real World | AIR Equivalent |
|-----------|----------------|
| Passport | AIR ID (unique identifier) |
| Credit Score | Trust Score (0-1000) |
| Business License | Verification Level |
| Background Check | Trust Score Components |
| Passport Office | AIR Registry |
| Credit Bureau | Trust Scoring Engine |

## What We Actually Built (Today, Live, Working)

### 1. The Registry API

A real, working REST API that anyone can call right now.

**Live at:** `agentidentityregistry.org/api/v1/`

What it does:
- **Register an agent** → you send name, creator info, capabilities → you get back a unique AIR ID and an AIR-minted DID (`did:wba:agentidentityregistry.org:agents:{air_id}`)
- **Look up an agent** → you send an AIR ID → you get back the full identity + trust score
- **Resolve a DID document** → `GET /agents/{air_id}/did-document` returns a W3C DID Core JSON-LD document for any AIR agent
- **List all agents** → see every agent in the registry
- **Check if a name exists** → warns about duplicate names
- **Update an agent** → change description, capabilities, etc.
- **Delete an agent** → admin-only, soft delete (data preserved)
- **Health check** → is the API running?

**Where it runs:** Cloudflare Workers (serverless functions at the edge, globally distributed, free tier)

**Database:** Cloudflare D1 (SQLite database at the edge, also free)

### 2. The AIR ID

Every registered agent gets a unique identifier:

```
AIR-7F3K-M9JQ-X2PL
```

Format: `AIR-XXXX-XXXX-XXXX`

How it's generated:
1. Take the agent's identity info (name, creator, timestamp)
2. Hash it with SHA-256 (a standard cryptographic function — turns any input into a fixed-length string of characters that's essentially unique)
3. Encode the first part in base32 (a way of representing binary data using only letters and numbers)
4. Add a checksum using CRC32 (an error-detection code — like a check digit on a credit card)
5. Format as AIR-HEAD-TAIL-CHECKSUM

The result is unique, verifiable, and human-readable.

### 3. The Trust Score

Every agent gets a score from 0 to 1000, broken down into five components:

| Component | Weight | What It Measures |
|-----------|--------|-----------------|
| Provenance | 25% | Who made this agent? Is the creator verified? |
| Behavioral | 25% | How does the agent actually perform? (starts at 500 — no history yet) |
| Transparency | 20% | Is the code open source? Is there documentation? |
| Security | 15% | Does it have security certifications? |
| Peer Attestations | 15% | Have other verified agents/auditors vouched for it? (starts at 300) |

The score maps to letter grades:

| Grade | Score | Meaning |
|-------|-------|---------|
| AAA | 950-1000 | Exceptional trust |
| AA | 850-949 | High trust |
| A | 700-849 | Good trust |
| BBB | 600-699 | Adequate |
| BB | 500-599 | Fair |
| B | 400-499 | Marginal |
| C | Below 400 | Insufficient |

### 4. The Website

**agentidentityregistry.org**

Pages:
- **Homepage** (`/`) — what AIR is, how it works, trust scoring overview
- **Register** (`/register`) — form to register an agent, with a live trust score preview that updates as you fill in fields
- **Lookup** (`/lookup`) — search for any agent by AIR ID, shows the full "identity passport"
- **About** (`/about`) — mission, values, timeline, standards engagement
- **Governance** (`/governance`) — how decisions are made, verification tiers, anti-capture provisions
- **Blog** (`/blog`) — updates and announcements
- **Admin** (`/admin`) — protected dashboard showing registration stats (API key required)

### 5. SDKs and MCP Server

Client libraries so developers don't have to write raw HTTP calls:

| Package | Language | Registry | Version |
|---------|----------|----------|---------|
| `agent-identity-registry` | Python | PyPI | v0.5.0 |
| `agent-identity-registry` | TypeScript/JS | npm | v0.1.0 |
| `air-mcp-server` | Python (MCP) | PyPI | v0.1.0 |

### 6. The GitHub Repository

**github.com/AgentIdentityRegistry/agent-identity-registry**

Contains:
- Full API source code
- AIR Identity Specification v0.1
- Trust Score Methodology v1.0
- Governance documentation
- Website source
- Open for community contribution (GitHub Discussions enabled)

## Infrastructure (How It All Connects)

```
User visits agentidentityregistry.org
         │
         ├── Static pages (HTML/CSS/JS)
         │   Served by: Cloudflare Pages (free)
         │
         └── API calls to /api/*
             Served by: Cloudflare Workers (free)
                    │
                    └── Reads/writes to D1 Database
                        (SQLite at the edge)
                        Tables: agents, trust_scores, rate_limits
```

Everything runs on Cloudflare's free tier. Total monthly cost: $0.

## What It Costs a User

Nothing. Registration is free. Lookup is free. The API is free. The specification is Apache 2.0 licensed (open source, anyone can use it).

## Key Numbers (as of June 2026)

- **8 demo agents** registered (flagged as demo data)
- **0 real agents** registered (we just launched)
- **9 API endpoints** live
- **4 blog posts** published
- **3 standards bodies** contacted (W3C, IETF, DIF)
- **1 NIST public comment** submitted
- **1 standards body response** received (DIF — Eric Scouten at Adobe reached out)
- **$0** infrastructure cost
