# Figma Plugin Patch Notes (2025-10-11)

## Manifest Fix History

- **Initial state:** `manifest.json` allowed `localhost` and `127.0.0.1` without schemes. Figma flagged both entries as invalid URLs and blocked import.
- **Attempt 1:** Added `http://localhost:4000` and `http://127.0.0.1:4000` under `allowedDomains`. Result: JSON parser failed because the file was saved with a UTF-8 BOM; error appeared as `Unexpected token`.
- **Attempt 2:** Removed the BOM but kept both URLs. Figma still rejected `127.0.0.1` as “must be a valid URL”.
- **Attempt 3:** Split values into `allowedDomains` and `devAllowedDomains`. Figma continued to reject the IP literal, even in the dev list.
- **Successful fix:** Reduced `allowedDomains` to a single entry `http://localhost:4000/` and documented the requirement to use `localhost` in the UI. The manifest is now UTF-8 without BOM, and `build.js` writes `dist/ui.html` so the `ui` path resolves during import.

## Positioning Fix Summary

- Added `nodeDataMap` to cache the raw node payload before building the scene (`figma-plugin/src/code.ts:50`).
- Updated `createNode` to look up the parent’s original bounding box, append the child, then call `applyPosition` for manual placement when the parent is not using auto layout (`figma-plugin/src/code.ts:162-176`).
- Introduced `applyPosition` to translate absolute coordinates into local offsets relative to the parent (`figma-plugin/src/code.ts:181-192`).
- Removed direct `x`/`y` assignments inside `createFrameNode` and `createTextNode`, leaving size and styling logic intact (`figma-plugin/src/code.ts:199-201`, `figma-plugin/src/code.ts:288-293`).

## Supporting Changes

- UI now guards `localStorage` access and falls back to an in-memory default URL when storage is blocked by the `data:` sandbox (`figma-plugin/src/ui.html:379-558`).
- Backend sends permissive CORS headers and short-circuits `OPTIONS` preflights so the plugin can POST from the embedded iframe (`src/server.ts:14-26`).
- TypeScript targets ES2018 to avoid emitting optional chaining, and text creation sets `fontName` immediately after loading fonts to prevent “unloaded font” write errors (`figma-plugin/tsconfig.json`, `figma-plugin/src/code.ts:258-272`).

## Current End-to-End Flow

1. User pastes HTML into the plugin UI. The UI posts `convert` with the configured API URL (default `http://localhost:4000`).
2. Backend Express server receives `/render-html-text`, runs the HTML processing pipeline (DOM parsing, CSS rules, AI vision fallback if enabled), and returns a node graph with metadata.
3. Plugin receives the graph, caches metadata, creates nodes in dependency order, and positions children relative to their parents. Frames and text are resized and styled as described in the payload.
4. UI reports progress and completion, updating stats (node count, render time, quality score). Any errors surface both in the UI status area and via `figma.notify`.

## Operational Notes

- Always run the backend (`npm run dev` at repo root) before using the plugin; CORS is configured for `http://localhost:4000` only.
- When editing the plugin, run `npm run build` in `figma-plugin/` so `dist/code.js` and `dist/ui.html` stay in sync with the manifest.
- If Figma reports manifest import issues, verify the file encoding (UTF-8 without BOM) and ensure the `dist` folder contains both `code.js` and `ui.html`.
\n- Added Exact Replica (No AI) pipeline to the plugin UI for URL mirroring and .h2d uploads (leverages new backend endpoints /render-url and /import-h2d).\n- Surfaced design-token detection in conversion metadata and exposed 
pm run tokens:export for emitting CSS/JSON token bundles.
