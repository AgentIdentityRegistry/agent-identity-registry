# Contributing to the Agent Identity Registry

Thank you for your interest in contributing to AIR. We welcome contributions from developers, researchers, and community members who share our vision of building neutral, trusted infrastructure for AI agents.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

Our community values:
- **Respectful dialogue** - Assume good faith in all interactions
- **Diversity** - We welcome perspectives from different backgrounds and experiences
- **Intellectual honesty** - Acknowledge limitations, debate ideas respectfully
- **Transparency** - Be clear about affiliations and potential conflicts of interest

Any violations should be reported to conduct@agentidentityregistry.org.

## Getting Started

### Prerequisites

- Git
- Python 3.10+
- Node.js 18+ (for API client and tools)
- PostgreSQL 14+ (for local development)
- Docker (recommended for local setup)

### Local Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/AgentIdentityRegistry/agent-identity-registry.git
   cd air
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

4. **Set up the database**
   ```bash
   createdb air_dev
   python manage.py migrate
   ```

5. **Start the development server**
   ```bash
   python manage.py runserver
   ```

6. **Run tests**
   ```bash
   pytest
   ```

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed setup instructions.

## Types of Contributions

### Bug Reports

Found a bug? We want to know about it. Please use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

**Before submitting a bug report:**
- Check existing issues to avoid duplicates
- Include version numbers and system information
- Provide steps to reproduce with minimal example code
- Describe the expected vs. actual behavior

**When submitting:**
- Use the bug report template
- Be specific and include error messages/logs
- Include code snippets or test cases if possible

### Feature Requests

Have an idea for improving AIR? We'd love to hear it. Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

**When submitting a feature request:**
- Describe the use case and benefit
- Explain how it aligns with AIR's mission
- Consider potential security/privacy implications
- Reference related issues or specifications

### Documentation

Documentation improvements are always welcome. This includes:
- Clarifying existing docs
- Adding examples and tutorials
- Fixing typos and broken links
- Adding translations

### Code Contributions

#### Pull Request Process

1. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. **Make your changes**
   - Follow the code style guidelines (see below)
   - Add tests for new functionality
   - Update documentation as needed
   - Keep commits focused and descriptive

3. **Run tests locally**
   ```bash
   pytest
   black --check .
   flake8
   mypy
   ```

4. **Submit your pull request**
   - Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
   - Link related issues
   - Describe what your PR does and why
   - Request review from maintainers

5. **Respond to feedback**
   - Be open to suggestions
   - Engage constructively with reviewers
   - Push follow-up commits as needed

#### Code Style

- **Python**: Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) using `black` for formatting
- **JavaScript/TypeScript**: Use ESLint configuration in `.eslintrc.json`
- **Documentation**: Use [Google Style Markdown](https://google.github.io/styleguide/docguide/style.html)

Run formatters before committing:
```bash
black .
isort .
flake8
```

#### Testing Requirements

- All new code must include tests
- Tests should cover normal cases and edge cases
- Aim for 80%+ code coverage
- Use descriptive test names: `test_function_does_something_specific`

Example:
```python
def test_trust_score_calculation_with_perfect_components():
    """Verify trust score reaches 1000 when all components are 1000."""
    score = calculate_trust_score(
        provenance=1000,
        behavioral=1000,
        transparency=1000,
        security=1000,
        peer_attestations=1000
    )
    assert score == 1000
```

#### Documentation Requirements

- Include docstrings for all public functions/classes
- Update README if your change affects usage
- Add entries to CHANGELOG.md
- Include code examples for new features

## Development Guidelines

### Architecture Decisions

Major architecture decisions are documented in [ADRs](docs/adr/) (Architecture Decision Records).

When proposing architectural changes:
1. Open an issue to discuss
2. Link to relevant specifications
3. Consider security and performance implications
4. Propose ADR if significant

### Security Considerations

AIR handles identity verification and trust scoring—security is paramount.

**Before submitting code involving:**
- Cryptography: Consult cryptography maintainers
- Authentication/Authorization: Review security design
- Data validation: Ensure input sanitization
- API endpoints: Include security analysis

Report security vulnerabilities privately to security@agentidentityregistry.org (do not open public issues).

### Performance

- Profile code before and after changes
- Avoid N+1 queries in database code
- Consider caching for expensive operations
- Document performance assumptions

### Dependencies

- Minimize new dependencies; justify additions
- Keep dependencies up to date
- Monitor for security advisories
- Prefer stable, well-maintained libraries

## Review Process

### What Reviewers Look For

- **Correctness**: Does the code work as intended?
- **Tests**: Are changes adequately tested?
- **Documentation**: Are changes documented?
- **Style**: Does code follow guidelines?
- **Performance**: Any performance concerns?
- **Security**: Any security implications?

### Getting Your PR Reviewed

- Tag relevant maintainers for review
- Keep PRs focused (aim for <400 lines)
- Respond to feedback promptly
- Rebase on main if conflicts arise

## Release Process

- Releases follow [Semantic Versioning](https://semver.org/)
- Release notes highlight breaking changes and major features
- Maintenance releases are created for critical bug fixes

## Licensing

By contributing to AIR, you agree that your contributions are licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

## Questions?

- **Documentation**: See [docs/](docs/)
- **Discussions**: Use GitHub Discussions for questions
- **Email**: foundation@agentidentityregistry.org
- **Discord**: https://discord.gg/air-identity

Thank you for contributing to making AI agent identity and trust transparent and verifiable!