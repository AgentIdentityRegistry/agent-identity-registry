# AIR Internal Strategy & Action Plan

**Document Classification:** Internal — Not for Public Distribution
**Version:** 1.0
**Date:** March 20, 2026
**Author:** Agent Identity Registry Foundation
**Review Date:** June 20, 2026

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [Competitive Positioning Analysis](#2-competitive-positioning-analysis)
3. [90-Day Tactical Roadmap](#3-90-day-tactical-roadmap)
4. [Funding & Sustainability Model](#4-funding--sustainability-model)
5. [Risk Analysis](#5-risk-analysis)
6. [Key Metrics & Decision Points](#6-key-metrics--decision-points)
7. [Appendices](#7-appendices)

---

## 1. Executive Overview

### The Market Moment

We are at an inflection point. In Q1 2026, three things happened simultaneously:

1. **NIST launched the AI Agent Standards Initiative** (February 2026), with the NCCoE publishing a concept paper on "Accelerating the Adoption of Software and AI Agent Identity and Authorization." The public comment period closes April 2, 2026.
2. **The IETF filed the AIMS draft** (March 2026) — a 26-page framework composing WIMSE, SPIFFE, and OAuth 2.0 into a formal Agent Identity Management System.
3. **Okta announced Auth0 for AI Agents** with general availability set for April 30, 2026, joining Microsoft Entra Agent ID (already in public preview) in the enterprise identity space.

The message is clear: **agent identity has moved from theoretical discussion to active standardization.** The organizations that participate in defining these standards will shape the next decade of AI infrastructure. The organizations that don't will be subject to standards designed by others.

### What AIR Is

The Agent Identity Registry (AIR) is a neutral, nonprofit registry providing identity verification, trust scoring, and verifiable credentials for AI agents. We are organized as a 501(c)(3) nonprofit with transparent multi-stakeholder governance.

### AIR's Four-Part Differentiator

No other organization in this space combines all four of these properties:

1. **True Independence.** Unlike AGNTCY (Linux Foundation with Cisco, Dell, Google, Oracle, Red Hat on the governing board) or Google's A2A protocol, AIR has zero corporate governance influence. Our 7-member board includes no corporate representatives with commercial interests in the agent identity space.

2. **Consumer-Facing Design.** Everyone else is building developer infrastructure — APIs, protocols, and SDKs. AIR makes agent identity *visible to end users* through the "passport" metaphor: a Trust Score (0-1000) with letter grades (AAA to C) that regular people can understand, not just engineers.

3. **Comprehensive Stack.** Most efforts focus on one piece: OWASP ANS does naming/discovery, AGNTCY does directory/orchestration, ERC-8004 does on-chain reputation, Google A2A does communication. AIR integrates identity + trust scoring + verifiable credentials in a single coherent framework.

4. **Global Nonprofit Governance.** AIR's governance charter — with rotating board terms, committee structure (TSC, TVC, CEC), public decision-making, conflict-of-interest policies, and whistleblower protections — is modeled on organizations like ICANN and the Internet Society. This is not a corporate open-source project with a foundation wrapper; it is a genuine public-interest institution.

### Document Purpose

This internal action plan answers three questions:

1. **Can AIR own this space?** — Competitive positioning analysis
2. **What's the fastest path to credibility?** — 90-day tactical roadmap
3. **How does AIR sustain as a nonprofit?** — Funding and sustainability model

---

## 2. Competitive Positioning Analysis

### 2.1 Landscape Overview

The agent identity landscape as of March 2026 comprises 17+ organizations across five categories. The space is **fragmented, intensely active, and lacks a unifying voice.**

#### Government & Standards Bodies

| Organization | Initiative | Status | Scope |
|---|---|---|---|
| NIST CAISI | AI Agent Standards Initiative | Active (Feb 2026) | Security controls, risk management, agent identity, monitoring |
| NIST NCCoE | Agent Identity & Authorization Concept Paper | Comment period closes April 2 | IAM standards (OAuth, OIDC, SPIFFE) applied to AI agents |
| IETF | AIMS draft (draft-klrc-aiagent-auth-00) | Filed March 2026 | WIMSE + SPIFFE + OAuth 2.0 composed for agent auth |
| IETF | WIMSE Working Group | Active | Workload identity in multi-service environments |

#### Open Standards Consortia

| Organization | Initiative | Status | Scope |
|---|---|---|---|
| OpenID Foundation | AI Identity Management Community Group | Active, whitepaper published Oct 2025 | Identity gaps, standards coordination |
| W3C | AI Agent Protocol Community Group | Active, WebMCP deliverable Sep 2025 | Agent discovery, identification, collaboration protocols |
| DIF | Trusted AI Agents Working Group | Active | DID/VC stack for agents, privacy-preserving trust |
| OWASP | Agent Name Service (ANS) v1.0 | Published May 2025 | DNS-inspired naming and discovery for agents |

#### Industry-Led Open Projects

| Organization | Initiative | Governance | Scope |
|---|---|---|---|
| Google | Agent2Agent (A2A) Protocol | Google-led, open spec | Agent communication, Agent Cards, OAuth/OIDC auth |
| AGNTCY (Linux Foundation) | Agent Directory Service | Corporate board (Cisco, Dell, Google, Oracle, Red Hat) | P2P agent discovery, orchestration, 75+ member orgs |
| Ethereum | ERC-8004 | EIP process (MetaMask, Coinbase, Ethereum Foundation authors) | On-chain Identity Registry + Reputation Registry + Validation Registry |

#### Enterprise Solutions

| Organization | Product | Status | Scope |
|---|---|---|---|
| Microsoft | Entra Agent ID | Public preview (Ignite 2025) | Enterprise agent lifecycle management, Zero Trust |
| Okta | Auth0 for AI Agents | GA April 30, 2026 | OAuth/OIDC agent identity, lifecycle management |
| Aembit | Workload IAM | Active | Workload identity and access management for agents |
| CyberArk | Workload Identity | Active | Dynamic, ephemeral agent identity at scale |
| Credo AI | AI Agent Registry | Generally available | Enterprise governance, compliance (EU AI Act, NIST RMF) |

#### Decentralized & Academic

| Organization | Initiative | Status | Scope |
|---|---|---|---|
| MIT Media Lab | Project NANDA | Active, 15 universities | Decentralized agent index, AgentFacts (JSON-LD) |
| Stanford DEL | Loyal Agents Initiative | Active | Consumer trust, authentication standards influence |
| SingularityNET + Privado ID | Decentralized AI Agent Trust Registry | Phase 1 pilot | On-chain DIDs, Verifiable Credentials via AnonCred |
| DeepTrust | Know Your Agent (KYA) | Live (HSBC, Sony Bank, Deutsche Bank) | Verifiable identity/reputation, TEE/HSM/MPC |

### 2.2 Competitive Matrix

| Organization | Independence | Scope | Maturity | Consumer-Facing |
|---|---|---|---|---|
| **AIR** | **Full (nonprofit, no corp board)** | **Full stack (ID + trust + creds)** | **Draft/pilot** | **Yes (passport, grades)** |
| AGNTCY/LF | Low (corporate board) | Directory + orchestration | Production | No (developer API) |
| Google A2A | Low (Google-led) | Communication + Agent Cards | Production | No (developer spec) |
| ERC-8004 | Medium (open EIP process) | Identity + reputation (on-chain) | Finalized spec | Partial (blockchain UI) |
| OWASP ANS | High (community project) | Naming + discovery only | v1.0 published | No (developer spec) |
| MIT NANDA | High (academic) | Index + AgentFacts | Research/pilot | No (research tool) |
| Microsoft Entra | Low (Microsoft product) | Enterprise lifecycle | Public preview | No (admin console) |
| Okta Auth0 | Low (Okta product) | OAuth/OIDC lifecycle | Pre-GA | No (developer SDK) |
| DeepTrust | Medium (startup) | Identity + reputation | Production | Partial (enterprise UI) |
| SingularityNET | Medium (crypto ecosystem) | DIDs + VCs (on-chain) | Phase 1 pilot | No (developer SDK) |
| Credo AI | Low (enterprise vendor) | Governance registry | Production | No (enterprise dashboard) |
| NIST/IETF/W3C/DIF | High (standards bodies) | Standards frameworks | Drafts/concepts | No (spec documents) |

### 2.3 White Space Analysis

**What no one else combines:**

The competitive matrix reveals four distinct white spaces that AIR occupies simultaneously:

1. **No other fully independent, nonprofit entity operates a comprehensive agent identity registry.** AGNTCY is closest but is corporate-governed. MIT NANDA is independent but academic and research-focused. OWASP ANS is community-driven but covers only naming/discovery.

2. **No one else makes agent trust *consumer-visible*.** Every existing solution targets developers or enterprise admins. AIR's Trust Score grades (AAA to C) and passport metaphor are designed for end users — people who interact with agents daily.

3. **No one else integrates identity + trust scoring + verifiable credentials in one framework.** The landscape is fragmented by design layer: OWASP does naming, A2A does communication, ERC-8004 does reputation, IETF does authentication. AIR connects all three.

4. **No one else has a governance charter explicitly designed to prevent corporate capture.** AIR's 501(c)(3) structure with conflict-of-interest policies, board diversity requirements, whistleblower protections, and "no pay-to-play" funding rules is unique in this space.

### 2.4 Three Most Dangerous Competitors

#### Threat 1: AGNTCY (Linux Foundation)

**Why dangerous:** 75+ corporate members including Cisco, Dell, Google, Oracle, Red Hat. Massive engineering resources. Linux Foundation brand recognition in open-source infrastructure. Already has a working Agent Directory Service.

**AIR's counter-strategy:** Position AIR as the *governance and trust* layer that complements AGNTCY's *directory and orchestration* layer. AIR does not need to replace AGNTCY's P2P directory; it needs to be the trusted authority that *verifies identities listed in that directory*. The analogy: AGNTCY is the phone book; AIR is the passport office.

**Key message:** "We are not competing with AGNTCY. We are providing the trust verification that makes their directory trustworthy."

#### Threat 2: Microsoft Entra Agent ID

**Why dangerous:** 95% enterprise penetration through existing Entra ID. Enterprises will default to whatever Microsoft provides because it integrates with their existing identity infrastructure. Zero marginal cost of adoption for existing Microsoft customers.

**AIR's counter-strategy:** Microsoft Entra is enterprise-specific and vendor-locked. AIR is platform-neutral and open. The positioning is: "Entra Agent ID tells you which agents your company deployed. AIR tells you which agents *anyone in the world* can trust." AIR serves the cross-organizational, cross-platform trust problem that no single vendor can solve.

**Key message:** "Microsoft solves identity within your enterprise. AIR solves identity across the ecosystem."

#### Threat 3: NIST-Native Efforts

**Why dangerous:** If NIST's standards initiative produces its own reference framework for agent identity (building on SPIFFE, OAuth, OIDC), it could become the de facto US government standard. NIST's authority in cybersecurity is unmatched.

**AIR's counter-strategy:** AIR should *contribute to*, not *compete with*, NIST. The NIST comment submission is the first step. Positioning: AIR is the nonprofit implementation partner that brings NIST's standards frameworks to life as a neutral, operational registry. NIST sets the rules; AIR runs the infrastructure.

**Key message:** "AIR implements NIST's vision of standards-based agent identity through an independent, auditable registry."

### 2.5 SWOT Analysis

#### Strengths
- **Unique positioning:** Only fully independent, consumer-facing, comprehensive agent identity nonprofit
- **Existing substance:** Detailed specification, governance charter, trust score methodology, roadmap — more developed than most competitors' public documentation
- **Clean brand:** "AIR" is memorable, "ICANN for agents" is instantly understood, domains secured
- **Governance design:** 501(c)(3) structure designed from day one to prevent corporate capture
- **Standards alignment:** Built on W3C DIDs and Verifiable Credentials — not a proprietary format

#### Weaknesses
- **Solo founder, part-time:** Cannot match the engineering resources of AGNTCY (75+ orgs) or Microsoft
- **No working product:** Specification exists but no running registry or demo
- **No institutional backing:** No university affiliation (vs. MIT NANDA), no corporate sponsors (vs. AGNTCY), no government mandate (vs. NIST)
- **No community yet:** Zero GitHub stars, zero contributors, zero mailing list subscribers
- **Revenue model unproven:** No funding secured; sustainability depends on future grants and membership

#### Opportunities
- **NIST comment period (April 2):** Immediate opportunity to enter the official record of the most important US government AI agent standards initiative
- **Fragmented landscape:** No single winner has emerged; the space needs a unifying neutral voice
- **Growing urgency:** Enterprise adoption of AI agents is accelerating; identity/trust infrastructure demand is increasing faster than supply
- **Standards body openness:** W3C, IETF, DIF working groups are actively seeking new participants
- **Nonprofit funding ecosystem:** Foundations (Ford, Mozilla, Sloan, Open Technology Fund) actively fund internet governance and AI safety infrastructure

#### Threats
- **Corporate consolidation:** Microsoft, Okta, or Google could capture the market through enterprise defaults before open standards mature
- **Standards fragmentation:** If the space fragments into incompatible standards (IETF vs. W3C vs. blockchain), AIR's interoperability thesis weakens
- **Timing:** The window for establishing a neutral alternative may close within 12-18 months as enterprise solutions become entrenched
- **Credibility gap:** Without a working product or institutional backing, AIR may be perceived as aspirational rather than substantive
- **Regulatory capture:** If governments mandate specific vendor solutions (e.g., NIST endorses a particular framework), independent alternatives become irrelevant

### 2.6 Verdict: Can AIR Own This Space?

**Qualified yes — with conditions.**

AIR cannot "own" the space in the sense of becoming the sole solution. The landscape is too fragmented, the corporate players too well-resourced, and the standards bodies too independent for any single organization to dominate.

But AIR *can* own a specific, defensible position: **the neutral, consumer-facing trust verification layer for the agentic era.** This position is currently unoccupied. No one else combines independence + consumer visibility + comprehensive stack + nonprofit governance.

The conditions for success:
1. **Speed:** AIR must establish its presence in standards processes within 90 days, before the landscape consolidates
2. **Substance:** AIR must demonstrate a working proof-of-concept, not just specifications
3. **Partnerships:** AIR must frame itself as complementary to existing efforts, not competitive
4. **Sustainability:** AIR must secure initial funding within 6 months to expand beyond solo founder

---

## 3. 90-Day Tactical Roadmap

### Strategic Approach

**Standards-First + Demo** — Prioritize embedding AIR into active standards processes while simultaneously building a minimal working demo. This hybrid approach (validated through Planner/Architect/Critic consensus) maximizes the NIST deadline opportunity while producing a tangible artifact.

**Weekly hour budget:** 25 hours/week maximum. If any sprint requires >35 hours/week, cut scope from the lowest-priority item. Priority order (highest to lowest):
1. NIST comment
2. Demo
3. Working group participation
4. Blog/article
5. Advisory recruitment
6. Roundtable event

### Sprint 1: Days 1-14 (March 20 — April 2)

**Theme: Plant the Flag**

#### Week 1 (March 20-26): Draft + Build

| Task | Hours | Deliverable |
|------|-------|-------------|
| Draft NIST CAISI public comment | 10-12h | 5-8 page comment referencing AIR framework |
| Build minimal "AIR ID Lookup" demo | 8-10h | Single-page web app at agentidentityregistry.org/lookup |
| Register for NIST comment submission | 1h | Account on regulations.gov or NCCoE comment portal |
| **Total** | **19-23h** | |

**NIST Comment Structure:**
1. Introduction to AIR and its mission (1 page)
2. Response to specific concept paper sections, highlighting gaps AIR addresses (2-3 pages)
3. AIR's technical approach — reference existing specification (1-2 pages)
4. Recommendations for neutral governance of agent identity infrastructure (1 page)
5. Link to working demo and full specification

**Demo Scope (minimal viable):**
- Single HTML page hosted on agentidentityregistry.org/lookup
- Input: AIR ID (e.g., AIR-7F3K-M9JQ-X2PL)
- Output: Agent identity summary + Trust Score + grade
- Data: 5-10 pre-populated example agents (mock data acceptable for v0.1)
- Tech: Static HTML/JS + JSON data file (no backend needed for demo)

#### Week 2 (March 27 — April 2): Submit + Announce

| Task | Hours | Deliverable |
|------|-------|-------------|
| Polish and submit NIST comment | 4-5h | Confirmed submission (save confirmation) |
| Polish and deploy demo | 3-4h | Live at agentidentityregistry.org/lookup |
| Announce AIR on 3 mailing lists | 3-4h | Introductory messages to IETF AIMS, W3C AI Agent Protocol CG, DIF Trusted AI Agents WG |
| Post announcement on LinkedIn | 1-2h | Public post linking to demo and NIST comment |
| **Total** | **11-15h** | |

**Mailing List Introduction Template:**
> Subject: Introducing AIR — Neutral Agent Identity Registry
>
> I'm writing to introduce the Agent Identity Registry (AIR), a 501(c)(3) nonprofit building neutral identity verification and trust scoring infrastructure for AI agents. AIR is built on W3C DIDs and Verifiable Credentials.
>
> We've published our technical specification, governance charter, and trust score methodology as open documents. We've also submitted a public comment to NIST CAISI and have a working demo at [URL].
>
> We'd welcome the opportunity to participate in [working group name] and contribute AIR's perspective on [specific topic relevant to that group].
>
> Links: [spec] [governance] [demo] [NIST comment]

#### Sprint 1 Success Criteria
- [ ] NIST comment submitted with confirmation number
- [ ] Demo live and returning valid responses for test agent IDs
- [ ] 3 mailing list introduction messages sent
- [ ] LinkedIn announcement posted

### Sprint 2: Days 15-45 (April 3 — May 4)

**Theme: Establish Presence**

| Task | Hours/Week | Deliverable |
|------|------------|-------------|
| Attend working group meetings (W3C, IETF, DIF) | 4-6h | Meeting attendance records, contribution notes |
| Publish independence thesis article | 6-8h (one-time) | Blog post or Medium article on why agent identity must be neutral |
| Begin advisory board recruitment | 3-4h | 5+ outreach emails to potential advisors |
| Populate GitHub repo with existing docs | 4-6h (one-time) | Spec, governance, trust-score, roadmap, contributing guide in repo |
| Monitor NIST comment engagement | 1h | Track any responses or citations |
| **Total** | **~20h/week** | |

**Independence Thesis Article Outline:**
1. The agentic era requires trust infrastructure (the problem)
2. Why big tech shouldn't control agent identity (the argument)
3. Lessons from the internet: ICANN, Let's Encrypt, the DNS (the precedent)
4. AIR's approach: independence + transparency + comprehensive coverage (the solution)
5. Call to action: join us in building neutral agent identity infrastructure

**Advisory Board Qualification Criteria:**
- No current employment at a company with a competing agent identity product
- Public track record in: standards development, AI governance, nonprofit management, or decentralized identity
- Geographic diversity (no more than 2 from same country)
- Must pass the Independence Test: AIR retains sole editorial and governance control; advisor can publicly disagree without consequence; relationship is transparently disclosed
- Target profiles: academics in AI/identity, former standards body participants, nonprofit governance experts, regulatory professionals

**GitHub Repo Population Plan:**
- Copy existing docs from `github-repo/` directory to the live repo
- Files: README.md (existing, well-developed), CONTRIBUTING.md, ROADMAP.md, LICENSE, docs/SPECIFICATION.md, docs/GOVERNANCE.md, docs/TRUST-SCORE.md
- Add: .github/ISSUE_TEMPLATE/ templates, SECURITY.md
- Goal: Repo looks like a real, active open-source project

#### Sprint 2 Success Criteria
- [ ] Attended 2+ working group meetings
- [ ] Independence thesis article published
- [ ] 5+ advisory recruitment emails sent, 2+ responses received
- [ ] GitHub repo populated with all existing documentation
- [ ] At least 1 external mention of AIR (mailing list reply, citation, etc.)

### Sprint 3: Days 46-90 (May 5 — June 18)

**Theme: Build Momentum**

| Task | Hours/Week | Deliverable |
|------|------------|-------------|
| Continue working group participation | 3-4h | Regular attendance and contributions |
| Expand demo to functional prototype | 6-8h/week | Agent registration flow, real trust score calculation |
| Host virtual roundtable on agent identity independence | 6-8h (one-time) | 60-min webinar with 3-5 speakers, recorded |
| Follow up on advisory recruitment | 2-3h | Secure 2+ formal advisory commitments |
| Apply to 2+ grant programs | 6-8h (one-time) | Grant applications submitted |
| **Total** | **~22h/week** | |

**Virtual Roundtable Plan:**
- Topic: "Who Should Control Agent Identity? The Case for Neutral Infrastructure"
- Format: 60-minute panel with 3-5 speakers + Q&A
- Target speakers: academics (MIT NANDA researcher, Stanford Loyal Agents participant), standards body member (W3C/DIF), independent AI governance expert
- Platform: Zoom webinar or YouTube Live (free, replayable)
- Promotion: Mailing lists, LinkedIn, working group channels
- Deliverable: Recorded video + written summary posted on AIR blog

#### Community-Building Strategy: First 50-100 Supporters

**Goal:** Build a base of 50-100 identifiable supporters (stars, subscribers, followers, or active participants) by Day 90.

**Target Communities (in priority order):**

1. **W3C/DIF mailing list participants** — Already engaged in decentralized identity; most likely to understand AIR's value immediately. Outreach: reply substantively to threads, reference AIR spec where relevant, invite review.
2. **AI governance Slack/Discord communities** — Groups like the Partnership on AI community, OECD AI Policy Observatory network, and AI safety/alignment communities on Discord. Outreach: share independence thesis article, participate in discussions about agent trust.
3. **Academic researchers** — Contacts at MIT Media Lab (NANDA project), Stanford DEL (Loyal Agents), and university labs working on AI identity/trust. Outreach: email researchers directly with spec link, invite to roundtable as speakers or attendees.
4. **Open-source AI developers** — Contributors to agent frameworks (LangChain, AutoGPT, CrewAI communities). Outreach: post in their forums about the agent identity problem, link to GitHub repo, propose integration ideas.
5. **AI policy professionals** — Think tank researchers, government AI policy staff, nonprofit technology professionals. Outreach: share NIST comment and executive summary via LinkedIn and professional networks.

**Tactics:**

| Tactic | Target | Timeline | Expected Yield |
|--------|--------|----------|----------------|
| GitHub repo launch with call for reviewers | Developers, researchers | Sprint 2-3 | 15-25 stars, 2-5 contributors |
| Independence thesis article on Medium/Substack | AI governance community | Sprint 2 | 10-20 followers/subscribers |
| LinkedIn content series (3-4 posts) | Policy professionals, enterprise | Sprint 2-3 | 15-25 connections/followers |
| Virtual roundtable promotion + attendees | Cross-community | Sprint 3 | 20-30 attendees → 10-15 ongoing supporters |
| Direct outreach to 20 named individuals | Researchers, standards participants | Sprint 2-3 | 8-12 responsive contacts |
| Mailing list engagement (substantive replies) | W3C, DIF, IETF participants | Sprint 2-3 | 5-10 recognized relationships |

**Measurement:** Track supporters across channels in a simple spreadsheet: Name, Affiliation, Channel (GitHub/LinkedIn/mailing list/roundtable), Date of first engagement. Target: 50 by Day 60, 100 by Day 90.

**Named Early Supporter Targets (first 10):**
- 2-3 W3C AI Agent Protocol CG active participants
- 2-3 DIF Trusted AI Agents WG members
- 1-2 MIT NANDA or Stanford DEL researchers
- 1-2 AI governance nonprofit professionals (e.g., Partnership on AI, AI Now Institute)
- 1-2 open-source agent framework maintainers

#### Sprint 3 Success Criteria
- [ ] Demo expanded with agent registration flow
- [ ] Virtual roundtable held with 20+ attendees
- [ ] 2+ advisory board members formally committed
- [ ] 2+ grant applications submitted
- [ ] GitHub repo has 10+ stars and 1+ external contributor
- [ ] 50+ identifiable supporters across all channels
- [ ] Community tracking spreadsheet maintained with named contacts

---

## 4. Funding & Sustainability Model

### 4.1 First-Year Operating Expenses (Minimal)

| Category | Monthly | Annual | Notes |
|---|---|---|---|
| Domain & hosting | $20 | $240 | Cloudflare (already covered) |
| Legal (501(c)(3) filing) | — | $2,000 | One-time; can use pro bono legal services |
| Cloud infrastructure | $50 | $600 | Demo + API hosting (minimal scale) |
| Design & branding | — | $1,000 | Logo, visual identity refinement |
| Conference attendance | — | $3,000 | 2-3 relevant conferences (travel + registration) |
| Contractor support | $500 | $6,000 | Part-time developer for reference implementation |
| Miscellaneous | $100 | $1,200 | Office supplies, communication tools |
| **Total** | **~$700** | **~$14,000** | |

Year 1 operating cost is manageable for a bootstrapped founder. The critical investment is *time*, not money.

### 4.2 Revenue Streams (Preserving Independence)

#### Stream 1: Foundation Grants (Primary, Year 1-2)

Target grant programs:

| Grant Program | Amount | Deadline | Fit |
|---|---|---|---|
| Mozilla Foundation — Mozilla Technology Fund | $50K-$200K | Rolling | Internet health, open standards, trustworthy AI |
| Ford Foundation — Technology & Society | $50K-$500K | Rolling | Digital infrastructure, public interest technology |
| Open Technology Fund — Internet Freedom | $50K-$300K | Annual (typically Q1) | Open standards, decentralized infrastructure |
| Sloan Foundation — Digital Technology | $50K-$200K | Rolling | Digital infrastructure research and development |
| NSF — Secure and Trustworthy Cyberspace | $100K-$500K | Annual (typically October) | Cybersecurity, identity infrastructure |
| Omidyar Network | $50K-$500K | Rolling | Responsible technology, digital identity |
| Siegel Family Endowment | $25K-$150K | Rolling | AI governance, public interest technology |

**Strategy:** Apply to 3-4 programs in Sprint 3 (Days 46-90). Lead with: "AIR submitted a public comment to NIST CAISI, participated in 3 standards body working groups, and operates a working demo — we need funding to scale from proof-of-concept to production."

#### Stream 2: Membership Tiers (Year 2+)

| Tier | Price | Benefits |
|---|---|---|
| Individual (developer) | Free | Basic API access, community participation |
| Organization (startup) | $500/year | Priority API access, listed as supporter |
| Organization (enterprise) | $5,000/year | Premium API access, technical support, governance voice |
| Founding Member | $25,000/year (limited) | Board observer status, early access, name on founding wall |

**Governance safeguard:** No membership tier grants voting control or board seats. Financial contribution does not equal governance influence. This is a hard rule encoded in the governance charter.

#### Stream 3: Certification & API Revenue (Year 2+)

| Service | Price | Description |
|---|---|---|
| Verifier certification | $2,000/year | Organizations become certified AIR verifiers |
| Bulk API access | $0.01/lookup | High-volume API access for platforms |
| Trust Score badge | $100/year | Verified trust score badge for agent marketing |
| Custom integration support | $200/hour | Professional services for enterprise integration |

**Red lines (what AIR will never do):**
- Accept corporate board seats in exchange for funding
- Allow pay-to-play trust scores (higher payment = higher score)
- Sell agent behavioral data to third parties
- Accept exclusive partnerships that compromise neutrality
- Compromise the independence test for any revenue stream

### 4.3 Path to Sustainability

| Month | Revenue Sources | Projected Monthly |
|---|---|---|
| 1-6 | Bootstrapped (founder-funded) | $0 |
| 6-12 | First grant received | $4,000-$10,000 |
| 12-18 | Grants + early memberships | $8,000-$20,000 |
| 18-24 | Grants + memberships + certification fees | $15,000-$40,000 |
| 24+ | Diversified (grants < 50% of revenue) | $25,000+ |

**Break-even target:** $14,000/year (achievable with a single $50K grant covering 3+ years of operations at minimal scale).

**Sustainability milestone:** Revenue diversification — no single source exceeds 30% of total revenue. This prevents dependency on any single funder and preserves independence.

### 4.4 Peer Comparison

| Organization | Structure | Primary Revenue | Annual Budget | Lesson for AIR |
|---|---|---|---|---|
| ICANN | Nonprofit | Domain registration fees | ~$140M | Scale comes from being the *only* registry; AIR should aim for similar network effects |
| Let's Encrypt (ISRG) | 501(c)(3) | Corporate sponsorships + grants | ~$5M | Proved that critical internet infrastructure can be nonprofit; started small |
| DIF | Nonprofit | Membership fees | ~$1M | Standards-focused nonprofits can sustain on membership alone; AIR should plan for this |
| OpenID Foundation | Nonprofit | Membership + certification | ~$2M | Certification revenue (OpenID Connect certification) is a proven model for identity organizations |

**Key takeaway:** Let's Encrypt is the most relevant precedent. It launched as a tiny project, grew to secure 300M+ websites, and operates on ~$5M/year. AIR could follow a similar trajectory: start with grants, prove value, then transition to sustainable recurring revenue.

---

## 5. Risk Analysis

### Risk 1: Irrelevance — Standards Converge Without AIR

**Likelihood:** Medium | **Impact:** High

**Scenario:** NIST, IETF, and W3C converge on an agent identity framework that doesn't reference or need AIR. AGNTCY or another large project becomes the de facto standard.

**Mitigation:** Position AIR as the *interoperability and trust verification layer* that works *with* any underlying standard, not as a competing standard. AIR's spec already uses W3C DIDs and VCs — it's built on existing standards, not replacing them.

**Kill condition:** If no standards body acknowledges AIR's existence or contributions by Day 60, deprioritize standards engagement and shift resources to direct product-led growth (demo → developer adoption → organic standards influence).

### Risk 2: Corporate Co-Option

**Likelihood:** Low (near-term), High (if AIR gains traction) | **Impact:** Critical

**Scenario:** A large tech company offers to "sponsor" or "partner with" AIR in exchange for governance influence, effectively capturing the neutral institution.

**Mitigation:**
- Governance charter explicitly prevents corporate board seats
- Independence Test requires unilateral control of spec and governance
- Funding diversification rule: no single source exceeds 30% of revenue
- All partnership proposals reviewed against Independence Test before acceptance

**Kill condition:** If any single funder would exceed 30% of AIR's revenue, decline or restructure the relationship. No exceptions.

### Risk 3: Solo Founder Bottleneck

**Likelihood:** High | **Impact:** High

**Scenario:** Everything depends on one person. Illness, burnout, or competing priorities halt all progress.

**Mitigation:**
- Advisory board recruitment (Sprint 2) distributes knowledge and creates continuity
- GitHub repo documentation ensures anyone can understand and extend the work
- Governance charter includes succession planning provisions
- All documents and assets are publicly accessible — the project can continue without any single individual

**Kill condition:** If fewer than 2 advisory board members commit by Day 45, cancel the advisory board structure entirely. Replace with informal "review partners" who provide async feedback. Do not spend further time on recruitment.

### Risk 4: Credibility Gap

**Likelihood:** Medium | **Impact:** High

**Scenario:** AIR has detailed specifications but no adoption, no registered agents, no community. Perception: "impressive paperwork, but does anyone use this?"

**Mitigation:**
- Demo in Sprint 1 provides a tangible artifact
- GitHub repo in Sprint 2 shows development activity
- Working group participation provides institutional credibility
- Virtual roundtable in Sprint 3 creates visible community engagement

**Kill condition:** If the demo gets fewer than 50 unique visitors AND the specification gets fewer than 5 external reviewers by Day 60, pivot from standards engagement to direct developer outreach (hackathons, developer blogs, integration tutorials).

### Risk 5: Timing — Window Closes

**Likelihood:** Medium | **Impact:** Medium

**Scenario:** The market moves faster than AIR can establish itself. Microsoft Entra and Okta become enterprise defaults. AGNTCY becomes the open-source default. By the time AIR has a production registry, the landscape has consolidated.

**Mitigation:**
- NIST comment submission in Sprint 1 establishes presence immediately
- Speed-over-perfection principle applied throughout
- Conditional pivot: if standards engagement fails but demo gains organic traction, shift to product-led growth

**Kill condition:** If NIST comment yields zero follow-up engagement by Day 30 but the demo attracts 50+ unique visitors organically, shift to product-led growth as the primary strategy.

---

## 6. Key Metrics & Decision Points

### 30-Day Metrics (April 20, 2026)

| Metric | Target | Source |
|---|---|---|
| NIST comment submitted | Yes/No | regulations.gov confirmation |
| Demo live and functional | Yes/No | HTTP 200 at /lookup |
| Mailing list introductions sent | 3+ | Email confirmations |
| LinkedIn announcement engagement | 20+ reactions | LinkedIn analytics |
| Demo unique visitors | 50+ | Cloudflare analytics |

**Decision gate at Day 30:** If NIST comment gets zero acknowledgment AND demo gets <25 visitors, reassess the standards-first strategy. Consider pivoting to product-led growth or direct developer outreach.

### 60-Day Metrics (May 20, 2026)

| Metric | Target | Source |
|---|---|---|
| Working group meetings attended | 4+ | Calendar records |
| Independence thesis article published | Yes/No | URL exists |
| Advisory outreach emails sent | 5+ | Email records |
| GitHub repo stars | 10+ | GitHub |
| External mentions of AIR | 2+ | Google Alerts, mailing list archives |
| Advisory responses received | 2+ | Email replies |

**Decision gate at Day 60:** If no standards body has acknowledged AIR AND no advisory board member has responded, activate the contingency: pivot to full product-led growth, focus on building the best demo in the space, and attract developers directly.

### 90-Day Metrics (June 18, 2026)

| Metric | Target | Source |
|---|---|---|
| Advisory board members committed | 2+ | Written confirmations |
| Grant applications submitted | 2+ | Application confirmations |
| Virtual roundtable held | Yes/No | Recording URL |
| Roundtable attendance | 20+ | Webinar analytics |
| GitHub contributors (external) | 1+ | GitHub |
| Total demo visitors (cumulative) | 200+ | Analytics |
| Standards body acknowledgment | 1+ | Mailing list, citation, or meeting reference |

**Decision gate at Day 90:** Full strategy review. Compare actual metrics against targets. Decide whether to continue standards-first approach, pivot to product-led growth, or pursue a hybrid. This review informs the next 90-day plan.

### Leading vs. Lagging Indicators

| Leading (measure weekly) | Lagging (measure monthly) |
|---|---|
| Demo traffic | Standards body citations |
| Mailing list responses | Advisory commitments |
| GitHub stars/forks | Grant award decisions |
| Article views/shares | Media coverage |
| Working group attendance | Community size |

### Explicit Pivot Triggers

| Trigger | Action |
|---|---|
| NIST comment ignored + demo thriving (Day 30) | Shift to product-led growth |
| No advisory interest after 15 outreach attempts (Day 45) | Replace advisory board with async review partners |
| Same standards body rejects AIR twice (any time) | Deprioritize that body, focus elsewhere |
| Demo gets 500+ visitors organically (any time) | Accelerate product development regardless of standards track |
| Major competitor announces consumer-facing trust scores (any time) | Emergency strategy review — differentiation thesis under threat |

---

## 7. Appendices

### Appendix A: Standards Body Contact Points

| Body | Working Group | Mailing List / Contact | Participation Cost |
|---|---|---|---|
| NIST CAISI | AI Agent Standards | caisi@nist.gov | Free (public comment) |
| IETF | WIMSE | wimse@ietf.org | Free (mailing list) |
| W3C | AI Agent Protocol CG | public-agentprotocol@w3.org | Free (Community Group) |
| DIF | Trusted AI Agents WG | membership@identity.foundation | DIF membership ($0 for individuals) |
| OpenID Foundation | AI Identity CG | openid-specs-digital-credentials@lists.openid.net | Free (Community Group) |
| OWASP | GenAI Security | genai-security@owasp.org | Free |

### Appendix B: Grant Application Timeline

| Program | Target Submission | Expected Response | Amount |
|---|---|---|---|
| Mozilla Technology Fund | May 2026 | Aug 2026 | $50-200K |
| Ford Foundation | June 2026 | Oct 2026 | $50-500K |
| Open Technology Fund | Q1 2027 | Q2 2027 | $50-300K |
| Sloan Foundation | June 2026 | Sep 2026 | $50-200K |

### Appendix C: Independence Test

Before accepting any partnership, sponsorship, or organizational relationship, evaluate against these four criteria. If any answer is "no," decline the relationship.

1. Does AIR retain sole editorial control over its specification?
2. Does AIR retain sole control over its governance structure?
3. Can AIR publicly disagree with the partner without consequence?
4. Is the partnership disclosed transparently?

### Appendix D: Content Flow — Internal Plan to Public Summary

| Internal Section | Public Summary Page |
|---|---|
| §1 Executive Overview | Page 1-2 (Problem + Solution) |
| §2 Competitive Positioning | Page 2 (Differentiators) + Page 5 (Appendix table) |
| §3 90-Day Roadmap | Page 4 (Path Forward, high-level) |
| §4 Funding Model | Not included (internal only) |
| §5 Risk Analysis | Not included (internal only) |
| §6 Metrics & Decisions | Not included (internal only) |

---

**End of Internal Strategy & Action Plan**

*Agent Identity Registry Foundation — Building neutral infrastructure for AI agent trust*

---

## Addendum: Timeline Adjustment (April 3, 2026)

**Status:** Day 14 of 90-day roadmap. Two-week slip — zero execution against Sprint 1.

### What Happened

The 90-day roadmap launched March 20. The founder's bandwidth was absorbed by competing projects (Signalytics, novel writing) for the full first sprint window. As of April 3:

- **NIST comment:** Written but never submitted. The April 2 deadline has passed.
- **Demo:** Built but never deployed. Not live at agentidentityregistry.org/lookup.
- **Mailing list introductions:** Not sent.
- **LinkedIn announcement:** Not posted.

Sprint 1 scored 0/4 on its success criteria. This is the honest baseline.

### Impact Assessment

**What was lost:**

- The NIST comment period closed April 2. Submitting late is still possible (NIST often accepts late comments during concept paper phases, and the comment has value as a published position paper regardless), but the signal of "submitted during the official window" is gone. This weakens the narrative for grant applications ("we submitted a public comment to NIST CAISI" vs. "we submitted a late comment").
- Two weeks of community momentum that cannot be recovered. Early movers in standards processes accumulate relationship capital; AIR accumulated none.

**What was NOT lost:**

- The NIST comment itself is written and ready. The work product exists.
- The demo is built and ready to deploy. The work product exists.
- The competitive landscape has not materially changed in 14 days. No new entrant has claimed AIR's white space.
- Okta Auth0 for AI Agents GA is still April 30 — the market moment remains.

### Revised Timeline

#### Recovery Week: April 3-9 (This Week)

All remaining Sprint 1 deliverables compressed into one week. These are deployment tasks, not creation tasks — the work is done, it just needs to ship.

| Task | Hours | Priority |
|------|-------|----------|
| Deploy demo to agentidentityregistry.org/lookup | 2-3h | P0 |
| Submit NIST comment (late submission or publish as open letter) | 2-3h | P0 |
| Send 3 mailing list introductions (IETF AIMS, W3C AI Agent Protocol CG, DIF) | 2-3h | P1 |
| Post LinkedIn announcement | 1h | P1 |
| **Total** | **7-10h** | |

**Decision on NIST comment:** If regulations.gov still accepts submissions, submit there. If the portal is closed, publish the comment on AIR's website as "AIR's Response to the NIST NCCoE Concept Paper on AI Agent Identity and Authorization" and email it directly to caisi@nist.gov. The content has value either way — it demonstrates substantive engagement with the federal standards process and becomes a referenceable artifact for grant applications and working group introductions.

#### Revised Sprint 2: April 10 — May 14 (5 weeks instead of 4.5)

Sprint 2 starts one week late but gains a half-week extension. The scope is unchanged, but execution order shifts to front-load the highest-leverage items.

**Weeks 1-2 (April 10-23) — Immediate parallel starts:**

| Task | Hours | Notes |
|------|-------|-------|
| Populate GitHub repo with all existing docs | 4-6h | Can start immediately; no dependency on Sprint 1 cleanup |
| Begin advisory board outreach (5+ emails) | 3-4h | Can start immediately; the NIST comment and demo give credibility to outreach |
| Attend first working group meeting | 2-3h | Check W3C AI Agent Protocol CG and DIF schedules for next available session |

**Weeks 3-5 (April 24 — May 14):**

| Task | Hours/Week | Notes |
|------|------------|-------|
| Continue working group attendance | 4-6h | Target 2+ meetings by end of revised Sprint 2 |
| Write and publish independence thesis article | 6-8h total | This was always a Sprint 2 deliverable; no change |
| Monitor NIST comment / demo engagement | 1h/week | Track analytics, responses |

Sprint 2 success criteria remain the same as the original plan. The 30-Day metrics gate (originally April 20) shifts to **April 27** — giving 3 weeks of live demo/comment data instead of 4.

#### Revised Sprint 3: May 15 — June 25 (6 weeks, one week extension)

Sprint 3 gains one week to compensate for the compressed timeline. Scope unchanged:

- Expand demo to functional prototype (agent registration flow)
- Host virtual roundtable
- Follow up on advisory recruitment
- Submit 2+ grant applications

The 60-Day metrics gate shifts from May 20 to **May 27**. The 90-Day final review shifts from June 18 to **June 25**.

### Tasks That Can Start Immediately (Parallel with Sprint 1 Cleanup)

These Sprint 2 items have zero dependency on Sprint 1 completion and should begin this week:

1. **GitHub repo population** — Copy spec, governance charter, trust score methodology, roadmap, and contributing guide into the live repository. This takes 4-6 hours and makes AIR look like an active project for anyone who discovers it through mailing list introductions.

2. **Advisory board outreach drafting** — Write the 5 outreach emails now. Send them after the demo is live (so the emails can link to a working artifact). Having the emails drafted means they ship within hours of the demo going live.

3. **Working group meeting schedule research** — Identify the next W3C AI Agent Protocol CG, DIF Trusted AI Agents WG, and IETF WIMSE meetings. Register/RSVP. This is 30 minutes of calendar work.

### Time-Sensitive Items Flagged

| Item | Deadline/Window | Risk if Delayed Further |
|------|----------------|------------------------|
| NIST comment submission/publication | This week (April 3-9) | Every day reduces the relevance signal. By April 10+ it reads as an afterthought rather than active participation. |
| Demo deployment | This week (April 3-9) | Mailing list introductions and advisory outreach both need a live URL. Everything downstream is blocked. |
| Okta Auth0 GA (April 30) | Market event | Once Okta ships, "enterprise already has a solution" becomes a stronger counterargument. AIR needs to be visible before this date — the independence thesis article should ideally publish before April 30. |
| Advisory board outreach | Before April 20 | The original kill condition says: if fewer than 2 advisory members commit by Day 45 (now May 4), cancel the advisory structure. That means outreach must happen by mid-April to allow response time. |
| Grant application prep | Begin research by May 1 | Mozilla Technology Fund target was May 2026. Grant applications need 2-3 weeks of preparation. Starting research in early May preserves this timeline. |

### Adjusted Decision Gates

| Gate | Original Date | New Date | Criteria (unchanged) |
|------|--------------|----------|---------------------|
| 30-Day | April 20 | **April 27** | NIST submitted, demo live, 50+ visitors, 3+ mailing list intros |
| 45-Day (advisory kill condition) | May 4 | **May 11** | 2+ advisory responses or cancel advisory structure |
| 60-Day | May 20 | **May 27** | 4+ WG meetings, article published, 10+ GitHub stars, 2+ external mentions |
| 90-Day | June 18 | **June 25** | Full strategy review against all Sprint 3 criteria |

### Honest Reckoning

The 2-week slip is a direct manifestation of Risk 3 (Solo Founder Bottleneck) from Section 5. The mitigation strategy — advisory board, documented processes, public assets — cannot work until those things exist, and they do not exist yet because the founder has not executed Sprint 1.

The good news: AIR's competitive white space has not been claimed. The bad news: the credibility gap (Risk 4) has widened. A project that announced a 90-day plan and shipped nothing for 14 days reinforces the perception of "impressive paperwork, but does anyone use this?"

The fix is simple and immediate: ship what is already built. The demo and comment exist. Deploying them is a matter of hours, not weeks. The single highest-leverage action this week is getting the demo live at a public URL — everything else (outreach, articles, working groups) becomes materially easier once there is a working artifact to point to.

**Revised end date for 90-day plan:** June 25, 2026 (one-week extension from original June 18).
