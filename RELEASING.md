# Releasing Guide

This document describes the release process for 3DMake GUI.

Maintainer operations and triage handoff notes are tracked in `.github/MAINTAINER_CHECKLIST.md`.

## Release Types

1. Patch: bug fixes, accessibility/security remediations, and low-risk corrections.
2. Minor: additive features and workflow improvements.

## Pre-Release Checklist

1. Ensure working tree is in the desired state.
2. Confirm `CHANGELOG.md` includes a user-facing entry for the release.
3. Run quality checks:
   - `npm install`
   - `npm run compile`
   - `npm run lint`
4. Build a package:
   - `npm run package`
5. Verify VSIX contents if packaging-sensitive files changed:
   - `npx vsce ls --tree`

## Accessibility Verification

Before publishing, validate key accessibility paths:

1. Core shortcuts do not override critical VS Code defaults.
2. Preview and viewer commands remain keyboard-usable.
3. Status and Output behavior remain understandable for screen reader workflows.

## Security Verification

1. Review open security reports and unresolved high-risk issues.
2. Confirm `SECURITY.md` reporting guidance remains accurate.
3. Ensure no external webview CDN dependency is reintroduced.

## Publish Steps

1. Update extension version in `package.json` if needed.
2. Package the release artifact: `npm run package`.
3. Publish using configured workflow/tooling (for example `npm run publish` if applicable).
4. Tag the release in source control and include release notes.

## Post-Release

1. Verify install/update from the published artifact.
2. Announce notable fixes, especially accessibility and security changes.
3. Monitor incoming issues and discussions for regressions.
