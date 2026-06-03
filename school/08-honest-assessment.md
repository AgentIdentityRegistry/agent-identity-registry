# Module 08: What We Have vs. What We Claim

## The Rule

**Never claim more than what exists.** Credibility, once lost, is almost impossible to rebuild — especially with standards body people who are trained to spot overselling.

## What Is Real (Today, Working, Verifiable)

| Claim | Evidence | Verifiable? |
|-------|----------|------------|
| We have a live registry API | agentidentityregistry.org/api/v1/health | Yes — anyone can call it |
| Agents can register and get AIR IDs | /api/v1/agents/register works | Yes — try it |
| Trust scores are calculated from 5 components | Source code in GitHub | Yes — open source |
| The spec is published | GitHub docs/SPECIFICATION.md | Yes — public |
| We submitted a NIST public comment | PDF exists, was emailed | Yes |
| We contacted W3C, IETF, DIF | Emails sent, DIF responded | Yes |
| Eric Scouten from Adobe reached out to us | Email thread exists | Yes |
| It costs $0 to run | Cloudflare free tier | Yes |
| 8 demo agents are in the registry | Flagged as is_demo=1 | Yes |

## What Is NOT Real (Don't Claim These)

| False Claim | Reality |
|-------------|---------|
| ~~"We're a 501(c)(3) nonprofit"~~ | Not filed. We're an "independent nonprofit initiative" |
| ~~"We have a diverse board"~~ | No board exists. It's 2 people — you and Kenny |
| ~~"We have SDKs for Python, JS, Go, Rust"~~ | SDKs for Python (v0.5.0, PyPI) and TypeScript (v0.1.0, npm) are shipped, plus an MCP server (air-mcp-server v0.1.0, PyPI). Go and Rust do not exist. Don't over-claim the language coverage. |
| ~~"Third-party security audits published quarterly"~~ | No audits have been done |
| ~~"We have a verifier certification program"~~ | Not built yet |
| ~~"Verification tiers are operational"~~ | All agents are self-verified. No upgrade path exists yet. |
| ~~"W3C Verifiable Credentials are issued"~~ | Our data follows the VC structure but we don't issue formal VCs yet |
| ~~"We have community members"~~ | GitHub Discussions is enabled but no community exists |
| ~~"Real agents are registered"~~ | All 8 are demo data we created |

## The Gray Area (True but Careful)

| Claim | Nuance |
|-------|--------|
| "Built on W3C standards" | True — we use JSON-LD and DID concepts. We now serve W3C DID documents for AIR-minted agents (`did:wba`) via a live endpoint. We do not yet issue formal W3C Verifiable Credentials. Say "built on W3C DID and VC concepts" or "designed to be W3C-compatible." |
| "Independent nonprofit" | True in intent. Not legally incorporated yet. Say "independent nonprofit initiative" not "nonprofit foundation." |
| "Trust scoring works" | True — the API calculates scores. Provenance, transparency, security, and peer attestation components are live and dynamic. Behavioral is still a flat 500 placeholder (no signed action history yet). Current ceiling is 645/BBB. Say "initial trust scoring with live attestation support; behavioral scoring is a future release." |
| "Engaging with standards bodies" | True — we've sent emails and gotten responses. But we're not members of any working group yet (DIF membership pending). Say "exploring engagement" or "in early discussions." |

## How to Talk About Our Stage

### Good Framing
- "We're a working prototype exploring standards alignment"
- "Early-stage project with a live API and published specification"
- "We've built the foundation and are now engaging with standards bodies to refine our approach"
- "Open-source project, contributor team of two, seeking collaboration"

### Bad Framing
- ~~"We're the ICANN for AI agents"~~ (aspirational, not current reality)
- ~~"Production-grade registry"~~ (it's a prototype on free tier)
- ~~"Foundation-governed nonprofit"~~ (no foundation exists yet)
- ~~"Backed by W3C and DIF"~~ (we're exploring, not endorsed)

## The "Two Truths" Test

Before saying anything externally, apply this test:

1. **Is it factually true RIGHT NOW?** (Not "true in our plans" or "true in spirit")
2. **Could someone verify it in 5 minutes?** (Visit the URL, check the repo, read the spec)

If both answers are yes → safe to say.
If either answer is no → reframe or don't say it.

## What We Can Legitimately Be Proud Of

- Built a working system from scratch in weeks
- Published a genuine specification, not vaporware
- Submitted a substantive NIST public comment (not a form letter)
- Got a personal response from a Principal Scientist at Adobe
- Running everything on $0 infrastructure
- Open-sourced everything
- Identified a real gap that industry leaders independently confirm

That's more than most standards-adjacent projects achieve in their first year. Own it honestly.
