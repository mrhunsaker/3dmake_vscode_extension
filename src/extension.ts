/**
 * 3DMake GUI — VS Code Extension
 * Main activation entry point.
 *
 * Registers all commands, TreeView providers, and status bar items.
 * All user-facing strings include accessible labels; every command
 * that produces output writes to the shared Output Channel so screen
 * readers receive live region announcements via VS Code's built-in
 * accessibility infrastructure.
 */

import * as vscode from "vscode";
import { ProjectViewProvider } from "./panel/ProjectViewProvider";
import { CommandOptionsProvider } from "./panel/CommandOptionsProvider";
import { QuickActionsProvider } from "./panel/QuickActionsProvider";
import { SettingsViewProvider } from "./panel/SettingsViewProvider";
import { CommandRunner } from "./commands/CommandRunner";
import { StlViewerPanel } from "./views/StlViewerPanel";
import { SvgViewerPanel } from "./views/SvgViewerPanel";
import { StatusBarManager } from "./utils/StatusBarManager";
import { ConfigManager } from "./utils/ConfigManager";

export function activate(context: vscode.ExtensionContext): void {
  // ── Shared services ──────────────────────────────────────────────
  const outputChannel = vscode.window.createOutputChannel("3DMake");
  const config = new ConfigManager();
  const statusBar = new StatusBarManager(context);
  const runner = new CommandRunner(outputChannel, config, statusBar);

  // ── Tree view providers ──────────────────────────────────────────
  const projectProvider = new ProjectViewProvider(context, config);
  const optionsProvider = new CommandOptionsProvider(context, config);
  const actionsProvider = new QuickActionsProvider(context);
  const settingsProvider = new SettingsViewProvider(context, config);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "3dmake.projectView",
      projectProvider,
    ),
    vscode.window.registerTreeDataProvider(
      "3dmake.commandOptions",
      optionsProvider,
    ),
    vscode.window.registerTreeDataProvider(
      "3dmake.quickActions",
      actionsProvider,
    ),
    vscode.window.registerTreeDataProvider(
      "3dmake.settingsView",
      settingsProvider,
    ),
  );

  // ── Helper: register a command that calls runner ─────────────────
  function reg<TArgs extends unknown[]>(
    id: string,
    fn: (...args: TArgs) => Promise<void> | void,
  ): void {
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));
  }

  // ── Project / file selection ──────────────────────────────────────
  reg("3dmake.selectProject", async () => {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Select Project (.scad file or directory)",
      filters: { "OpenSCAD / Directory": ["scad", ""] },
    });
    if (uris && uris.length > 0) {
      config.setProjectPath(uris[0].fsPath);
      projectProvider.refresh();
      statusBar.update(uris[0].fsPath);
      vscode.window.showInformationMessage(
        `3DMake: Project set to ${uris[0].fsPath}`,
      );
    }
  });

  reg("3dmake.refreshProjectView", () => projectProvider.refresh());

  reg("3dmake.setOption", async (key: string) => {
    await optionsProvider.editOption(key);
  });

  // ── Core build/process commands ───────────────────────────────────
  reg("3dmake.runBuild", () =>
    runner.run("build", [], { injectGlobalFlags: true }),
  );
  reg("3dmake.runSlice", () =>
    runner.run("slice", [], { injectGlobalFlags: true }),
  );
  reg("3dmake.runOrient", () => runner.run("orient"));
  reg("3dmake.runPreview", async () => {
    await runner.run("preview", [], { injectGlobalFlags: true });
    const svgPath = config.getLastSvgPath();
    if (svgPath) {
      try {
        SvgViewerPanel.createOrShow(context.extensionUri, svgPath);
      } catch {
        // Keep command completion behavior intact even if viewer render fails.
      }
    }
  });
  reg("3dmake.runBuildSlice", () =>
    runner.run("build", ["--slice"], { injectGlobalFlags: true }),
  );
  reg("3dmake.runFullPipeline", () =>
    runner.run("build", ["--orient", "--slice"], { injectGlobalFlags: true }),
  );
  reg("3dmake.runInfo", () => runner.run("info"));
  reg("3dmake.runPrint", () => runner.run("print"));
  reg("3dmake.runImageExport", () => runner.run("images"));

  // ── Project scaffolding ───────────────────────────────────────────
  reg("3dmake.runNew", async () => {
    const name = await vscode.window.showInputBox({
      prompt: "New project name",
      placeHolder: "my-part",
      validateInput: (v) => (v.trim() === "" ? "Name cannot be empty" : null),
    });
    if (name) {
      await runner.run("new", [name], {
        injectGlobalFlags: false,
        includeProjectPathArg: false,
      });
    }
  });

  // ── Tooling / environment commands ───────────────────────────────
  reg("3dmake.runSetup", () => runner.run("setup"));
  reg("3dmake.runListLibraries", () => runner.run("libraries", ["--list"]));
  reg("3dmake.runInstallLibraries", () =>
    runner.run("libraries", ["--install"]),
  );
  reg("3dmake.runListProfiles", () => runner.run("profiles"));
  reg("3dmake.runListOverlays", () => runner.run("overlays"));
  reg("3dmake.runVersion", () => runner.run("version"));
  reg("3dmake.runSelfUpdate", () => runner.run("self-update"));
  reg("3dmake.runHelp", () => runner.run("help"));

  // ── Custom / freeform command ─────────────────────────────────────
  reg("3dmake.runCustomCommand", async () => {
    const raw = await vscode.window.showInputBox({
      prompt: '3dm arguments (everything after "3dm")',
      placeHolder: "build -m cap --slice",
    });
    if (raw !== undefined) {
      const parts = raw.trim().split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        await runner.runRaw(parts);
      }
    }
  });

  // ── Viewer commands ───────────────────────────────────────────────
  reg("3dmake.viewStl", async (stlPath?: string) => {
    // If a .stl file is active in the editor, use it; otherwise ask
    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    let resolvedStlPath: string | undefined = stlPath?.trim();

    if (!resolvedStlPath && activeFile?.toLowerCase().endsWith(".stl")) {
      resolvedStlPath = activeFile;
    } else if (!resolvedStlPath) {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        openLabel: "Open STL file",
        filters: { "STL Files": ["stl"] },
      });
      resolvedStlPath = uris?.[0]?.fsPath;
    }

    if (resolvedStlPath) {
      StlViewerPanel.createOrShow(context.extensionUri, resolvedStlPath);
    }
  });

  reg("3dmake.viewLastSvg", (svgPath?: string) => {
    const resolvedSvgPath = svgPath?.trim() || config.getLastSvgPath();
    if (resolvedSvgPath) {
      SvgViewerPanel.createOrShow(context.extensionUri, resolvedSvgPath);
    } else {
      vscode.window.showWarningMessage(
        "3DMake: No SVG preview available yet. Run Preview first.",
      );
    }
  });

  // ── Settings/config commands ──────────────────────────────────────
  reg("3dmake.set3dmPath", async () => {
    const current = config.getBinaryPath();
    const value = await vscode.window.showInputBox({
      prompt: "Full path to the 3dm binary (leave empty to use PATH)",
      value: current,
      placeHolder: "/usr/local/bin/3dm",
    });
    if (value !== undefined) {
      await config.setBinaryPath(value);
      vscode.window.showInformationMessage(
        `3DMake: Binary path set to "${value || "auto-detect"}"`,
      );
    }
  });

  reg("3dmake.openGlobalConfig", async () => {
    const cfgPath = config.getGlobalConfigPath();
    if (cfgPath) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(cfgPath),
      );
      await vscode.window.showTextDocument(doc);
    } else {
      vscode.window.showWarningMessage(
        "3DMake: Could not locate defaults.toml. Run Setup first.",
      );
    }
  });

  reg("3dmake.openProjectConfig", async () => {
    const cfgPath = config.getProjectConfigPath();
    if (cfgPath) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(cfgPath),
      );
      await vscode.window.showTextDocument(doc);
    } else {
      vscode.window.showWarningMessage(
        "3DMake: No 3dmake.toml found in the current project directory.",
      );
    }
  });

  // ── Output channel initial greeting ──────────────────────────────
  outputChannel.appendLine("3DMake GUI extension activated.");
  outputChannel.appendLine(
    `Binary: ${config.getBinaryPath() || "(auto-detect from PATH)"}`,
  );

  vscode.window.showInformationMessage(
    "3DMake GUI ready. Use the activity bar panel or Command Palette (Ctrl+Shift+P) to get started.",
  );
}

export function deactivate(): void {
  // Nothing to clean up — VS Code disposes subscriptions automatically.
}
