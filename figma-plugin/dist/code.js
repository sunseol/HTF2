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
        // Figma 플러그인 샌드박스에서는 localStorage 접근이 제한됨
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
        // Figma 플러그인 샌드박스에서는 localStorage 접근이 제한됨
      }
    }

    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
    } catch (err) {
      storageAvailable = false;
      // Figma 플러그인 샌드박스에서는 localStorage가 비활성화되어 있음 (정상 동작)
      console.info('Local storage unavailable in Figma plugin sandbox, using in-memory cache.');
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
// 스프라이트 시트 이미지 캐시
let spriteSheetImageHash;
figma.ui.onmessage = async (msg) => {
    var _a, _b, _c;
    if (msg.type === 'convert') {
        try {
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Sending request to backend...' });
            // 타임아웃이 있는 fetch 구현
            const response = await Promise.race([
                fetch(`${msg.apiUrl}/render-html-text`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        htmlContent: msg.htmlContent,
                        options: msg.options,
                    }),
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout: Backend took too long to respond')), 60000))
            ]);
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
            await createFigmaNodes(data.nodes, (_a = data.meta) === null || _a === void 0 ? void 0 : _a.spriteSheet);
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
            // 타임아웃이 있는 fetch 구현
            const response = await Promise.race([
                fetch(`${msg.apiUrl}/render-url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: msg.url,
                        viewport: msg.viewport,
                        waitUntil: msg.waitUntil,
                    }),
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout: Backend took too long to respond')), 60000))
            ]);
            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            figma.ui.postMessage({ type: 'conversion-progress', message: 'Creating Figma nodes...' });
            await createFigmaNodes(data.nodes, (_b = data.meta) === null || _b === void 0 ? void 0 : _b.spriteSheet);
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
            await createFigmaNodes(data.nodes, (_c = data.meta) === null || _c === void 0 ? void 0 : _c.spriteSheet);
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
async function createFigmaNodes(nodes, spriteSheet) {
    nodeMap.clear();
    nodeDataMap.clear();
    spriteSheetImageHash = undefined;
    nodes.forEach((node) => nodeDataMap.set(node.id, node));
    // 스프라이트 시트 이미지가 있으면 미리 로드
    if (spriteSheet && spriteSheet.spriteImage) {
        try {
            const base64Data = spriteSheet.spriteImage.includes('base64,')
                ? spriteSheet.spriteImage.split('base64,')[1]
                : spriteSheet.spriteImage;
            const bytes = decodeBase64ToUint8Array(base64Data);
            const image = figma.createImage(bytes);
            spriteSheetImageHash = image.hash;
            console.log('Sprite sheet loaded:', {
                hash: spriteSheetImageHash,
                size: `${spriteSheet.totalWidth}x${spriteSheet.totalHeight}`,
                imageCount: spriteSheet.images.length
            });
        }
        catch (error) {
            console.error('Failed to load sprite sheet:', error);
        }
    }
    // Calculate the bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((node) => {
        minX = Math.min(minX, node.boundingBox.x);
        minY = Math.min(minY, node.boundingBox.y);
        maxX = Math.max(maxX, node.boundingBox.x + node.boundingBox.width);
        maxY = Math.max(maxY, node.boundingBox.y + node.boundingBox.height);
    });
    const containerWidth = maxX - minX;
    const containerHeight = maxY - minY;
    // Create a root container frame - ensure it's large enough to contain all content
    const rootContainer = figma.createFrame();
    rootContainer.name = 'HTML Import';
    // Add padding to ensure all content fits comfortably
    const finalWidth = Math.max(containerWidth + 40, 1920);
    const finalHeight = Math.max(containerHeight + 40, 100);
    rootContainer.resize(finalWidth, finalHeight);
    rootContainer.x = 0;
    rootContainer.y = 0;
    rootContainer.fills = []; // Transparent background
    rootContainer.clipsContent = false; // Don't clip content
    figma.currentPage.appendChild(rootContainer);
    // Sort nodes by dependency (parents first)
    const sortedNodes = topologicalSort(nodes);
    // Create nodes in order
    for (const nodeData of sortedNodes) {
        await createNode(nodeData, rootContainer, minX - 20, minY - 20); // Add 20px offset for padding
    }
    // Adjust layer order: bring image nodes to front
    const imageNodes = [];
    // Collect image nodes based on original node data
    nodeMap.forEach((node, nodeId) => {
        const nodeData = nodeDataMap.get(nodeId);
        if (nodeData && nodeData.type === 'IMAGE') {
            imageNodes.push(node);
        }
    });
    // Bring image nodes to front
    imageNodes.forEach((imageNode) => {
        try {
            // Use moveInParentOrder to bring to front
            const parent = imageNode.parent;
            if (parent && 'children' in parent) {
                // Move to the end of parent's children array (front layer)
                parent.appendChild(imageNode);
                console.log('Brought image node to front:', imageNode.name);
            }
        }
        catch (error) {
            console.warn('Failed to bring image node to front:', imageNode.name, error);
        }
    });
    console.log(`Layer order adjusted: ${imageNodes.length} image nodes brought to front`);
    // Focus on the root container
    figma.currentPage.selection = [rootContainer];
    figma.viewport.scrollAndZoomIntoView([rootContainer]);
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
async function createNode(nodeData, rootContainer, offsetX, offsetY) {
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
            // Attach root nodes to the root container
            rootContainer.appendChild(node);
        }
        applyLayoutParticipation(node, nodeData, parentData);
        applyPosition(node, nodeData, parentData, offsetX, offsetY);
        return node;
    }
    catch (error) {
        console.error(`Error creating node ${nodeData.id}:`, error);
        return null;
    }
}
function applyPosition(node, nodeData, parentData, rootOffsetX = 0, rootOffsetY = 0) {
    var _a;
    const parentLayoutMode = (parentData === null || parentData === void 0 ? void 0 : parentData.layoutMode) && parentData.layoutMode !== 'NONE';
    const isAbsolute = nodeData.layoutPositioning === 'ABSOLUTE';
    const layoutNode = node;
    // Only set ABSOLUTE positioning if parent has auto layout (layoutMode !== 'NONE')
    if (isAbsolute && parentLayoutMode && 'layoutPositioning' in layoutNode) {
        layoutNode.layoutPositioning = 'ABSOLUTE';
    }
    // If parent has auto layout but child is not absolute, skip position setting
    // Figma auto layout will handle positioning
    if (parentLayoutMode && !isAbsolute) {
        return;
    }
    // Calculate position relative to parent or root
    let offsetX;
    let offsetY;
    // 정확한 이미지 위치 정보가 있으면 우선 사용
    if ((_a = nodeData.meta) === null || _a === void 0 ? void 0 : _a.accurateImageInfo) {
        const accurateInfo = nodeData.meta.accurateImageInfo;
        offsetX = accurateInfo.x;
        offsetY = accurateInfo.y;
        console.log('Using accurate image position:', {
            id: nodeData.id,
            original: { x: nodeData.boundingBox.x, y: nodeData.boundingBox.y },
            accurate: { x: accurateInfo.x, y: accurateInfo.y }
        });
    }
    else {
        if (parentData) {
            // Position relative to parent
            offsetX = parentData.boundingBox.x;
            offsetY = parentData.boundingBox.y;
        }
        else {
            // Position relative to root container (apply global offset)
            offsetX = rootOffsetX;
            offsetY = rootOffsetY;
        }
    }
    // 정확한 위치 계산 - 반올림으로 픽셀 단위 정렬
    const finalX = Math.round(nodeData.boundingBox.x - offsetX);
    const finalY = Math.round(nodeData.boundingBox.y - offsetY);
    // Set position for:
    // 1. Nodes without auto layout parents
    // 2. Absolutely positioned nodes
    layoutNode.x = finalX;
    layoutNode.y = finalY;
    console.log('Applied position:', {
        id: nodeData.id,
        name: nodeData.name,
        type: nodeData.type,
        originalX: nodeData.boundingBox.x,
        originalY: nodeData.boundingBox.y,
        finalX,
        finalY,
        offsetX,
        offsetY
    });
}
function applyLayoutParticipation(node, nodeData, parentData) {
    const layoutNode = node;
    // If parent doesn't exist or has no auto layout, set to AUTO and return early
    if (!parentData || parentData.layoutMode === 'NONE') {
        if ('layoutPositioning' in layoutNode) {
            layoutNode.layoutPositioning = 'AUTO';
        }
        return;
    }
    // Parent has auto layout - now we can set ABSOLUTE if needed
    if ('layoutPositioning' in layoutNode) {
        layoutNode.layoutPositioning = nodeData.layoutPositioning === 'ABSOLUTE' ? 'ABSOLUTE' : 'AUTO';
    }
    if (nodeData.layoutAlign) {
        // Skip deprecated CENTER and MAX values - let Figma use its default behavior
        const alignValue = nodeData.layoutAlign;
        if (alignValue === 'MIN' || alignValue === 'STRETCH') {
            layoutNode.layoutAlign = alignValue;
        }
        // Don't set CENTER or MAX as they're deprecated
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
    // Fills - prevent large black frames
    if (nodeData.fills && nodeData.fills.length > 0) {
        const fills = convertFills(nodeData.fills);
        // Filter out solid black fills on large frames (likely body/html elements)
        const filteredFills = fills.filter(fill => {
            if (fill.type === 'SOLID' && nodeData.boundingBox.width > 1000 && nodeData.boundingBox.height > 500) {
                const color = fill.color;
                // Check if it's black or very dark
                const isBlack = color.r < 0.1 && color.g < 0.1 && color.b < 0.1;
                return !isBlack;
            }
            return true;
        });
        frame.fills = filteredFills.length > 0 ? filteredFills : [];
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
    // Only set ABSOLUTE positioning if not in an auto layout parent
    // This will be handled in applyPosition instead
    return frame;
}
async function createImageNode(nodeData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22;
    const rect = figma.createRectangle();
    // SVG 크기 계산 개선
    let width = Math.max(nodeData.boundingBox.width, 1);
    let height = Math.max(nodeData.boundingBox.height, 1);
    // SVG인 경우 특별 처리
    const isSvg = ((_a = nodeData.meta) === null || _a === void 0 ? void 0 : _a.htmlTag) === 'svg' || ((_c = (_b = nodeData.meta) === null || _b === void 0 ? void 0 : _b.imageData) === null || _c === void 0 ? void 0 : _c.isSvg) || ((_e = (_d = nodeData.meta) === null || _d === void 0 ? void 0 : _d.snapshot) === null || _e === void 0 ? void 0 : _e.isSvg);
    const isLogo = ((_g = (_f = nodeData.meta) === null || _f === void 0 ? void 0 : _f.imageData) === null || _g === void 0 ? void 0 : _g.isLogo) || ((_j = (_h = nodeData.meta) === null || _h === void 0 ? void 0 : _h.imageInfo) === null || _j === void 0 ? void 0 : _j.isLogo);
    if (isSvg) {
        if (isLogo) {
            // 로고 SVG는 상위 DIV 크기를 유지 (확대하지 않음)
            console.log('Logo SVG detected, keeping original size:', {
                id: nodeData.id,
                width,
                height,
                boundingBox: nodeData.boundingBox
            });
        }
        else {
            // 일반 SVG의 경우 최소 크기 보장
            width = Math.max(width, 20);
            height = Math.max(height, 20);
            // accurateImageInfo가 있으면 우선 사용 (더 정확한 크기)
            if ((_k = nodeData.meta) === null || _k === void 0 ? void 0 : _k.accurateImageInfo) {
                const accurateInfo = nodeData.meta.accurateImageInfo;
                if (accurateInfo.width > 0 && accurateInfo.height > 0) {
                    width = Math.max(accurateInfo.width, width);
                    height = Math.max(accurateInfo.height, height);
                    console.log('Using accurate SVG dimensions:', {
                        id: nodeData.id,
                        original: { width: nodeData.boundingBox.width, height: nodeData.boundingBox.height },
                        accurate: { width: accurateInfo.width, height: accurateInfo.height },
                        final: { width, height }
                    });
                }
            }
            // 일반 SVG가 너무 작으면 기본 크기로 확대
            if (width < 30 || height < 30) {
                const scale = Math.max(30 / width, 30 / height);
                width *= scale;
                height *= scale;
                console.log('Scaled up small SVG:', {
                    id: nodeData.id,
                    original: { width: nodeData.boundingBox.width, height: nodeData.boundingBox.height },
                    scaled: { width, height, scale }
                });
            }
        }
    }
    else {
        // 일반 이미지의 경우 accurateImageInfo 사용
        if ((_l = nodeData.meta) === null || _l === void 0 ? void 0 : _l.accurateImageInfo) {
            const accurateInfo = nodeData.meta.accurateImageInfo;
            if (accurateInfo.width > 0 && accurateInfo.height > 0) {
                width = accurateInfo.width;
                height = accurateInfo.height;
                console.log('Using accurate image dimensions:', {
                    id: nodeData.id,
                    original: { width: nodeData.boundingBox.width, height: nodeData.boundingBox.height },
                    accurate: { width: accurateInfo.width, height: accurateInfo.height }
                });
            }
        }
    }
    // 스프라이트 정보가 있으면 우선 사용
    const spriteInfo = (_m = nodeData.meta) === null || _m === void 0 ? void 0 : _m.spriteInfo;
    if (spriteInfo) {
        width = Math.max(spriteInfo.width, 1);
        height = Math.max(spriteInfo.height, 1);
        console.log('Using sprite dimensions:', {
            id: nodeData.id,
            spriteSize: { width: spriteInfo.width, height: spriteInfo.height },
            spritePosition: { x: spriteInfo.x, y: spriteInfo.y }
        });
    }
    // Size
    rect.resize(width, height);
    const isLogoForDebug = (_p = (_o = nodeData.meta) === null || _o === void 0 ? void 0 : _o.imageData) === null || _p === void 0 ? void 0 : _p.isLogo;
    const isIconForDebug = (_r = (_q = nodeData.meta) === null || _q === void 0 ? void 0 : _q.imageData) === null || _r === void 0 ? void 0 : _r.isIcon;
    console.log('Image node size:', {
        id: nodeData.id,
        name: nodeData.name,
        width,
        height,
        isLogo: isLogoForDebug,
        isIcon: isIconForDebug,
        boundingBox: nodeData.boundingBox
    });
    const imageSrc = (_t = (_s = nodeData.meta) === null || _s === void 0 ? void 0 : _s.attributes) === null || _t === void 0 ? void 0 : _t.src;
    // imageData 추출 로직 - 여러 경로 시도
    let imageData;
    // 1. snapshot에서 직접 가져오기 (우선순위 1)
    if ((_v = (_u = nodeData.meta) === null || _u === void 0 ? void 0 : _u.snapshot) === null || _v === void 0 ? void 0 : _v.imageData) {
        imageData = nodeData.meta.snapshot.imageData;
    }
    // 2. meta.imageData가 객체인 경우 (ImageInfo 래핑)
    else if (((_w = nodeData.meta) === null || _w === void 0 ? void 0 : _w.imageData) && typeof nodeData.meta.imageData === 'object') {
        const imgObj = nodeData.meta.imageData;
        imageData = imgObj.imageData; // ImageInfo.imageData 필드
    }
    // 3. meta.imageData가 직접 문자열인 경우
    else if (((_x = nodeData.meta) === null || _x === void 0 ? void 0 : _x.imageData) && typeof nodeData.meta.imageData === 'string') {
        imageData = nodeData.meta.imageData;
    }
    // 4. attributes에서 직접 가져오기 (data URI)
    else if (((_z = (_y = nodeData.meta) === null || _y === void 0 ? void 0 : _y.attributes) === null || _z === void 0 ? void 0 : _z.src) && nodeData.meta.attributes.src.startsWith('data:')) {
        imageData = nodeData.meta.attributes.src;
    }
    // 5. 백엔드에서 직접 전달된 이미지 데이터 확인
    else if (((_0 = nodeData.meta) === null || _0 === void 0 ? void 0 : _0.imageData) && typeof nodeData.meta.imageData === 'string' && nodeData.meta.imageData.startsWith('data:image/')) {
        imageData = nodeData.meta.imageData;
    }
    const alt = (_2 = (_1 = nodeData.meta) === null || _1 === void 0 ? void 0 : _1.attributes) === null || _2 === void 0 ? void 0 : _2.alt;
    // 이미지 타입 확인 - 여러 경로에서 확인 (중복 선언 제거)
    const isSvgImage = ((_4 = (_3 = nodeData.meta) === null || _3 === void 0 ? void 0 : _3.imageData) === null || _4 === void 0 ? void 0 : _4.isSvg) || ((_6 = (_5 = nodeData.meta) === null || _5 === void 0 ? void 0 : _5.snapshot) === null || _6 === void 0 ? void 0 : _6.isSvg) || ((_7 = nodeData.meta) === null || _7 === void 0 ? void 0 : _7.htmlTag) === 'svg';
    const isDownloadedImage = ((_9 = (_8 = nodeData.meta) === null || _8 === void 0 ? void 0 : _8.imageData) === null || _9 === void 0 ? void 0 : _9.isDownloadedImage) || ((_11 = (_10 = nodeData.meta) === null || _10 === void 0 ? void 0 : _10.snapshot) === null || _11 === void 0 ? void 0 : _11.isDownloadedImage);
    console.log('Creating image node:', {
        id: nodeData.id,
        name: nodeData.name,
        tagName: (_12 = nodeData.meta) === null || _12 === void 0 ? void 0 : _12.htmlTag,
        src: imageSrc ? imageSrc.substring(0, 50) : 'no-src',
        isSvg: isSvgImage,
        isDownloadedImage,
        hasImageData: !!imageData,
        imageDataType: typeof imageData,
        imageDataLength: typeof imageData === 'string' ? imageData.length : 0,
        imageDataPrefix: typeof imageData === 'string' ? imageData.substring(0, 80) : (imageData ? JSON.stringify(imageData).substring(0, 200) : 'no-data'),
        metaKeys: nodeData.meta ? Object.keys(nodeData.meta) : [],
    });
    // 스프라이트 정보가 있더라도 개별 이미지 데이터를 사용
    // (Figma의 imageTransform으로 스프라이트 시트 일부만 표시하기는 어려움)
    // Try to use actual image data if available
    if (imageData && typeof imageData === 'string' && imageData.length > 0) {
        try {
            // Base64 데이터 추출
            let base64Data = imageData;
            // data:image/png;base64, 형식에서 base64 부분만 추출
            if (imageData.includes('base64,')) {
                base64Data = imageData.split('base64,')[1];
            }
            else if (imageData.includes(',')) {
                base64Data = imageData.split(',')[1];
            }
            // 공백 제거
            base64Data = base64Data.trim().replace(/\s/g, '');
            console.log('Processing image data:', {
                id: nodeData.id,
                name: nodeData.name,
                tagName: (_13 = nodeData.meta) === null || _13 === void 0 ? void 0 : _13.htmlTag,
                originalLength: imageData.length,
                base64Length: base64Data.length,
                isSvg: isSvgImage,
                isDownloadedImage,
                dataPrefix: imageData.substring(0, 50),
                base64Prefix: base64Data.substring(0, 50)
            });
            // Base64 문자열 유효성 검사
            if (base64Data.length === 0) {
                throw new Error('Empty base64 data after extraction');
            }
            // 최소 길이 체크 (PNG 헤더 최소 크기)
            if (base64Data.length < 100) {
                throw new Error(`Base64 data too short: ${base64Data.length} chars`);
            }
            const bytes = decodeBase64ToUint8Array(base64Data);
            // 바이트 배열 유효성 검사
            if (bytes.length === 0) {
                throw new Error('Decoded bytes array is empty');
            }
            console.log('Decoded bytes:', {
                id: nodeData.id,
                byteLength: bytes.length,
                firstBytes: Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
            });
            const image = figma.createImage(bytes);
            // SVG인 경우 스케일 모드 개선
            const scaleMode = isSvgImage ? 'FILL' : 'FIT';
            rect.fills = [{
                    type: 'IMAGE',
                    imageHash: image.hash,
                    scaleMode: scaleMode,
                }];
            // Set name based on image type
            if (isSvgImage) {
                rect.name = alt || 'SVG Image';
                console.log('✓ SVG image created:', nodeData.id, 'hash:', image.hash, 'size:', bytes.length);
            }
            else if (isDownloadedImage) {
                rect.name = alt || 'Downloaded Image';
                console.log('✓ Downloaded image created:', nodeData.id, 'hash:', image.hash, 'size:', bytes.length);
            }
            else {
                rect.name = alt || (imageSrc ? (_14 = imageSrc.split('/').pop()) === null || _14 === void 0 ? void 0 : _14.substring(0, 30) : 'Image') || 'Image';
                console.log('✓ Image created:', nodeData.id, 'hash:', image.hash, 'size:', bytes.length);
            }
        }
        catch (error) {
            console.error('Failed to create image from data:', {
                error: error.message,
                stack: error.stack,
                imageDataLength: typeof imageData === 'string' ? imageData.length : 0,
                imageDataStart: typeof imageData === 'string' ? imageData.substring(0, 100) : 'not a string',
                isSvg: isSvgImage,
                isDownloadedImage
            });
            // SVG 실패 시 텍스트로 대체
            if (isSvgImage) {
                rect.fills = [{
                        type: 'SOLID',
                        color: { r: 0.95, g: 0.95, b: 0.95 },
                    }];
                // SVG 텍스트 추가
                const text = figma.createText();
                await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
                text.characters = alt || 'SVG';
                text.fontSize = Math.min(width / 6, height / 2, 16); // 크기에 맞춰 폰트 크기 조정
                text.fills = [{
                        type: 'SOLID',
                        color: { r: 0.3, g: 0.3, b: 0.3 }
                    }];
                // 텍스트 중앙 정렬
                text.x = width / 2 - text.width / 2;
                text.y = height / 2 - text.height / 2;
                // RectangleNode에는 appendChild가 없으므로 Frame으로 변경
                const frame = figma.createFrame();
                frame.resize(width, height);
                frame.fills = rect.fills;
                frame.appendChild(text);
                frame.name = alt || 'SVG (text fallback)';
                console.log('SVG fallback to text:', nodeData.id);
                return frame;
            }
            else {
                // 일반 이미지 실패 시 플레이스홀더
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
            const fileName = imageSrc ? imageSrc.substring(imageSrc.lastIndexOf('/') + 1, imageSrc.lastIndexOf('/') + 30) : 'unknown';
            rect.name = `Image: ${fileName}`;
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
    const isLogoForCorner = ((_16 = (_15 = nodeData.meta) === null || _15 === void 0 ? void 0 : _15.imageData) === null || _16 === void 0 ? void 0 : _16.isLogo) || ((_18 = (_17 = nodeData.meta) === null || _17 === void 0 ? void 0 : _17.classes) === null || _18 === void 0 ? void 0 : _18.some((c) => /logo/i.test(c)));
    const isIconForCorner = ((_20 = (_19 = nodeData.meta) === null || _19 === void 0 ? void 0 : _19.imageData) === null || _20 === void 0 ? void 0 : _20.isIcon) || ((_22 = (_21 = nodeData.meta) === null || _21 === void 0 ? void 0 : _21.classes) === null || _22 === void 0 ? void 0 : _22.some((c) => /icon/i.test(c)));
    if (isIconForCorner) {
        rect.cornerRadius = nodeData.boundingBox.width / 4;
    }
    else if (isLogoForCorner) {
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
