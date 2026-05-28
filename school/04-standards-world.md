# Module 04: The Standards World

## Why Standards Bodies Matter

Standards are agreements about how things should work so they're compatible. Without standards:
- Every phone charger would be different (they used to be — USB-C fixed that)
- Email from Gmail wouldn't reach Outlook (SMTP is the standard that makes email work)
- Websites wouldn't load in different browsers (HTTP and HTML are the standards)

For AI agents, there are no widely adopted standards yet for identity and trust. Multiple organizations are working on pieces of this puzzle. AIR needs to work WITH them, not against them.

## The Key Organizations

### NIST (National Institute of Standards and Technology)
**What:** US government agency that creates standards and frameworks
**Think of it as:** The government's science lab that tells industries how things should work
**Why they matter to AIR:** NIST is actively working on AI agent identity through their CAISI initiative (Consortium for the Advancement of Intelligent Systems). They published a concept paper asking "how should AI agents identify themselves?" — we submitted a public comment responding to it.
**Our status:** Public comment submitted April 3, 2026. On their radar.
**Website:** nist.gov

### W3C (World Wide Web Consortium)
**What:** The international body that creates web standards (HTML, CSS, URLs, etc.)
**Think of it as:** The rule-makers of the internet
**Why they matter to AIR:** W3C created two standards we build on — DIDs (Decentralized Identifiers) and VCs (Verifiable Credentials). They also have an AI Agent Protocol Community Group working on how agents discover and talk to each other.
**Our status:** Introduction email sent to the AI Agent Protocol CG. Archive approved.
**Website:** w3.org

### IETF (Internet Engineering Task Force)
**What:** Creates the core protocols that make the internet work (TCP/IP, DNS, HTTP, email, TLS)
**Think of it as:** The plumbers of the internet — they build the pipes
**Why they matter to AIR:** IETF has a working group called AIMS (AI Managed Systems) and WIMSE (Workload Identity in Multi-Service Environments) working on how AI agents authenticate. Authentication = "prove you are who you say you are." AIR's trust scoring is the NEXT layer: "now that we know who you are, should we trust you?"
**Our status:** Introduction email sent to the WIMSE working group.
**Website:** ietf.org

### DIF (Decentralized Identity Foundation)
**What:** A consortium of companies and individuals building decentralized identity technology
**Think of it as:** The R&D lab for digital identity that doesn't depend on one company
**Why they matter to AIR:** DIF is where the Trusted AI Agents Working Group lives. Also home to CAWG (Creator Assertions Working Group), which Eric Scouten co-chairs. DIF members include Microsoft, IBM, Mastercard, and many others.
**Our status:** Most advanced relationship. Invited to join as Contributor (free). Eric Scouten (Adobe) personally reached out to collaborate on agent identity for content provenance.
**Website:** identity.foundation

## How These Organizations Relate to Each Other

```
NIST
  "AI agents need identity standards"
  (Policy and frameworks — tells the world what's needed)
      │
      ▼
W3C ◄──────────────────────────── IETF
  "Here are DIDs and VCs"            "Here's how agents authenticate"
  (Identity formats)                  (Authentication protocols)
      │                                    │
      └──────────┬─────────────────────────┘
                 ▼
               DIF
  "Let's build real implementations"
  (Working groups that code and test)
      │
      ├── Trusted AI Agents WG
      │     "How do DIDs/VCs apply to AI agents?"
      │
      └── CAWG (Creator Assertions WG)
            "How do agents prove they created content?"
            (Eric Scouten, Adobe)
```

## Where AIR Sits

AIR is NOT trying to be a standards body. We're building an IMPLEMENTATION — a working system that uses the standards these bodies create. Our role:

| Standards Body | They Define | AIR Provides |
|---------------|------------|-------------|
| W3C | Identity format (DIDs, VCs) | A registry that uses DIDs and issues VCs |
| IETF | Authentication protocols | Trust scoring on top of authentication |
| DIF | Implementation best practices | A live reference implementation |
| NIST | Policy frameworks | Evidence that neutral registries work |

**Analogy:** W3C defines what a passport looks like. IETF defines how border control verifies it. DIF tests the process. AIR is the passport office that actually issues passports.

## How Standards Bodies Work (Practically)

- **They move slowly.** A standard can take 2-5 years from proposal to adoption.
- **They're consensus-driven.** Everyone has to agree. This means lots of discussion.
- **They value implementers.** People who build real things based on the standards have outsized influence. This is AIR's advantage — we have a working system.
- **Participation is mostly free.** DIF Contributor is free. W3C Community Groups are free. IETF mailing lists are open.
- **Communication is email + calls.** Most work happens on mailing lists and weekly video calls. You can be email-only.

## What You Need to Know for Conversations

When someone from a standards body asks "what standards do you support?":

> "AIR is built on W3C Decentralized Identifiers and Verifiable Credentials. Our agent identity documents are JSON-LD. We're designed to complement IETF authentication work like AIMS — we provide the trust assessment layer on top of authentication."

When someone asks "are you trying to create a competing standard?":

> "No. We're an implementer, not a standards body. We use the standards that W3C, IETF, and DIF create. Our contribution is a working, neutral registry that puts those standards into practice."
