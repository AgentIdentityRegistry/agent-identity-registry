## Description

Please include a summary of the changes and related context. Help us understand the motivation and any relevant background.

### Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Specification change
- [ ] Infrastructure/DevOps change
- [ ] Security enhancement

## Related Issues

Closes #(issue number)

Related discussions or issues:
- #(issue number)
- Relates to: [spec section or discussion link]

## Changes Made

Describe the specific changes in this PR:

- Change 1
- Change 2
- Change 3

## Testing

Describe how you've tested these changes:

### Unit Tests
- [ ] Added/updated unit tests
- [ ] Test coverage: __%
- [ ] All tests passing locally

### Integration Tests
- [ ] Tested against staging environment
- [ ] API integration tested (if applicable)
- [ ] Database migrations tested (if applicable)

### Manual Testing
- [ ] Tested locally with reproduction steps
- [ ] Tested on multiple environments/browsers (if applicable)

### Test Checklist
- [ ] Tests added for new functionality
- [ ] Existing tests updated if behavior changed
- [ ] Tests are focused and clear
- [ ] Test names describe what they test

## Breaking Changes

If this is a breaking change, describe the impact:

- **What breaks**: 
- **Migration path**: 
- **Timeline for deprecation**: 

## Documentation

- [ ] Updated relevant documentation
- [ ] Added code comments for complex logic
- [ ] Updated API documentation (if applicable)
- [ ] Updated specification (if applicable)
- [ ] Added/updated examples

## Performance Impact

- [ ] No performance impact expected
- [ ] Performance improvement: [describe improvement]
- [ ] Performance regression: [describe and mitigation]
- [ ] Benchmarks: [link to results or include numbers]

## Security Considerations

- [ ] No security implications
- [ ] Security review requested (below)
- [ ] Security implications addressed: [describe]

**Security Review Requested For**:
- Cryptographic changes
- Authentication/Authorization changes
- Data handling/privacy changes
- External API integrations
- Input validation changes

## Code Quality

- [ ] Code follows project style guidelines
- [ ] Code has been self-reviewed
- [ ] Comments added for complex logic
- [ ] No new warnings generated
- [ ] Refactored repeated code patterns

### Linting & Formatting

```bash
# Run locally before submitting
black .
isort .
flake8
mypy
```

- [ ] Black formatting applied
- [ ] isort imports sorted
- [ ] No flake8 violations
- [ ] Type checking passes

## Deployment Considerations

- [ ] Database migrations included (with rollback script)
- [ ] Environment variables documented
- [ ] Feature flags used for gradual rollout (if applicable)
- [ ] Backward compatibility maintained
- [ ] No data loss risk

## Checklist

Before submitting:

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have rebased on main and resolved conflicts
- [ ] I have not included commits from other branches
- [ ] All commits are well-formed and follow commit message conventions

## Commit Message Format

Commit messages follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore, perf, ci, security
**Scope**: api, registry, trust-score, spec, docs, etc.
**Subject**: Present tense, imperative mood, lowercase, no period

Example:
```
feat(registry): add AIR ID validation endpoint

Adds GET /v1/agents/validate-air-id endpoint to validate
and check AIR ID integrity before registration.

Closes #123
```

## Reviewers

**Suggested reviewers**:
- @username1 (API expertise)
- @username2 (security review)
- @username3 (spec changes)

**Maintainers**: Will assign reviewers based on code changes

## Additional Context

Add any other context, screenshots, or links:

- Screenshots of UI changes
- Links to design documents
- Related PRs or branches
- Performance benchmarks
- Data migration scripts

## Questions for Reviewers

Any specific areas you'd like reviewers to focus on:

1. Question 1?
2. Question 2?

---

## Review Process Notes

**Maintainers will review** focusing on:
- ✓ Correctness of implementation
- ✓ Test coverage and quality
- ✓ Code style and maintainability  
- ✓ Security implications
- ✓ Performance impact
- ✓ Alignment with specification

**Expect feedback on**:
- Design decisions and alternatives
- Code clarity and documentation
- Test scenarios and edge cases
- Performance and scalability
- Security considerations

**PR will be merged when**:
- ✓ All checks pass (CI, tests, linting)
- ✓ At least 2 approvals from maintainers
- ✓ No requested changes remain
- ✓ Up-to-date with base branch
- ✓ All conversations resolved

Thank you for contributing to AIR! 🎉