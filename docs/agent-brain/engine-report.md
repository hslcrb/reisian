# Document engine implementation report

## Delivered APIs

- `src/core/model.ts`: `createProject(template?: 'atelier' | 'portfolio' | 'blank')`, `createSection(kind)`, `parseProject(text)`, `serializeProject(project)`, `cloneProject(project)`, and `uid`, `safeHref`, `safeImage`, `safeColor` helpers.
- `src/core/render.ts`: `renderPageDocument(project, pageId, options?)`, `runtimeSource()`, `pageFileName(project, page)`, `escapeHTML(value)`.
- `src/core/export.ts`: `createExportBundle(project)` produces `index.html`, other page HTML, `styles.css`, and `runtime.js`. Images remain embedded. Page links and page-fragment links resolve to exported filenames.
- `src/core/audit.ts`: `auditProject(project)`, `contrastRatio(a,b)`.
- `src/core/styles.ts`: shared responsive `siteStyles`.
- `src/runtime/site-runtime.js`: self-contained `mountSite()` with real procedural torus, sphere, wave, and knot WebGL meshes, lighting, pointer response, pause/reduced-motion behavior, scroll presets, static fallback, and iframe editing protocol.

No schema or NativeBridge changes were needed. No additional dependency was added.

## Parent CSP integration

The exact inline script bytes are:

```js
readFileSync('src/runtime/site-runtime.js', 'utf8')
  .replace('export function mountSite()', 'function mountSite()') + '\nmountSite();'
```

Hash those bytes in the parent CSP. `render.ts` imports the runtime with `?raw`, so production minification does not change the inline script. All user content stays in escaped text/attributes, never executable literals. Exported pages load the exact same source from local `runtime.js`.

## Security and resource handling

Imported projects are reconstructed from validated, bounded fields. Limits: 30 MB JSON text, 30 pages, 100 sections per page, 300 sections total, 8 million characters per embedded raster image. Executable URLs, protocol-relative and remote images, SVG data URLs, malformed colors, duplicate IDs/slugs, unsupported enumerations, and unbounded numeric settings are rejected. Only embedded PNG/JPEG/WebP/GIF images are allowed. Export validates again, rejects filename collisions, and escapes every user-facing field. The renderer additionally checks URLs, images and colors in case in-memory editor data has not yet passed import validation.

Iframe runtime accepts messages only from `window.parent`. Text edit fields are limited to `title`, `body`, `eyebrow`, and `buttonLabel`; paste is plain text. Editor links do not navigate. Selection and scrolling use DOM matching, without interpolating arbitrary selectors. Runtime sends ready/select/edit/scroll and receives select/scrollTo/restoreScroll.

## Verification actually performed

- TDD red/green for missing model, malicious imports, round trips, semantic render, XSS escaping, offline files, contrast findings, page fragments, and filename collisions.
- `npm test -- tests/core-model.test.ts tests/core-render.test.ts`: **10 passed**.
- `npm run typecheck`: **passed**.
- `npm run build`: TypeScript passed; Vite failed because isolated engine worktree has no `/src/main.tsx` (editor-owned file). Full build must run on merged integration branch.
- Real Chromium 148 export inspection at desktop 1440×1000 and mobile 390×844: **no horizontal overflow**, **one h1**, **no JavaScript errors**, visible offline content and functional motion toggle.
- Chromium initially had no WebGL context because matching SwiftShader libraries were absent. Extracted matching bundled `swiftshader.tar.br` into `/tmp/session54-chromium`; actual WebGL then initialized successfully. All four geometry presets produced visible, shaded meshes. Screenshots were inspected. Visual QA found and corrected a depth-projection bug before delivery.
- Axe scan of default exported template with WCAG 2A, 2AA, 2.1AA and 2.2AA tags: **zero violations**. This is not a complete WCAG certification.
- Real `sandbox="allow-scripts"` iframe smoke: ready message received; double-click text editing produced expected edit payload; parent selection yielded exactly one selection outline; restoreScroll to 500 produced scroll message at 500; **no JS errors**.
- Filesystem smoke artifacts are temporary under `/tmp/reisian-engine-smoke/`; no binary QA screenshots were committed.

Browser execution required normal sandbox escalation because Chromium cannot launch inside the restricted syscall sandbox. This was approved. A Vite SSR fixture loader logged an incidental prohibited HMR socket, but it completed fixture generation; no product networking was required for export tests.

## Published commits

1. `ecdae60aaafcc19b2f03dd1d83b7ebc35ddf8fb1` — feat: 문서 검증과 기본 템플릿 추가
2. `a84385df7a6696ea5abcb8445673422d6fb41675` — feat: 오프라인 WebGL 조형과 캔버스 상호작용 구현
3. `c9fcc14be466fdf554b7a060e08c9e55da2f7491` — feat: 반응형 편집 캔버스와 공통 페이지 렌더러 추가
4. `6ba54728b9e54371aa7bc76b003741f33b37d7ac` — feat: 접근성 점검과 독립형 사이트 내보내기 검증
5. `244b8a0cd51bb67eb8426455436fbdb018c3738c` — fix: 런타임 CSP 해시 안정성과 WebGL 깊이 보정
6. `0389873017c748c87d4c83169f4328fc63a8d6fd` — fix: 페이지 앵커 링크와 내보내기 파일 충돌 검사
7. `a63af8361f6b65f3c443b8861fcec2b0a3743c95` — fix: 기본 소개 버튼을 작품 섹션에 연결

Every commit was created and immediately published through the authorized GitHub Git-data integration, then fetched back to the isolated worktree. No local unpublished commit and no GitHub Actions workflow was used.

## Known scope boundaries

- Gallery has one uploaded section image repeated across the requested column count; its default three visual studies are procedural CSS. The current shared schema does not contain independently authored gallery items.
- Cards have editable section heading/body with fixed sample per-card copy; no individual card content fields exist in the shared schema.
- WebGL context loss gracefully reveals the static fallback. Context restoration does not rebuild the scene until a page reload.
- Automated audit checks text contrast against solid section/theme colors. It does not establish contrast over arbitrary raster images, all dynamic focus states, or complete accessibility conformance.
- Native packaging and integrated editor smoke belong to the desktop/root branches; the engine branch does not independently claim release readiness.
