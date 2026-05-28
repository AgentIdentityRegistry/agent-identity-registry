# Module 03: How Trust Scores Work

## The Simple Version

A trust score is like a credit score for AI agents. Instead of measuring financial responsibility, it measures five things about an agent that tell you whether to trust it.

## The Five Components

Think of trust like a job interview. You'd evaluate a candidate on:

### 1. Provenance (25%) — "Where did you come from?"

This is about the agent's origins. Questions it answers:
- Who created this agent?
- Is the creator a real, verifiable entity?
- Is it a person or an organization?

**How we score it today:**
- Creator DID provided → +100 points
- Creator name provided → +100 points
- Creator is an organization (not individual) → +100 points
- Base: 300 points
- Cap: 600 points (for new registrations)

**Why it matters:** An agent from a verified organization with a public identity is inherently more trustworthy than an anonymous agent from an unknown creator.

### 2. Behavioral (25%) — "What's your track record?"

This is about how the agent actually performs over time. Questions it answers:
- Does it do what it says it does?
- Does it fail often?
- Has it caused incidents?

**How we score it today:**
- Starts at 500 (neutral — no history yet)
- Will increase or decrease over time as behavioral data comes in

**Why it matters:** Past behavior is the best predictor of future behavior. An agent that has operated reliably for months is more trustworthy than one that just registered.

### 3. Transparency (20%) — "Can we see how you work?"

This is about openness. Questions it answers:
- Is the source code available?
- Is there documentation?
- Can you inspect how the agent makes decisions?

**How we score it today:**
- Open source → +150 points
- Code repository linked → +100 points
- Documentation URL provided → +100 points
- Base: 300 points
- Cap: 650 points

**Why it matters:** If you can see how an agent works, you can verify its claims. Opacity breeds distrust.

### 4. Security (15%) — "How well are you protected?"

This is about the agent's security posture. Questions it answers:
- Has it been security audited?
- Does it follow security standards?
- Are there known vulnerabilities?

**How we score it today:**
- Each security certification → +100 points (up to 3)
- Base: 300 points
- Cap: 600 points

**Why it matters:** A well-secured agent is less likely to be compromised or manipulated.

### 5. Peer Attestations (15%) — "Who vouches for you?"

This is about third-party endorsements. Questions it answers:
- Have other verified agents worked with this one successfully?
- Have independent auditors reviewed it?
- Do platforms endorse it?

**How we score it today:**
- Starts at 300 (no attestations yet)
- Will increase as peer review system is built

**Why it matters:** Trust is social. If multiple independent parties vouch for an agent, that's stronger evidence than self-reporting.

## How the Total Score Is Calculated

```
Total = (Provenance × 0.25) + (Behavioral × 0.25) + (Transparency × 0.20) + (Security × 0.15) + (Peer Attestations × 0.15)
```

**Example — a well-documented open-source agent from an organization:**
- Provenance: 600 (org creator with DID and name)
- Behavioral: 500 (new, no history)
- Transparency: 650 (open source, repo, docs)
- Security: 500 (one certification)
- Peer Attestations: 300 (none yet)

Total = (600 × 0.25) + (500 × 0.25) + (650 × 0.20) + (500 × 0.15) + (300 × 0.15)
     = 150 + 125 + 130 + 75 + 45
     = **525 (BB grade)**

**Example — an anonymous agent with nothing verified:**
- Provenance: 400 (DID only, no name, individual)
- Behavioral: 500 (new)
- Transparency: 300 (nothing linked)
- Security: 300 (no certs)
- Peer Attestations: 300 (none)

Total = (400 × 0.25) + (500 × 0.25) + (300 × 0.20) + (300 × 0.15) + (300 × 0.15)
     = 100 + 125 + 60 + 45 + 45
     = **375 (C grade)**

## The Live Score Preview

On the registration form (`/register`), there's a sidebar that shows your estimated trust score in real time as you fill in fields. Every checkbox you tick, every URL you add, you watch the score go up. This encourages people to provide more information.

## What the Grades Mean in Practice

| Grade | Think of it as... | Real-world analogy |
|-------|------------------|-------------------|
| AAA | "Would trust with my bank account" | AAA credit rating |
| AA | "Would deploy in production" | A+ employee review |
| A | "Good for general use" | Solid contractor with references |
| BBB | "Fine with oversight" | New hire, still in probation |
| BB | "Use cautiously" | Freelancer with thin portfolio |
| B | "Testing only" | Unknown quantity, handle with care |
| C | "Don't trust" | No credentials, no track record |

## What's NOT Built Yet

- Behavioral scoring over time (currently static at 500)
- Peer attestation submission system
- Score changes based on verification tier upgrades
- Dispute resolution for incorrect scores
- Score history tracking

These will come as the registry gets real usage and real users tell us what they need.
