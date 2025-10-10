"use strict";
// Figma Plugin Main Code
// This runs in the Figma plugin sandbox
figma.showUI(`﻿<!DOCTYPE html>
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
\r\n    const statusDiv = document.getElementById('status');
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
    }

    function hideLoader() {
      loader.style.display = 'none';
      convertBtn.disabled = false;
    }

    function updateStats(data) {
      if (data.nodes) {
        document.getElementById('stat-nodes').textContent = data.nodes.length;
      }
      if (data.meta && data.meta.render) {
        const time = Math.round(data.meta.render.processingTimeMs);
        document.getElementById('stat-time').textContent = time + 'ms';
      }
      if (data.quality) {
        const accuracy = Math.round(data.quality.accuracyScore * 100);
        document.getElementById('stat-accuracy').textContent = accuracy + '%';
      }
      if (data.meta && data.meta.info) {
        const aiSuggestions = data.meta.info.find(i => i.includes('AI-driven'));
        if (aiSuggestions) {
          const match = aiSuggestions.match(/(\d+)/);
          if (match) {
            document.getElementById('stat-ai').textContent = match[1];
          }
        }
      }
      statsDiv.style.display = 'block';
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

      // Send to plugin code
      parent.postMessage({
        pluginMessage: {
          type: 'convert',
          htmlContent,
          apiUrl: apiUrl.value,
          options
        }
      }, '*');
    });

    importFileBtn.addEventListener('click', () => {
      parent.postMessage({
        pluginMessage: {
          type: 'import-file'
        }
      }, '*');
    });

    // Listen for messages from plugin code
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;

      if (msg.type === 'conversion-complete') {
        hideLoader();
        showStatus(\`??Successfully created \${msg.data.nodes.length} Figma nodes!\`, 'success');
        updateStats(msg.data);
      } else if (msg.type === 'conversion-error') {
        hideLoader();
        showStatus(\`??Error: \${msg.error}\`, 'error');
      } else if (msg.type === 'conversion-progress') {
        showStatus(\`??\${msg.message}\`, 'info');
      } else if (msg.type === 'file-selected') {
        htmlInput.value = msg.content;
        showStatus('??File loaded successfully', 'success');
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
figma.ui.onmessage = async (msg) => {
    if (msg.type === 'convert') {
        try {
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Sending request to backend...' });
            // Call backend API
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
            // Create Figma nodes from the response
            await createFigmaNodes(data.nodes);
            figma.ui.postMessage({
                type: 'conversion-complete',
                data: data,
            });
            figma.notify(`??Successfully created ${data.nodes.length} Figma nodes!`);
        }
        catch (error) {
            console.error('Conversion error:', error);
            figma.ui.postMessage({
                type: 'conversion-error',
                error: error.message || 'Unknown error occurred',
            });
            figma.notify(`??Error: ${error.message}`, { error: true });
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
    let node = null;
    try {
        if (nodeData.type === 'TEXT') {
            node = await createTextNode(nodeData);
        }
        else if (nodeData.type === 'FRAME') {
            node = createFrameNode(nodeData);
        }
        if (!node)
            return null;
        // Set common properties
        node.name = nodeData.name || nodeData.type.toLowerCase();
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
    if (parentLayoutMode) {
        return;
    }
    const offsetX = parentData ? parentData.boundingBox.x : 0;
    const offsetY = parentData ? parentData.boundingBox.y : 0;
    const layoutNode = node;
    layoutNode.x = nodeData.boundingBox.x - offsetX;
    layoutNode.y = nodeData.boundingBox.y - offsetY;
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
    }
    // Overflow
    if (nodeData.overflowDirection) {
        // Note: Figma doesn't have direct overflow property, using clipsContent
        frame.clipsContent = nodeData.overflowDirection === 'NONE';
    }
    if (nodeData.clipsContent !== undefined) {
        frame.clipsContent = nodeData.clipsContent;
    }
    return frame;
}
async function createTextNode(nodeData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const text = figma.createText();
    // Load font before mutating text properties
    const fontFamily = ((_a = nodeData.text) === null || _a === void 0 ? void 0 : _a.fontFamily) || 'Inter';
    const fontWeight = normalizeFontWeight((_b = nodeData.text) === null || _b === void 0 ? void 0 : _b.fontWeight);
    let fontName = { family: fontFamily, style: fontWeight };
    try {
        await figma.loadFontAsync(fontName);
    }
    catch (error) {
        // Fallback to Inter Regular if requested font is unavailable
        fontName = { family: 'Inter', style: 'Regular' };
        await figma.loadFontAsync(fontName);
    }
    text.fontName = fontName;
    // Text content
    text.characters = ((_c = nodeData.text) === null || _c === void 0 ? void 0 : _c.characters) || '';
    // Size
    if (nodeData.boundingBox.width > 0) {
        text.resize(nodeData.boundingBox.width, nodeData.boundingBox.height || 100);
    }
    // Font size
    if ((_d = nodeData.text) === null || _d === void 0 ? void 0 : _d.fontSize) {
        text.fontSize = nodeData.text.fontSize;
    }
    // Line height
    if ((_e = nodeData.text) === null || _e === void 0 ? void 0 : _e.lineHeight) {
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
    if ((_f = nodeData.text) === null || _f === void 0 ? void 0 : _f.letterSpacing) {
        text.letterSpacing = { value: nodeData.text.letterSpacing, unit: 'PIXELS' };
    }
    // Text alignment
    if ((_g = nodeData.text) === null || _g === void 0 ? void 0 : _g.textAlignHorizontal) {
        text.textAlignHorizontal = nodeData.text.textAlignHorizontal;
    }
    if ((_h = nodeData.text) === null || _h === void 0 ? void 0 : _h.textAlignVertical) {
        text.textAlignVertical = nodeData.text.textAlignVertical;
    }
    // Text fills
    if (((_j = nodeData.text) === null || _j === void 0 ? void 0 : _j.fills) && nodeData.text.fills.length > 0) {
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
function convertFills(fills) {
    return fills.map((fill) => {
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
