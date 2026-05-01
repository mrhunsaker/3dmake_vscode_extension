/**
 * ProjectViewProvider
 *
 * Populates the "Project" tree view in the 3DMake activity bar panel.
 * Shows:
 *   - Currently selected project file or directory
 *   - .scad files found in the project directory (or workspace root)
 *   - 3dmake.toml config file if present
 *   - Output artefacts (.stl, .gcode, .svg) if present
 *
 * Every TreeItem is given an accessibilityInformation label so screen
 * readers announce meaningful context rather than raw file names.
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ConfigManager } from "../utils/ConfigManager";

type ItemKind =
  | "projectRoot"
  | "scadFile"
  | "tomlFile"
  | "stlFile"
  | "gcodeFile"
  | "svgFile"
  | "placeholder";

export class ProjectItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly kind: ItemKind,
    public readonly filePath?: string,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode
      .TreeItemCollapsibleState.None,
  ) {
    super(label, collapsibleState);

    const iconMap: Partial<Record<ItemKind, vscode.ThemeIcon>> = {
      projectRoot: new vscode.ThemeIcon("folder-opened"),
      scadFile: new vscode.ThemeIcon("file-code"),
      tomlFile: new vscode.ThemeIcon("settings-gear"),
      stlFile: new vscode.ThemeIcon("file-binary"),
      gcodeFile: new vscode.ThemeIcon("file"),
      svgFile: new vscode.ThemeIcon("file-media"),
      placeholder: new vscode.ThemeIcon("info"),
    };
    this.iconPath = iconMap[kind] ?? new vscode.ThemeIcon("file");

    if (filePath) {
      this.resourceUri = vscode.Uri.file(filePath);
      this.tooltip = filePath;

      if (kind === "scadFile") {
        this.command = {
          command: "vscode.open",
          title: "Open file",
          arguments: [vscode.Uri.file(filePath)],
        };
      } else if (kind === "stlFile") {
        this.command = {
          command: "3dmake.viewStl",
          title: "View in 3D Viewer",
          arguments: [filePath],
        };
      } else if (kind === "tomlFile") {
        this.command = {
          command: "3dmake.openProjectConfig",
          title: "Open project config",
        };
      } else if (kind === "gcodeFile") {
        this.command = {
          command: "vscode.open",
          title: "Open file",
          arguments: [vscode.Uri.file(filePath)],
        };
      } else if (kind === "svgFile") {
        this.command = {
          command: "3dmake.viewLastSvg",
          title: "View SVG preview",
          arguments: [filePath],
        };
      }
    }

    // Accessible label — more descriptive than the bare filename
    const kindLabels: Record<ItemKind, string> = {
      projectRoot: "Project folder",
      scadFile: "OpenSCAD source file",
      tomlFile: "3DMake configuration file",
      stlFile: "STL output file",
      gcodeFile: "G-code output file",
      svgFile: "SVG preview file",
      placeholder: "Information",
    };
    this.accessibilityInformation = {
      label: `${kindLabels[kind]}: ${label}${filePath ? ", " + filePath : ""}`,
      role: filePath ? "treeitem" : "note",
    };
  }
}

export class ProjectViewProvider implements vscode.TreeDataProvider<ProjectItem> {
  private _onDidChange = new vscode.EventEmitter<
    ProjectItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly config: ConfigManager,
  ) {}

  refresh(): void {
    this._onDidChange.fire();
  }

  getTreeItem(element: ProjectItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ProjectItem): ProjectItem[] {
    if (element) {
      // Expand project root to show files
      return element.kind === "projectRoot" && element.filePath
        ? this.buildFileItems(element.filePath)
        : [];
    }

    const projectPath = this.config.getProjectPath();
    if (!projectPath) {
      return [
        new ProjectItem(
          'No project selected — use "Select Project" command',
          "placeholder",
        ),
      ];
    }

    const isDir = fs.statSync(projectPath).isDirectory();
    const dirPath = isDir ? projectPath : path.dirname(projectPath);
    const label = path.basename(projectPath);

    const root = new ProjectItem(
      label,
      "projectRoot",
      dirPath,
      vscode.TreeItemCollapsibleState.Expanded,
    );
    return [root];
  }

  private buildFileItems(dirPath: string): ProjectItem[] {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return [new ProjectItem("Cannot read directory", "placeholder")];
    }

    const items: ProjectItem[] = [];
    const extMap: Record<string, ItemKind> = {
      ".scad": "scadFile",
      ".toml": "tomlFile",
      ".stl": "stlFile",
      ".gcode": "gcodeFile",
      ".svg": "svgFile",
    };

    for (const entry of entries.filter((e) => e.isFile())) {
      const ext = path.extname(entry.name).toLowerCase();
      const kind = extMap[ext];
      if (kind) {
        items.push(
          new ProjectItem(entry.name, kind, path.join(dirPath, entry.name)),
        );
      }
    }

    if (items.length === 0) {
      items.push(new ProjectItem("No relevant files found", "placeholder"));
    }
    return items;
  }
}
