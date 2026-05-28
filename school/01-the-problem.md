# Module 01: The Problem

## The One-Sentence Version

AI agents are doing things in the world — writing code, managing data, creating content, making decisions — and nobody can verify who they are or whether they should be trusted.

## Think of It Like This

Imagine you hire a contractor to renovate your kitchen. Before you let them into your house, you'd check:
- **Who are they?** (Name, company, license number)
- **Are they legit?** (Licensed, insured, references)
- **Can they do the work?** (Portfolio, certifications, reviews)
- **Should you trust them?** (Track record, complaints, ratings)

Now imagine there are thousands of contractors showing up at your door, and NONE of them have ID. No licenses. No ratings. No way to verify anything. That's the AI agent world right now.

## What's an AI Agent?

An AI agent is software that acts on your behalf. Not just a chatbot that answers questions — an agent that actually DOES things:

- A code review agent that examines your pull requests
- A customer service agent that handles support tickets
- A financial analysis agent that processes your data
- A content creation agent that writes blog posts for you

These agents are getting more autonomous. They're making decisions. They're interacting with other agents. They're handling sensitive data.

## The Three Problems

### Problem 1: No Identity

When an AI agent contacts your system, there's no standard way to answer "who is this?"

- Is this agent really from the company it claims?
- Is it the same agent that did good work last month, or a new one impersonating it?
- Who built this agent? Who's responsible if it breaks something?

Today, the answer is: ¯\_(ツ)_/¯

### Problem 2: No Trust

Even if you know who an agent is, how do you know whether to trust it?

- Has it been tested? Audited? Certified?
- Does it have a track record of reliable behavior?
- Is its source code available for review?
- Has anyone else vouched for it?

Today, you either trust everything or trust nothing. There's no middle ground.

### Problem 3: No Portability

Let's say an agent has a great reputation on Platform A. You want to use it on Platform B. But:

- Platform A's identity system doesn't work on Platform B
- The agent's reputation doesn't transfer
- It has to start from zero on every new platform

This is like having a credit score that only works at one bank. Useless.

## Why This Is Getting Urgent

Three trends are converging:

**1. Agents are multiplying.** Every AI company is building agent capabilities. OpenAI has agents. Anthropic has agents (that's what Claude Code uses internally). Google has agents. Thousands of startups are building agents.

**2. Agents are talking to each other.** Agent-to-agent communication is the next frontier. Anthropic's MCP (Model Context Protocol) and Google's A2A (Agent-to-Agent) protocol are building the plumbing. But when Agent A talks to Agent B, neither can verify who the other is.

**3. Regulators are watching.** NIST (the US standards body) is actively working on AI agent identity. The EU AI Act will require traceability. Governments want to know: when an AI agent does something, who's accountable?

## What's Missing

There's no neutral, independent registry where an agent can:
1. Get a verifiable identity
2. Earn a transparent trust score based on objective criteria
3. Present credentials that work across platforms
4. Build a portable reputation over time

That's what AIR is building.

## Key Takeaway

The problem isn't technical — it's infrastructural. The internet needed DNS (a neutral registry for domain names) before websites could work. The agent ecosystem needs something similar before agents can interoperate trustfully. AIR is that registry.
