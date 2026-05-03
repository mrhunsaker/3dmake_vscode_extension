/**
 * CommandRunner
 *
 * Spawns the `3dm` binary as a child process and pipes stdout/stderr
 * to the shared VS Code Output Channel.
 *
 * Accessibility notes:
 *  - The Output Channel is an `aria-live` region in VS Code; screen
 *    readers announce new lines as they arrive.
 *  - On completion, an information or error notification is shown
 *    (configurable) so users not watching the Output panel are informed.
 *  - For informational commands (info, help, version, list-*), the Output
 *    Channel is focused after completion so screen readers read results.
 *  - The working directory is always set to the project directory so
 *    relative paths in 3dm output resolve correctly.
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigManager } from '../utils/ConfigManager';
import { StatusBarManager } from '../utils/StatusBarManager';

interface RunOptions {
  injectGlobalFlags?: boolean;
  includeProjectPathArg?: boolean;
  stdinText?: string;
  /** When true, steal focus into the Output Channel after successful completion
   *  so screen reader users can immediately read the result. Use for
   *  informational commands: info, help, version, list-profiles, etc. */
  focusOutputOnComplete?: boolean;
}

export class CommandRunner {
  constructor(
    private readonly output: vscode.OutputChannel,
    private readonly config: ConfigManager,
    private readonly statusBar: StatusBarManager,
  ) {}

  /**
   * Run a named 3dm subcommand with optional extra flags.
   * Global flags (-m, -v, -p, -o) are prepended automatically from config.
   */
  async run(
    subcommand: string,
    extraArgs: string[] = [],
    options: RunOptions = {},
  ): Promise<void> {
    const injectGlobalFlags = options.injectGlobalFlags ?? false;
    const globalFlags = injectGlobalFlags ? this.config.buildGlobalFlags() : [];
    await this.runRaw([subcommand, ...globalFlags, ...extraArgs], {
      includeProjectPathArg: options.includeProjectPathArg,
      stdinText: options.stdinText,
      focusOutputOnComplete: options.focusOutputOnComplete,
    });
  }

  /**
   * Run with a fully custom argument list (no automatic flag injection).
   */
  async runRaw(args: string[], options: RunOptions = {}): Promise<void> {
    const binary = this.config.getEffectiveBinaryPath();
    const projectPath = this.config.getProjectPath();
    const includeProjectPathArg = options.includeProjectPathArg ?? true;
    const stdinText = options.stdinText;
    const focusOutputOnComplete = options.focusOutputOnComplete ?? false;

    // Determine working directory
    let cwd: string | undefined;
    if (projectPath) {
      cwd = fs.statSync(projectPath).isDirectory()
        ? projectPath
        : path.dirname(projectPath);
    } else {
      cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    // Add project file arg if a specific .scad file is selected
    const allArgs = [...args];
    if (
      includeProjectPathArg &&
      projectPath &&
      !fs.statSync(projectPath).isDirectory() &&
      !allArgs.includes(projectPath) &&
      !allArgs.includes(path.basename(projectPath))
    ) {
      // Keep the selected project file as a positional argument at the end so
      // subcommand flags remain grouped and parser order is predictable.
      allArgs.push(projectPath);
    }

    if (this.config.shouldShowOutputOnRun()) {
      this.output.show(true); // preserveFocus=true so keyboard stays in editor
    }

    const cmdDisplay = `${binary} ${allArgs.join(' ')}`;
    this.output.appendLine('');
    this.output.appendLine(`▶ ${cmdDisplay}`);
    this.output.appendLine(`  cwd: ${cwd ?? '(workspace root)'}`);
    this.output.appendLine('─'.repeat(60));

    return new Promise<void>((resolve) => {
      this.statusBar.setState('running');
      const proc = spawn(binary, allArgs, {
        cwd: cwd,
        env: { ...process.env },
        shell: process.platform === 'win32', // needed on Windows for PATH resolution
      });

      if (typeof stdinText === 'string') {
        proc.stdin.write(stdinText);
        proc.stdin.end();
      }

      proc.stdout.setEncoding('utf8');
      proc.stderr.setEncoding('utf8');

      proc.stdout.on('data', (chunk: string) => {
        for (const line of chunk.split(/\r?\n/)) {
          if (line) {
            this.output.appendLine(line);
          }
        }
        // Track generated artifact paths for follow-up open/view commands.
        this.trackOutputPaths(chunk, cwd);
      });

      proc.stderr.on('data', (chunk: string) => {
        for (const line of chunk.split(/\r?\n/)) {
          if (line) {
            this.output.appendLine(`[stderr] ${line}`);
          }
        }
      });

      proc.on('error', (err) => {
        const msg = err.message.includes('ENOENT')
          ? `3dm binary not found at "${binary}". Use "3DMake: Set 3dm Binary Path" to configure it.`
          : `Failed to start 3dm: ${err.message}`;
        this.output.appendLine(`✖ ${msg}`);
        this.statusBar.setState('error');
        if (this.config.shouldAnnounceCompletion()) {
          void vscode.window.showErrorMessage(`3DMake Error: ${msg}`);
        }
        resolve();
      });

      proc.on('close', (code) => {
        this.output.appendLine('─'.repeat(60));
        this.statusBar.setState(code === 0 ? 'success' : 'error');
        if (code === 0) {
          this.output.appendLine(`✔ ${allArgs[0]} completed successfully.`);
          // Route focus to Output Channel for informational commands so screen
          // readers can immediately read the result without manual navigation.
          if (focusOutputOnComplete) {
            this.output.show(false); // false = steal focus
          }
          if (this.config.shouldAnnounceCompletion()) {
            void vscode.window.showInformationMessage(
              `3DMake: ${allArgs[0]} completed successfully.`,
            );
          }
        } else {
          this.output.appendLine(`✖ ${allArgs[0]} exited with code ${code}.`);
          if (this.config.shouldAnnounceCompletion()) {
            void vscode.window.showErrorMessage(
              `3DMake: ${allArgs[0]} failed (exit ${code}). See Output panel for details.`,
            );
          }
        }
        resolve();
      });
    });
  }

  private trackOutputPaths(chunk: string, cwd?: string): void {
    this.trackExtensionOutput(chunk, 'svg', cwd, (p) =>
      this.config.setLastSvgPath(p),
    );
    this.trackExtensionOutput(chunk, 'stl', cwd, (p) =>
      this.config.setLastStlPath(p),
    );
    this.trackExtensionOutput(chunk, 'gcode', cwd, (p) =>
      this.config.setLastGcodePath(p),
    );
    this.trackImageExportOutput(chunk, cwd);
  }

  private trackExtensionOutput(
    chunk: string,
    extension: string,
    cwd: string | undefined,
    onFound: (resolvedPath: string) => void,
  ): void {
    const escapedExt = extension.replace('.', '\\.');
    const matches = chunk.matchAll(
      new RegExp(`([^\\s'"]+\\.${escapedExt})`, 'gi'),
    );
    for (const match of matches) {
      const resolvedPath = this.resolveExistingOutputPath(match[1], cwd);
      if (resolvedPath) {
        onFound(resolvedPath);
      }
    }
  }

  private resolveExistingOutputPath(
    rawPath: string,
    cwd: string | undefined,
  ): string | undefined {
    const cleanedPath = rawPath.trim();
    if (!cleanedPath) {
      return undefined;
    }

    if (path.isAbsolute(cleanedPath) && fs.existsSync(cleanedPath)) {
      return cleanedPath;
    }

    if (!cwd) {
      return undefined;
    }

    const resolvedFromCwd = path.resolve(cwd, cleanedPath);
    return fs.existsSync(resolvedFromCwd) ? resolvedFromCwd : undefined;
  }

  private trackImageExportOutput(chunk: string, cwd: string | undefined): void {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];
    for (const extension of imageExtensions) {
      this.trackExtensionOutput(chunk, extension, cwd, (p) => {
        this.config.setLastImageExportDir(path.dirname(p));
      });
    }
  }
}
