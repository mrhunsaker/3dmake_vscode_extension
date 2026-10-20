---
layout: home
title: 3DMake VS Code Extension
---

An accessibility-first Visual Studio Code extension for building, slicing, previewing, and inspecting OpenSCAD-driven 3D printing projects with the `3dm` CLI.

## Project Links

- [Repository](https://github.com/mrhunsaker/3dmake_vscode_extension)
- [README](https://github.com/mrhunsaker/3dmake_vscode_extension/blob/main/README.md)
- [Changelog](https://github.com/mrhunsaker/3dmake_vscode_extension/blob/main/CHANGELOG.md)
- [Contributing](https://github.com/mrhunsaker/3dmake_vscode_extension/blob/main/CONTRIBUTING.md)
- [Security](https://github.com/mrhunsaker/3dmake_vscode_extension/blob/main/SECURITY.md)
- [Releasing](https://github.com/mrhunsaker/3dmake_vscode_extension/blob/main/RELEASING.md)

## Highlights

- Activity bar views for project files, command options, quick actions, and settings
- Accessible output and status updates for screen reader workflows
- Built-in STL viewer and SVG preview panel
- Automatic follow-up actions for common workflows:
  - Build opens the generated STL viewer when an STL is detected
  - Slice opens generated G-code in the editor when available
  - Setup opens `defaults.toml` when present
  - Image export reveals the export folder when image output is detected

## Commands

- `Build STL`: Runs `3dm build` and opens the generated STL in the viewer
- `Slice`: Runs `3dm slice` and opens generated G-code in the editor
- `Preview (SVG)`: Runs `3dm preview` and opens the latest SVG preview
- `Open/Edit Source`: Opens the active project's `src/*.scad` source file
- `Build + Slice`: Runs `3dm build --slice` and opens the generated STL
- `Full Pipeline`: Runs `3dm build --orient --slice` and opens the generated STL

## Installation

1. Install the `3dm` CLI and ensure it is on your `PATH`, or configure `3dmake.binaryPath` in VS Code.
2. Install the packaged `.vsix` from the repository releases, or build it locally with `npm install`, `npm run compile`, and `npm run package`.
3. Open the 3DMake activity bar container in VS Code and select a project file or directory.

## Publishing Notes

- This documentation site is deployed by the `Publish Documentation` GitHub Actions workflow.
- Releases are created automatically by the `Release On Tag` workflow whenever a new git tag is pushed.
- The published Pages URL is `https://mrhunsaker.github.io/3dmake_vscode_extension/`.

## Next Reference

Use the repository README for the full command matrix, keyboard shortcuts, troubleshooting, and packaging details.
