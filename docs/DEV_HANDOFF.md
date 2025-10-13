# Development Handoff (2025-10-11)

This note captures the current state of the HTML → Figma project so the next engineer/agent can resume with zero ambiguity.

---

## 1. Summary

- Added a **design-token aware pipeline**: src/config/design-tokens.ts, scripts/export-design-tokens.ts, and the 
pm run tokens:export script now emit dist/design-tokens.css/.json. Conversion metadata embeds detected tokens under meta.tokens.
- Introduced an **Exact Replica (No AI)** flow alongside the existing AI-assisted converter:
  - Backend endpoints: /render-url, /render-url-html, /import-h2d.
  - Services: code-to-design-service.ts, exact-replica-service.ts, h2d-import-service.ts.
  - Playwright renderer now supports captureUrlWithPlaywright.
  - Plugin UI exposes an “Exact Replica (No AI)” panel for URL mirroring and .h2d uploads.
- Layout, typography, and shadow data snap to the 8pt grid/design tokens via the updated converters (spacing rem values, typography token matching, shadow presets).

## 2. Working State

- 
pm run build (backend) ✅
- 
pm run tokens:export ✅ (writes /dist/design-tokens.*)
- 
pm run build (figma-plugin) ❌ — currently fails due to poorly formed template strings in src/code.ts (see To-Do).
- New REST endpoints compile but lack smoke tests.
- Plugin UI renders new controls; messaging skeletons exist for convert-exact-url and convert-h2d.

## 3. Outstanding To-Do List

1. **Fix plugin TypeScript errors**: Replace broken literals such as etch(/render-url with backticked strings. Ensure notifications use plain text (replace placeholder emoji + missing values).
2. **Null-safe DOM wiring**: Guard convertExactBtn, exactUrlInput, exactViewportSelect, h2dFileInput before binding events.
3. **Stats panel**: Backend now exposes meta.quality; UI should read data.meta.quality as fallback and optionally surface token/shadow details.
4. **Document update**: Once plugin builds, capture screenshots for the new Exact Replica panel and append to FIGMA_PLUGIN_GUIDE.md.
5. **Endpoint QA**: Add curl/Postman smoke tests for /render-url and /import-h2d. No automated coverage yet.
6. **Typing follow-up**: ConversionMeta.tokens.detected and components/quality are currently typed as unknown; introduce explicit interfaces later.

## 4. Suggested Next Steps

1. Fix igma-plugin/src/code.ts string/template issues and rebuild (
pm run build in igma-plugin/).
2. Manual smoke tests:
   - Standard convert (existing flow).
   - Exact URL convert.
   - .h2d archive import.
3. Exercise new endpoints via curl or Postman; log outputs in logs/.
4. Update docs/guides once everything compiles and tests pass.

Artifacts touched: backend services, renderers, converters, plugin UI, documentation. See git diff for details before committing.