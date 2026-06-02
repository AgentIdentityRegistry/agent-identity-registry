# AIR Public Roadmap

**Last Updated**: 2026-05-28

---

## Current Status

AIR has graduated from "early development" to **a working production system with shipping SDKs and active cross-organization integration**. The registry API, a Python SDK, an MCP server, an OpenAPI 3.1 spec, and an Agent-to-Agent messaging spec are all live. We're partway into Q4 deliverables ahead of schedule, with cross-internet A2A messaging in active integration with the BossClaw reference implementation.

### What exists today (May 2026)

**Spec + governance**
- AIR Identity Specification v0.1 (draft)
- Trust Score Methodology v1.0
- **A2A Messaging Specification draft-1** — Agent-to-Agent envelope format, JCS canonicalization, Ed25519 signing — published at [/specs/air/draft-1](https://agentidentityregistry.org/specs/air/draft-1/v1.md)
- NIST CAISI public comment submitted (April 2026)

**Registry**
- Live registry API — 11 endpoints at `agentidentityregistry.org/api/v1` (registration, lookup, trust scores, DID documents, admin, OpenAPI)
- W3C did:wba support with weekly resolution refresh via Cloudflare Workers Cron
- Service-endpoint discovery: agents publish A2A inbox URLs via their DID document
- Cloudflare Workers + D1 infrastructure

**Developer surface**
- `agent-identity-registry` v0.4.0 on PyPI — async Python SDK + `air` CLI + automatic retry/backoff + Service model
- `air-mcp-server` v0.1.0 on PyPI — drop-in MCP server, integrates with Claude Code and any MCP-aware host
- OpenAPI 3.1 spec at `agentidentityregistry.org/api/v1/openapi.yaml` — generates clients in any language
- A2A Rust crate `a2a-rs` (sign/verify primitives, in BossClaw reference implementation)
- Cross-language conformance test vectors (20 vectors, Python + Rust harnesses)

**Web presence**
- Marketing site with About / Governance / Developers / Contact / Lookup / Register / Blog pages
- 6 categorized live email addresses
- OpenGraph + Twitter Card meta on every page for outreach link previews

**Cross-internet messaging (Phase 3, in active integration)**
- Relay scaffold at `relay.agentidentityregistry.org` (Cloudflare Worker + D1 + KV bindings live)
- BossClaw reference implementation building transport + signing end-to-end

---

## Q2 2026 (Apr - Jun) — Foundation ✅ Mostly Complete

### Goals
- Finalize specification based on feedback
- Submit introductions to W3C AI Agent Protocol CG, IETF AIMS, and DIF
- Build community around the specification (GitHub Discussions)
- Add agent registration UI to the lookup page
- Seek first external contributors

### Deliverables
- [ ] Specification v0.1 published for formal community review (still drafting)
- [x] **Outreach to W3C, IETF, DIF** — W3C AI Agent Protocol CG invited AIR to present; active engagement with Paola Di Maio (AI KRCG), Ben Stone (SwarmSync), Taylor Kendal (Learning Economy Foundation), Eric Scouten (Adobe/DIF/CAWG)
- [x] **Registration form on the website** — live at `/register`
- [ ] 10+ agents registered in the live registry (still small, BossClaw integration imminent)
- [x] **First community discussion threads active** — GitHub org + Discussions launched May 22

---

## Q3 2026 (Jul - Sep) — Credibility (mostly delivered EARLY in May)

### Goals
- Pursue 501(c)(3) filing or equivalent legal structure
- Publish trust score methodology as a standalone paper
- Build SDK (Python) for programmatic agent registration
- Seek grant funding (NSF, Open Technology Fund, or similar)
- First third-party verification pilot

### Deliverables
- [ ] Legal entity established (in progress)
- [x] **Python SDK published on PyPI** — `agent-identity-registry` v0.4.0 live since 2026-05-28 (prior versions v0.2.0 + v0.3.0 shipped earlier this week)
- [x] **MCP server published on PyPI** — `air-mcp-server` v0.1.0
- [ ] At least 1 grant application submitted (pending)
- [ ] Trust score whitepaper published (in scope for Q3)
- [ ] 50+ agents registered (will accelerate with BossClaw + OpenClaw integration)

---

## Q4 2026 (Oct - Dec) — Growth (some items already in motion)

### Goals
- JavaScript SDK
- Platform integration partnerships (target: 1-2 AI platforms)
- Verifier certification program (pilot)
- Specification v0.2 incorporating community feedback
- Security audit of registry infrastructure
- **NEW**: Promote A2A draft-1 → v1 after conformance gate is green across implementations
- **NEW**: Second federated relay deployed (target: BossClaw + at least one other organization)

### Deliverables
- [ ] JS SDK published on npm (de-prioritized — OpenAPI 3.1 spec generates working TS clients for free)
- [x] **Platform integration in progress** — BossClaw reference implementation actively integrating (Phase 3 Waves 1+2 shipped: a2a-rs crate, 20 conformance vectors, signing/verifying impl, end-to-end Tauri integration; Wave 3 transport in active development)
- [ ] AIR Identity Specification v0.2 draft
- [ ] Security audit completed and published
- [ ] 200+ agents registered
- [ ] A2A messaging spec promoted draft-1 → v1
- [ ] Second federated relay live

---

## 2027 — Scale

High-level goals (details TBD based on 2026 learnings):
- Enterprise features (private registrations, batch APIs)
- Mobile and wallet support
- Domain-specific trust scoring
- Governance formalization (elected technical steering committee)
- Financial sustainability model
- A2A messaging at v2 (production traffic from multiple independent implementations across organizations)

---

## How to Engage

- **GitHub Discussions**: https://github.com/AgentIdentityRegistry/agent-identity-registry/discussions
- **Email**: foundation@agentidentityregistry.org
- **Contribute**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Specs**:
  - AIR Identity: [docs/SPECIFICATION.md](docs/SPECIFICATION.md)
  - A2A Messaging: [/specs/air/draft-1/v1.md](https://agentidentityregistry.org/specs/air/draft-1/v1.md)
- **API**: OpenAPI 3.1 spec at [/api/v1/openapi.yaml](https://agentidentityregistry.org/api/v1/openapi.yaml)
- **Packages**: [pypi.org/project/agent-identity-registry](https://pypi.org/project/agent-identity-registry) · [pypi.org/project/air-mcp-server](https://pypi.org/project/air-mcp-server)

This roadmap is a living document. We commit to honesty about our progress and welcome community input.
