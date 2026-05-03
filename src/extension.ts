/**
 * 3DMake GUI — VS Code Extension
 * Main activation entry point.
 *
 * Registers all commands, TreeView providers, and status bar items.
 * All user-facing strings include accessible labels; every command
 * that produces output writes to the shared Output Channel so screen
 * readers receive live region announcements via VS Code's built-in
 * accessibility infrastructure.
 *
 * Remediation applied (2026-05-02):
 *  P0-01: image export verb corrected to `image` (was `images`)
 *  P0-02: library verbs corrected to `list-libraries`/`install-libraries`
 *  P0-03: profiles verb corrected to `list-profiles`
 *  P0-04: overlays verb corrected to `list-overlays`
 *  P0-05: non-project commands no longer append project file path
 *  P1-01: informational commands route Output Channel focus on completion
 *  P1-03: orient command now injects global flags
 *  P1-04: edit-overlay command added
 *  P1-05: edit-profile command added
 *  P2-01: new project scaffolding opens main.scad and sets project
 *  P2-03: info interactive mode command added
 *  P2-05: global config not-found warning gains "Run Setup" button
 *  P3-01: edit AI prompt command added
 *  P3-02: orient+slice, preview+slice, build+orient pipeline actions
 *  P3-03: image export now prompts for angles
 *  P3-06: self-update replaced with browser-based update check
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectViewProvider } from './panel/ProjectViewProvider';
import { CommandOptionsProvider } from './panel/CommandOptionsProvider';
import { QuickActionsProvider } from './panel/QuickActionsProvider';
import { SettingsViewProvider } from './panel/SettingsViewProvider';
import { CommandRunner } from './commands/CommandRunner';
import { StlViewerPanel } from './views/StlViewerPanel';
import { SvgViewerPanel } from './views/SvgViewerPanel';
import { StatusBarManager } from './utils/StatusBarManager';
import { ConfigManager } from './utils/ConfigManager';

export function activate(context: vscode.ExtensionContext): void {
  // ── Shared services ──────────────────────────────────────────────
  const outputChannel = vscode.window.createOutputChannel('3DMake');
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
      '3dmake.projectView',
      projectProvider,
    ),
    vscode.window.registerTreeDataProvider(
      '3dmake.commandOptions',
      optionsProvider,
    ),
    vscode.window.registerTreeDataProvider(
      '3dmake.quickActions',
      actionsProvider,
    ),
    vscode.window.registerTreeDataProvider(
      '3dmake.settingsView',
      settingsProvider,
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('3dmake.projectViewFileMode')) {
        projectProvider.refresh();
      }
    }),
  );

  // ── Helper: register a command that calls runner ─────────────────
  function reg<TArgs extends unknown[]>(
    id: string,
    fn: (...args: TArgs) => Promise<void> | void,
  ): void {
    context.subscriptions.push(vscode.commands.registerCommand(id, fn));
  }

  // ── Project / file selection ──────────────────────────────────────
  reg('3dmake.selectProject', async () => {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Project (.scad file or directory)',
      filters: { 'OpenSCAD / Directory': ['scad', ''] },
    });
    if (uris && uris.length > 0) {
      config.setProjectPath(uris[0].fsPath);
      projectProvider.refresh();
      statusBar.update(uris[0].fsPath);
      void vscode.window.showInformationMessage(
        `3DMake: Project set to ${uris[0].fsPath}`,
      );
    }
  });

  reg('3dmake.refreshProjectView', () => projectProvider.refresh());

  reg('3dmake.setOption', async (key: string) => {
    await optionsProvider.editOption(key);
  });

  // ── Helper: open the global defaults.toml in the editor ──────────
  const openGlobalConfigInEditor = async (): Promise<void> => {
    const cfgPath = config.getGlobalConfigPath();
    if (cfgPath) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(cfgPath),
      );
      await vscode.window.showTextDocument(doc);
    } else {
      // P2-05: offer an actionable "Run Setup" button instead of a plain warning
      const action = await vscode.window.showWarningMessage(
        '3DMake: Could not locate defaults.toml. Run 3DMake setup first.',
        'Run Setup',
      );
      if (action === 'Run Setup') {
        void vscode.commands.executeCommand('3dmake.runSetup');
      }
    }
  };

  // ── Helper: open the last generated STL in the viewer ────────────
  const openLastStlIfAvailable = (): void => {
    const stlPath = config.getLastStlPath();
    if (stlPath) {
      StlViewerPanel.createOrShow(context.extensionUri, stlPath);
    }
  };

  // ── Helper: open the last generated gcode in the editor ──────────
  const openLastGcodeIfAvailable = async (): Promise<void> => {
    const gcodePath = config.getLastGcodePath();
    if (!gcodePath) {
      return;
    }
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(gcodePath),
    );
    await vscode.window.showTextDocument(doc);
  };

  // ── Core build/process commands ───────────────────────────────────
  reg('3dmake.runBuild', async () => {
    config.setLastStlPath(undefined);
    await runner.run('build', [], { injectGlobalFlags: true });
    openLastStlIfAvailable();
  });

  reg('3dmake.runSlice', async () => {
    config.setLastGcodePath(undefined);
    await runner.run('slice', [], { injectGlobalFlags: true });
    await openLastGcodeIfAvailable();
  });

  // P1-03: orient now injects global flags so -m model selection works
  reg('3dmake.runOrient', () =>
    runner.run('orient', [], { injectGlobalFlags: true }),
  );

  reg('3dmake.runPreview', async () => {
    await runner.run('preview', [], { injectGlobalFlags: true });
    const svgPath = config.getLastSvgPath();
    if (svgPath) {
      try {
        SvgViewerPanel.createOrShow(context.extensionUri, svgPath);
      } catch {
        // Keep command completion behavior intact even if viewer render fails.
      }
    }
  });

  reg('3dmake.runBuildSlice', async () => {
    config.setLastStlPath(undefined);
    await runner.run('build', ['slice'], { injectGlobalFlags: true });
    openLastStlIfAvailable();
  });

  // P3-02: build + orient pipeline
  reg('3dmake.runBuildOrient', async () => {
    config.setLastStlPath(undefined);
    await runner.run('build', ['orient'], { injectGlobalFlags: true });
    openLastStlIfAvailable();
  });

  // P3-02: orient + slice pipeline
  reg('3dmake.runOrientSlice', async () => {
    config.setLastGcodePath(undefined);
    await runner.run('orient', ['slice'], { injectGlobalFlags: true });
    await openLastGcodeIfAvailable();
  });

  // P3-02: preview + slice pipeline (print the silhouette preview)
  reg('3dmake.runPreviewSlice', async () => {
    config.setLastGcodePath(undefined);
    await runner.run('preview', ['slice'], { injectGlobalFlags: true });
    await openLastGcodeIfAvailable();
  });

  reg('3dmake.runFullPipeline', async () => {
    config.setLastStlPath(undefined);
    await runner.run('build', ['orient', 'slice'], {
      injectGlobalFlags: true,
    });
    openLastStlIfAvailable();
  });

  // P1-01: info routes Output Channel focus on completion
  // P0-05: no project path appended
  reg('3dmake.runInfo', () =>
    runner.run('info', [], {
      includeProjectPathArg: false,
      focusOutputOnComplete: true,
    }),
  );

  // P2-03: interactive info mode (-i flag)
  reg('3dmake.runInfoInteractive', async () => {
    // VS Code extension host cannot provide a real TTY. Warn the user if
    // interactive mode requires keyboard input beyond what stdin can provide.
    const proceed = await vscode.window.showInformationMessage(
      'Interactive mode sends -i to 3dm info. If the AI asks follow-up questions, responses cannot be typed in the extension. For a full interactive session, use the integrated terminal. Continue anyway?',
      'Continue',
      'Open Terminal',
    );
    if (proceed === 'Open Terminal') {
      void vscode.commands.executeCommand('workbench.action.terminal.new');
      return;
    }
    if (proceed !== 'Continue') {
      return;
    }
    await runner.run('info', ['-i'], {
      includeProjectPathArg: false,
      focusOutputOnComplete: true,
    });
  });

  reg('3dmake.runPrint', () =>
    runner.run('print', [], { injectGlobalFlags: true }),
  );

  reg('3dmake.runEditModel', async (_resource?: vscode.Uri) => {
    const openInEditor = async (scadPath: string): Promise<void> => {
      await vscode.commands.executeCommand(
        'vscode.open',
        vscode.Uri.file(scadPath),
      );
    };

    const projectPath = config.getProjectPath();
    const projectRoot = projectPath
      ? fs.statSync(projectPath).isDirectory()
        ? projectPath
        : path.dirname(projectPath)
      : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!projectRoot) {
      void vscode.window.showWarningMessage(
        '3DMake: No project selected. Run "Select Project" first.',
      );
      return;
    }

    const srcDir = path.join(projectRoot, 'src');
    let scadFiles: string[] = [];

    try {
      scadFiles = fs
        .readdirSync(srcDir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() && entry.name.toLowerCase().endsWith('.scad'),
        )
        .map((entry) => path.join(srcDir, entry.name));
    } catch {
      // If src/ cannot be read, fall through to the warning below.
    }

    if (scadFiles.length === 0) {
      void vscode.window.showWarningMessage(
        `3DMake: No .scad file found in ${srcDir}.`,
      );
      return;
    }

    const mainScad = scadFiles.find(
      (filePath) => path.basename(filePath).toLowerCase() === 'main.scad',
    );
    if (mainScad) {
      await openInEditor(mainScad);
      return;
    }

    if (scadFiles.length === 1) {
      await openInEditor(scadFiles[0]);
      return;
    }

    const picked = await vscode.window.showQuickPick(
      scadFiles.map((filePath) => ({
        label: path.basename(filePath),
        description: filePath,
        filePath,
      })),
      {
        title: 'Select OpenSCAD source file',
        placeHolder: 'Choose a .scad file from the project src folder',
      },
    );

    if (picked?.filePath) {
      await openInEditor(picked.filePath);
    }
  });

  // P0-01: corrected verb `image` (was `images`)
  // P3-03: prompt for angles before running
  reg('3dmake.runImageExport', async () => {
    const ANGLES = [
      'front',
      'back',
      'left',
      'right',
      'top',
      'bottom',
      'above_front',
      'above_front_left',
      'above_front_right',
      'above_back_left',
      'above_back_right',
    ];
    const DEFAULT_ANGLES = new Set([
      'above_front_left',
      'above_front',
      'above_front_right',
    ]);

    const picked = await vscode.window.showQuickPick(
      ANGLES.map((a) => ({
        label: a,
        picked: DEFAULT_ANGLES.has(a),
      })),
      {
        canPickMany: true,
        title: 'Select image angles to export',
        placeHolder: 'Default: above_front_left, above_front, above_front_right',
      },
    );

    if (picked === undefined) {
      return; // cancelled
    }

    const selectedAngles = picked.map((p) => p.label);
    // Fall back to default angles if nothing selected
    const anglesForCli =
      selectedAngles.length > 0
        ? selectedAngles
        : ['above_front_left', 'above_front', 'above_front_right'];
    const angleArgs = anglesForCli.flatMap((a) => ['-a', a]);

    config.setLastImageExportDir(undefined);
    // P0-05: image does not take a project path positional arg
    await runner.run('image', angleArgs, { includeProjectPathArg: false });

    const exportDir = config.getLastImageExportDir();
    if (!exportDir) {
      return;
    }

    const exportUri = vscode.Uri.file(exportDir);
    try {
      await vscode.commands.executeCommand('revealInExplorer', exportUri);
    } catch {
      await vscode.commands.executeCommand('revealFileInOS', exportUri);
    }
  });

  // ── Project scaffolding ───────────────────────────────────────────
  reg('3dmake.runNew', async () => {
    const name = await vscode.window.showInputBox({
      prompt: 'New project directory name (leave blank for current directory)',
      placeHolder: 'my-part',
    });
    if (name !== undefined) {
      const rawValue = name.trim();
      if (!rawValue) {
        await runner.run('new', [], {
          injectGlobalFlags: false,
          includeProjectPathArg: false,
        });
        return;
      }

      const home =
        process.env.USERPROFILE ??
        process.env.HOME ??
        (process.env.HOMEDRIVE && process.env.HOMEPATH
          ? `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`
          : '');

      let normalized = rawValue;
      if (home) {
        normalized = normalized.replace(/^~(?=$|[\\/])/, home);
        normalized = normalized.replace(/^\$HOME(?=$|[\\/])/, home);
        normalized = normalized.replace(/^\$\{HOME\}(?=$|[\\/])/, home);
      }
      normalized = normalized.replace(
        /%USERPROFILE%/gi,
        process.env.USERPROFILE ?? '',
      );

      await runner.run('new', [path.normalize(normalized)], {
        injectGlobalFlags: false,
        includeProjectPathArg: false,
      });

      // P2-01: set the new project as active and offer to open main.scad
      const workspaceRoot =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const newProjectDir = path.isAbsolute(normalized)
        ? normalized
        : workspaceRoot
          ? path.join(workspaceRoot, normalized)
          : undefined;

      if (newProjectDir && fs.existsSync(newProjectDir)) {
        config.setProjectPath(newProjectDir);
        projectProvider.refresh();
        statusBar.update(newProjectDir);

        const mainScad = path.join(newProjectDir, 'src', 'main.scad');
        if (fs.existsSync(mainScad)) {
          const open = await vscode.window.showInformationMessage(
            `Project '${rawValue}' created. Open src/main.scad?`,
            'Open',
            'Not now',
          );
          if (open === 'Open') {
            const doc = await vscode.workspace.openTextDocument(
              vscode.Uri.file(mainScad),
            );
            await vscode.window.showTextDocument(doc);
          }
        }
      }
    }
  });

  // ── Tooling / environment commands ───────────────────────────────
  // P0-05: setup does not append project path
  reg('3dmake.runSetup', async () => {
    await runner.run('setup', [], { includeProjectPathArg: false });
    await openGlobalConfigInEditor();
  });

  // P0-02: corrected verb `list-libraries` (was `libraries --list`)
  // P0-05 + P1-01: no project path, focus output on complete
  reg('3dmake.runListLibraries', () =>
    runner.run('list-libraries', [], {
      includeProjectPathArg: false,
      focusOutputOnComplete: true,
    }),
  );

  // P0-02: corrected verb `install-libraries` (was `libraries --install`)
  reg('3dmake.runInstallLibraries', () =>
    runner.run('install-libraries', [], { includeProjectPathArg: false }),
  );

  // P0-03: corrected verb `list-profiles` (was `profiles`)
  // P0-05 + P1-01: no project path, focus output on complete
  reg('3dmake.runListProfiles', () =>
    runner.run('list-profiles', [], {
      includeProjectPathArg: false,
      focusOutputOnComplete: true,
    }),
  );

  // P0-04: corrected verb `list-overlays` (was `overlays`)
  // P0-05 + P1-01: no project path, focus output on complete
  reg('3dmake.runListOverlays', () =>
    runner.run('list-overlays', [], {
      includeProjectPathArg: false,
      focusOutputOnComplete: true,
    }),
  );

  // P0-05 + P1-01: no project path, focus output on complete
  reg('3dmake.runVersion', () =>
    runner.run('version', [], {
      includeProjectPathArg: false,
      focusOutputOnComplete: true,
    }),
  );

  // P0-05 + P1-01: no project path, focus output on complete
  reg('3dmake.runHelp', () =>
    runner.run('help', [], {
      includeProjectPathArg: false,
      focusOutputOnComplete: true,
    }),
  );

  // P3-06: self-update replaced with browser-based update check
  reg('3dmake.checkForUpdates', async () => {
    await vscode.env.openExternal(
      vscode.Uri.parse('https://github.com/tdeck/3dmake/releases/latest'),
    );
  });

  // ── Custom / freeform command ─────────────────────────────────────
  reg('3dmake.runCustomCommand', async () => {
    const raw = await vscode.window.showInputBox({
      prompt: '3dm arguments (everything after "3dm")',
      placeHolder: 'build -m cap slice',
    });
    if (raw !== undefined) {
      const parts = raw.trim().split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        await runner.runRaw(parts);
      }
    }
  });

  // ── Viewer commands ───────────────────────────────────────────────
  reg('3dmake.viewStl', async (stlPath?: string) => {
    const activeFile = vscode.window.activeTextEditor?.document.uri.fsPath;
    let resolvedStlPath: string | undefined = stlPath?.trim();

    if (!resolvedStlPath && activeFile?.toLowerCase().endsWith('.stl')) {
      resolvedStlPath = activeFile;
    } else if (!resolvedStlPath) {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: false,
        openLabel: 'Open STL file',
        filters: { 'STL Files': ['stl'] },
      });
      resolvedStlPath = uris?.[0]?.fsPath;
    }

    if (resolvedStlPath) {
      StlViewerPanel.createOrShow(context.extensionUri, resolvedStlPath);
    }
  });

  reg('3dmake.viewLastSvg', (svgPath?: string) => {
    const resolvedSvgPath = svgPath?.trim() || config.getLastSvgPath();
    if (resolvedSvgPath) {
      SvgViewerPanel.createOrShow(context.extensionUri, resolvedSvgPath);
    } else {
      void vscode.window.showWarningMessage(
        '3DMake: No SVG preview available yet. Run Preview first.',
      );
    }
  });

  // ── Settings/config commands ──────────────────────────────────────
  reg('3dmake.set3dmPath', async () => {
    const current = config.getBinaryPath();
    const value = await vscode.window.showInputBox({
      prompt: 'Full path to the 3dm binary (leave empty to use PATH)',
      value: current,
      placeHolder: '/usr/local/bin/3dm',
    });
    if (value !== undefined) {
      await config.setBinaryPath(value);
      void vscode.window.showInformationMessage(
        `3DMake: Binary path set to "${value || 'auto-detect'}"`,
      );
    }
  });

  reg('3dmake.openGlobalConfig', async () => {
    await openGlobalConfigInEditor();
  });

  reg('3dmake.openProjectConfig', async () => {
    const cfgPath = config.getProjectConfigPath();
    if (cfgPath) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(cfgPath),
      );
      await vscode.window.showTextDocument(doc);
    } else {
      void vscode.window.showWarningMessage(
        '3DMake: No 3dmake.toml found in the current project directory.',
      );
    }
  });

  // P1-04: Edit Overlay command
  reg('3dmake.editOverlay', async () => {
    const name = await vscode.window.showInputBox({
      prompt: 'Overlay name (leave blank to list available overlays)',
      placeHolder: 'supports',
    });
    if (name === undefined) {
      return; // cancelled
    }
    if (!name.trim()) {
      void vscode.commands.executeCommand('3dmake.runListOverlays');
      return;
    }

    const overlayPath = config.getOverlayPath(name.trim());
    if (overlayPath) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(overlayPath),
      );
      await vscode.window.showTextDocument(doc);
    } else {
      // Run CLI to create the overlay file, then open it
      await runner.run('edit-overlay', ['-o', name.trim()], {
        includeProjectPathArg: false,
      });
      // Re-check for the file after the CLI may have created it
      const createdPath = config.getOverlayPath(name.trim());
      if (createdPath) {
        const doc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(createdPath),
        );
        await vscode.window.showTextDocument(doc);
      } else {
        void vscode.window.showWarningMessage(
          `3DMake: Overlay '${name.trim()}' not found after creation attempt. Check the Output Channel for details.`,
        );
      }
    }
  });

  // P1-05: Edit Profile command
  reg('3dmake.editProfile', async () => {
    const name = await vscode.window.showInputBox({
      prompt: 'Profile name (leave blank to list available profiles)',
      placeHolder: 'prusa_MK4',
    });
    if (name === undefined) {
      return; // cancelled
    }
    if (!name.trim()) {
      void vscode.commands.executeCommand('3dmake.runListProfiles');
      return;
    }

    const profilePath = config.getProfilePath(name.trim());
    if (profilePath) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(profilePath),
      );
      await vscode.window.showTextDocument(doc);
    } else {
      const configDir = config.getConfigDir();
      const expectedPath = configDir
        ? path.join(configDir, 'profiles', `${name.trim()}.ini`)
        : `<config dir>/profiles/${name.trim()}.ini`;
      void vscode.window.showWarningMessage(
        `3DMake: Profile '${name.trim()}' not found at ${expectedPath}. Run 'List Profiles' to see available profiles.`,
      );
    }
  });

  // P3-01: Edit AI Prompt command
  reg('3dmake.editPrompt', async () => {
    const existingPath = config.getPromptFilePath();
    if (existingPath) {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(existingPath),
      );
      await vscode.window.showTextDocument(doc);
    } else {
      // Run the CLI to create the default prompt file
      await runner.run('edit-prompt', [], { includeProjectPathArg: false });
      // Re-check after CLI may have created it
      const createdPath = config.getPromptFilePath();
      if (createdPath) {
        const doc = await vscode.workspace.openTextDocument(
          vscode.Uri.file(createdPath),
        );
        await vscode.window.showTextDocument(doc);
      } else {
        void vscode.window.showWarningMessage(
          '3DMake: Could not locate prompt file after creation attempt. Check the Output Channel for details.',
        );
      }
    }
  });

  // ── Output channel initial greeting ──────────────────────────────
  outputChannel.appendLine('3DMake GUI extension activated.');
  outputChannel.appendLine(
    `Binary: ${config.getBinaryPath() || '(auto-detect from PATH)'}`,
  );

  void vscode.window.showInformationMessage(
    '3DMake GUI ready. Use the activity bar panel or Command Palette (Ctrl+Shift+P) to get started.',
  );
}

export function deactivate(): void {
  // Nothing to clean up — VS Code disposes subscriptions automatically.
}
