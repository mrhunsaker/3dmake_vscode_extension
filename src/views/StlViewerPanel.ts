/**
 * StlViewerPanel
 *
 * A VS Code WebviewPanel that renders an STL file in 3D using Three.js.
 *
 * Remediation (2026-05-02):
 *  P2-04: Detect ASCII STL format and show an accessible error message
 *         via both the info panel and the aria-live region.
 */

import * as vscode from 'vscode';
import * as path from 'path';

export class StlViewerPanel {
  private static instance: StlViewerPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private stlPath: string;

  static createOrShow(extensionUri: vscode.Uri, stlPath: string): void {
    if (StlViewerPanel.instance) {
      StlViewerPanel.instance.update(stlPath);
      StlViewerPanel.instance.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      '3dmake.stlViewer',
      `STL Viewer — ${path.basename(stlPath)}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        localResourceRoots: [
          extensionUri,
          vscode.Uri.file(path.dirname(stlPath)),
          vscode.Uri.joinPath(extensionUri, 'node_modules', 'three', 'build'),
        ],
        retainContextWhenHidden: true,
      },
    );

    StlViewerPanel.instance = new StlViewerPanel(panel, extensionUri, stlPath);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    stlPath: string,
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.stlPath = stlPath;
    this.render();
    this.panel.onDidDispose(() => {
      StlViewerPanel.instance = undefined;
    });
  }

  update(stlPath: string): void {
    this.stlPath = stlPath;
    this.panel.title = `STL Viewer — ${path.basename(stlPath)}`;
    this.render();
  }

  private render(): void {
    const fileName = path.basename(this.stlPath);
    const stlUri = this.panel.webview.asWebviewUri(
      vscode.Uri.file(this.stlPath),
    );
    const threeUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'node_modules',
        'three',
        'build',
        'three.min.js',
      ),
    );

    this.panel.webview.html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>STL Viewer — ${fileName}</title>
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
      font-size: var(--vscode-font-size, 13px);
      display: flex; flex-direction: column; height: 100vh; overflow: hidden;
    }
    #skip-link {
      position: absolute; top: -100px; left: 0; z-index: 999;
      background: var(--btn-bg); color: var(--btn-fg);
      padding: 6px 12px; text-decoration: none; border-radius: 0 0 4px 0;
    }
    #skip-link:focus { top: 0; }

    #toolbar {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    #toolbar h1 {
      font-size: 13px; font-weight: 600; flex: 1; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    button {
      background: var(--btn-bg); color: var(--btn-fg);
      border: none; border-radius: 3px; padding: 4px 10px;
      cursor: pointer; font-size: 12px;
    }
    button:focus { outline: 2px solid var(--vscode-focusBorder, #007fd4); outline-offset: 2px; }

    #canvas-container { flex: 1; position: relative; overflow: hidden; }
    canvas {
      width: 100% !important; height: 100% !important;
      display: block;
    }

    #controls-help {
      position: absolute; bottom: 8px; left: 8px;
      background: rgba(0,0,0,.65); padding: 6px 10px;
      border-radius: 4px; font-size: 11px; line-height: 1.6;
      pointer-events: none;
    }

    #live-region {
      position: absolute; left: -9999px;
      width: 1px; height: 1px; overflow: hidden;
    }

    #model-info {
      border-top: 1px solid var(--border);
      padding: 8px 12px; font-size: 12px; line-height: 1.8;
      min-height: 64px;
    }
    #model-info h2 { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
  </style>
</head>
<body>
<a id="skip-link" href="#controls-help">Skip to keyboard controls help</a>

<div id="toolbar" role="toolbar" aria-label="STL Viewer controls">
  <h1 aria-label="Viewing STL file: ${fileName}">${fileName}</h1>
  <button id="btn-reset" title="Reset camera to default position (R)">Reset View (R)</button>
  <button id="btn-top" title="Top-down view (T)">Top (T)</button>
  <button id="btn-front" title="Front view (F)">Front (F)</button>
  <button id="btn-iso" title="Isometric view (I)">Isometric (I)</button>
  <button id="btn-wireframe" title="Toggle wireframe overlay (W)">Wireframe (W)</button>
</div>

<div id="canvas-container" role="region" aria-label="3D model viewer canvas">
  <canvas id="stl-canvas" role="img" tabindex="0" aria-label="3D STL model: ${fileName}. Use arrow keys to orbit, plus and minus to zoom."></canvas>
  <div id="controls-help" aria-hidden="true">
    Arrow keys: orbit &nbsp;|&nbsp; +/−: zoom &nbsp;|&nbsp; Shift+drag: pan<br>
    R: reset &nbsp;|&nbsp; T: top &nbsp;|&nbsp; F: front &nbsp;|&nbsp; I: iso &nbsp;|&nbsp; W: wireframe
  </div>
</div>

<div id="live-region" role="status" aria-live="polite" aria-atomic="true"></div>

<div id="model-info" role="region" aria-label="Model information">
  <h2>Model Information</h2>
  <div id="info-text">Loading…</div>
</div>

<script src="${threeUri.toString()}"></script>
<script>
(function() {
  const STL_URI = "${stlUri.toString()}";
  const canvas = document.getElementById('stl-canvas');
  const liveRegion = document.getElementById('live-region');
  const infoText = document.getElementById('info-text');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1e1e2e);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
  let mesh;
  let wireframeMesh;
  let showWireframe = false;
  let modelSize = 1;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(1, 2, 3);
  scene.add(dirLight);
  const backLight = new THREE.DirectionalLight(0x8888ff, 0.3);
  backLight.position.set(-1, -1, -1);
  scene.add(backLight);

  function parseStlBinary(buffer) {
    const view = new DataView(buffer);
    const numTris = view.getUint32(80, true);
    const geometry = new THREE.BufferGeometry();
    const verts = new Float32Array(numTris * 9);
    const norms = new Float32Array(numTris * 9);
    let offset = 84;

    for (let i = 0; i < numTris; i++) {
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);
      offset += 12;

      for (let v = 0; v < 3; v++) {
        const base = i * 9 + v * 3;
        verts[base] = view.getFloat32(offset, true);
        verts[base + 1] = view.getFloat32(offset + 4, true);
        verts[base + 2] = view.getFloat32(offset + 8, true);
        norms[base] = nx;
        norms[base + 1] = ny;
        norms[base + 2] = nz;
        offset += 12;
      }

      offset += 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(norms, 3));
    return geometry;
  }

  function loadStl() {
    return fetch(STL_URI)
      .then(r => r.arrayBuffer())
      .then(buf => {
        // P2-04: Detect ASCII STL (first 6 bytes start with "solid ")
        // Binary STL has an 80-byte arbitrary header; ASCII always begins with "solid ".
        // Note: some binary STLs also begin with "solid " in their header, so we do
        // a secondary check: if byte 80 (triangle count) would give an impossibly large
        // or mismatched file size, treat as ASCII.
        const headerBytes = new Uint8Array(buf, 0, Math.min(6, buf.byteLength));
        const headerText = String.fromCharCode(...headerBytes);
        const looksAscii = headerText.toLowerCase().startsWith('solid ');

        if (looksAscii && buf.byteLength > 84) {
          // Verify triangle count consistency for binary format
          const view = new DataView(buf);
          const numTris = view.getUint32(80, true);
          const expectedSize = 84 + numTris * 50;
          if (Math.abs(expectedSize - buf.byteLength) > 4) {
            // File size doesn't match binary expectation — almost certainly ASCII
            const errorMsg = 'ASCII STL format detected. The built-in viewer only supports binary STL. ' +
              'Re-export from OpenSCAD with binary output enabled, or run \\'3dm build\\' which produces a binary STL automatically.';
            infoText.textContent = errorMsg;
            announce('Error: ASCII STL format is not supported by the built-in viewer. ' +
              'Please re-export as binary STL or use 3dm build.');
            return;
          }
        }

        const geometry = parseStlBinary(buf);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const bb = geometry.boundingBox;
        const size = new THREE.Vector3();
        bb.getSize(size);
        modelSize = geometry.boundingSphere.radius * 2;

        const material = new THREE.MeshPhongMaterial({
          color: 0x3794cf,
          specular: 0x222222,
          shininess: 40,
          side: THREE.DoubleSide,
        });
        mesh = new THREE.Mesh(geometry, material);

        const wireMat = new THREE.MeshBasicMaterial({
          color: 0x88ccff,
          wireframe: true,
          opacity: 0.15,
          transparent: true,
        });
        wireframeMesh = new THREE.Mesh(geometry, wireMat);
        wireframeMesh.visible = false;
        mesh.add(wireframeMesh);

        const centre = new THREE.Vector3();
        bb.getCenter(centre);
        mesh.position.sub(centre);
        scene.add(mesh);

        resetCamera();

        const triCount = geometry.attributes.position.count / 3;
        infoText.innerHTML =
          '<strong>File:</strong> ${fileName}<br>' +
          '<strong>Triangles:</strong> ' + triCount.toLocaleString() + '<br>' +
          '<strong>Bounding box:</strong> X ' + size.x.toFixed(2) + ' mm &times; Y ' + size.y.toFixed(2) + ' mm &times; Z ' + size.z.toFixed(2) + ' mm';

        announce(
          'Model loaded. ' + triCount.toLocaleString() +
          ' triangles. Dimensions: X ' + size.x.toFixed(1) +
          ', Y ' + size.y.toFixed(1) + ', Z ' + size.z.toFixed(1) + ' millimetres.'
        );

        canvas.focus();
      })
      .catch(err => {
        infoText.textContent = 'Error loading STL: ' + err.message;
        announce('Error loading STL file: ' + err.message);
      });
  }

  let theta = 45;
  let phi = 60;
  let radius;

  function resetCamera() {
    radius = modelSize * 2.5;
    theta = 45;
    phi = 60;
    updateCamera();
    announce('Camera reset to isometric view.');
  }

  function setView(t, p, label) {
    theta = t;
    phi = p;
    updateCamera();
    announce('Camera set to ' + label + ' view.');
  }

  function updateCanvasLabel() {
    canvas.setAttribute(
      'aria-label',
      '3D STL model: ${fileName}. Camera: theta ' + Math.round(theta) +
      ' degrees, phi ' + Math.round(phi) + ' degrees, distance ' +
      Math.round(radius) + 'mm.'
    );
  }

  function updateCamera() {
    const tRad = THREE.MathUtils.degToRad(theta);
    const pRad = THREE.MathUtils.degToRad(phi);
    camera.position.set(
      radius * Math.sin(pRad) * Math.sin(tRad),
      radius * Math.cos(pRad),
      radius * Math.sin(pRad) * Math.cos(tRad),
    );
    camera.lookAt(0, 0, 0);
    updateCanvasLabel();
  }

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let shiftDrag = false;
  const panOffset = new THREE.Vector3();

  canvas.addEventListener('pointerdown', e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    shiftDrag = e.shiftKey;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    if (!dragging) {
      return;
    }

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (shiftDrag) {
      panOffset.x -= dx * 0.005 * (radius / modelSize);
      panOffset.y += dy * 0.005 * (radius / modelSize);
      if (mesh) {
        mesh.position.set(panOffset.x, panOffset.y, panOffset.z);
      }
    } else {
      theta -= dx * 0.4;
      phi = Math.max(5, Math.min(175, phi - dy * 0.4));
      updateCamera();
    }
  });

  canvas.addEventListener('pointerup', () => {
    dragging = false;
  });

  canvas.addEventListener('wheel', e => {
    radius = Math.max(modelSize * 0.5, radius + e.deltaY * 0.05 * (radius / 200));
    updateCamera();
    e.preventDefault();
  }, { passive: false });

  // Keyboard events scoped to canvas only
  canvas.addEventListener('keydown', e => {
    const step = 5;
    if (e.key === 'ArrowLeft') { theta -= step; updateCamera(); }
    if (e.key === 'ArrowRight') { theta += step; updateCamera(); }
    if (e.key === 'ArrowUp') { phi = Math.max(5, phi - step); updateCamera(); }
    if (e.key === 'ArrowDown') { phi = Math.min(175, phi + step); updateCamera(); }
    if (e.key === '+' || e.key === '=') { radius = Math.max(modelSize * 0.5, radius * 0.9); updateCamera(); }
    if (e.key === '-') { radius *= 1.1; updateCamera(); }
    if (e.key === 'r' || e.key === 'R') { resetCamera(); }
    if (e.key === 't' || e.key === 'T') { setView(0, 1, 'top'); }
    if (e.key === 'f' || e.key === 'F') { setView(0, 90, 'front'); }
    if (e.key === 'i' || e.key === 'I') { setView(45, 60, 'isometric'); }
    if (e.key === 'w' || e.key === 'W') { toggleWireframe(); }
  });

  function toggleWireframe() {
    showWireframe = !showWireframe;
    if (wireframeMesh) {
      wireframeMesh.visible = showWireframe;
    }
    announce('Wireframe ' + (showWireframe ? 'enabled' : 'disabled'));
  }

  document.getElementById('btn-reset').addEventListener('click', resetCamera);
  document.getElementById('btn-top').addEventListener('click', () => setView(0, 1, 'top'));
  document.getElementById('btn-front').addEventListener('click', () => setView(0, 90, 'front'));
  document.getElementById('btn-iso').addEventListener('click', () => setView(45, 60, 'isometric'));
  document.getElementById('btn-wireframe').addEventListener('click', toggleWireframe);

  function resize() {
    const container = document.getElementById('canvas-container');
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  function announce(msg) {
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
      liveRegion.textContent = msg;
    });
  }

  loadStl();
})();
</script>
</body>
</html>`;
  }
}
