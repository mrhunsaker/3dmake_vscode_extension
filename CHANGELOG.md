# Changelog

All notable changes to **3DMake GUI** are documented here.

## [2026.05.01] — Accessibility and Reliability Remediation

### Fixed

- Corrected command argument handling so unsupported global flags are no longer passed to unrelated `3dm` subcommands.
- Fixed project file argument placement so selected `.scad` paths are appended as positional arguments instead of being inserted between flags.
- Fixed project tree click behavior: `.stl`, `.svg`, `.gcode`, and `3dmake.toml` entries now open the expected viewer or editor action.
- Fixed SVG accessibility injection to avoid malformed markup and duplicate `<title>` tags.
- Fixed status bar run-state updates so running, success, and error states are shown during command execution.

### Changed

- Updated keyboard shortcuts to non-conflicting bindings (`Ctrl/Cmd+Alt+...`) to preserve core VS Code accessibility shortcuts.
- Preview command now opens the SVG viewer automatically when a generated preview file is detected.
- SVG output detection was broadened so more real-world preview output formats are recognized.
- STL viewer keyboard input is now scoped to the canvas, with focus and dynamic camera announcements improving keyboard and screen reader behavior.
- Moved `setOption` command registration to extension activation to prevent duplicate registration errors.

### Security

- Removed external Three.js CDN dependency from the STL viewer and now load `three.min.js` from extension-local resources for offline and enterprise-safe execution.
- Replaced inlined base64 STL payload loading with local webview resource URIs to reduce memory pressure and improve handling of large STL files.

## [2026.04.29] — Initial Release

### Added

- Activity bar panel with four tree views: Project, Command Options, Quick Actions, Settings & Tools
- Full command palette coverage of all `3dm` subcommands
- Inline STL viewer (Three.js, WebviewPanel) with keyboard orbit, zoom, and wireframe toggle
- Inline SVG preview viewer with keyboard zoom
- OpenSCAD syntax highlighting grammar (`.scad` files)
- Project/config file detection and one-click opening
- Status bar item showing current project and run state
- Accessible announcements via VS Code Output Channel and notification toasts
- Context menu entries on `.scad`, `.stl`, and `3dmake.toml` files
- Keyboard shortcuts for Build, Preview, View STL, Custom Command, and Select Project
- `accessibilityInformation` labels on every TreeItem, StatusBarItem, and button
