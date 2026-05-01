/**
 * QuickActionsProvider
 *
 * Populates the "Quick Actions" tree view with the most common 3dm
 * commands as clickable tree items.
 *
 * Each item carries a full accessibilityInformation label describing
 * what the action does and the keyboard shortcut where applicable.
 */

import * as vscode from "vscode";

interface ActionDef {
  label: string;
  command: string;
  icon: string;
  a11yLabel: string;
  shortcut?: string;
}

const ACTIONS: ActionDef[] = [
  {
    label: "New Project",
    command: "3dmake.runNew",
    icon: "new-folder",
    a11yLabel: "Scaffold a new 3DMake project.",
  },
  {
    label: "Select Project",
    command: "3dmake.selectProject",
    icon: "folder-opened",
    a11yLabel:
      "Select project file or directory. Keyboard shortcut: Ctrl+Alt+O.",
    shortcut: "Ctrl+Alt+O",
  },
  {
    label: "Build STL",
    command: "3dmake.runBuild",
    icon: "play",
    a11yLabel:
      "Build STL from the current OpenSCAD project. Keyboard shortcut: Ctrl+Alt+B.",
    shortcut: "Ctrl+Alt+B",
  },
  {
    label: "Slice",
    command: "3dmake.runSlice",
    icon: "layers",
    a11yLabel: "Slice the built STL with the configured slicer profile.",
  },
  {
    label: "Orient",
    command: "3dmake.runOrient",
    icon: "arrow-swap",
    a11yLabel: "Auto-orient the STL for optimal print bed placement.",
  },
  {
    label: "Preview (SVG)",
    command: "3dmake.runPreview",
    icon: "eye",
    a11yLabel:
      "Generate an SVG silhouette preview. Keyboard shortcut: Ctrl+Alt+P.",
    shortcut: "Ctrl+Alt+P",
  },
  {
    label: "Build + Slice",
    command: "3dmake.runBuildSlice",
    icon: "run-all",
    a11yLabel: "Run Build then Slice in sequence.",
  },
  {
    label: "Full Pipeline",
    command: "3dmake.runFullPipeline",
    icon: "rocket",
    a11yLabel: "Run Build, Orient, and Slice in sequence.",
  },
  {
    label: "Describe (Info)",
    command: "3dmake.runInfo",
    icon: "info",
    a11yLabel: "Print model metadata and available parameters.",
  },
  {
    label: "Print",
    command: "3dmake.runPrint",
    icon: "device-desktop",
    a11yLabel: "Send G-code to printer.",
  },
  {
    label: "Edit Model",
    command: "3dmake.runEditModel",
    icon: "edit",
    a11yLabel: "Open interactive model editing for the current project.",
  },
  {
    label: "View STL",
    command: "3dmake.viewStl",
    icon: "symbol-structure",
    a11yLabel: "Open the last built STL in the 3D viewer panel.",
    shortcut: "Ctrl+Alt+V",
  },
  {
    label: "View SVG Preview",
    command: "3dmake.viewLastSvg",
    icon: "file-media",
    a11yLabel: "View the last generated SVG silhouette preview.",
  },
  {
    label: "Export Images",
    command: "3dmake.runImageExport",
    icon: "file-media",
    a11yLabel: "Export rendered images of the model.",
  },
  {
    label: "Custom Command",
    command: "3dmake.runCustomCommand",
    icon: "terminal",
    a11yLabel:
      "Run a custom 3dm command with arbitrary arguments. Keyboard shortcut: Ctrl+Alt+X.",
    shortcut: "Ctrl+Alt+X",
  },
];

export class ActionItem extends vscode.TreeItem {
  constructor(def: ActionDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon(def.icon);
    this.tooltip = def.shortcut ? `${def.label} (${def.shortcut})` : def.label;
    this.command = {
      command: def.command,
      title: def.label,
    };
    this.accessibilityInformation = {
      label: def.a11yLabel,
      role: "button",
    };
  }
}

export class QuickActionsProvider implements vscode.TreeDataProvider<ActionItem> {
  private _onDidChange = new vscode.EventEmitter<
    ActionItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  getTreeItem(element: ActionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): ActionItem[] {
    return ACTIONS.map((a) => new ActionItem(a));
  }
}
