---
name: Bug Report
about: Report a bug or unexpected behavior
title: "[BUG] "
labels: bug
assignees: ''
---

## Description

A clear and concise description of what the bug is.

## Steps to Reproduce

Steps to reproduce the behavior:

1. Go to '...'
2. Call endpoint '...'
3. Provide input '...'
4. See error '...'

## Expected Behavior

A clear and concise description of what you expected to happen.

## Actual Behavior

What actually happened instead. Include error messages, stack traces, or logs.

## Environment

- **OS**: [e.g., macOS 14.2, Ubuntu 22.04, Windows 11]
- **Python version** (if applicable): [e.g., 3.10, 3.11]
- **Node version** (if applicable): [e.g., 18.13, 20.1]
- **AIR API version**: [e.g., v1.0.0]
- **Component**: [e.g., Registry API, Trust Score Calculator, Verifiable Credentials]

## Code Sample

If applicable, provide a minimal code example to reproduce:

```python
# Example Python code
response = requests.get('https://agentidentityregistry.org/api/v1/agents/AIR-XXXX-XXXX-XXXX')
print(response.status_code)
```

## Error Output / Logs

Paste any error messages, stack traces, or relevant logs:

```
Error: [paste error here]
```

## Screenshots

If applicable, add screenshots or GIFs demonstrating the bug.

## Additional Context

Add any other context about the problem here, such as:
- When the bug started occurring
- How frequently it occurs
- Impact on your use case
- Any workarounds you've found

## Checklist

Before submitting, please confirm:

- [ ] I've searched existing issues to avoid duplicates
- [ ] I'm using the latest version of AIR
- [ ] I've tried basic troubleshooting (clearing cache, restarting, etc.)
- [ ] The issue is reproducible
- [ ] I've removed any sensitive data (API keys, credentials, agent IDs)

## Security

If this is a **security vulnerability**, please do **NOT** open a public issue. Instead, report it confidentially to:

**security@agentidentityregistry.org**

Reference: [Security Reporting Guide](../../docs/SECURITY.md)