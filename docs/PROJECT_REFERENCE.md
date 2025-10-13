# HTML to Figma Project Reference (2025-10-11)

This document captures the complete context needed to reproduce the current HTML to Figma conversion project 1:1. It includes repository structure, runtime prerequisites, pipeline details, configuration, historical fixes, and known limitations so another engineer or AI agent can rebuild the environment without additional prompts.

---

## 1. Repository Layout

```
HTF2/
??? .env                         # Runtime configuration for backend services
??? dist/                        # Compiled backend TypeScript outputs (tsc --project tsconfig.json)
??? docs/                        # Reference material, guides, and test reports
?? ??? FIGMA_PLUGIN_GUIDE.md     # Korean-language end-user guide
?? ??? FIGMA_PLUGIN_PATCH_NOTES.md
?? ??? PROJECT_REFERENCE.md      # This document
?? ??? TESTING_GUIDE.md          # API and pipeline test instructions
?? ?遺? status.md                 # Snapshot of recent work
??? figma-plugin/                # Figma plugin source bundle
?? ??? manifest.json             # Development manifest (allowedDomains configured for localhost)
?? ??? package.json              # Plugin build scripts (tsc + build.js)
?? ??? src/                      # UI (ui.html) and controller (code.ts)
?? ?遺? dist/                     # Generated code.js and ui.html consumed by Figma
??? logs/                        # Runtime logs (Playwright, Gemini smoke tests)
??? node_modules/                # Backend dependencies (installed via npm install)
??? package.json                 # Backend package manifest (Express server, Playwright, Gemini SDK)
??? plan.md                      # Project roadmap notes
??? scripts/                     # Utility scripts (e.g., gemini-smoke.ts runner)
??? src/                         # Backend TypeScript source
?? ??? config/                   # Environment helpers
?? ??? converters/               # CSS/HTML -> Figma mapping utilities
?? ??? generators/               # Style system, component detection, figma tree building
?? ??? renderers/                # DOM rendering backends (JSDOM, Playwright)
?? ??? services/                 # Business logic (html-processing-service, AI integration)
?? ??? types/                    # Shared TypeScript interfaces
?? ??? utils/                    # Logging, async helpers, file management
?? ?遺? server.ts                 # Express HTTP entrypoint
?遺? tsconfig.json                # Backend TypeScript compiler settings (target es2020)
```

---

## 2. Prerequisites

### 2.1 System Requirements
- **Node.js 18 LTS or newer** ??backend `dist/` targets ES2020 and relies on modern APIs.
- **npm 9+** ??aligns with the lockfile bundled in the repository.
- **Figma Desktop (latest API build)** ??required to import the development manifest (`Plugins > Development > Import plugin from manifest...`) and support Vision AI messaging from the plugin.
- **Chrome/Chromium (headless)** ??Playwright drives Chromium-based browsers in headless mode; first install may prompt `npx playwright install`.
- **Google Generative AI (Gemini) API key** ??mandatory only when vision-assisted conversions are desired.

Verify versions:
```
node --version           # expect v18.x or higher
npm --version            # expect 9.x or higher
```

### 2.2 Repository Setup
```
# from repo root (HTF2/)
npm install              # installs backend dependencies (Express, Playwright, Gemini SDK)
# optional but recommended: download Playwright browsers
npx playwright install --with-deps

cd figma-plugin
npm install              # installs plugin dependencies (TypeScript, typings, bundler helpers)
```
If `npx playwright install` fails due to permissions, rerun the command in an elevated shell or export `PLAYWRIGHT_BROWSERS_PATH=0` to keep downloads local to the project.

### 2.3 Environment File
Create or update `.env` at the repository root:
```
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-2.5-flash
VISION_TIMEOUT_MS=4000
VISION_CHUNK_CHAR_LIMIT=6000
VISION_MAX_CHUNKS=4
PORT=4000          # optional; defaults to 4000 if omitted
```
`src/config/env.ts` loads this file automatically via `dotenv`. Omit `GEMINI_*` keys to run in heuristic-only mode.

### 2.4 Figma Preparation
1. Download and install Figma Desktop from https://www.figma.com/downloads/.
2. Sign in, then open **Plugins ??Development ??Import plugin from manifest...**.
3. Keep Figma running while iterating; re-import the manifest whenever `dist/` assets change.

### 2.5 Quick Smoke Test
```
# ensure backend compiles and runs
npm run build            # optional, produces dist/
npm run dev              # starts Express + HtmlProcessingService on http://localhost:4000
curl http://localhost:4000/health
# -> {"status":"ok", ...}
```
If the curl command times out, confirm nothing else is listening on port 4000 or adjust `PORT` in `.env`.

---

## 3. Configuration

Environment variables live in `.env` at the repository root. Relevant keys:

| Key | Description | Notes |
| --- | --- | --- |
| `PORT` | Optional override for Express server (defaults to 4000) | Exposed in `src/server.ts` |
| `GEMINI_API_KEY` | Google Generative AI API key | Required for full vision mode |
| `GEMINI_MODEL` | Gemini model identifier (default `gemini-2.5-flash`) | Use models supporting `generateContent` |
| `VISION_TIMEOUT_MS` | Default timeout for Gemini vision chunks | Falls back to heuristic mode on expiry |
| `VISION_CHUNK_CHAR_LIMIT` | Max characters per chunk when calling Gemini | Used by chunking logic |
| `VISION_MAX_CHUNKS` | Maximum chunk count per request | Avoids overrun |

Configuration accessors are defined in `src/config/env.ts`. `dotenv` loads `.env` automatically at server start.

---

## 4. Backend Service

### Overview

- Entrypoint: `src/server.ts` (compiled to `dist/server.js`).
- Framework: Express 5.x with JSON body parsing and Multer for file uploads.
- Logging: Winston (`src/utils/logger.ts`).
- Primary service: `HtmlProcessingService` (`src/services/html-processing-service.ts`).

### Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Returns `{ status: "ok", timestamp }` for monitoring |
| `GET` | `/info` | Returns project metadata (`name`, `version`, `environment`) |
| `POST` | `/render-html-text` | Core endpoint; accepts JSON `{ htmlContent, filename?, options? }` |
| `POST` | `/render-html-file` | Multipart upload (`htmlFile` field); converts uploaded HTML file |

### CORS and Preflight Handling

`src/server.ts` injects a global middleware (lines ~14-26) that:
- Adds `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET,POST,OPTIONS`, and `Access-Control-Allow-Headers: Content-Type, Authorization`.
- Responds to `OPTIONS` preflights with HTTP 204.

This change unblocks plugin iframe requests launched from Figma (`origin null`).

### Processing Pipeline (`HtmlProcessingService.process`)

1. **Mode Resolution**: `fast`, `balanced` (default), or `quality` influences capture timeouts, vision timeouts, and whether Playwright is attempted.
2. **Rendering Resolution Profiles**:
   - Default Playwright viewport is **Full HD (1920 x 1080)** when `width`/`height` are omitted.
   - Provide custom `options.width`/`options.height` to render auxiliary artboards (e.g., `375 x 667`, `1440 x 900`). Multiple requests can be queued to generate parallel assets for each resolution.
3. **Rendering Execution**:
   - In `balanced`/`quality`, attempt `captureHtmlWithPlaywright` with timeout guard (`withTimeout` at `src/utils/async-utils.ts`).
   - On timeout or failure, fall back to `renderHtmlFromString` (JSDOM-based renderer).
4. **Conversion**:
   - `convertSnapshotToFigma` (Playwright path) or `convertHtmlToFigma` (JSDOM path) generate intermediate nodes.
   - `generateFigmaTree`, `generateStyleSystem`, and `detectComponentPatterns` derive structure and design tokens.
5. **Vision Analysis**:
   - `analyzeCapture` coordinates Gemini vision; respects `skipVision` option and `.env` timeouts.
   - Fallback heuristics run when the API errors or vision disabled.
6. **Annotation Application**:
   - `applyVisionAnnotations` matches suggestions to nodes via ID or bounding box tolerance and mutates node data (layout, spacing, fills, typography).
7. **Response**:
   - Returns `{ nodes, meta, vision }` including render stats (`elementCount`, processing time, optional screenshot path) and quality info.

Errors are wrapped in `ProcessingError` where appropriate. Express error middleware logs and sends either 4xx or 500 responses.

### Supporting Utilities

- `src/utils/file-manager.ts`: Temporary file persistence for file uploads.
- `src/utils/logger.ts`: Configurable console logger, colorized output.
- `src/utils/async-utils.ts`: Timeout guard for async operations.

---

## 5. Figma Plugin

The plugin targets the latest Figma desktop builds with full Plugin API coverage, including asynchronous UI messaging, networkAccess permissions, and Vision AI data channels. Environment expectations:
- Figma Desktop release (2025-10 or newer) that exposes the Vision AI bridge and current plugin sandbox behaviour.
- Chromium-based headless fetches enabled via `networkAccess.allowedDomains` (manifest restricts to `http://localhost:4000/`).
- Backend provides Gemini Vision outputs consumed by the UI for status metrics.\n- Plugin exposes two modes: the original AI-assisted conversion and an Exact Replica panel for URL mirroring and .h2d imports.

### Build Pipeline

1. `npm run build` in `figma-plugin/` executes:
   - `tsc` (config: `figma-plugin/tsconfig.json`, target `ES2018`, `lib` `ES2018`).
   - `npm run bundle` (invokes `node build.js`).
2. `build.js` reads `dist/code.js` and `src/ui.html`, embeds the HTML in a template literal (`__html__` placeholder) and writes both `dist/code.js` and `dist/ui.html`.
3. Manifest (`figma-plugin/manifest.json`) references `main: dist/code.js`, `ui: dist/ui.html`.

### Design Token Pipeline

- Canonical tokens live in `src/config/design-tokens.ts` (spacing, typography, shadows, colors).
- Run `npm run tokens:export` to generate `dist/design-tokens.css` and `dist/design-tokens.json` for downstream web usage.
- Conversion metadata returns detected tokens under `meta.tokens` so UI/controllers can reconcile spacing (8pt grid), typography, shadows, and color usage across Figma and the browser.

### Manifest History

| Attempt | Change | Outcome |
| ------- | ------ | ------- |
| Baseline | Plain hostnames (`localhost`, `127.0.0.1`) | Figma rejected as invalid URLs |
| Attempt 1 | Added `http://localhost:4000`, `http://127.0.0.1:4000` | JSON parse failure (file saved with UTF-8 BOM) |
| Attempt 2 | Removed BOM, kept both URLs | Figma rejected IP literal (`127.0.0.1`) |
| Attempt 3 | Moved IP into `devAllowedDomains` | Still rejected (same validation) |
| Final | Single entry `http://localhost:4000/`, manifest saved UTF-8 w/out BOM | Import succeeds; UI defaults to localhost |

The manifest also requires `dist/ui.html` to exist; `build.js` now writes the file explicitly.

### UI (`figma-plugin/src/ui.html`)

- Collects HTML input, mode (`fast`, `balanced`, `quality`), and toggles for screenshot/vision.
- Uses safe storage helpers to persist API URL. On `data:` origins (Figma preview) where `localStorage` is disabled, falls back to an in-memory cache with default `http://localhost:4000`.
- Displays progress messages (`conversion-progress`), success metrics (node count, render time, accuracy, AI adjustments), and error notifications.

### Controller (`figma-plugin/src/code.ts`)

Key responsibilities:
- Receives UI messages (`convert`, `import-file`).
- Calls backend `POST /render-html-text` and handles errors.
- Builds Figma nodes using a dependency-aware topological sort.

Recent fixes:
- **Font Loading**: Loads requested font (`fontFamily`, `fontWeight`) via `figma.loadFontAsync`, falls back to `Inter/Regular`, and assigns `text.fontName` before setting characters to avoid ??븂loaded font??errors.
- **Node Positioning**: Maintains `nodeDataMap` to compute offsets. `applyPosition` subtracts parent offsets for non?諛턷to-layout parents. Auto layout parents let Figma manage placement. `createFrameNode` and `createTextNode` no longer set absolute `x`/`y` values directly.

### Development Workflow

1. `npm install` in `figma-plugin/`.
2. `npm run build` after any source change.
3. In Figma Desktop: Plugins > Development > Import plugin from manifest... -> select `figma-plugin/manifest.json`.
4. Run the plugin: Plugins > Development > HTML to Figma Converter.
5. Ensure backend server is running at `http://localhost:4000`.

---

## 6. Front-to-Back Pipeline

1. **User Input**: UI collects HTML and options, sends `parent.postMessage` with `{ type: 'convert' }` to controller.
2. **Controller Fetch**: `figma-plugin/src/code.ts` performs `fetch(${apiUrl}/render-html-text)` with JSON payload.
3. **Backend Processing**: Express route calls `HtmlProcessingService.process` (detailed in Section 4). Nodes, meta, and vision data returned.
4. **Node Construction**:
   - `createFigmaNodes` sorts nodes by parent dependencies.
   - For each node: create text/frame, append to parent/page, call `applyPosition`, apply styling (fills, strokes, effects, typography, layout).
5. **Completion**: Controller notifies UI (`conversion-complete`) with payload. UI updates status and stats; `figma.notify` surfaces success message.
6. **Error Handling**:
   - Network or server errors produce `conversion-error` messages and `figma.notify` with error icon.
   - Backend logs warnings/errors with structured metadata (`logs/gemini-smoke.log` example).

---

## 7. Historical Fix Log

### Manifest
- Resolved BOM-induced parsing failures by rewriting with UTF-8 (no BOM) and enforcing scheme + port.
- Removed `127.0.0.1` (Figma rejects IP literal) and documented requirement to use `localhost`.

### Plugin UI
- `localStorage` guards added to survive `data:` origin restrictions and store API URL in memory fallback.
- Default API URL stored in constant and injected into UI on load when storage unavailable.

### Backend
- Added permissive CORS middleware with OPTIONS short-circuit to support plugin fetches from null origin.

### Text Rendering
- Down-leveled plugin TypeScript target to ES2018 to remove optional chaining in compiled bundle (Figma sandbox previously errored on `?.`).
- Explicit font loading and assignment prior to calling `text.characters` to avoid ??븂loaded font??errors.

### Layout
- Implemented relative positioning via `applyPosition` to keep children aligned under parents even when upstream data uses absolute coordinates.

---

## 8. Running the System End-to-End

1. **Backend**
   - `npm run build` (optional if `dist/` already present).
   - `npm run dev` (ts-node-dev) or `npm start` (node dist/server.js).
   - Verify `http://localhost:4000/health` responds `{ "status": "ok" }`.

2. **Plugin**
   - `npm run build` in `figma-plugin/` to refresh `dist/` assets.
   - Import manifest into Figma Desktop.

3. **Conversion**
   - Run plugin, paste HTML, ensure API URL is `http://localhost:4000`.
   - Choose mode (fast/balanced/quality). Balanced recommended for Playwright + vision.
   - Click "Convert to Figma".

4. **Validation**
   - Watch Figma console for progress messages.
   - Inspect canvas for frames, text, and layout consistency (children now positioned relative to parents unless auto layout manages them).
   - Review UI stats panel for node count, render time, accuracy %, AI adjustments.

5. **Logs**
   - Backend logs appear in terminal; structured warnings if Playwright or Gemini fail.
   - `logs/gemini-smoke.log` contains historical smoke test outputs (Playwright/Gemini interactions).

---

## 9. Reproducing or Extending the Project

- Clone repository, install dependencies as in Section 2.
- Populate `.env` with required keys.
- Follow Section 8 to run backend and plugin.
- All current fixes are recorded in `docs/FIGMA_PLUGIN_PATCH_NOTES.md`; use it alongside this document for chronological context.
- When modifying plugin logic, always rebuild `figma-plugin/dist/` and re-import manifest.
- For backend changes, run `npm run build` and restart server (or rely on `npm run dev` hot reload).

---

## 10. Known Limitations

- `allowedDomains` supports only `http://localhost:4000/`; remote or IP-based hosts require additional manifest negotiation with Figma.
- Fast mode skips Playwright capture; resulting nodes may lack precise layout for complex CSS.
- Gemini vision depends on external API availability; `.env` timeouts trigger heuristic fallbacks, which may reduce accuracy.
- Optional chaining still exists in backend `dist/` (target ES2020); ensure runtime Node version supports it.
- Plugin currently supports FRAME and TEXT nodes explicitly; VECTOR/IMAGE placeholders exist but pipeline focuses on boxes, text, gradients, shadows.

---

## 11. Reference Commands

```
# Backend
npm run dev          # ts-node-dev watch server
npm run build        # compile backend to dist/
npm start            # run compiled server

# Plugin
cd figma-plugin
npm run build        # compile and bundle plugin assets

# Testing scripts
npx ts-node --transpile-only scripts/gemini-smoke.ts
```

---

With the above context, another agent can reconstruct the environment, reapply past fixes, and extend the project while understanding prior failures and their resolutions.






