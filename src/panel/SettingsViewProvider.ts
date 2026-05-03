/**
 * SettingsViewProvider
 *
 * Populates the "Settings & Tools" tree view with quick-access links
 * to configuration commands and environment diagnostics.
 */

import * as vscode from "vscode";
import { ConfigManager } from "../utils/ConfigManager";

interface SettingDef {
  label: string;
  description: string;
  command: string;
  icon: string;
  a11yLabel: string;
}

const SETTINGS: SettingDef[] = [
  {
    label: "Set 3dm Binary Path",
    description: "Configure the path to the 3dm binary",
    command: "3dmake.set3dmPath",
    icon: "settings",
    a11yLabel: "Set the path to the 3dm binary executable.",
  },
  {
    label: "Open Global Config",
    description: "Open defaults.toml in the editor",
    command: "3dmake.openGlobalConfig",
    icon: "file-code",
    a11yLabel: "Open the global 3DMake defaults.toml configuration file.",
  },
  {
    label: "Open Project Config",
    description: "Open 3dmake.toml in the editor",
    command: "3dmake.openProjectConfig",
    icon: "file-text",
    a11yLabel: "Open the project-level 3dmake.toml configuration file.",
  },
  {
    label: "Edit Overlay",
    description: "Open or create a slicer overlay .ini file",
    command: "3dmake.editOverlay",
    icon: "layers",
    a11yLabel: "Open or create a 3DMake slicer overlay configuration file.",
  },
  {
    label: "Edit Profile",
    description: "Open a printer profile .ini file",
    command: "3dmake.editProfile",
    icon: "device-desktop",
    a11yLabel: "Open a 3DMake printer profile configuration file.",
  },
  {
    label: "Edit AI Prompt",
    description: "Customize the AI model description prompt",
    command: "3dmake.editPrompt",
    icon: "comment",
    a11yLabel: "Edit the prompt used for AI model descriptions.",
  },
  {
    label: "Run Setup",
    description: "Configure 3dm environment and dependencies",
    command: "3dmake.runSetup",
    icon: "tools",
    a11yLabel: "Run the 3dm setup command to configure the environment.",
  },
  {
    label: "List Profiles",
    description: "Show available slicer profiles",
    command: "3dmake.runListProfiles",
    icon: "list-flat",
    a11yLabel: "List available slicer profiles.",
  },
  {
    label: "List Overlays",
    description: "Show available overlays",
    command: "3dmake.runListOverlays",
    icon: "layers",
    a11yLabel: "List available overlays.",
  },
  {
    label: "List Libraries",
    description: "Show installed OpenSCAD libraries",
    command: "3dmake.runListLibraries",
    icon: "library",
    a11yLabel: "List installed OpenSCAD libraries.",
  },
  {
    label: "Install Libraries",
    description: "Install configured OpenSCAD libraries",
    command: "3dmake.runInstallLibraries",
    icon: "cloud-download",
    a11yLabel: "Install configured OpenSCAD libraries.",
  },
  {
    label: "Show Version",
    description: "Print 3dm version string",
    command: "3dmake.runVersion",
    icon: "tag",
    a11yLabel: "Show the 3dm tool version.",
  },
  {
    label: "Check for Updates",
    description: "Open the 3dmake releases page",
    command: "3dmake.checkForUpdates",
    icon: "sync",
    a11yLabel: "Open the 3dmake releases page to check for updates.",
  },
  {
    label: "Show Help",
    description: "Print 3dm help text to Output Channel",
    command: "3dmake.runHelp",
    icon: "question",
    a11yLabel: "Show 3dm help text in the Output Channel.",
  },
  {
    label: "VS Code Settings",
    description: "Open 3DMake extension settings",
    command: "workbench.action.openSettings",
    icon: "gear",
    a11yLabel: "Open VS Code settings filtered to 3DMake extension options.",
  },
];

export class SettingItem extends vscode.TreeItem {
  constructor(def: SettingDef) {
    super(def.label, vscode.TreeItemCollapsibleState.None);
    this.description = def.description;
    this.iconPath = new vscode.ThemeIcon(def.icon);
    this.tooltip = def.description;
    this.command =
      def.command === "workbench.action.openSettings"
        ? { command: def.command, title: def.label, arguments: ["3dmake"] }
        : { command: def.command, title: def.label };
    this.accessibilityInformation = {
      label: def.a11yLabel,
      role: "button",
    };
  }
}

export class SettingsViewProvider
  implements vscode.TreeDataProvider<SettingItem>
{
  private _onDidChange = new vscode.EventEmitter<
    SettingItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(
    private readonly _context: vscode.ExtensionContext,
    private readonly config: ConfigManager,
  ) {}

  getTreeItem(element: SettingItem): vscode.TreeItem {
    return element;
  }

  getChildren(): SettingItem[] {
    return SETTINGS.map((s) => new SettingItem(s));
  }
}
