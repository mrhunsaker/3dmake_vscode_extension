/**
 * SvgViewerPanel
 *
 * Displays the last generated SVG silhouette preview in a WebviewPanel.
 *
 * Accessibility:
 *  - SVG is embedded inline with a <title> element for screen readers.
 *  - Keyboard zoom controls (+/−, 0 to reset) are provided.
 *  - An aria-live region announces zoom level changes.
 *  - A text description section is reserved for SVG alt-text extraction.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class SvgViewerPanel {
  private static instance: SvgViewerPanel | undefined;
  private readonly panel: vscode.WebviewPanel;

  static createOrShow(extensionUri: vscode.Uri, svgPath: string): void {
    if (SvgViewerPanel.instance) {
      SvgViewerPanel.instance.panel.reveal(vscode.ViewColumn.Beside);
      SvgViewerPanel.instance.render(svgPath);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      '3dmake.svgViewer',
      `SVG Preview — ${path.basename(svgPath)}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true },
    );
    SvgViewerPanel.instance = new SvgViewerPanel(panel, svgPath);
  }

  private constructor(panel: vscode.WebviewPanel, svgPath: string) {
    this.panel = panel;
    this.render(svgPath);
    this.panel.onDidDispose(() => { SvgViewerPanel.instance = undefined; });
  }

  private render(svgPath: string): void {
    let svgContent = '';
    try {
      svgContent = fs.readFileSync(svgPath, 'utf8');
      // Inject a <title> for accessibility if none present
      if (!svgContent.includes('<title')) {
        svgContent = svgContent.replace('<svg', `<svg aria-label="Silhouette preview of ${path.basename(svgPath)}" role="img"`);
        svgContent = svgContent.replace(/(<svg[^>]*>)/, `$1<title>Silhouette preview: ${path.basename(svgPath)}</title>`);
      }
    } catch {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100">
        <text x="10" y="50" fill="red">Could not load SVG: ${svgPath}</text></svg>`;
    }

    const fileName = path.basename(svgPath);

    this.panel.webview.html = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>SVG Preview — ${fileName}</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #d4d4d4);
      --border: var(--vscode-panel-border, #444);
      --btn-bg: var(--vscode-button-background, #0e639c);
      --btn-fg: var(--vscode-button-foreground, #fff);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg); color: var(--fg);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: 13px;
      display: flex; flex-direction: column; height: 100vh; overflow: hidden;
    }
    #toolbar {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border-bottom: 1px solid var(--border);
    }
    h1 { font-size: 13px; font-weight: 600; flex: 1; }
    button {
      background: var(--btn-bg); color: var(--btn-fg);
      border: none; border-radius: 3px; padding: 4px 10px;
      cursor: pointer; font-size: 12px;
    }
    button:focus { outline: 2px solid var(--vscode-focusBorder, #007fd4); outline-offset: 2px; }
    #zoom-label { font-size: 12px; min-width: 4em; text-align: right; }
    #svg-container {
      flex: 1; overflow: auto; display: flex;
      align-items: center; justify-content: center;
      background: #2a2a3a;
      padding: 20px;
    }
    #svg-wrapper {
      transform-origin: center;
      transition: transform 0.15s;
    }
    #svg-wrapper svg, #svg-wrapper img {
      max-width: 100%; height: auto; display: block;
    }
    #live-region {
      position: absolute; left: -9999px;
      width: 1px; height: 1px; overflow: hidden;
    }
  </style>
</head>
<body>
<div id="toolbar" role="toolbar" aria-label="SVG Preview controls">
  <h1>${fileName}</h1>
  <button id="btn-zoom-in"  title="Zoom in (+)">＋ Zoom In</button>
  <button id="btn-zoom-out" title="Zoom out (−)">－ Zoom Out</button>
  <button id="btn-zoom-reset" title="Reset zoom (0)">Reset (0)</button>
  <span id="zoom-label" aria-live="polite" aria-atomic="true">100%</span>
</div>

<div id="svg-container" role="region" aria-label="SVG preview canvas">
  <div id="svg-wrapper">${svgContent}</div>
</div>

<div id="live-region" role="status" aria-live="polite" aria-atomic="true"></div>

<script>
(function() {
  let zoom = 1;
  const wrapper = document.getElementById('svg-wrapper');
  const zoomLabel = document.getElementById('zoom-label');
  const liveRegion = document.getElementById('live-region');

  function setZoom(z) {
    zoom = Math.max(0.1, Math.min(10, z));
    wrapper.style.transform = 'scale(' + zoom + ')';
    const pct = Math.round(zoom * 100) + '%';
    zoomLabel.textContent = pct;
    liveRegion.textContent = '';
    requestAnimationFrame(() => { liveRegion.textContent = 'Zoom: ' + pct; });
  }

  document.getElementById('btn-zoom-in').addEventListener('click', () => setZoom(zoom * 1.25));
  document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(zoom / 1.25));
  document.getElementById('btn-zoom-reset').addEventListener('click', () => setZoom(1));

  window.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') setZoom(zoom * 1.25);
    if (e.key === '-') setZoom(zoom / 1.25);
    if (e.key === '0') setZoom(1);
  });

  // Ctrl+scroll zoom
  document.getElementById('svg-container').addEventListener('wheel', e => {
    if (e.ctrlKey) { setZoom(zoom * (e.deltaY < 0 ? 1.1 : 0.9)); e.preventDefault(); }
  }, { passive: false });
})();
</script>
</body>
</html>`;
  }
}
