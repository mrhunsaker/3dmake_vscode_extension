# Changelog

All notable changes to **3DMake GUI** are documented here.

## [2026.05.02] — Accessibility and CLI Correctness Remediation

### Fixed

- **P0-01** Corrected image export CLI verb from `images` to `image` — previous version always failed with "Unknown action images".
- **P0-02** Corrected library CLI verbs: `libraries --list` → `list-libraries`, `libraries --install` → `install-libraries`.
- **P0-03** Corrected profiles CLI verb from `profiles` to `list-profiles`.
- **P0-04** Corrected overlays CLI verb from `overlays` to `list-overlays`.
- **P0-05** Fixed project `.scad` file path being incorrectly appended as a positional argument to `setup`, `help`, `version`, `list-*`, `self-update`, and `info` subcommands, which do not accept file arguments.
- **P1-02** Fixed `defaults.toml` path resolution on Windows: now checks `%LOCALAPPDATA%\3dmake\3dmake\` (matching Python `platformdirs`) in addition to the XDG path. Also honours the `THREEDMAKE_CONFIG_DIR` environment variable.
- **P1-03** `runOrient` now injects global flags (`-m`, `-v`, `-p`, `-o`, `-s`, `-c`) consistent with other build commands.

### Added

- **P1-01** Output Channel focus is now transferred to the user after informational commands complete (`info`, `help`, `version`, `list-profiles`, `list-overlays`, `list-libraries`). Screen reader users can immediately read the result without navigating manually.
- **P1-04** `3DMake: Edit Overlay` command — prompts for an overlay name and opens the corresponding `.ini` file in the VS Code editor. If the file does not exist, runs `3dm edit-overlay -o NAME` to create it, then opens the result. Accessible from the Settings & Tools panel and Command Palette.
- **P1-05** `3DMake: Edit Profile` command — prompts for a profile name and opens the corresponding `.ini` file from the config directory. If the profile does not exist, shows an actionable warning. Accessible from the Settings & Tools panel and Command Palette.
- **P2-01** After `3dm new <name>` completes, the extension now automatically sets the new directory as the active project, refreshes the project tree and status bar, and offers a toast notification to open `src/main.scad` in the editor.
- **P2-02** Scale (`-s`) and Copies (`-c`) options added to the Command Options tree view. Both are included in the global flags passed to build commands.
- **P2-03** `3DMake: Describe (Interactive AI)` command added for `3dm info -i`. Notes that full interactive Q&A requires the integrated terminal and offers to open one.
- **P2-04** ASCII STL detection in the built-in viewer: if a file is identified as ASCII format, an accessible error is shown in the model information panel and announced via the `aria-live` region. Binary format validation uses both header text and triangle-count consistency checks.
- **P2-05** `3DMake: Open Global Config` now shows a "Run Setup" action button when `defaults.toml` is not found, instead of a plain dismissible warning.
- **P3-01** `3DMake: Edit AI Description Prompt` command — opens the custom AI description prompt file (`prompt.txt` in the config directory). If not present, runs `3dm edit-prompt` to create it, then opens the result.
- **P3-02** Three new pipeline Quick Action combinations: Build + Orient, Orient + Slice, Preview + Slice.
- **P3-03** Image export now prompts for view angles via a multi-select picker before running. Default selection is `above_front_left`, `above_front`, `above_front_right`. Supports all 11 standard angles.
- **P3-04** OpenSCAD syntax grammar expanded with missing built-in functions: `abs`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `floor`, `ceil`, `round`, `sqrt`, `pow`, `log`, `ln`, `max`, `min`, `norm`, `cross`, `concat`, `len`, `str`, `chr`, `ord`, `search`, `lookup`, `version_num`, `parent_module`, `sign`, `exp`, and all `is_*` type-check functions.
- **P3-05** OpenSCAD special variables (`$fn`, `$fa`, `$fs`, `$t`, `$vpt`, `$vpr`, `$vpd`, `$vpf`, `$children`, `$parent_modules`, `$preview`, `$idx`) now receive distinct syntax highlighting as `variable.language`.

### Changed

- **P3-06** `3DMake: Self-Update` replaced with `3DMake: Check for Updates (Opens Browser)`, which opens the 3dmake GitHub releases page. The original command issued an unknown CLI verb that always errored.
- `ConfigManager` now exposes `getConfigDir()`, `getProfilePath()`, `getOverlayPath()`, and `getPromptFilePath()` helpers for correct cross-platform path resolution.
- `CommandRunner.RunOptions` has a new `focusOutputOnComplete` flag used by informational commands to route focus to the Output Channel on success.

## [2026.05.01] — Accessibility and Reliability Remediation

### Added

- Added `3DMake: Edit Model` command wired to `3dm edit-model`.
- Added `Edit Model` to Quick Actions, explorer/editor `.scad` context menus, and keyboard shortcut `Ctrl/Cmd+Alt+E`.

### Improvements

- Reordered Quick Actions so `New Project` appears first for faster project setup.

### Fixed

- Corrected command argument handling so unsupported global flags are no longer passed to unrelated `3dm` subcommands.
- Fixed project file argument placement so selected `.scad` paths are appended as positional arguments instead of being inserted between flags.
- Fixed Edit Model behavior: command now opens `.scad` source files from the current project's `src` folder (prefers `main.scad`) instead of looking for `.stl` files.
- Build commands now automatically open the generated `.stl` artifact, and Slice now opens generated `.gcode` in the editor when output paths are detected.
- Setup now opens `defaults.toml` automatically when available, and image export reveals the output folder when image paths are detected.
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

### Added (Initial Release)

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
