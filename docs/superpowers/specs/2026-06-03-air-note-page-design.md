# AIR Note page (`/note`) — design

**Date:** 2026-06-03
**Status:** Approved (brainstorm)
**Author:** Peter + Claude

## Goal

Create the public web home for **AIR Note** at `agentidentityregistry.org/note`
— the consumer brand for the agent messaging / "agentic power of attorney"
product (`agent-bridge-mcp` / `air-msg`), built on AIR. Per the locked naming
decision (GBrain `air/naming-decision-2026-06-02`): a path on the existing site,
no separate domain, inheriting AIR's SEO.

## Decisions (from brainstorm)

- **Purpose:** a vision page with an honest, soft CTA — not a marketing landing
  with a waitlist (no signup backend) and not a bare teaser.
- **Voice:** vision-led but developer-credible — lead with the human story
  (your agent acts/speaks as you, provably — a "chief of staff"), then ground it
  in the real tech (AIR Verified, did:wba, E2E).
- **Status framing:** honest "builder preview" — a working reference
  implementation today; the consumer experience is in progress.
- **CTA:** link the public repo `github.com/AgentIdentityRegistry/air-note`
  (verified public + populated), the public protocol `/specs/air/draft-1`, and
  `foundation@agentidentityregistry.org` for interest. No backend needed.
- **Voice/visuals:** reuse the existing site design system verbatim (nav, hero
  gradient, Outfit/Work Sans/JetBrains Mono, CSS tokens, feature-grid, hero-pills,
  footer) so it reads as native.
- **Nav:** add an "AIR Note" link to the global top nav (all marketing pages).

## File / shipping

- New `note/index.html` (serves at `/note/`, matching `about/`, `developers/`).
- Add `note` to `scripts/deploy-site.sh` `DIRS` so it deploys.
- `<title>`/meta/OG/canonical matching the site's pattern; canonical
  `https://agentidentityregistry.org/note/`.

## Page structure

1. **Hero** — tag `POWERED BY AIR`; H1 "Your agent's chief of staff."; subhead
   on signed + AIR-verified + E2E; pills (AIR-Verified identity · E2E encrypted ·
   did:wba · Open source); buttons **See it on GitHub** + **How it works**;
   honest builder-preview micro-line.
2. **What it is** — the agentic-power-of-attorney vision; the "Note" double
   meaning (warm message + signed instrument of authority).
3. **Built on AIR** — why it's trustworthy; 4-card feature grid: Verified
   identity (did:wba) · End-to-end encrypted (sealed-box) · Pinned contacts
   (fingerprint pinning) · Real-time delivery (relay + SSE).
4. **How it works** — 4-step flow (AIR identity → sign+encrypt → recipient
   verifies the AIR DID → trust via AIR Verified) + a small `air-msg` CLI peek.
5. **Where it's at (honest)** — Today (reference impl: MCP server + `air-msg` CLI
   + `air-rs`, Ed25519, did:wba, E2E, real-time) vs In progress (web invite
   links, managed handles, consumer app).
6. **Get involved** — soft CTA: See the code (GitHub) · Read the protocol
   (`/specs/air/draft-1`) · Shape it (email `foundation@`).
7. **Footer** — identical to the rest of the site.

## Out of scope (separate follow-ups)

The other "to-latest" gaps surfaced during context exploration — Trust Graph not
surfaced on any page, the TypeScript/npm SDK absent from the homepage + `/about`,
and a June "what shipped" blog post — are NOT part of this task.

## Verification

- Valid HTML; all links resolve (repo, spec path, email, internal anchors).
- Nav link present + consistent on every edited page; new page in the deploy set.
- Independent review pass before deploy (no self-approval), then deploy + verify
  live at `/note/`.
