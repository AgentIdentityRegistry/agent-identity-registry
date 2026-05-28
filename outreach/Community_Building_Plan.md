# Community Building Plan: First 50-100 Supporters

**Sprint 2-3 | April 3 — June 18, 2026**
**Goal:** Build a base of 50-100 identifiable supporters by Day 90

---

## 1. Target Communities (Priority Order)

### Tier 1: Standards-Adjacent (Highest Conversion Probability)

| Community | Why | Entry Point | Target Contacts |
|-----------|-----|-------------|-----------------|
| W3C AI Agent Protocol CG | Already working on agent identity; understand the problem | public-agentprotocol@w3.org | 5-8 active participants |
| DIF Trusted AI Agents WG | DID/VC practitioners who share AIR's technical foundation | membership@identity.foundation | 5-8 WG members |
| IETF WIMSE/AIMS participants | Working on the authentication layer AIR builds upon | wimse@ietf.org | 3-5 engaged participants |
| OpenID Foundation AI Identity CG | Identity standards professionals | openid-specs-digital-credentials@lists.openid.net | 2-3 members |

### Tier 2: AI Governance and Policy

| Community | Why | Entry Point | Target Contacts |
|-----------|-----|-------------|-----------------|
| Partnership on AI community | Multi-stakeholder AI governance; aligned mission | Slack/events | 3-5 members |
| OECD AI Policy Observatory network | International AI governance professionals | Newsletter/events | 2-3 researchers |
| AI Now Institute network | Critical AI research; public interest focus | Publications/events | 2-3 researchers |
| AI safety/alignment communities (Discord) | Growing concern about autonomous agent trust | Discord servers (e.g., EleutherAI, Alignment Forum) | 3-5 active members |

### Tier 3: Developers and Builders

| Community | Why | Entry Point | Target Contacts |
|-----------|-----|-------------|-----------------|
| LangChain community | Largest agent framework ecosystem | Discord, GitHub discussions | 3-5 contributors |
| AutoGPT community | Active autonomous agent project | Discord, GitHub | 2-3 contributors |
| CrewAI community | Multi-agent orchestration; identity is a natural concern | Discord, GitHub | 2-3 contributors |
| Hugging Face community | Broad AI/ML ecosystem | Forum, Discord | 2-3 active members |

### Tier 4: Academic Researchers

| Community | Why | Entry Point | Target Contacts |
|-----------|-----|-------------|-----------------|
| MIT Media Lab (NANDA project) | Directly working on agent identity research | Direct email to researchers | 1-2 researchers |
| Stanford DEL (Loyal Agents) | Agent trust and alignment research | Direct email | 1-2 researchers |
| University AI ethics labs | Broader AI governance research community | Conference connections, email | 2-3 researchers |

---

## 2. Outreach Tactics

### A. GitHub Repository as Community Hub

**Actions:**
- Populate repo with full documentation (spec, governance, trust-score, roadmap)
- Create well-structured issue templates: "Feature Request," "Specification Feedback," "Integration Proposal"
- Open 3-5 "Good First Issue" tickets to lower the contribution barrier
- Enable GitHub Discussions with categories: General, Specification Feedback, Integration Ideas, Trust Score Methodology
- Add CONTRIBUTING.md with clear guidance on how to participate
- Post a "Call for Reviewers" discussion thread pinned to the repo

**Target:** 15-25 stars, 2-5 contributors by Day 60

### B. Independence Thesis Article (Medium/Substack)

**Outline:**
1. The agentic era requires trust infrastructure (the problem)
2. Why big tech should not control agent identity (the argument)
3. Lessons from the internet: ICANN, Let's Encrypt, the DNS (the precedent)
4. AIR's approach: independence + transparency + comprehensive coverage (the solution)
5. Call to action: join us in building neutral agent identity infrastructure

**Distribution:**
- Post on Medium (AI/Technology tags) and cross-post to Substack
- Share on LinkedIn with a summary thread
- Submit to relevant newsletters: Import AI, The Batch, AI Alignment Newsletter
- Post in W3C/DIF mailing lists with a brief note linking to the article
- Share in AI governance Slack/Discord communities

**Target:** 500+ reads, 10-20 followers/subscribers

### C. Blog Post Series (agentidentityregistry.org/blog)

**Draft Topics for Sprint 2-3:**

1. **"Why AI Agent Identity Must Be Independent"** — The independence thesis (cross-posted from Medium)
2. **"How AIR's Trust Score Works: A Technical Overview"** — Deep dive into the five-component model with examples
3. **"AIR and W3C Standards: Building on DIDs and VCs"** — Technical post showing how AIR uses W3C standards
4. **"What We Told NIST About AI Agent Identity"** — Summary of AIR's public comment to CAISI
5. **"The Agent Identity Landscape in 2026: 17 Initiatives and Counting"** — Ecosystem overview positioning AIR as the neutral connector

**Cadence:** 1 post every 10 days during Sprint 2-3

### D. LinkedIn Content Series

**Post Plan (3-4 posts during Sprint 2):**

1. **Introduction post:** "We just launched the Agent Identity Registry — here's why AI agents need passports" (link to executive summary)
2. **NIST comment post:** "We submitted a public comment to NIST on AI agent identity standards. Here's what we said." (link to comment)
3. **Technical post:** "How do you score an AI agent's trustworthiness? Our five-component model." (visual + link to trust score doc)
4. **Call to action post:** "We're looking for reviewers, advisors, and collaborators. Here's how to get involved." (link to GitHub)

**Target:** 15-25 new connections/followers in the AI governance and identity spaces

### E. Direct Outreach to Named Individuals

**First 20 Outreach Targets:**

| # | Profile | Affiliation Type | Outreach Method |
|---|---------|-----------------|-----------------|
| 1-3 | Active participants in W3C AI Agent Protocol CG | Standards | Mailing list reply + direct email |
| 4-6 | DIF Trusted AI Agents WG contributors | Standards | DIF channels + direct email |
| 7-8 | MIT NANDA project researchers | Academic | Direct email with spec link |
| 9-10 | Stanford DEL researchers | Academic | Direct email with spec link |
| 11-12 | Partnership on AI staff or fellows | Governance | LinkedIn + email |
| 13-14 | AI Now Institute researchers | Governance | Email via published contact |
| 15-16 | LangChain/CrewAI core maintainers | Developer | GitHub + Discord DM |
| 17-18 | IETF AIMS draft co-authors | Standards | Mailing list + direct email |
| 19-20 | AI policy professionals (think tanks) | Policy | LinkedIn message |

**Email Template (customize per recipient):**

> Subject: Agent Identity Registry — Seeking Your Perspective
>
> Hi [Name],
>
> I'm reaching out because your work on [specific project/paper] is directly relevant to something we're building: the Agent Identity Registry (AIR), a neutral, nonprofit trust layer for AI agents.
>
> AIR provides identity verification, trust scoring (0-1000), and W3C-standard verifiable credentials for AI agents — governed as a 501(c)(3) with no corporate board influence.
>
> I'd value your perspective on [specific aspect relevant to their work]. Our full specification and governance docs are open source: [GitHub link]
>
> Would you have 15 minutes for a brief conversation, or would you prefer to review the spec and share written feedback?
>
> Best regards,
> [Name], Agent Identity Registry Foundation

**Target:** 8-12 responsive contacts from 20 outreach attempts

### F. Mailing List Engagement

**Strategy:** Do not lead with self-promotion. Lead with substantive contribution.

- Monitor W3C, DIF, IETF, and OWASP mailing lists daily
- Reply to threads where AIR has relevant technical perspective (target: 2-3 substantive replies per week)
- Reference AIR specification only when directly relevant to the discussion topic
- Build recognition as a knowledgeable, constructive participant before making any asks

**Target:** 5-10 recognized relationships by Day 60

### G. Social Media (Twitter/X)

- Create @AIRIdentity account if not already active
- Post 2-3 times per week: article links, specification highlights, ecosystem commentary
- Engage with posts from standards bodies, AI governance organizations, and agent framework projects
- Use hashtags: #AIAgents #AgentIdentity #DecentralizedIdentity #AIGovernance #TrustableAI

---

## 3. Weekly Milestones (30-Day Plan)

### Week 1 (April 3-9)

- [ ] Send introduction emails to W3C AI Agent Protocol CG, IETF WIMSE, and DIF Trusted AI Agents WG
- [ ] Populate GitHub repo with full documentation and issue templates
- [ ] Enable GitHub Discussions and post "Call for Reviewers" thread
- [ ] Draft independence thesis article (first draft)
- [ ] Send first 5 direct outreach emails (targets #1-5: W3C and DIF participants)

### Week 2 (April 10-16)

- [ ] Publish independence thesis article on Medium/Substack
- [ ] Post LinkedIn introduction (#1 of 4)
- [ ] Send next 5 outreach emails (targets #6-10: DIF members, academic researchers)
- [ ] Make 2-3 substantive mailing list replies (W3C or DIF threads)
- [ ] Publish first blog post on agentidentityregistry.org
- [ ] Submit article to 2 newsletters (Import AI, The Batch)

### Week 3 (April 17-23)

- [ ] Attend first W3C or DIF working group meeting
- [ ] Post LinkedIn NIST comment post (#2 of 4)
- [ ] Send next 5 outreach emails (targets #11-15: governance and developer contacts)
- [ ] Open 3-5 "Good First Issue" tickets on GitHub
- [ ] Follow up on Week 1 outreach emails (non-responders)
- [ ] Publish second blog post

### Week 4 (April 24-30)

- [ ] Attend second working group meeting (different group from Week 3)
- [ ] Post LinkedIn technical post (#3 of 4)
- [ ] Send final 5 outreach emails (targets #16-20: IETF, policy professionals)
- [ ] Post in LangChain/CrewAI Discord about agent identity
- [ ] Publish third blog post
- [ ] Conduct 30-day progress review against metrics below

---

## 4. Tracking and Measurement

### Supporter Tracking Spreadsheet

| Name | Affiliation | Channel | Type | Date | Status |
|------|-------------|---------|------|------|--------|
| (example) Jane Smith | MIT Media Lab | Email | Academic | 2026-04-05 | Responded, reviewing spec |

**Channels:** GitHub (star/contributor), LinkedIn (connection/follower), Mailing List (replied), Email (responded), Discord (engaged), Blog (subscriber)

**Types:** Standards, Academic, Governance, Developer, Policy

### 30-Day Targets

| Metric | Target | Stretch |
|--------|--------|---------|
| GitHub stars | 10 | 20 |
| GitHub contributors (external) | 1 | 3 |
| Direct outreach emails sent | 20 | 25 |
| Responsive contacts | 8 | 12 |
| Mailing list substantive replies | 8 | 12 |
| Blog posts published | 3 | 4 |
| LinkedIn connections/followers (new) | 15 | 25 |
| Newsletter/article pickups | 1 | 3 |
| Working group meetings attended | 2 | 3 |
| **Total identifiable supporters** | **30** | **50** |

### 60-Day Target: 50 supporters
### 90-Day Target: 100 supporters

---

## 5. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Low response rate on direct outreach | Increase volume to 30 targets; diversify channels (LinkedIn DM, conference encounters) |
| Perceived as self-promotion on mailing lists | Lead with substance; reference AIR only when technically relevant; build credibility first |
| Working group meetings conflict with schedule | Request recordings; contribute asynchronously via mailing list |
| Independence thesis article does not gain traction | Cross-post aggressively; ask responsive contacts to share; adapt headline/framing |
| GitHub repo appears inactive | Schedule regular commits (documentation updates, issue responses) even during slow periods |
