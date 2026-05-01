# 3DMake GUI — VS Code Extension

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![VS Code Engine](https://img.shields.io/badge/VS%20Code-%5E1.85-blue)](https://code.visualstudio.com)

An accessibility-first Visual Studio Code extension that wraps the [`3dm` / tdeck CLI tool](https://github.com/mrhunsaker/3dmakeGUI) and exposes its full workflow through VS Code's native UI: tree views, the Command Palette, the Output Channel, keyboard shortcuts, and rich screen reader support.

---

## Contents

- [What This Extension Does](#what-this-extension-does)
- [Screenshots / Panel Overview](#screenshots--panel-overview)
- [Prerequisites](#prerequisites)
- [Installation from VSIX](#installation-from-vsix)
- [Building the VSIX Yourself](#building-the-vsix-yourself)
- [Configuration](#configuration)
- [Activity Bar Panel](#activity-bar-panel)
  - [Project View](#project-view)
  - [Command Options View](#command-options-view)
  - [Quick Actions View](#quick-actions-view)
  - [Settings & Tools View](#settings--tools-view)
- [Commands Reference](#commands-reference)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Context Menu Entries](#context-menu-entries)
- [STL Viewer](#stl-viewer)
- [SVG Preview Viewer](#svg-preview-viewer)
- [OpenSCAD Syntax Highlighting](#openscad-syntax-highlighting)
- [Accessibility Design](#accessibility-design)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## What This Extension Does

`3dm` (tdeck) is a command-line pipeline tool for OpenSCAD-based 3D printing workflows. It handles building STL files from `.scad` sources, auto-orienting them for print beds, slicing with configurable profiles, exporting silhouette previews, and managing libraries and overlays.

This extension wraps every `3dm` subcommand in VS Code's native UI so you never need to type in a terminal. It is designed from the ground up for **blind and low-vision users** using screen readers (NVDA, JAWS, Narrator, VoiceOver) while remaining fully usable by sighted users.

Key design decisions:

| Goal                   | How it is achieved                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen reader friendly | Every tree item, button, and status bar item carries an `accessibilityInformation` label. The Output Channel is an `aria-live` region natively in VS Code. Completion toasts are shown for users not watching the Output panel. |
| Keyboard-only usable   | All commands have keyboard shortcuts. Tree views are fully keyboard-navigable. The STL viewer supports arrow-key orbit and zoom. The SVG viewer supports keyboard zoom.                                                         |
| No terminal required   | Commands are spawned from Node.js `child_process`; stdout/stderr stream live to the Output Channel.                                                                                                                             |
| Portable               | Works on Linux, macOS, and Windows. Binary path is configurable.                                                                                                                                                                |

---

## Screenshots / Panel Overview

```
┌─────────────────────────────────────────────────────────┐
│  Activity Bar                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🗂 3DMake                                         │   │
│  │  ▼ PROJECT                                        │   │
│  │    📂 my-part/                                    │   │
│  │      📄 my-part.scad                             │   │
│  │      ⚙  3dmake.toml                              │   │
│  │      📦 my-part.stl                              │   │
│  │  ▼ COMMAND OPTIONS                               │   │
│  │    ✏  Model (-m)       -m cap                    │   │
│  │    ✏  View (-v)        -v 3sil                   │   │
│  │    ✏  Profile (-p)     (default)                 │   │
│  │    ✏  Overlay (-o)     (default)                 │   │
│  │  ▼ QUICK ACTIONS                                 │   │
│  │    ▶  Build STL                                  │   │
│  │    ◉  Slice                                      │   │
│  │    👁  Preview (SVG)                              │   │
│  │    🚀 Full Pipeline                              │   │
│  │    …                                             │   │
│  │  ▼ SETTINGS & TOOLS                              │   │
│  │    ⚙  Set 3dm Binary Path                        │   │
│  │    📄 Open Global Config                         │   │
│  │    …                                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Runtime requirements

| Requirement                   | Notes                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Visual Studio Code** ≥ 1.85 | [Download](https://code.visualstudio.com/)                                                                                                                            |
| **`3dm` binary**              | Install via your system package manager or download from the tdeck/3dmake project releases. Must be on your `PATH` or configured via the `3dmake.binaryPath` setting. |
| **OpenSCAD**                  | Required by `3dm build`. Install from [openscad.org](https://openscad.org/).                                                                                          |
| **A slicer** (optional)       | Required only for `3dm slice`. PrusaSlicer / SuperSlicer / OrcaSlicer are supported depending on your `3dm` profile configuration.                                    |

### Build requirements (only if building from source)

| Requirement      | Version                                   |
| ---------------- | ----------------------------------------- |
| **Node.js**      | ≥ 18 LTS                                  |
| **npm**          | ≥ 9 (bundled with Node 18+)               |
| **TypeScript**   | installed automatically via `npm install` |
| **@vscode/vsce** | installed automatically via `npm install` |

---

## Installation from VSIX

If you have received a pre-built `.vsix` file:

### Method 1 — VS Code GUI

1. Open VS Code.
2. Open the Extensions view: `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS).
3. Click the **`···`** (More Actions) button at the top-right of the Extensions panel.
4. Select **Install from VSIX…**
5. Navigate to and select `vscode-3dmake-gui-2026.04.29.vsix`.
6. Click **Install**.
7. Reload VS Code when prompted.

### Method 2 — Command Palette

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P` to open the Command Palette.
2. Type `Extensions: Install from VSIX` and press `Enter`.
3. Navigate to the `.vsix` file and confirm.

### Method 3 — Terminal

```bash
code --install-extension vscode-3dmake-gui-2026.04.29.vsix
```

---

## Building the VSIX Yourself

Follow these steps exactly to produce a `.vsix` file from the source tree.

### Step 1 — Clone or download the source

```bash
git clone https://github.com/mrhunsaker/3dmakeGUI.git
cd 3dmakeGUI/vscode-extension
# — or, if you received a zip —
unzip vscode-3dmake-gui-src.zip
cd vscode-3dmake-gui
```

### Step 2 — Install Node.js dependencies

```bash
npm install
```

This installs TypeScript, the VS Code type definitions, ESLint, and `@vscode/vsce` (the extension packaging tool) into `node_modules/`. Nothing is installed globally.

> **Proxy / offline environments:** If you are behind a corporate proxy, set `npm config set proxy http://proxy.example.com:8080` before running `npm install`.

### Step 3 — Compile TypeScript

```bash
npm run compile
```

This invokes `tsc` using `tsconfig.json` and writes compiled JavaScript to `dist/`. Check the terminal for any TypeScript errors — they must be resolved before packaging.

To watch for changes during development:

```bash
npm run watch
```

### Step 4 — (Optional) Lint

```bash
npm run lint
```

### Step 5 — Package the VSIX

```bash
npm run package
```

Under the hood this runs:

```bash
npx vsce package
```

`vsce` reads `package.json`, bundles everything not excluded by `.vscodeignore`, and writes a file named:

```
vscode-3dmake-gui-<version>.vsix
```

in the project root. For version `2026.4.29` the output file is:

```
vscode-3dmake-gui-2026.04.29.vsix
```

> **Common packaging errors:**
>
> | Error                    | Fix                                                                             |
> | ------------------------ | ------------------------------------------------------------------------------- |
> | `Missing publisher name` | Ensure `"publisher"` is set in `package.json`. Use any string for local builds. |
> | `icon not found`         | Place a 128×128 PNG at `resources/icon.png` (see note below).                   |
> | `README.md not found`    | The README must exist at the project root — it does in this repo.               |
> | TypeScript errors        | Run `npm run compile` first and fix all errors.                                 |

### Note on the icon

`package.json` references `resources/icon.png`. This must be a **128×128 PNG**. For a quick placeholder during development:

```bash
# Requires ImageMagick
convert -size 128x128 xc:#0e639c -fill white \
  -font DejaVu-Sans-Bold -pointsize 28 \
  -gravity center -annotate 0 "3DM" \
  resources/icon.png
```

Or copy any 128×128 PNG to `resources/icon.png`.

### Full build script (copy-pasteable)

```bash
# 1. Enter the extension directory
cd vscode-3dmake-gui

# 2. Install deps
npm install

# 3. Compile
npm run compile

# 4. Package
npm run package

# 5. Install into VS Code
code --install-extension vscode-3dmake-gui-*.vsix
```

---

## Configuration

Open VS Code Settings (`Ctrl+,`) and search for **3dmake** to see all options.

| Setting                            | Type    | Default  | Description                                                                                                                          |
| ---------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `3dmake.binaryPath`                | string  | `""`     | Full path to the `3dm` binary. Leave empty to auto-detect from `PATH` or the `THREE_DM_PATH` / `THREEDM_PATH` environment variables. |
| `3dmake.defaultModel`              | string  | `""`     | Default value for the `-m` (model) flag.                                                                                             |
| `3dmake.defaultView`               | string  | `"3sil"` | Default silhouette view for the `-v` flag. One of: `3sil`, `frontsil`, `backsil`, `leftsil`, `rightsil`, `topsil`.                   |
| `3dmake.defaultProfile`            | string  | `""`     | Default slicer profile for the `-p` flag.                                                                                            |
| `3dmake.showOutputOnRun`           | boolean | `true`   | Automatically reveal the Output Channel when a command starts.                                                                       |
| `3dmake.announceCommandCompletion` | boolean | `true`   | Show a notification toast when a command succeeds or fails. Especially useful for screen reader users.                               |

Settings can also be changed via the **Settings & Tools** panel → **VS Code Settings** item.

---

## Activity Bar Panel

Click the **3DMake icon** in the VS Code Activity Bar (left edge) to open the panel. The panel contains four collapsible tree views.

### Project View

Shows the currently selected project (a `.scad` file or a directory containing one) and its associated files:

- `.scad` source files — click to open in the editor
- `3dmake.toml` project config — click to open in the editor
- `.stl` output files — click to open in the **STL Viewer**
- `.gcode` output files
- `.svg` preview files

Use the **Refresh** button (↺ icon in the view title bar) to re-scan the directory.

To select a project, click **Select Project** in the Quick Actions view, or press `Ctrl+Shift+O`.

### Command Options View

Four editable items map to `3dm` CLI flags:

| Item         | Flag         | Effect                                           |
| ------------ | ------------ | ------------------------------------------------ |
| Model (-m)   | `-m <value>` | Selects the target model within the `.scad` file |
| View (-v)    | `-v <value>` | Sets the silhouette view                         |
| Profile (-p) | `-p <value>` | Sets the slicer profile                          |
| Overlay (-o) | `-o <value>` | Applies a named overlay                          |

Click (or press `Enter` on) any item to open an **InputBox** and set the value. These override the corresponding VS Code settings for the current session. Leave a value empty to fall back to the VS Code setting default.

### Quick Actions View

One-click access to the most common commands. Each item shows its keyboard shortcut in the tooltip. See [Commands Reference](#commands-reference) for the full list.

### Settings & Tools View

Quick links to configuration commands and environment management (Setup, List Profiles, List Overlays, List Libraries, Install Libraries, Version, Self-Update, Help, and VS Code Settings).

---

## Commands Reference

All commands are available in the **Command Palette** (`Ctrl+Shift+P`) under the `3DMake:` prefix.

| Command                                          | Description                                                |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `3DMake: Select Project File or Directory`       | Opens a file picker to choose the active project           |
| `3DMake: Build STL`                              | Runs `3dm build`                                           |
| `3DMake: Slice`                                  | Runs `3dm slice`                                           |
| `3DMake: Orient`                                 | Runs `3dm orient` (auto-orient for print bed)              |
| `3DMake: Preview (SVG)`                          | Runs `3dm preview` and generates an SVG silhouette         |
| `3DMake: Build + Slice`                          | Runs `3dm build --slice`                                   |
| `3DMake: Full Pipeline (Build + Orient + Slice)` | Runs `3dm build --orient --slice`                          |
| `3DMake: Describe (Info)`                        | Runs `3dm info` to print model metadata                    |
| `3DMake: Print`                                  | Runs `3dm print` to send G-code to the printer             |
| `3DMake: Export Images`                          | Runs `3dm images`                                          |
| `3DMake: New Project`                            | Prompts for a name and runs `3dm new <name>`               |
| `3DMake: Run Setup`                              | Runs `3dm setup`                                           |
| `3DMake: List Libraries`                         | Runs `3dm libraries --list`                                |
| `3DMake: Install Libraries`                      | Runs `3dm libraries --install`                             |
| `3DMake: List Profiles`                          | Runs `3dm profiles`                                        |
| `3DMake: List Overlays`                          | Runs `3dm overlays`                                        |
| `3DMake: Show Version`                           | Runs `3dm version`                                         |
| `3DMake: Self-Update`                            | Runs `3dm self-update`                                     |
| `3DMake: Show Help`                              | Runs `3dm help`                                            |
| `3DMake: Run Custom Command`                     | Prompts for arbitrary arguments and runs `3dm <args>`      |
| `3DMake: View STL in 3D Viewer`                  | Opens the active or selected `.stl` in the built-in viewer |
| `3DMake: View Last SVG Preview`                  | Opens the most recently generated SVG in the preview panel |
| `3DMake: Set 3dm Binary Path`                    | Edits the `3dmake.binaryPath` setting inline               |
| `3DMake: Open Global Config (defaults.toml)`     | Opens `~/.config/3dmake/defaults.toml` in the editor       |
| `3DMake: Open Project Config (3dmake.toml)`      | Opens `3dmake.toml` from the project directory             |
| `3DMake: Refresh Project View`                   | Re-scans the project directory                             |

---

## Keyboard Shortcuts

| Shortcut                       | Command            | Active when            |
| ------------------------------ | ------------------ | ---------------------- |
| `Ctrl+Shift+B` / `Cmd+Shift+B` | Build STL          | Active file is `.scad` |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Preview (SVG)      | Active file is `.scad` |
| `Ctrl+Shift+O` / `Cmd+Shift+O` | Select Project     | Always                 |
| `Ctrl+Shift+V` / `Cmd+Shift+V` | View STL           | Active file is `.stl`  |
| `Ctrl+Shift+X` / `Cmd+Shift+X` | Run Custom Command | Always                 |

All shortcuts can be re-bound via **File → Preferences → Keyboard Shortcuts** and searching for `3DMake`.

### STL Viewer keyboard controls

| Key                  | Action                   |
| -------------------- | ------------------------ |
| `Arrow Left / Right` | Orbit horizontally       |
| `Arrow Up / Down`    | Orbit vertically         |
| `+` / `=`            | Zoom in                  |
| `-`                  | Zoom out                 |
| `R`                  | Reset camera             |
| `T`                  | Top-down view            |
| `F`                  | Front view               |
| `I`                  | Isometric view           |
| `W`                  | Toggle wireframe overlay |

### SVG Preview keyboard controls

| Key           | Action             |
| ------------- | ------------------ |
| `+` / `=`     | Zoom in            |
| `-`           | Zoom out           |
| `0`           | Reset zoom to 100% |
| `Ctrl+Scroll` | Mouse-wheel zoom   |

---

## Context Menu Entries

Right-click context menus are added to:

| Location       | File type     | Items added              |
| -------------- | ------------- | ------------------------ |
| Explorer panel | `.scad`       | Build STL, Preview (SVG) |
| Editor         | `.scad`       | Build STL, Preview (SVG) |
| Explorer panel | `.stl`        | View in 3D Viewer        |
| Explorer panel | `3dmake.toml` | Open Project Config      |

---

## STL Viewer

The built-in STL viewer opens as a **split panel** alongside the editor (`ViewColumn.Beside`) so your source file remains visible.

Features:

- **Binary STL parsing** — no native add-ons required; runs entirely in the WebviewPanel sandbox
- **Phong shading** with ambient, directional, and back lights
- **Wireframe overlay** toggle (`W` key)
- **Orbit** via mouse drag or arrow keys
- **Pan** via `Shift`+drag
- **Zoom** via scroll wheel, `+`/`−` keys
- **Preset views**: Top, Front, Isometric, Reset
- **Model information panel**: triangle count, bounding-box dimensions in mm
- **aria-live region** announcing camera changes and model load events to screen readers

The viewer re-uses the same panel instance if you open another STL, avoiding panel proliferation.

---

## SVG Preview Viewer

Opens the most recently generated SVG silhouette preview (detected from `3dm preview` output) in a split panel.

Features:

- **Inline SVG rendering** — no external image viewer needed
- **Keyboard zoom** and Ctrl+scroll zoom
- **Automatic `<title>` injection** if the SVG lacks one, for screen reader compatibility
- **`aria-live` zoom level announcements**

---

## OpenSCAD Syntax Highlighting

Installing this extension also registers a language definition for `.scad` files (if no other OpenSCAD extension is already installed). The grammar covers:

- Line and block comments
- String literals with escape sequences
- Control keywords (`module`, `function`, `if`, `else`, `for`, `let`, `each`, `include`, `use`, `assert`, `echo`)
- Built-in transform and shape functions (`cube`, `sphere`, `translate`, `rotate`, `union`, `difference`, etc.)
- Language constants (`true`, `false`, `undef`, `PI`)
- Numeric literals (including scientific notation)
- Operators

> **Tip:** For a more complete OpenSCAD language experience (hover docs, snippets, formatter) pair this extension with a dedicated OpenSCAD extension from the marketplace.

---

## Accessibility Design

This extension was built to be fully usable with screen readers and keyboard-only navigation. The following mechanisms are used:

### VS Code Output Channel

All `3dm` subprocess output streams live into a named Output Channel (`3DMake`). VS Code's Output Channel is an `aria-live` polite region — screen readers announce new lines as they arrive without interrupting the current reading focus.

### Notification Toasts

When `3dmake.announceCommandCompletion` is enabled (default: on), a VS Code information or error notification is shown at command completion. These are announced immediately by screen readers as alert dialogs.

### TreeItem `accessibilityInformation`

Every `vscode.TreeItem` in all four panel views carries an `accessibilityInformation` object with:

- `label`: a human-readable description of the item's purpose and current state
- `role`: `"treeitem"` for data items, `"button"` for action items, `"note"` for informational placeholders

### StatusBarItem `accessibilityInformation`

The status bar item includes a label describing the current project name and run state (idle, running, success, error).

### WebviewPanel accessibility

The STL viewer and SVG preview are custom HTML panels. They implement:

- `role="img"` on the canvas with a dynamic `aria-label` describing the loaded model
- An off-screen `role="status" aria-live="polite"` region that announces camera changes, zoom levels, and model load events
- A visible skip link (`#skip-link`) to bypass the canvas for keyboard users
- Toolbar buttons with explicit `title` attributes and keyboard equivalents documented on-screen
- High-contrast-aware CSS using VS Code theme custom properties

### Input accessibility

All user input goes through VS Code's native `showInputBox` and `showOpenDialog` APIs, which are fully accessible to screen readers.

---

## Troubleshooting

### `3dm binary not found`

The extension cannot locate the `3dm` binary.

1. Confirm `3dm` is installed: open a terminal and run `3dm version`.
2. If it works in a terminal but not in the extension, the VS Code process may not inherit your shell `PATH`. Set the full path: Command Palette → `3DMake: Set 3dm Binary Path` → enter e.g. `/usr/local/bin/3dm`.
3. Alternatively, set the environment variable `THREE_DM_PATH=/usr/local/bin/3dm` in your shell profile and restart VS Code.

### Output Channel shows no output

Make sure `3dmake.showOutputOnRun` is `true` (the default). If the Output panel is open but the `3DMake` channel is not selected, use the dropdown at the top-right of the Output panel to switch to it.

### STL Viewer shows a blank panel

- The STL file must be a **binary STL**. ASCII STL files are not currently supported by the built-in parser.
- Check the browser console for errors: `Help → Toggle Developer Tools → Console`.

### TypeScript compile errors during build

Run `npm install` first to ensure all type definitions are installed. Node.js ≥ 18 is required.

### `vsce` errors about missing `icon.png`

Create a placeholder icon (see [Note on the icon](#note-on-the-icon) above) or comment out the `"icon"` field in `package.json` temporarily.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Make changes in `src/`.
3. Run `npm run compile` and verify no TypeScript errors.
4. Run `npm run lint`.
5. Test manually using `F5` in VS Code (Run Extension launch configuration).
6. Open a pull request describing what changed and why.

---

## License

Apache-2.0 — see [LICENSE](LICENSE).

---

_Built with accessibility as a first-class requirement, not an afterthought._
