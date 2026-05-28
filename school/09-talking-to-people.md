# Module 09: Talking to People

## The Core Pitch (30 Seconds)

"AIR is an open-source registry that gives AI agents verifiable identity and transparent trust scores. It's like a passport office for AI agents — any agent, from any platform, can register and get a unique ID and trust score. Built on W3C open standards, neutral and independent."

## Audience-Specific Cheat Sheets

### To a Standards Body Person (W3C, IETF, DIF)

**They care about:** Standards compliance, interoperability, community process

**Opening:**
"We're an early-stage open-source project building agent identity on W3C DIDs and Verifiable Credentials. We have a working API and published specification, and we're here to learn how our work aligns with yours."

**If they ask "what standards do you implement?":**
"Our agent identity documents use JSON-LD. Each agent links to a W3C DID. Our trust attestations are designed as Verifiable Credentials. We use SHA-256 for ID generation. We're built to complement existing standards, not create new ones."

**If they ask "how mature is this?":**
"Early stage. Working prototype with a live API. Specification v0.1 published for community review. Two-person team. We're looking for feedback from people who've been in this space longer than us."

**What NOT to say:**
- Don't claim W3C/DIF endorsement
- Don't say "production-ready"
- Don't say "standard" (it's a specification, not a ratified standard)

---

### To Eric Scouten / CAWG Specifically

**They care about:** Persistent agent identity for content provenance, C2PA integration

**Opening:**
"We've been thinking about the exact problem you described — current agent identity is transactional. AIR provides persistent, registry-based identity that survives beyond any session. We want to understand how this could plug into CAWG's identity assertion framework."

**Questions to ask Eric:**
1. "What would an identity provider for AI agents need to implement to be compatible with CAWG's identity assertion spec?"
2. "Is the v1.3 VC support draft the right integration point, or is there a simpler starting path?"
3. "How do you envision the delegation chain working — when a human authorizes an agent to create content on their behalf?"
4. "Are there existing implementations we should study? Open-source code we should look at?"
5. "What's the timeline for CAWG to support non-human named actors in practice?"

**Things to mention:**
- We submitted a NIST CAISI public comment on AI agent identity
- We have a live API — agents can register right now
- Our trust score model maps naturally to CAWG's verification needs
- We're joining DIF as a Contributor

**What NOT to say:**
- Don't claim we issue W3C VCs yet (we don't)
- Don't claim we have a DID resolution endpoint yet (we don't)
- Don't promise a timeline for integration (learn first)
- Don't oversell the trust scoring as "production-grade" (it's an initial model)

---

### To a Potential Funder / Grant Reviewer

**They care about:** Impact, sustainability, team, differentiation

**Opening:**
"AIR is building neutral identity infrastructure for AI agents — think DNS for agent identity. The problem is urgent: agents are proliferating but have no standardized way to prove who they are. We're the only independent, non-corporate project in this space with a working system."

**Key points:**
- Real technical asset (live API, spec, trust model) — not just a whitepaper
- Adobe/DIF connection validates the need (Eric Scouten reached out unprompted)
- NIST engagement shows policy relevance
- $0 infrastructure means funding goes to development, not hosting
- Built on W3C standards — not reinventing, implementing
- Open source, Apache 2.0 — public good, not proprietary

**What NOT to say:**
- Don't claim revenue or business model (none exists)
- Don't claim user traction (0 real registrations)
- Don't call it a "startup" (it's a nonprofit initiative)

---

### To a Developer / Potential Contributor

**They care about:** Is the code good? Can I contribute? Is this going somewhere?

**Opening:**
"AIR is an open-source project building agent identity infrastructure. Cloudflare Workers + D1, plain JavaScript, no dependencies. The spec, trust model, and API are all in one GitHub repo. We're looking for contributors."

**Key points:**
- GitHub repo: github.com/AgentIdentityRegistry/agent-identity-registry
- API source is one file (~500 lines of plain JS, no framework)
- Spec and trust methodology are published
- GitHub Discussions enabled
- Apache 2.0 license
- Contribution guide in CONTRIBUTING.md

**What NOT to say:**
- Don't claim a large community (it's 2 people)
- Don't claim "production-grade" (it's a prototype)

---

### To a Journalist or Media

**They care about:** Story, trend, conflict, impact

**Opening:**
"AI agents are everywhere — writing code, handling customer service, creating content — but there's no way to verify who they are. AIR is building the identity layer for AI agents, like how the internet needed DNS before websites could work."

**The story angle:**
- "The passport office for AI agents" (simple, memorable)
- Neutral and independent vs. platform lock-in
- NIST is asking for this, Adobe is interested, regulation is coming
- Built by a small team, not a big company

**What NOT to say:**
- Don't bash specific companies
- Don't claim more adoption than exists
- Don't make regulatory predictions ("the EU WILL require this")

---

## Universal Rules for All Conversations

1. **Lead with the problem, not the solution.** People care about problems they recognize.
2. **Use analogies.** "Passport office for AI agents." "Credit bureau for AI." "DNS for agent identity."
3. **Be honest about stage.** "Working prototype" not "production system." "Two-person team" not "foundation."
4. **Ask questions more than you make claims.** Especially with Eric and standards people.
5. **Don't apologize for being early.** Every standard started with one person and an idea. You have more than that — you have a working system.
6. **Say "I don't know" when you don't know.** Then follow up. This builds more credibility than guessing.
7. **Always offer the demo.** "You can try it right now at agentidentityregistry.org/register" is more convincing than any slide deck.
