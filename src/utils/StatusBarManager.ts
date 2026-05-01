/**
 * StatusBarManager
 *
 * Manages the status bar item that shows the currently selected project
 * and the state of a running 3dm command (idle / running / success / error).
 * The status bar item is for sighted convenience only; all meaningful state
 * changes are also announced via the Output Channel and notification toasts.
 */

import * as vscode from 'vscode';
import * as path from 'path';

export type RunState = 'idle' | 'running' | 'success' | 'error';

export class StatusBarManager {
  private readonly item: vscode.StatusBarItem;
  private projectPath: string | undefined;
  private state: RunState = 'idle';

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.item.command = '3dmake.selectProject';
    this.item.accessibilityInformation = {
      label: '3DMake: No project selected. Activate to select a project.',
      role: 'button',
    };
    this.item.tooltip = 'Click to select a 3DMake project file or directory';
    this.render();
    this.item.show();
    context.subscriptions.push(this.item);
  }

  update(projectPath: string): void {
    this.projectPath = projectPath;
    this.render();
  }

  setState(state: RunState): void {
    this.state = state;
    this.render();
  }

  private render(): void {
    const name = this.projectPath ? path.basename(this.projectPath) : 'No project';

    const icons: Record<RunState, string> = {
      idle: '$(file-code)',
      running: '$(sync~spin)',
      success: '$(check)',
      error: '$(error)',
    };

    const labels: Record<RunState, string> = {
      idle: name,
      running: `Running… ${name}`,
      success: `Done — ${name}`,
      error: `Error — ${name}`,
    };

    this.item.text = `${icons[this.state]} 3DMake: ${labels[this.state]}`;
    this.item.accessibilityInformation = {
      label: `3DMake status: ${labels[this.state]}`,
      role: 'button',
    };
  }
}
