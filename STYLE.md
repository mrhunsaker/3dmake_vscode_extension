# Style Guide

This guide defines coding and documentation standards for 3DMake GUI.

## TypeScript

1. Use strict typing and avoid `any` unless there is a clear reason.
2. Prefer `const` over `let` where possible.
3. Keep functions small and single-purpose.
4. Use descriptive names for commands, handlers, and UI labels.
5. Preserve existing code patterns unless a refactor is required.

## Error Handling

1. Fail with clear, actionable messages.
2. Do not swallow errors silently in command paths.
3. Keep completion notifications consistent for success and failure.

## Accessibility

1. Add `accessibilityInformation` to TreeItems and status controls.
2. Avoid overriding core VS Code accessibility shortcuts.
3. Scope keyboard handlers to relevant controls in webviews.
4. Keep aria labels descriptive and current with UI state.

## Webview Standards

1. Prefer local extension resources over external CDNs.
2. Keep CSP-safe patterns and minimize inline risk.
3. Avoid large base64 payloads when local resource URIs can be used.

## Documentation

1. Update README and CHANGELOG for user-visible behavior changes.
2. Keep shortcut and command tables synchronized with `package.json`.
3. Use concise, user-focused language in release notes.

## Formatting

1. Keep line lengths readable and maintain existing style.
2. Use single quotes in TypeScript where existing files do.
3. Avoid unrelated reformatting in functional PRs.
