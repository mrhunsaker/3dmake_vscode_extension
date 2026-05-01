/**
 * ConfigManager
 *
 * Central store for:
 *  - 3dm binary path (from settings or auto-detect)
 *  - Current project path (runtime state, not persisted)
 *  - CLI option overrides (model, view, profile, overlay)
 *  - Paths to well-known config files
 *  - Last-generated SVG path (for the viewer command)
 */

import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

export class ConfigManager {
  private projectPath: string | undefined;
  private lastSvgPath: string | undefined;
  private lastStlPath: string | undefined;
  private lastGcodePath: string | undefined;
  private lastImageExportDir: string | undefined;

  // ── Options set via the Command Options tree view ─────────────────
  private modelOverride: string | undefined;
  private viewOverride: string | undefined;
  private profileOverride: string | undefined;
  private overlayOverride: string | undefined;

  // ── VS Code settings accessors ────────────────────────────────────

  getBinaryPath(): string {
    const cfg = vscode.workspace.getConfiguration("3dmake");
    return cfg.get<string>("binaryPath", "").trim();
  }

  async setBinaryPath(value: string): Promise<void> {
    const cfg = vscode.workspace.getConfiguration("3dmake");
    await cfg.update("binaryPath", value, vscode.ConfigurationTarget.Global);
  }

  getDefaultModel(): string {
    return vscode.workspace
      .getConfiguration("3dmake")
      .get<string>("defaultModel", "")
      .trim();
  }

  getDefaultView(): string {
    return vscode.workspace
      .getConfiguration("3dmake")
      .get<string>("defaultView", "3sil")
      .trim();
  }

  getDefaultProfile(): string {
    return vscode.workspace
      .getConfiguration("3dmake")
      .get<string>("defaultProfile", "")
      .trim();
  }

  shouldShowOutputOnRun(): boolean {
    return vscode.workspace
      .getConfiguration("3dmake")
      .get<boolean>("showOutputOnRun", true);
  }

  shouldAnnounceCompletion(): boolean {
    return vscode.workspace
      .getConfiguration("3dmake")
      .get<boolean>("announceCommandCompletion", true);
  }

  getProjectViewFileMode(): "all" | "relevant" {
    return vscode.workspace
      .getConfiguration("3dmake")
      .get<"all" | "relevant">("projectViewFileMode", "all");
  }

  // ── Runtime project path ──────────────────────────────────────────

  setProjectPath(p: string): void {
    this.projectPath = p;
  }

  getProjectPath(): string | undefined {
    return this.projectPath;
  }

  // ── Effective binary path (respects env var fallback) ─────────────

  getEffectiveBinaryPath(): string {
    const setting = this.getBinaryPath();
    if (setting) {
      return setting;
    }
    // Honour the environment variable used by the Python app
    const envPath =
      process.env["THREE_DM_PATH"] ?? process.env["THREEDM_PATH"] ?? "";
    if (envPath) {
      return envPath;
    }
    return "3dm"; // rely on shell PATH
  }

  // ── Override getters/setters (set by Command Options view) ────────

  setModelOverride(v: string | undefined): void {
    this.modelOverride = v;
  }
  getModelOverride(): string | undefined {
    return this.modelOverride;
  }

  setViewOverride(v: string | undefined): void {
    this.viewOverride = v;
  }
  getViewOverride(): string | undefined {
    return this.viewOverride;
  }

  setProfileOverride(v: string | undefined): void {
    this.profileOverride = v;
  }
  getProfileOverride(): string | undefined {
    return this.profileOverride;
  }

  setOverlayOverride(v: string | undefined): void {
    this.overlayOverride = v;
  }
  getOverlayOverride(): string | undefined {
    return this.overlayOverride;
  }

  /** Build the flag array [-m <model>] [-v <view>] [-p <profile>] etc. */
  buildGlobalFlags(): string[] {
    const flags: string[] = [];
    const model = this.modelOverride ?? this.getDefaultModel();
    const view = this.viewOverride ?? this.getDefaultView();
    const profile = this.profileOverride ?? this.getDefaultProfile();
    const overlay = this.overlayOverride;

    if (model) {
      flags.push("-m", model);
    }
    if (view) {
      flags.push("-v", view);
    }
    if (profile) {
      flags.push("-p", profile);
    }
    if (overlay) {
      flags.push("-o", overlay);
    }
    return flags;
  }

  // ── SVG path tracking ─────────────────────────────────────────────

  setLastSvgPath(p: string | undefined): void {
    this.lastSvgPath = p;
  }
  getLastSvgPath(): string | undefined {
    return this.lastSvgPath;
  }

  setLastStlPath(p: string | undefined): void {
    this.lastStlPath = p;
  }
  getLastStlPath(): string | undefined {
    return this.lastStlPath;
  }

  setLastGcodePath(p: string | undefined): void {
    this.lastGcodePath = p;
  }
  getLastGcodePath(): string | undefined {
    return this.lastGcodePath;
  }

  setLastImageExportDir(p: string | undefined): void {
    this.lastImageExportDir = p;
  }
  getLastImageExportDir(): string | undefined {
    return this.lastImageExportDir;
  }

  // ── Well-known config file paths ──────────────────────────────────

  getGlobalConfigPath(): string | undefined {
    // ~/.config/3dmake/defaults.toml  (XDG)
    const xdg =
      process.env["XDG_CONFIG_HOME"] ?? path.join(os.homedir(), ".config");
    const candidate = path.join(xdg, "3dmake", "defaults.toml");
    return fs.existsSync(candidate) ? candidate : undefined;
  }

  getProjectConfigPath(): string | undefined {
    const base = this.projectPath
      ? fs.statSync(this.projectPath).isDirectory()
        ? this.projectPath
        : path.dirname(this.projectPath)
      : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!base) {
      return undefined;
    }
    const candidate = path.join(base, "3dmake.toml");
    return fs.existsSync(candidate) ? candidate : undefined;
  }
}
