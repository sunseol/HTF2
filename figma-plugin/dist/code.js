"use strict";
// Figma Plugin Main Code
// This runs in the Figma plugin sandbox
figma.showUI(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HTML to Figma</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      background: #ffffff;
      color: #333;
      width: 400px;
    }

    .header {
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e5e5;
    }

    h1 {
      font-size: 18px;
      font-weight: 600;
      color: #000;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 12px;
      color: #999;
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #000;
    }

    .input-group {
      margin-bottom: 12px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 6px;
      color: #666;
    }

    textarea {
      width: 100%;
      min-height: 120px;
      padding: 10px;
      border: 1px solid #e5e5e5;
      border-radius: 4px;
      font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
      font-size: 11px;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s;
    }

    textarea:focus {
      border-color: #18a0fb;
    }

    input[type="text"] {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #e5e5e5;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s;
    }

    input[type="text"]:focus {
      border-color: #18a0fb;
    }

    .radio-group {
      display: flex;
      gap: 12px;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .radio-option input[type="radio"] {
      margin: 0;
    }

    .radio-option label {
      margin: 0;
      font-weight: 400;
      cursor: pointer;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .checkbox-option input[type="checkbox"] {
      margin: 0;
    }

    .checkbox-option label {
      margin: 0;
      font-weight: 400;
      cursor: pointer;
    }

    button {
      width: 100%;
      padding: 10px 16px;
      background: #18a0fb;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    button:hover {
      background: #0d8ce8;
    }

    button:active {
      background: #0b7fd4;
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .button-secondary {
      background: #f0f0f0;
      color: #333;
      margin-bottom: 8px;
    }

    .button-secondary:hover {
      background: #e5e5e5;
    }

    .button-secondary:active {
      background: #d9d9d9;
    }

    .status {
      margin-top: 12px;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
      display: none;
    }

    .status.info {
      background: #e7f3ff;
      color: #0066cc;
      border: 1px solid #b3d9ff;
    }

    .status.success {
      background: #e6f7e6;
      color: #0d6e0d;
      border: 1px solid #b3e6b3;
    }

    .status.error {
      background: #ffe6e6;
      color: #cc0000;
      border: 1px solid #ffb3b3;
    }

    .status.warning {
      background: #fff7e6;
      color: #cc8800;
      border: 1px solid #ffe0b3;
    }

    .loader {
      display: none;
      justify-content: center;
      align-items: center;
      margin-top: 12px;
    }

    .spinner {
      border: 2px solid #f3f3f3;
      border-top: 2px solid #18a0fb;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .settings {
      background: #f9f9f9;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .settings-row {
      margin-bottom: 8px;
    }

    .settings-row:last-child {
      margin-bottom: 0;
    }

    .stats {
      display: none;
      margin-top: 12px;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
      font-size: 11px;
      color: #666;
    }

    .stats-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .stats-row:last-child {
      margin-bottom: 0;
    }

    .example-links {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .example-link {
      font-size: 11px;
      color: #18a0fb;
      text-decoration: none;
      cursor: pointer;
    }

    .example-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>HTML to Figma</h1>
    <div class="subtitle">Convert HTML/CSS to Figma layers with AI</div>
  </div>

  <div class="section">
    <div class="section-title">HTML Content</div>
    <div class="example-links">
      <a class="example-link" id="example-1">Simple Box</a>
      <a class="example-link" id="example-2">Card Layout</a>
      <a class="example-link" id="example-3">Button Group</a>
    </div>
    <div class="input-group">
      <textarea id="html-input" placeholder="<div style='width:200px; height:100px; background:#3498db; border-radius:10px;'></div>"></textarea>
    </div>
  </div>

  <div class="section">
    <div class="section-title">API Settings</div>
    <div class="settings">
      <div class="settings-row input-group">
        <label for="api-url">Backend URL</label>
        <input type="text" id="api-url" value="http://localhost:4000" placeholder="http://localhost:4000">
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Conversion Options</div>

    <div class="input-group">
      <label>Mode</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" id="mode-fast" name="mode" value="fast">
          <label for="mode-fast">Fast</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="mode-balanced" name="mode" value="balanced" checked>
          <label for="mode-balanced">Balanced</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="mode-quality" name="mode" value="quality">
          <label for="mode-quality">Quality</label>
        </div>
      </div>
    </div>

    <div class="input-group">
      <div class="checkbox-group">
        <div class="checkbox-option">
          <input type="checkbox" id="enable-screenshot" checked>
          <label for="enable-screenshot">Enable Screenshot</label>
        </div>
        <div class="checkbox-option">
          <input type="checkbox" id="skip-vision">
          <label for="skip-vision">Skip AI Vision (faster)</label>
        </div>
      </div>
    </div>
  </div>

  <button id="convert-btn">Convert to Figma</button>
  <button id="import-file-btn" class="button-secondary">Import HTML File</button>

  <div class="section">
    <div class="section-title">Exact Replica (No AI)</div>
    <div class="input-group">
      <label for="exact-url">URL</label>
      <input type="text" id="exact-url" placeholder="https://example.com" autocomplete="off">
    </div>
    <div class="input-group">
      <label for="exact-viewport">Viewport</label>
      <select id="exact-viewport">
        <option value="1920x1080">Desktop · 1920 × 1080</option>
        <option value="1440x900">Desktop · 1440 × 900</option>
        <option value="1280x720">Desktop · 1280 × 720</option>
        <option value="375x667">Mobile · 375 × 667</option>
      </select>
    </div>
    <div class="button-row">
      <button id="convert-exact-url" class="primary">Render URL (Exact)</button>
      <label class="upload-label">
        <input type="file" id="h2d-file-input" accept=".h2d,.zip" hidden>
        <span>Import .h2d</span>
      </label>
    </div>
    <p class="helper-text">Generate a pixel-faithful Figma layout without AI by mirroring a production URL or importing a code.to.design archive.</p>
  </div>

  <div class="loader" id="loader">
    <div class="spinner"></div>
  </div>

  <div id="status" class="status"></div>

  <div id="stats" class="stats">
    <div class="stats-row">
      <span>Nodes Created:</span>
      <strong id="stat-nodes">0</strong>
    </div>
    <div class="stats-row">
      <span>Processing Time:</span>
      <strong id="stat-time">0ms</strong>
    </div>
    <div class="stats-row">
      <span>Accuracy Score:</span>
      <strong id="stat-accuracy">0%</strong>
    </div>
    <div class="stats-row">
      <span>AI Suggestions:</span>
      <strong id="stat-ai">0</strong>
    </div>
  </div>

  <script>
    const htmlInput = document.getElementById('html-input');
    const apiUrl = document.getElementById('api-url');
    const convertBtn = document.getElementById('convert-btn');
    const convertExactBtn = document.getElementById('convert-exact-url');
    const exactUrlInput = document.getElementById('exact-url');
    const exactViewportSelect = document.getElementById('exact-viewport');
    const h2dFileInput = document.getElementById('h2d-file-input');
    const importFileBtn = document.getElementById('import-file-btn');
    const loader = document.getElementById('loader');
    const DEFAULT_API_URL = 'http://localhost:4000';

    let storageAvailable = true;
    let cachedApiUrl = DEFAULT_API_URL;

    function getStoredApiUrl() {
      if (!storageAvailable) {
        return cachedApiUrl;
      }
      try {
        return window.localStorage.getItem('api-url');
      } catch (err) {
        storageAvailable = false;
        return cachedApiUrl;
      }
    }

    function setStoredApiUrl(value) {
      cachedApiUrl = value;
      if (!storageAvailable) {
        return;
      }
      try {
        window.localStorage.setItem('api-url', value);
      } catch (err) {
        storageAvailable = false;
      }
    }

    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
    } catch (err) {
      storageAvailable = false;
      console.warn('Local storage unavailable, falling back to in-memory API URL cache.', err);
    }

    const statusDiv = document.getElementById('status');
    const statsDiv = document.getElementById('stats');

    // Example templates
    const examples = {
      1: \`<div style="width:200px;height:100px;background:#3498db;border-radius:10px;"></div>\`,
      2: \`<div style="display:flex;flex-direction:column;gap:16px;padding:24px;background:white;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);width:300px;">
  <h2 style="font-size:20px;font-weight:bold;color:#2c3e50;margin:0;">Card Title</h2>
  <p style="font-size:14px;color:#7f8c8d;margin:0;line-height:1.6;">This is a sample card layout with auto layout properties.</p>
  <button style="background:#3498db;color:white;padding:10px 20px;border:none;border-radius:6px;font-weight:600;">Action</button>
</div>\`,
      3: \`<div style="display:flex;gap:12px;padding:20px;">
  <button style="background:#3498db;color:white;padding:12px 24px;border:none;border-radius:8px;font-weight:600;">Primary</button>
  <button style="background:white;color:#3498db;padding:12px 24px;border:2px solid #3498db;border-radius:8px;font-weight:600;">Secondary</button>
  <button style="background:#e74c3c;color:white;padding:12px 24px;border:none;border-radius:8px;font-weight:600;">Danger</button>
</div>\`
    };

    document.getElementById('example-1').addEventListener('click', () => {
      htmlInput.value = examples[1];
    });
    document.getElementById('example-2').addEventListener('click', () => {
      htmlInput.value = examples[2];
    });
    document.getElementById('example-3').addEventListener('click', () => {
      htmlInput.value = examples[3];
    });

    function showStatus(message, type = 'info') {
      statusDiv.textContent = message;
      statusDiv.className = \`status \${type}\`;
      statusDiv.style.display = 'block';
    }

    function hideStatus() {
      statusDiv.style.display = 'none';
    }

    function showLoader() {
      loader.style.display = 'flex';
      convertBtn.disabled = true;
      if (convertExactBtn instanceof HTMLButtonElement) {
        convertExactBtn.disabled = true;
      }
      if (h2dFileInput instanceof HTMLInputElement) {
        h2dFileInput.disabled = true;
      }
    }

    function hideLoader() {
      loader.style.display = 'none';
      convertBtn.disabled = false;
      if (convertExactBtn instanceof HTMLButtonElement) {
        convertExactBtn.disabled = false;
      }
      if (h2dFileInput instanceof HTMLInputElement) {
        h2dFileInput.disabled = false;
      }
    }

    function updateStats(data) {
      if (data.nodes) {
        document.getElementById('stat-nodes').textContent = data.nodes.length;
      }
      if (data.meta && data.meta.render) {
        const time = Math.round(data.meta.render.processingTimeMs);
        document.getElementById('stat-time').textContent = time + 'ms';
      }
      const quality = data.quality || (data.meta && data.meta.quality);
      if (quality && typeof quality.accuracyScore === 'number') {
        const accuracy = Math.round(quality.accuracyScore * 100);
        document.getElementById('stat-accuracy').textContent = accuracy + '%';
      }
      if (data.meta && data.meta.info) {
        const aiSuggestions = data.meta.info.find((info) => info.includes('AI-driven'));
        if (aiSuggestions) {
          const match = aiSuggestions.match(/(\d+)/);
          if (match) {
            document.getElementById('stat-ai').textContent = match[1];
          }
        }
      }
      statsDiv.style.display = 'block';
    }
    function arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }


    convertBtn.addEventListener('click', async () => {
      const htmlContent = htmlInput.value.trim();

      if (!htmlContent) {
        showStatus('Please enter HTML content', 'error');
        return;
      }

      hideStatus();
      showLoader();
      statsDiv.style.display = 'none';

      const mode = document.querySelector('input[name="mode"]:checked').value;
      const enableScreenshot = document.getElementById('enable-screenshot').checked;
      const skipVision = document.getElementById('skip-vision').checked;

      const options = {
        mode,
        enableScreenshot,
        skipVision
      };

      parent.postMessage({
        pluginMessage: {
          type: 'convert',
          htmlContent,
          apiUrl: apiUrl.value,
          options
        }
      }, '*');
    });

    if (
      convertExactBtn instanceof HTMLButtonElement &&
      exactUrlInput instanceof HTMLInputElement &&
      exactViewportSelect instanceof HTMLSelectElement &&
      statsDiv instanceof HTMLElement &&
      apiUrl instanceof HTMLInputElement
    ) {
      convertExactBtn.addEventListener('click', () => {
        const url = exactUrlInput.value.trim();
        if (!url) {
          showStatus('Please enter a URL to mirror', 'error');
          return;
        }

        hideStatus();
        showLoader();
        statsDiv.style.display = 'none';

        const [widthStr, heightStr] = exactViewportSelect.value.split('x');
        const viewport = {
          width: parseInt(widthStr, 10) || 1920,
          height: parseInt(heightStr, 10) || 1080,
        };

        parent.postMessage({
          pluginMessage: {
            type: 'convert-exact-url',
            apiUrl: apiUrl.value,
            url,
            viewport,
            waitUntil: 'networkidle',
          }
        }, '*');
      });
    }

    if (
      h2dFileInput instanceof HTMLInputElement &&
      statsDiv instanceof HTMLElement &&
      apiUrl instanceof HTMLInputElement
    ) {
      h2dFileInput.addEventListener('change', async (event) => {
        const target = event.target;
        const file = target instanceof HTMLInputElement && target.files ? target.files[0] : null;
        if (!file) {
          return;
        }

        hideStatus();
        showLoader();
        statsDiv.style.display = 'none';

        try {
          const buffer = await file.arrayBuffer();
          const base64 = arrayBufferToBase64(buffer);
          parent.postMessage({
            pluginMessage: {
              type: 'convert-h2d',
              apiUrl: apiUrl.value,
              filename: file.name,
              data: base64,
            }
          }, '*');
        } catch (error) {
          console.error('Failed to read H2D archive', error);
          showStatus('Failed to read archive', 'error');
          hideLoader();
        } finally {
          if (target instanceof HTMLInputElement) {
            target.value = '';
          }
        }
      });
    }

    if (importFileBtn instanceof HTMLButtonElement) {
      importFileBtn.addEventListener('click', () => {
        parent.postMessage({
          pluginMessage: {
            type: 'import-file'
          }
        }, '*');
      });
    }
    // Listen for messages from plugin code
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;

      if (msg.type === 'conversion-complete') {
        hideLoader();
        showStatus(\`Created \${msg.data.nodes.length} Figma nodes.\`, 'success');
        updateStats(msg.data);
      } else if (msg.type === 'conversion-error') {
        hideLoader();
        showStatus(\`Error: \${msg.error}\`, 'error');
      } else if (msg.type === 'conversion-progress') {
        showStatus(msg.message, 'info');
      } else if (msg.type === 'file-selected') {
        htmlInput.value = msg.content;
        showStatus('File loaded successfully', 'success');
      }
    };

    // Load saved settings
    window.onload = () => {
      const savedUrl = getStoredApiUrl();
      if (savedUrl) {
        apiUrl.value = savedUrl;
      } else if (!apiUrl.value) {
        apiUrl.value = DEFAULT_API_URL;
      }
    };

    // Save settings on change
    apiUrl.addEventListener('change', () => {
      setStoredApiUrl(apiUrl.value);
    });
  </script>
</body>
</html>










`, { width: 400, height: 700 });
// Map to store created nodes by ID
const nodeMap = new Map();
const nodeDataMap = new Map();
const imageHashCache = new Map();
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'convert') {
        try {
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Sending request to backend...' });
            const response = await fetch(`${msg.apiUrl}/render-html-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    htmlContent: msg.htmlContent,
                    options: msg.options,
                }),
            });
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
            await createFigmaNodes(data.nodes);
            figma.ui.postMessage({ type: 'conversion-complete', data });
            figma.notify(`Created ${data.nodes.length} Figma nodes.`);
        }
        catch (error) {
            console.error('Conversion error:', error);
            const message = (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error occurred';
            figma.ui.postMessage({ type: 'conversion-error', error: message });
            figma.notify(`Error: ${message}`, { error: true });
        }
    }
    else if (msg.type === 'convert-exact-url') {
        try {
            if (!msg.url) {
                throw new Error('URL is required for exact conversion');
            }
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Rendering URL via exact pipeline...' });
            const response = await fetch(`${msg.apiUrl}/render-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: msg.url,
                    viewport: msg.viewport,
                    waitUntil: msg.waitUntil,
                }),
            });
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
            await createFigmaNodes(data.nodes);
            figma.ui.postMessage({ type: 'conversion-complete', data });
            figma.notify(`Created ${data.nodes.length} nodes from exact replica.`);
        }
        catch (error) {
            console.error('Exact conversion error:', error);
            const message = (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error occurred';
            figma.ui.postMessage({ type: 'conversion-error', error: message });
            figma.notify(`Error: ${message}`, { error: true });
        }
    }
    else if (msg.type === 'convert-h2d') {
        try {
            if (!msg.data) {
                throw new Error('H2D payload missing');
            }
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Importing H2D archive...' });
            const response = await fetch(`${msg.apiUrl}/import-h2d`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data: msg.data, filename: msg.filename }),
            });
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
            await createFigmaNodes(data.nodes);
            figma.ui.postMessage({ type: 'conversion-complete', data });
            figma.notify(`Imported ${data.nodes.length} nodes from H2D archive.`);
        }
        catch (error) {
            console.error('H2D import error:', error);
            const message = (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error occurred';
            figma.ui.postMessage({ type: 'conversion-error', error: message });
            figma.notify(`Error: ${message}`, { error: true });
        }
    }
    else if (msg.type === 'import-file') {
        figma.notify('File import not yet supported. Please paste HTML directly.', { timeout: 3000 });
    }
};
async function createFigmaNodes(nodes) {
    nodeMap.clear();
    nodeDataMap.clear();
    nodes.forEach((node) => nodeDataMap.set(node.id, node));
    // Sort nodes by dependency (parents first)
    const sortedNodes = topologicalSort(nodes);
    // Create nodes in order
    for (const nodeData of sortedNodes) {
        await createNode(nodeData);
    }
    // Focus on the root nodes
    const rootNodes = Array.from(nodeMap.values()).filter((node) => !nodes.find((n) => n.id === node.parentId));
    if (rootNodes.length > 0) {
        figma.currentPage.selection = rootNodes;
        figma.viewport.scrollAndZoomIntoView(rootNodes);
    }
}
function topologicalSort(nodes) {
    const sorted = [];
    const visited = new Set();
    function visit(nodeId) {
        if (visited.has(nodeId))
            return;
        const node = nodes.find((n) => n.id === nodeId);
        if (!node)
            return;
        if (node.parentId) {
            visit(node.parentId);
        }
        visited.add(nodeId);
        sorted.push(node);
    }
    nodes.forEach((node) => visit(node.id));
    return sorted;
}
async function createNode(nodeData) {
    var _a, _b;
    let node = null;
    try {
        if (nodeData.type === 'TEXT') {
            node = await createTextNode(nodeData);
        }
        else if (nodeData.type === 'IMAGE') {
            node = await createImageNode(nodeData);
        }
        else if (nodeData.type === 'FRAME') {
            node = createFrameNode(nodeData);
        }
        if (!node)
            return null;
        // Set common properties
        node.name = nodeData.name || nodeData.type.toLowerCase();
        if (typeof nodeData.visible === 'boolean') {
            node.visible = nodeData.visible;
        }
        if (((_b = (_a = nodeData.meta) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.role) === 'screenshot' && 'locked' in node) {
            node.locked = true;
        }
        // Store in map
        nodeMap.set(nodeData.id, node);
        const parentNode = nodeData.parentId ? nodeMap.get(nodeData.parentId) : undefined;
        const parentData = nodeData.parentId ? nodeDataMap.get(nodeData.parentId) : undefined;
        if (parentNode && 'appendChild' in parentNode) {
            parentNode.appendChild(node);
        }
        else {
            figma.currentPage.appendChild(node);
        }
        applyLayoutParticipation(node, nodeData, parentData);
        applyPosition(node, nodeData, parentData);
        return node;
    }
    catch (error) {
        console.error(`Error creating node ${nodeData.id}:`, error);
        return null;
    }
}
function applyPosition(node, nodeData, parentData) {
    const parentLayoutMode = (parentData === null || parentData === void 0 ? void 0 : parentData.layoutMode) && parentData.layoutMode !== 'NONE';
    const isAbsolute = nodeData.layoutPositioning === 'ABSOLUTE';
    const layoutNode = node;
    // For absolute positioned elements, always set position
    if (isAbsolute && 'layoutPositioning' in layoutNode) {
        layoutNode.layoutPositioning = 'ABSOLUTE';
    }
    // Calculate position relative to parent
    const offsetX = parentData ? parentData.boundingBox.x : 0;
    const offsetY = parentData ? parentData.boundingBox.y : 0;
    // If parent has auto layout but child is not absolute, skip position setting
    // Figma auto layout will handle positioning
    if (parentLayoutMode && !isAbsolute) {
        return;
    }
    // Set position for:
    // 1. Nodes without auto layout parents
    // 2. Absolutely positioned nodes
    layoutNode.x = nodeData.boundingBox.x - offsetX;
    layoutNode.y = nodeData.boundingBox.y - offsetY;
}
function applyLayoutParticipation(node, nodeData, parentData) {
    const layoutNode = node;
    if ('layoutPositioning' in layoutNode) {
        layoutNode.layoutPositioning = nodeData.layoutPositioning === 'ABSOLUTE' ? 'ABSOLUTE' : 'AUTO';
    }
    if (!parentData || parentData.layoutMode === 'NONE') {
        return;
    }
    if (nodeData.layoutAlign) {
        layoutNode.layoutAlign = nodeData.layoutAlign;
    }
    if (nodeData.layoutGrow !== undefined) {
        layoutNode.layoutGrow = nodeData.layoutGrow;
    }
    if (nodeData.layoutShrink !== undefined && 'layoutShrink' in layoutNode) {
        layoutNode.layoutShrink = nodeData.layoutShrink;
    }
    if (nodeData.layoutBasis !== undefined && 'layoutBasis' in layoutNode) {
        layoutNode.layoutBasis = nodeData.layoutBasis;
    }
}
function createFrameNode(nodeData) {
    const frame = figma.createFrame();
    // Size
    frame.resize(Math.max(nodeData.boundingBox.width, 1), Math.max(nodeData.boundingBox.height, 1));
    // Fills
    if (nodeData.fills && nodeData.fills.length > 0) {
        frame.fills = convertFills(nodeData.fills);
    }
    // Strokes
    if (nodeData.strokes && nodeData.strokes.length > 0) {
        frame.strokes = convertFills(nodeData.strokes);
    }
    if (nodeData.strokeWeight !== undefined) {
        frame.strokeWeight = nodeData.strokeWeight;
    }
    if (nodeData.strokeAlign) {
        frame.strokeAlign = nodeData.strokeAlign;
    }
    // Corner radius
    if (nodeData.cornerRadius !== undefined) {
        if (typeof nodeData.cornerRadius === 'number') {
            frame.cornerRadius = nodeData.cornerRadius;
        }
        else {
            frame.topLeftRadius = nodeData.cornerRadius.topLeft;
            frame.topRightRadius = nodeData.cornerRadius.topRight;
            frame.bottomRightRadius = nodeData.cornerRadius.bottomRight;
            frame.bottomLeftRadius = nodeData.cornerRadius.bottomLeft;
        }
    }
    // Effects
    if (nodeData.effects && nodeData.effects.length > 0) {
        frame.effects = convertEffects(nodeData.effects);
    }
    // Auto Layout
    if (nodeData.layoutMode && nodeData.layoutMode !== 'NONE') {
        frame.layoutMode = nodeData.layoutMode;
        if (nodeData.itemSpacing !== undefined) {
            frame.itemSpacing = nodeData.itemSpacing;
        }
        if (nodeData.padding) {
            frame.paddingTop = nodeData.padding.top;
            frame.paddingRight = nodeData.padding.right;
            frame.paddingBottom = nodeData.padding.bottom;
            frame.paddingLeft = nodeData.padding.left;
        }
        if (nodeData.primaryAxisAlignItems) {
            frame.primaryAxisAlignItems = nodeData.primaryAxisAlignItems;
        }
        if (nodeData.counterAxisAlignItems) {
            // Figma API doesn't support STRETCH for counterAxisAlignItems
            // Map STRETCH to MAX as a reasonable fallback
            const alignValue = nodeData.counterAxisAlignItems === 'STRETCH' ? 'MAX' : nodeData.counterAxisAlignItems;
            frame.counterAxisAlignItems = alignValue;
        }
        if (nodeData.primaryAxisSizingMode) {
            frame.primaryAxisSizingMode = nodeData.primaryAxisSizingMode;
        }
        if (nodeData.counterAxisSizingMode) {
            frame.counterAxisSizingMode = nodeData.counterAxisSizingMode;
        }
        if (nodeData.layoutWrap) {
            frame.layoutWrap = nodeData.layoutWrap;
        }
        if (nodeData.primaryAxisAlignContent && 'primaryAxisAlignContent' in frame) {
            frame.primaryAxisAlignContent = nodeData.primaryAxisAlignContent;
        }
    }
    // Overflow
    if (nodeData.overflowDirection) {
        // Note: Figma doesn't have direct overflow property, using clipsContent
        frame.clipsContent = nodeData.overflowDirection === 'NONE';
    }
    if (nodeData.clipsContent !== undefined) {
        frame.clipsContent = nodeData.clipsContent;
    }
    if (nodeData.layoutPositioning === 'ABSOLUTE' && 'layoutPositioning' in frame) {
        frame.layoutPositioning = 'ABSOLUTE';
    }
    return frame;
}
async function createImageNode(nodeData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const rect = figma.createRectangle();
    // Size
    rect.resize(Math.max(nodeData.boundingBox.width, 1), Math.max(nodeData.boundingBox.height, 1));
    const imageSrc = (_b = (_a = nodeData.meta) === null || _a === void 0 ? void 0 : _a.attributes) === null || _b === void 0 ? void 0 : _b.src;
    const imageData = (_c = nodeData.meta) === null || _c === void 0 ? void 0 : _c.imageData;
    const alt = (_e = (_d = nodeData.meta) === null || _d === void 0 ? void 0 : _d.attributes) === null || _e === void 0 ? void 0 : _e.alt;
    // Try to use actual image data if available
    if (imageData) {
        try {
            // Check if it's an SVG data URL
            const isSvg = imageData.startsWith('data:image/svg+xml');
            if (isSvg) {
                // For SVG, try to convert it to PNG first
                // Figma doesn't support SVG fills directly, so we need to rasterize
                try {
                    const bytes = decodeBase64ToUint8Array(imageData);
                    const image = figma.createImage(bytes);
                    rect.fills = [{
                            type: 'IMAGE',
                            imageHash: image.hash,
                            scaleMode: 'FIT',
                        }];
                    rect.name = alt || 'SVG Image';
                }
                catch (svgError) {
                    // SVG conversion failed, use placeholder
                    console.warn('Could not convert SVG to image:', svgError);
                    rect.fills = [{
                            type: 'SOLID',
                            color: { r: 0.95, g: 0.95, b: 0.95 },
                        }];
                    rect.name = alt || 'SVG (conversion failed)';
                }
            }
            else {
                // Regular image (PNG/JPG)
                const bytes = decodeBase64ToUint8Array(imageData);
                const image = figma.createImage(bytes);
                // Use image as fill
                rect.fills = [{
                        type: 'IMAGE',
                        imageHash: image.hash,
                        scaleMode: 'FIT',
                    }];
                // Set name
                if (alt) {
                    rect.name = alt;
                }
                else if (imageSrc) {
                    const srcName = imageSrc.substring(imageSrc.lastIndexOf('/') + 1);
                    rect.name = srcName.length > 30 ? srcName.substring(0, 30) : srcName;
                }
                else {
                    rect.name = 'Image';
                }
            }
        }
        catch (error) {
            console.error('Failed to create image from data:', error);
            // Fallback to placeholder
            rect.fills = [{
                    type: 'SOLID',
                    color: { r: 0.9, g: 0.9, b: 0.9 },
                }];
            rect.name = alt || 'Image (load failed)';
            // Add warning text overlay
            rect.strokes = [{
                    type: 'SOLID',
                    color: { r: 0.9, g: 0.5, b: 0.1 },
                }];
            rect.strokeWeight = 2;
        }
    }
    else if (imageSrc) {
        // No image data available - create placeholder
        rect.fills = [{
                type: 'SOLID',
                color: { r: 0.9, g: 0.9, b: 0.9 },
            }];
        if (alt) {
            rect.name = `Image: ${alt}`;
        }
        else {
            rect.name = `Image: ${imageSrc.substring(imageSrc.lastIndexOf('/') + 1, imageSrc.lastIndexOf('/') + 30)}`;
        }
        // Add border to indicate it's a placeholder
        rect.strokes = [{
                type: 'SOLID',
                color: { r: 0.7, g: 0.7, b: 0.7 },
            }];
        rect.strokeWeight = 1;
    }
    else {
        // Fallback placeholder
        rect.fills = [{
                type: 'SOLID',
                color: { r: 0.85, g: 0.85, b: 0.85 },
            }];
        rect.name = 'Image (no src)';
        rect.strokes = [{
                type: 'SOLID',
                color: { r: 0.7, g: 0.7, b: 0.7 },
            }];
        rect.strokeWeight = 1;
    }
    // Check if it's a logo or icon from meta
    const isLogo = ((_g = (_f = nodeData.meta) === null || _f === void 0 ? void 0 : _f.imageData) === null || _g === void 0 ? void 0 : _g.isLogo) || ((_j = (_h = nodeData.meta) === null || _h === void 0 ? void 0 : _h.classes) === null || _j === void 0 ? void 0 : _j.some((c) => /logo/i.test(c)));
    const isIcon = ((_l = (_k = nodeData.meta) === null || _k === void 0 ? void 0 : _k.imageData) === null || _l === void 0 ? void 0 : _l.isIcon) || ((_o = (_m = nodeData.meta) === null || _m === void 0 ? void 0 : _m.classes) === null || _o === void 0 ? void 0 : _o.some((c) => /icon/i.test(c)));
    if (isIcon) {
        rect.cornerRadius = nodeData.boundingBox.width / 4;
    }
    else if (isLogo) {
        rect.cornerRadius = 4;
    }
    return rect;
}
async function createTextNode(nodeData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const text = figma.createText();
    // Load font before mutating text properties
    const fontFamily = ((_a = nodeData.text) === null || _a === void 0 ? void 0 : _a.fontFamily) || 'Inter';
    const fontWeight = normalizeFontWeight((_b = nodeData.text) === null || _b === void 0 ? void 0 : _b.fontWeight);
    const fontStyle = resolveFontStyle(fontWeight, (_c = nodeData.text) === null || _c === void 0 ? void 0 : _c.fontStyle);
    let fontName = { family: fontFamily, style: fontStyle };
    try {
        await figma.loadFontAsync(fontName);
    }
    catch (error) {
        // Fallback to Inter with similar weight/style if requested font is unavailable
        const fallbackWeight = normalizeFontWeight((_d = nodeData.text) === null || _d === void 0 ? void 0 : _d.fontWeight);
        const fallbackStyle = resolveFontStyle(fallbackWeight, (_e = nodeData.text) === null || _e === void 0 ? void 0 : _e.fontStyle);
        fontName = { family: 'Inter', style: fallbackStyle };
        try {
            await figma.loadFontAsync(fontName);
        }
        catch (_q) {
            fontName = { family: 'Inter', style: 'Regular' };
            await figma.loadFontAsync(fontName);
        }
    }
    text.fontName = fontName;
    // Text content
    text.characters = ((_f = nodeData.text) === null || _f === void 0 ? void 0 : _f.characters) || '';
    // Font size (set before resizing)
    if ((_g = nodeData.text) === null || _g === void 0 ? void 0 : _g.fontSize) {
        text.fontSize = nodeData.text.fontSize;
    }
    // Size - use auto-resize to prevent truncation
    if (nodeData.boundingBox.width > 0) {
        // Set text auto-resize to WIDTH_AND_HEIGHT first to get full dimensions
        text.textAutoResize = 'WIDTH_AND_HEIGHT';
        // Get the natural size of the text
        const naturalWidth = text.width;
        const naturalHeight = text.height;
        // If the bounding box width is larger than natural width, use fixed width
        if (nodeData.boundingBox.width >= naturalWidth) {
            text.textAutoResize = 'HEIGHT';
            text.resize(nodeData.boundingBox.width, text.height);
        }
        // Otherwise, let it auto-resize to show full text
        else {
            text.textAutoResize = 'WIDTH_AND_HEIGHT';
        }
    }
    else {
        // If no width specified, use auto-resize
        text.textAutoResize = 'WIDTH_AND_HEIGHT';
    }
    // Line height
    if ((_h = nodeData.text) === null || _h === void 0 ? void 0 : _h.lineHeight) {
        if (nodeData.text.lineHeight < 10) {
            // Relative line height (e.g., 1.6)
            text.lineHeight = { value: nodeData.text.lineHeight * 100, unit: 'PERCENT' };
        }
        else {
            // Absolute line height (e.g., 24px)
            text.lineHeight = { value: nodeData.text.lineHeight, unit: 'PIXELS' };
        }
    }
    // Letter spacing
    if ((_j = nodeData.text) === null || _j === void 0 ? void 0 : _j.letterSpacing) {
        text.letterSpacing = { value: nodeData.text.letterSpacing, unit: 'PIXELS' };
    }
    // Text alignment
    if ((_k = nodeData.text) === null || _k === void 0 ? void 0 : _k.textAlignHorizontal) {
        text.textAlignHorizontal = nodeData.text.textAlignHorizontal;
    }
    if ((_l = nodeData.text) === null || _l === void 0 ? void 0 : _l.textAlignVertical) {
        text.textAlignVertical = nodeData.text.textAlignVertical;
    }
    if ((_m = nodeData.text) === null || _m === void 0 ? void 0 : _m.textCase) {
        text.textCase = nodeData.text.textCase;
    }
    if ((_o = nodeData.text) === null || _o === void 0 ? void 0 : _o.textDecoration) {
        text.textDecoration = nodeData.text.textDecoration;
    }
    // Text fills
    if (((_p = nodeData.text) === null || _p === void 0 ? void 0 : _p.fills) && nodeData.text.fills.length > 0) {
        text.fills = convertFills(nodeData.text.fills);
    }
    return text;
}
function normalizeFontWeight(weight) {
    if (!weight)
        return 'Regular';
    const weightMap = {
        '100': 'Thin',
        '200': 'Extra Light',
        '300': 'Light',
        '400': 'Regular',
        '500': 'Medium',
        '600': 'Semi Bold',
        '700': 'Bold',
        '800': 'Extra Bold',
        '900': 'Black',
        'normal': 'Regular',
        'bold': 'Bold',
    };
    return weightMap[weight.toString()] || 'Regular';
}
function resolveFontStyle(weightStyle, fontStyle) {
    if (!fontStyle || fontStyle === 'normal') {
        return weightStyle;
    }
    const lowered = fontStyle.toLowerCase();
    if (lowered === 'italic' || lowered === 'oblique') {
        if (weightStyle.toLowerCase().includes('italic')) {
            return weightStyle;
        }
        if (weightStyle === 'Regular') {
            return 'Italic';
        }
        return `${weightStyle} Italic`;
    }
    return weightStyle;
}
function decodeBase64ToUint8Array(base64) {
    const normalized = base64.includes(',') ? base64.split(',').pop() : base64;
    const globalAtob = typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function'
        ? globalThis.atob
        : undefined;
    if (globalAtob) {
        const binary = globalAtob(normalized);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    const cleaned = normalized.replace(/[^A-Za-z0-9+/=]/g, '');
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const output = [];
    let index = 0;
    while (index < cleaned.length) {
        const enc1 = base64Chars.indexOf(cleaned.charAt(index++));
        const enc2 = base64Chars.indexOf(cleaned.charAt(index++));
        const enc3 = base64Chars.indexOf(cleaned.charAt(index++));
        const enc4 = base64Chars.indexOf(cleaned.charAt(index++));
        if (enc1 < 0 || enc2 < 0) {
            break;
        }
        const chr1 = (enc1 << 2) | (enc2 >> 4);
        output.push(chr1 & 0xff);
        if (enc3 >= 0 && enc3 < 64) {
            const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            output.push(chr2 & 0xff);
            if (enc4 >= 0 && enc4 < 64) {
                const chr3 = ((enc3 & 3) << 6) | enc4;
                output.push(chr3 & 0xff);
            }
        }
    }
    return new Uint8Array(output);
}
function convertFills(fills) {
    return fills.map((fill) => {
        var _a, _b;
        if (fill.type === 'SOLID') {
            return {
                type: 'SOLID',
                color: {
                    r: fill.color.r,
                    g: fill.color.g,
                    b: fill.color.b,
                },
                opacity: fill.color.a !== undefined ? fill.color.a : (fill.opacity || 1),
            };
        }
        else if (fill.type === 'GRADIENT_LINEAR') {
            return {
                type: 'GRADIENT_LINEAR',
                gradientStops: fill.gradientStops.map((stop) => ({
                    position: stop.position,
                    color: {
                        r: stop.color.r,
                        g: stop.color.g,
                        b: stop.color.b,
                        a: stop.color.a !== undefined ? stop.color.a : 1,
                    },
                })),
                gradientTransform: calculateGradientTransform(fill.gradientHandlePositions || []),
            };
        }
        else if (fill.type === 'IMAGE') {
            const cacheKey = (_a = fill.imageRef) !== null && _a !== void 0 ? _a : fill.imageData;
            let imageHash = cacheKey ? imageHashCache.get(cacheKey) : undefined;
            if (!imageHash) {
                if (!fill.imageData) {
                    console.warn('Image fill missing imageData; skipping image fill');
                    return {
                        type: 'SOLID',
                        color: { r: 0, g: 0, b: 0 },
                        opacity: 0,
                    };
                }
                const bytes = decodeBase64ToUint8Array(fill.imageData);
                const image = figma.createImage(bytes);
                imageHash = image.hash;
                if (cacheKey) {
                    imageHashCache.set(cacheKey, imageHash);
                }
            }
            return {
                type: 'IMAGE',
                imageHash,
                scaleMode: (_b = fill.scaleMode) !== null && _b !== void 0 ? _b : 'FILL',
            };
        }
        // Default fallback
        return {
            type: 'SOLID',
            color: { r: 0, g: 0, b: 0 },
            opacity: 1,
        };
    });
}
function calculateGradientTransform(handles) {
    if (handles.length < 2) {
        return [[1, 0, 0], [0, 1, 0]];
    }
    const start = handles[0];
    const end = handles[1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
        return [[1, 0, 0], [0, 1, 0]];
    }
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
        [cos * length, -sin * length, start.x],
        [sin * length, cos * length, start.y],
    ];
}
function convertEffects(effects) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const result = [];
    for (const effect of effects) {
        if (effect.type === 'DROP_SHADOW') {
            result.push({
                type: 'DROP_SHADOW',
                color: {
                    r: ((_a = effect.color) === null || _a === void 0 ? void 0 : _a.r) || 0,
                    g: ((_b = effect.color) === null || _b === void 0 ? void 0 : _b.g) || 0,
                    b: ((_c = effect.color) === null || _c === void 0 ? void 0 : _c.b) || 0,
                    a: ((_d = effect.color) === null || _d === void 0 ? void 0 : _d.a) || 0.25,
                },
                offset: {
                    x: ((_e = effect.offset) === null || _e === void 0 ? void 0 : _e.x) || 0,
                    y: ((_f = effect.offset) === null || _f === void 0 ? void 0 : _f.y) || 0,
                },
                radius: effect.radius || 4,
                visible: effect.visible !== false,
                blendMode: 'NORMAL',
            });
        }
        else if (effect.type === 'INNER_SHADOW') {
            result.push({
                type: 'INNER_SHADOW',
                color: {
                    r: ((_g = effect.color) === null || _g === void 0 ? void 0 : _g.r) || 0,
                    g: ((_h = effect.color) === null || _h === void 0 ? void 0 : _h.g) || 0,
                    b: ((_j = effect.color) === null || _j === void 0 ? void 0 : _j.b) || 0,
                    a: ((_k = effect.color) === null || _k === void 0 ? void 0 : _k.a) || 0.25,
                },
                offset: {
                    x: ((_l = effect.offset) === null || _l === void 0 ? void 0 : _l.x) || 0,
                    y: ((_m = effect.offset) === null || _m === void 0 ? void 0 : _m.y) || 0,
                },
                radius: effect.radius || 4,
                visible: effect.visible !== false,
                blendMode: 'NORMAL',
            });
        }
        else if (effect.type === 'LAYER_BLUR') {
            result.push({
                type: 'LAYER_BLUR',
                radius: effect.radius || 4,
                visible: effect.visible !== false,
            });
        }
    }
    return result;
}
