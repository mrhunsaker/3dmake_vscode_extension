/**
 * CommandOptionsProvider
 *
 * Populates the "Command Options" tree view.  Each item is an editable
 * option (model, view, profile, overlay, scale, copies) that maps to a
 * 3dm CLI flag.
 *
 * Clicking an item opens an InputBox so keyboard-only / screen reader
 * users can set the value without leaving the keyboard.
 */

import * as vscode from 'vscode';
import { ConfigManager } from '../utils/ConfigManager';

export class OptionItem extends vscode.TreeItem {
  constructor(
    public readonly optionKey: string,
    public readonly displayLabel: string,
    public readonly currentValue: string,
    public readonly cliFlag: string,
    public readonly description: string,
  ) {
    super(displayLabel, vscode.TreeItemCollapsibleState.None);

    this.description = currentValue
      ? `${cliFlag} ${currentValue}`
      : '(default)';
    this.tooltip = `${description}\nCurrent: ${currentValue || '(using default)'}`;
    this.iconPath = new vscode.ThemeIcon('edit');
    this.command = {
      command: '3dmake.setOption',
      title: `Set ${displayLabel}`,
      arguments: [optionKey],
    };
    this.accessibilityInformation = {
      label: `${displayLabel}, ${cliFlag} flag, current value: ${currentValue || 'default'}. Activate to edit.`,
      role: 'treeitem',
    };
  }
}

export class CommandOptionsProvider
  implements vscode.TreeDataProvider<OptionItem>
{
  private _onDidChange = new vscode.EventEmitter<
    OptionItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly config: ConfigManager,
  ) {}

  refresh(): void {
    this._onDidChange.fire();
  }

  getTreeItem(element: OptionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): OptionItem[] {
    const copiesVal = this.config.getCopiesOverride();
    return [
      new OptionItem(
        'model',
        'Model (-m)',
        this.config.getModelOverride() ?? this.config.getDefaultModel(),
        '-m',
        'Target model name inside the .scad file.',
      ),
      new OptionItem(
        'view',
        'View (-v)',
        this.config.getViewOverride() ?? this.config.getDefaultView(),
        '-v',
        'Silhouette view: 3sil, frontsil, backsil, leftsil, rightsil, topsil.',
      ),
      new OptionItem(
        'profile',
        'Profile (-p)',
        this.config.getProfileOverride() ?? this.config.getDefaultProfile(),
        '-p',
        'Slicer profile name.',
      ),
      new OptionItem(
        'overlay',
        'Overlay (-o)',
        this.config.getOverlayOverride() ?? '',
        '-o',
        'Overlay name to apply during build.',
      ),
      new OptionItem(
        'scale',
        'Scale (-s)',
        this.config.getScaleOverride() ?? '',
        '-s',
        'Uniform scale factor when slicing (e.g. 1.05) or "auto".',
      ),
      new OptionItem(
        'copies',
        'Copies (-c)',
        copiesVal !== undefined ? String(copiesVal) : '',
        '-c',
        'Number of copies of the model to create when slicing.',
      ),
    ];
  }

  public async editOption(key: string): Promise<void> {
    const labels: Record<string, string> = {
      model: 'Model name (-m)',
      view: 'View (-v) e.g. 3sil, frontsil',
      profile: 'Slicer profile (-p)',
      overlay: 'Overlay (-o)',
      scale: 'Scale (-s) — numeric (e.g. 1.05) or "auto"',
      copies: 'Copies (-c) — positive integer',
    };

    const copiesVal = this.config.getCopiesOverride();
    const current: Record<string, string | undefined> = {
      model: this.config.getModelOverride() ?? this.config.getDefaultModel(),
      view: this.config.getViewOverride() ?? this.config.getDefaultView(),
      profile:
        this.config.getProfileOverride() ?? this.config.getDefaultProfile(),
      overlay: this.config.getOverlayOverride(),
      scale: this.config.getScaleOverride(),
      copies: copiesVal !== undefined ? String(copiesVal) : '',
    };

    const value = await vscode.window.showInputBox({
      prompt: labels[key] ?? key,
      value: current[key] ?? '',
      placeHolder: 'Leave empty to use default',
    });

    if (value === undefined) {
      return;
    } // cancelled

    switch (key) {
      case 'model':
        this.config.setModelOverride(value || undefined);
        break;
      case 'view':
        this.config.setViewOverride(value || undefined);
        break;
      case 'profile':
        this.config.setProfileOverride(value || undefined);
        break;
      case 'overlay':
        this.config.setOverlayOverride(value || undefined);
        break;
      case 'scale':
        this.config.setScaleOverride(value || undefined);
        break;
      case 'copies': {
        if (!value) {
          this.config.setCopiesOverride(undefined);
        } else {
          const n = parseInt(value, 10);
          if (isNaN(n) || n < 1) {
            void vscode.window.showWarningMessage(
              '3DMake: Copies must be a positive integer.',
            );
            return;
          }
          this.config.setCopiesOverride(n);
        }
        break;
      }
    }

    this.refresh();
  }
}
