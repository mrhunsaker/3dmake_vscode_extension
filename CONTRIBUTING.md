# Contributing Guide

Thanks for contributing to 3DMake GUI.

## Getting Started

1. Fork the repository.
2. Create a feature branch from `main`.
3. Install dependencies:
   - `npm install`
4. Build and check quality before opening a PR:
   - `npm run compile`
   - `npm run lint`

## Development Workflow

1. Make focused changes with clear commit messages.
2. Keep user-facing behavior accessible and keyboard-friendly.
3. Update docs when behavior or shortcuts change.
4. Add or update tests when practical.

## Issues vs Discussions

Use the right intake path so triage is faster:

1. Open an Issue for actionable work items:
   - reproducible bugs
   - concrete feature requests
2. Start a Discussion for conversation-first topics:
   - Q&A and usage help
   - open-ended ideas
   - show-and-tell workflows

Templates are available in:

1. `.github/ISSUE_TEMPLATE/`
2. `.github/DISCUSSION_TEMPLATE/`

## Pull Request Expectations

1. Explain what changed and why.
2. Include verification steps and expected outcomes.
3. Reference related issues if applicable.
4. Keep scope small when possible.

## Governance

### Maintainer Roles

1. Repository owner and maintainers approve pull requests and cut releases.
2. Contributors may propose changes through issues, discussions, and pull requests.

### Triage Targets

1. New issues and discussions should receive an initial maintainer response within 5 business days.
2. Pull requests should receive an initial review within 7 business days when practical.
3. High-impact accessibility regressions should be prioritized ahead of non-critical enhancements.

### Decision Rules

1. Breaking UX changes (including shortcuts and command behavior) should be discussed before merge.
2. Security and reliability fixes may be fast-tracked when risk is clear and validation is complete.
3. In case of disagreement, maintainers make the final merge decision and document rationale in the PR.

### Release Cadence

1. Patch releases: as needed for bug fixes and accessibility/security remediations.
2. Minor releases: for additive features and workflow improvements.
3. Each release should include an updated `CHANGELOG.md` entry.

## Accessibility Requirements

1. Do not introduce keyboard conflicts with VS Code defaults.
2. Ensure TreeItems and UI controls have meaningful accessible labels.
3. Keep command output and error states visible in the Output channel and notifications.

## Packaging Checks

Before release packaging:

1. Ensure `npm run compile` succeeds.
2. Ensure `npm run lint` succeeds.
3. Build a VSIX with `npm run package`.

For full release workflow details, see `RELEASING.md`.
