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
 *  - The working directory is always set to the project directory so
 *    relative paths in 3dm output resolve correctly.
 */

import * as vscode from "vscode";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { ConfigManager } from "../utils/ConfigManager";
import { StatusBarManager } from "../utils/StatusBarManager";

interface RunOptions {
  injectGlobalFlags?: boolean;
  includeProjectPathArg?: boolean;
  stdinText?: string;
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
    const includeProjectPathArg = options.includeProjectPathArg ?? true;
    const stdinText = options.stdinText;
    const globalFlags = injectGlobalFlags ? this.config.buildGlobalFlags() : [];
    await this.runRaw([subcommand, ...globalFlags, ...extraArgs], {
      includeProjectPathArg,
      stdinText,
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

    const cmdDisplay = `${binary} ${allArgs.join(" ")}`;
    this.output.appendLine("");
    this.output.appendLine(`▶ ${cmdDisplay}`);
    this.output.appendLine(`  cwd: ${cwd ?? "(workspace root)"}`);
    this.output.appendLine("─".repeat(60));

    return new Promise<void>((resolve) => {
      this.statusBar.setState("running");
      const proc = spawn(binary, allArgs, {
        cwd: cwd,
        env: { ...process.env },
        shell: process.platform === "win32", // needed on Windows for PATH resolution
      });

      if (typeof stdinText === "string") {
        proc.stdin.write(stdinText);
        proc.stdin.end();
      }

      proc.stdout.setEncoding("utf8");
      proc.stderr.setEncoding("utf8");

      proc.stdout.on("data", (chunk: string) => {
        for (const line of chunk.split(/\r?\n/)) {
          if (line) {
            this.output.appendLine(line);
          }
        }
        // Track SVG paths for the viewer command
        this.trackSvgOutput(chunk);
      });

      proc.stderr.on("data", (chunk: string) => {
        for (const line of chunk.split(/\r?\n/)) {
          if (line) {
            this.output.appendLine(`[stderr] ${line}`);
          }
        }
      });

      proc.on("error", (err) => {
        const msg = err.message.includes("ENOENT")
          ? `3dm binary not found at "${binary}". Use "3DMake: Set 3dm Binary Path" to configure it.`
          : `Failed to start 3dm: ${err.message}`;
        this.output.appendLine(`✖ ${msg}`);
        this.statusBar.setState("error");
        if (this.config.shouldAnnounceCompletion()) {
          vscode.window.showErrorMessage(`3DMake Error: ${msg}`);
        }
        resolve();
      });

      proc.on("close", (code) => {
        this.output.appendLine("─".repeat(60));
        this.statusBar.setState(code === 0 ? "success" : "error");
        if (code === 0) {
          this.output.appendLine(`✔ ${allArgs[0]} completed successfully.`);
          if (this.config.shouldAnnounceCompletion()) {
            vscode.window.showInformationMessage(
              `3DMake: ${allArgs[0]} completed successfully.`,
            );
          }
        } else {
          this.output.appendLine(`✖ ${allArgs[0]} exited with code ${code}.`);
          if (this.config.shouldAnnounceCompletion()) {
            vscode.window.showErrorMessage(
              `3DMake: ${allArgs[0]} failed (exit ${code}). See Output panel for details.`,
            );
          }
        }
        resolve();
      });
    });
  }

  // ── SVG detection ─────────────────────────────────────────────────
  private trackSvgOutput(chunk: string): void {
    const matches = chunk.matchAll(/([^\s'\"]+\.svg)/gi);
    for (const match of matches) {
      const svgPath = match[1];
      if (fs.existsSync(svgPath)) {
        this.config.setLastSvgPath(svgPath);
      }
    }
  }
}
