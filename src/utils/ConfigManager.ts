/**
 * ConfigManager
 *
 * Central store for:
 *  - 3dm binary path (from settings or auto-detect)
 *  - Current project path (runtime state, not persisted)
 *  - CLI option overrides (model, view, profile, overlay, scale, copies)
 *  - Paths to well-known config files
 *  - Last-generated SVG/STL/gcode paths (for viewer/editor follow-up)
 *
 * Config path resolution matches platformdirs.user_config_path('3dmake', None):
 *  - Linux/macOS: $XDG_CONFIG_HOME/3dmake  or  ~/.config/3dmake
 *  - macOS fallback: ~/Library/Application Support/3dmake
 *  - Windows: %LOCALAPPDATA%\3dmake\3dmake  (platformdirs appends app name twice on Windows)
 *  - Override: THREEDMAKE_CONFIG_DIR environment variable (same as the CLI uses)
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
  private scaleOverride: string | undefined;
  private copiesOverride: number | undefined;

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

  setScaleOverride(v: string | undefined): void {
    this.scaleOverride = v;
  }
  getScaleOverride(): string | undefined {
    return this.scaleOverride;
  }

  setCopiesOverride(v: number | undefined): void {
    this.copiesOverride = v;
  }
  getCopiesOverride(): number | undefined {
    return this.copiesOverride;
  }

  /** Build the flag array [-m <model>] [-v <view>] [-p <profile>] [-o <overlay>] [-s <scale>] [-c <copies>] */
  buildGlobalFlags(): string[] {
    const flags: string[] = [];
    const model = this.modelOverride ?? this.getDefaultModel();
    const view = this.viewOverride ?? this.getDefaultView();
    const profile = this.profileOverride ?? this.getDefaultProfile();
    const overlay = this.overlayOverride;
    const scale = this.scaleOverride;
    const copies = this.copiesOverride;

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
    if (scale) {
      flags.push("-s", scale);
    }
    if (copies !== undefined && copies > 1) {
      flags.push("-c", String(copies));
    }
    return flags;
  }

  // ── SVG / STL / gcode path tracking ──────────────────────────────

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

  // ── Well-known config directory ───────────────────────────────────

  /**
   * Resolve the 3dmake configuration directory, matching the Python
   * `platformdirs.user_config_path('3dmake', None)` logic:
   *
   *  Priority:
   *  1. THREEDMAKE_CONFIG_DIR environment variable (same override the CLI uses)
   *  2. Windows: %LOCALAPPDATA%\3dmake\3dmake
   *             %APPDATA%\3dmake\3dmake  (fallback)
   *  3. Linux/macOS: $XDG_CONFIG_HOME/3dmake  or  ~/.config/3dmake
   *  4. macOS only: ~/Library/Application Support/3dmake
   */
  getConfigDir(): string | undefined {
    // 1. Explicit environment override (same var the CLI checks)
    const envOverride = process.env["THREEDMAKE_CONFIG_DIR"];
    if (envOverride && fs.existsSync(envOverride)) {
      return envOverride;
    }

    const candidates: string[] = [];

    if (process.platform === "win32") {
      // platformdirs on Windows: user_config_path appends the app name twice
      // when author is None, giving %LOCALAPPDATA%\<appname>\<appname>
      const localAppData = process.env["LOCALAPPDATA"];
      const appData = process.env["APPDATA"];
      if (localAppData) {
        candidates.push(path.join(localAppData, "3dmake", "3dmake"));
      }
      if (appData) {
        candidates.push(path.join(appData, "3dmake", "3dmake"));
      }
    }

    // XDG / Linux / macOS
    const xdg =
      process.env["XDG_CONFIG_HOME"] ?? path.join(os.homedir(), ".config");
    candidates.push(path.join(xdg, "3dmake"));

    // macOS Library fallback
    if (process.platform === "darwin") {
      candidates.push(
        path.join(os.homedir(), "Library", "Application Support", "3dmake"),
      );
    }

    return candidates.find((c) => fs.existsSync(c));
  }

  // ── Well-known config file paths ──────────────────────────────────

  getGlobalConfigPath(): string | undefined {
    // 1. Explicit environment override
    const envOverride = process.env["THREEDMAKE_CONFIG_DIR"];
    if (envOverride) {
      const candidate = path.join(envOverride, "defaults.toml");
      return fs.existsSync(candidate) ? candidate : undefined;
    }

    const configDir = this.getConfigDir();
    if (!configDir) {
      return undefined;
    }
    const candidate = path.join(configDir, "defaults.toml");
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

  getPromptFilePath(): string | undefined {
    const configDir = this.getConfigDir();
    if (!configDir) {
      return undefined;
    }
    // The 3dmake CLI stores the custom prompt at CONFIG_DIR/prompt.txt
    const candidate = path.join(configDir, "prompt.txt");
    return fs.existsSync(candidate) ? candidate : undefined;
  }

  getProfilePath(profileName: string): string | undefined {
    const configDir = this.getConfigDir();
    if (!configDir) {
      return undefined;
    }
    const candidate = path.join(configDir, "profiles", `${profileName}.ini`);
    return fs.existsSync(candidate) ? candidate : undefined;
  }

  /**
   * Resolve an overlay file. Overlays may be in:
   *  CONFIG_DIR/overlays/<name>.ini  (generic)
   *  CONFIG_DIR/overlays/<printer>/<name>.ini  (printer-specific)
   */
  getOverlayPath(overlayName: string): string | undefined {
    const configDir = this.getConfigDir();
    if (!configDir) {
      return undefined;
    }
    const overlaysDir = path.join(configDir, "overlays");
    // Generic overlay
    const generic = path.join(overlaysDir, `${overlayName}.ini`);
    if (fs.existsSync(generic)) {
      return generic;
    }
    // Search printer-specific subdirectories
    if (fs.existsSync(overlaysDir)) {
      try {
        for (const entry of fs.readdirSync(overlaysDir, {
          withFileTypes: true,
        })) {
          if (entry.isDirectory()) {
            const specific = path.join(
              overlaysDir,
              entry.name,
              `${overlayName}.ini`,
            );
            if (fs.existsSync(specific)) {
              return specific;
            }
          }
        }
      } catch {
        // ignore read errors
      }
    }
    return undefined;
  }
}
