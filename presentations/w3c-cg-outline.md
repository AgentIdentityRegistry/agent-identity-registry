# AIR Presentation — W3C AI Agent Protocol Community Group

**Title:** "Trust Beyond Identity: The Missing Layer in Agent Protocols"
**Duration:** 12 min + 3 min Q&A
**Presenters:** Peter Ahn (vision, slides 1-4, 9-11) / Kenny Bahia (technical, slides 5-8)

---

## SLIDE 1: Title
- Trust Beyond Identity: The Missing Layer in Agent Protocols
- Agent Identity Registry — Open Trust Infrastructure for AI Agents
- Peter Ahn & Kenny Bahia, Co-Founders
- agentidentityregistry.org | GitHub: agent-identity-registry

**Notes (Peter):** Thank you for having us. We're not here to pitch a product — we're here to show something we've built that addresses a gap in this group's protocol specification: the gap between knowing who an agent is and knowing whether you should trust it.

---

## SLIDE 2: The Problem — Identity ≠ Trust (Peter)
Two columns:
- **What identity tells you:** This agent is operated by example.com. Its DID resolves. Its domain is verified.
- **What identity doesn't tell you:** Has it behaved reliably? Is its source code auditable? Has anyone verified its claims? Has it had incidents? What do peers say?

**Bottom line:** DNS + HTTPS proves who you are. It says nothing about whether you're trustworthy.

**Notes:** This group has done excellent work on did:wba, discovery, and communication. The spec rightly identifies that agents must assess trustworthiness — but it acknowledges this gap. That's not a criticism; identity and trust are separate concerns.

---

## SLIDE 3: What AIR Is — 30-Second Version (Peter)
Layer cake diagram:
1. Communication — MCP, A2A, HTTP (this group's work)
2. Authentication — did:wba, AIMS, OAuth (IETF)
3. Identity — DIDs, VCs (W3C standards)
4. **Trust Assessment — AIR (the missing layer)**

AIR = open registry giving AI agents verifiable identity (AIR IDs) + transparent trust scores (0-1000) + machine-readable credentials. Nonprofit. Built on W3C DIDs and VCs.

---

## SLIDE 4: Three Gaps This Group Has Discussed But Not Solved (Peter)

| Gap (with meeting reference) | AIR's Approach |
|------------------------------|---------------|
| **Trust assessment mechanism** — spec requires "trustworthiness" assessment but provides none. Ken Huang proposed reputation scoring in Meeting 3 (Jul 2025); Wenjing (TSP) said infrastructure exists but scoring isn't built. Chris flagged "significant gaps in trust markers" in Meeting 6 (Sep 2025). | Five-component trust score (0-1000) with published methodology and live API |
| **OAuth-compatible trust signals** — George Fletcher has consistently pushed for OAuth compatibility. Meeting 9 demoed trust marks on tokens. But no multi-dimensional trust data exists to put in those tokens. | AIR is identity-method agnostic. Trust scores can enhance OAuth tokens, DID documents, or Agent Cards. We don't pick sides in the DID vs. OAuth debate. |
| **Agent reputation over time** — George raised instance vs. class identifiers for trust (Meeting 12). How does trust build over an agent's lifetime? | Behavioral component (25% of score) tracks reliability over time. Peer Attestations (15%) capture third-party verification. Scores are living, not static registration events. |

**Notes:** I've read all 15 of this group's meeting minutes. These aren't theoretical gaps — they're problems your own members have raised and that remain unsolved. Ken proposed reputation scoring a year ago. Chris flagged trust marker gaps. George asked how trust builds over time. AIR is our attempt to answer those questions. Now let me hand to Kenny for the technical walkthrough.

---

## SLIDE 5: The Trust Score Model (Kenny)
Radar chart + grade table:
- Provenance (25%) — Who built this agent? Source available?
- Behavioral (25%) — Uptime, error rates, consistency
- Transparency (20%) — Documentation, limitations disclosed
- Security (15%) — Certifications, encryption, vuln disclosure
- Peer Attestations (15%) — Independent third-party claims

Grades: AAA (950+) → AA → A → BBB → BB → B → C (<400)

Every criterion and evidence requirement is published openly.

---

## SLIDE 6: AIR ID and Identity Document (Kenny)
- Format: `AIR-XXXX-XXXX-XXXX`
- Generation: canonical JSON → SHA-256 → base32 → CRC32 checksum
- Identity doc: JSON-LD with `@context: "https://agentidentityregistry.org/v1"`
- Creator field links to ANY DID method: did:key, did:web, did:wba
- Credentials follow W3C VC Data Model 1.0, Ed25519 signatures

---

## SLIDE 7: Live Demo (Kenny)
Pre-loaded curl commands:
1. `GET /api/v1/health` → status OK
2. `GET /api/v1/agents` → list with trust scores
3. `GET /api/v1/agents/AIR-XXXX-XXXX-XXXX` → full identity doc
4. `GET /api/v1/agents/AIR-XXXX-XXXX-XXXX/trust-score` → component breakdown
5. (If time) `POST /api/v1/agents/register` → live registration

Have backup screenshots in case of network issues.

---

## SLIDE 8: Integration Scenario (Kenny)
Sequence diagram:
```
Agent A → discover Agent B (your protocol)
Agent A → verify did:wba (your protocol)
Agent A → GET /trust-score from AIR (one HTTP call)
Agent A → apply policy ("only collaborate if score ≥ 700")
Agent A → proceed or decline
```

AIR provides the data. The agent's operator sets the policy. Clean separation of concerns.

---

## SLIDE 9: Honest Assessment (Peter)

**What we have:** Published spec, live API, trust methodology, governance charter, DIF participation, CAWG interest (Eric Scouten, Adobe)

**What we don't have:** Zero real users (demo only), two co-founders, no funding, behavioral scoring needs production traffic we don't have yet

**Notes:** Credibility matters more than polish. We're early. We're sharing this because this group has the expertise to tell us if our approach is sound.

---

## SLIDE 10: Proposed Collaboration (Peter)
1. **Spec review exchange** — mutual review of each other's specs
2. **Trust metadata extension** — co-author companion note on trust in Agent Cards
3. **did:wba bridge** — Kenny implements did:wba support in AIR
4. **Interop demo** — discovery → trust verification → collaboration in one flow
5. **VC layer discussion** — should this group define a VC profile for agent capabilities?

**Notes:** We're not asking for endorsement. We're asking for engagement. We'll do the work.

---

## SLIDE 11: Summary + Contact
Three takeaways:
- **The gap:** Your protocol requires trust assessment but doesn't provide one.
- **The bridge:** AIR provides it — 0-1000, one API call, W3C standards, neutral nonprofit.
- **The ask:** Review our spec. Tell us what's wrong. Help us build the trust layer.

Contact:
- peter@agentidentityregistry.org
- kenny@agentidentityregistry.org
- GitHub: github.com/AgentIdentityRegistry/agent-identity-registry

---

## SLIDE 12: Reference Card (displayed during Q&A)
- Endpoints: /v1/agents, /v1/agents/:id, /v1/agents/:id/trust-score, /v1/agents/register
- Stack: Cloudflare Workers + D1
- Standards: W3C DIDs, W3C VCs, JSON-LD, RFC 8785
- Trust: Provenance 25%, Behavioral 25%, Transparency 20%, Security 15%, Peer 15%

---

## Prep Checklist
- [ ] Fix Priority 0 issues (grade threshold consistency, trust score defaults documentation, registration security notes)
- [ ] Implement did:wba in creator field
- [ ] Test API 30 min before call
- [ ] Pre-load curl commands in terminal
- [ ] Backup screenshots ready
- [ ] Seed DB with 3-5 agents showing range of scores (include one with did:wba creator)
- [ ] Peter handles slides 1-4, 9-11 (vision)
- [ ] Kenny handles slides 5-8 (technical + demo)
- [ ] Read all 15 meeting minutes (DONE — see w3c-cg-meeting-minutes-analysis.md in KB)

## Q&A Prep — Anticipating Tough Questions

**George Fletcher (OAuth skeptic):**
- Q: "How does this work with OAuth/OIDC? We can't expect everyone to adopt DIDs."
- A: "AIR is identity-method agnostic. The trust score is a simple REST API call — any system that can make an HTTP request can consume it. You could embed an AIR trust score as a claim in an OAuth token, as a field in an Agent Card, or as metadata in a DID document. We deliberately don't require DID adoption."

**Chris Phillips (adoption skeptic):**
- Q: "There are already too many competing specs. Why should we pay attention to another one?"
- A: "Two things differentiate us. First, we have a live API — not a spec, not a proposal, a running service you can query right now. Second, we're not competing with anyone's identity layer. We sit above it. AIR makes every identity system more useful by adding the trust assessment that none of them provide."

**Sean Zhang (DID advocate):**
- Q: "How does AIR integrate with did:wba specifically?"
- A: "Our creator field accepts did:wba natively. If your agent has did:wba:example.com:alice, that goes directly into the AIR identity document. Kenny can demo this live."

**Ben Stone (if present — SwarmSync/AIVS):**
- Q: "Your behavioral scores are flat defaults, not live data. How is that useful?"
- A: "Correct — we're v0.1 with zero production traffic. The methodology and rubrics are published. The data pipeline architecture is designed. What we need is real-world usage to populate it, which is part of why we're here — to find integration partners who will generate that traffic."
- Note: Ben is the AIVS/SwarmSync creator. His critique is valid but he's also pitching his own competing reputation system.

**"Is standardization even necessary?" (raised in Meeting 13):**
- A: "Claude/MCP succeeded because it's a single-vendor ecosystem. The moment you need agents from different vendors to trust each other across organizational boundaries, you need a shared trust layer. That's what AIR provides."
