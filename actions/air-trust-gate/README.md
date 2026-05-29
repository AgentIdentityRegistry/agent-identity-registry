# AIR Trust Gate

A GitHub Action that **gates your workflow on an AI agent's [AIR](https://agentidentityregistry.org) trust score, grade, and Verified status.**

If your repo, pipeline, or product depends on an external AI agent, this Action lets CI fail (or warn) when that agent's trust drops below the bar you set — the same way you'd gate on a failing test or a vulnerable dependency.

## Usage

```yaml
- name: Gate on agent trust
  uses: AgentIdentityRegistry/agent-identity-registry/actions/air-trust-gate@main
  with:
    air-id: AIR-XXXX-XXXX-XXXX
    min-trust-score: "700"
    require-verified: "true"
```

The step fails the job if the agent scores below 700 **or** isn't AIR Verified. Omit a condition to skip it — only the conditions you set are checked.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `air-id` | ✅ | — | The AIR ID to check, e.g. `AIR-XXXX-XXXX-XXXX`. |
| `min-trust-score` | | `""` | Minimum trust score (0–1000). Empty = skip. |
| `min-grade` | | `""` | Minimum grade: `AAA`, `AA`, `A`, `BBB`, `BB`, `B`, `C`. Empty = skip. |
| `require-verified` | | `"false"` | `"true"` requires attestation-based AIR Verified status. |
| `api-base-url` | | `https://agentidentityregistry.org` | Override to point at a staging registry. |
| `fail-level` | | `"error"` | `"error"` fails the job on a miss; `"warn"` annotates but passes. |

## Outputs

| Output | Description |
|--------|-------------|
| `trust-score` | The agent's current trust score (empty if not found). |
| `trust-grade` | The agent's current grade (empty if not found). |
| `verified` | `"true"` / `"false"` — current AIR Verified status. |
| `passed` | `"true"` if every requested condition passed. |

## Examples

**Block a release unless a dependency agent stays Verified:**

```yaml
- uses: AgentIdentityRegistry/agent-identity-registry/actions/air-trust-gate@main
  with:
    air-id: AIR-DEP1-DEP1-DEP1
    require-verified: "true"
```

**Warn (don't fail) when a grade slips, and read the result in a later step:**

```yaml
- id: trust
  uses: AgentIdentityRegistry/agent-identity-registry/actions/air-trust-gate@main
  with:
    air-id: AIR-XXXX-XXXX-XXXX
    min-grade: "A"
    fail-level: "warn"
- run: echo "score=${{ steps.trust.outputs.trust-score }} verified=${{ steps.trust.outputs.verified }}"
```

> Pin to a tag (e.g. `@v1`) instead of `@main` once you want a stable reference.

## README trust badges

Show your agent's live AIR status in your own README. The badge image updates automatically (60s cache) — green when Verified, blue with the score otherwise.

```markdown
[![AIR Trust](https://agentidentityregistry.org/api/v1/agents/AIR-XXXX-XXXX-XXXX/badge.svg)](https://agentidentityregistry.org/lookup/?id=AIR-XXXX-XXXX-XXXX)
```

Renders as a Codecov-style badge:

[![AIR Trust](https://agentidentityregistry.org/api/v1/agents/AIR-WBA1-DEMO-AGT0/badge.svg)](https://agentidentityregistry.org/lookup/?id=AIR-WBA1-DEMO-AGT0)

## License

Apache 2.0.
