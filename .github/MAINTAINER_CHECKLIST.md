# Maintainer Checklist

Use this checklist for weekly maintenance, triage, and release handoff.

## Weekly Triage

1. Review new issues and apply labels (`bug`, `enhancement`, `accessibility`, `security`, `needs-info`).
2. Review new discussions and route actionable topics to issues when needed.
3. Close duplicates with links to the canonical issue/discussion.
4. Verify unresolved accessibility-impacting bugs are prioritized.

## Pull Request Triage

1. Confirm PR template checklist is completed.
2. Verify scope is clear and linked to issue/discussion when applicable.
3. Request changes when docs or changelog updates are missing.
4. Ensure at least one maintainer review before merge for non-trivial changes.

## Release Handoff

1. Confirm release candidate has updated `CHANGELOG.md` entry.
2. Confirm quality checks have passed (`npm run compile`, `npm run lint`).
3. Confirm package build succeeds (`npm run package`).
4. Confirm security-sensitive fixes are coordinated with `SECURITY.md` guidance.
5. Record release notes and tag details in the release PR/notes.

## Incident/Regression Handling

1. Create a tracking issue for high-impact regressions.
2. Add mitigation/workaround details to issue description.
3. Prioritize patch release decision and assign owner.
4. Post follow-up notes after fix is released.
