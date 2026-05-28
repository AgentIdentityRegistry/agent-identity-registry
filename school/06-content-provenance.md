# Module 06: The Content Provenance Story

## Why This Module Matters

This is the specific area where Eric Scouten and CAWG are working. Understanding content provenance is critical for the DIF relationship. But it's also important beyond Eric — this is a massive industry initiative backed by the biggest tech companies in the world.

## The Problem: "Who Made This?"

In 2026, you see an image online. Questions you can't answer:
- Was this created by a human or AI?
- If AI, which AI? Which agent? Controlled by whom?
- Has it been modified since creation?
- Did the original creator authorize this version?

Now multiply this by every piece of content on the internet — images, videos, documents, code, articles. Nobody can verify anything.

## C2PA: The Industry's Answer

**C2PA** = Coalition for Content Provenance and Authenticity

Think of it as a **nutrition label for digital content.** Just like a food package tells you what's inside, C2PA metadata tells you:
- What tool created this content
- When it was created
- What modifications were made
- A chain of custody from creation to now

### Who's Behind C2PA

This is not a small project. The steering committee:

| Company | Role |
|---------|------|
| **Adobe** | Founding member, primary driver |
| **Microsoft** | Founding member |
| **Google** | Member |
| **Meta** | Member |
| **OpenAI** | Member |
| **Sony** | Member |
| **BBC** | Member |
| **Amazon** | Member |
| Intel | Member |
| Truepic | Member |

When Adobe, Microsoft, Google, Meta, and OpenAI all agree on something, that's as close to "industry standard" as it gets.

### How C2PA Works (Simply)

```
1. Creator makes content (photo, video, document)
         │
2. C2PA-compatible tool signs the content
   (adds a "manifest" — metadata that says who/what/when)
         │
3. Content goes into the world
   (shared, published, edited)
         │
4. Anyone can check the manifest
   (verify who made it, what tool, if it was modified)
```

The manifest is cryptographically signed — if anyone tampers with the content, the signature breaks and you know it's been altered.

## CAWG: Adding Identity to C2PA

**CAWG** = Creator Assertions Working Group (part of DIF)

C2PA tells you WHAT tool made the content. But it doesn't strongly identify WHO. That's where CAWG comes in.

### The Distinction

| Layer | C2PA Handles | CAWG Adds |
|-------|-------------|-----------|
| What tool | "Made with Adobe Photoshop" | — |
| When | "Created 2026-04-08T10:30:00Z" | — |
| Who (machine) | "Claim signed by software X" | — |
| **Who (identity)** | — | **"Created by person/agent Y, verified by Z"** |
| **Trust** | — | **"Creator has verifiable credentials from..."** |

### Why CAWG Exists Separately

In 2024, C2PA narrowed its scope to focus on device-level metadata (what camera, what software, when). They explicitly said: "Identity is complex and deserves its own working group." So CAWG was created within DIF to handle the identity layer.

## The AI Agent Problem (Why Eric Reached Out)

Here's the critical gap Eric identified:

**Current state:**
```
Human uses Photoshop → C2PA manifest says "Made with Photoshop by [human identity]"
                        ✅ Works! Human identity is well-understood.

AI agent creates content → C2PA manifest says "Made with [software]"
                           ❌ But WHICH agent? Controlled by whom? 
                              Is it trustworthy? The identity is TRANSACTIONAL —
                              it exists only during the session.
```

**What "transactional identity" means:**

When you use Claude Code, it spins up agents to do work. Those agents exist for the duration of the task, then disappear. There's no lasting record that says "Agent X created this code at this time with this trust level."

This is like a construction worker who builds your house but leaves no record of who they are. Years later, you have a structural issue — who do you call?

**What Eric needs — "archival identity":**

An identity that:
- Persists beyond the session
- Can be looked up years later
- Has a verifiable trust record
- Can be bound to specific content permanently

**This is exactly what AIR provides.**

## How AIR + CAWG Could Work Together

```
1. AI agent is registered in AIR
   → Gets AIR ID: AIR-7F3K-M9JQ-X2PL
   → Linked to DID: did:web:datatech.io
   → Trust Score: 942 (AAA)

2. Agent creates content (image, document, code)
   → C2PA manifest is created

3. CAWG identity assertion is added to the manifest
   → "This content was created by agent AIR-7F3K-M9JQ-X2PL"
   → "Agent verified by: Agent Identity Registry"
   → "Trust Score at time of creation: 942 (AAA)"

4. Years later, someone checks the content
   → Looks up AIR-7F3K-M9JQ-X2PL in the AIR registry
   → Sees full identity, trust history, creator info
   → Can verify the agent's credentials independently
```

**AIR becomes the "identity provider" for AI agents in the content provenance ecosystem.**

## Why This Is Bigger Than Eric

Content provenance is becoming legally required:
- **EU AI Act** — AI-generated content must be labeled
- **US executive orders** — content authenticity is a national security concern
- **Platform policies** — YouTube, Instagram, TikTok are all implementing content labels

If C2PA becomes the standard (and with Adobe, Google, Microsoft, Meta, and OpenAI behind it, it likely will), then EVERY piece of AI-generated content will need provenance metadata. And every AI agent creating content will need a verifiable identity.

That's millions of agents needing identities. That's AIR's total addressable market.

## Key Terminology

| Term | Plain English |
|------|-------------|
| C2PA | Industry standard for content provenance ("nutrition label for content") |
| Content Credentials | Adobe's consumer-facing name for C2PA metadata |
| CAWG | DIF working group adding identity layer to C2PA |
| Manifest | The metadata package attached to content (who, what, when) |
| Claim | A specific assertion in a manifest ("this was made with Photoshop") |
| Assertion | An additional claim that plugs into a manifest (CAWG adds identity assertions) |
| Named Actor | A person, organization, or agent that asserts identity in a CAWG credential |
| Claim Generator | The software that creates the manifest (automatic, no human input needed) |
| Transactional Identity | Identity that only exists during a session (MCP, A2A) |
| Archival Identity | Identity that persists indefinitely (what CAWG needs, what AIR provides) |
