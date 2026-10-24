# Document engine implementation report

## Delivered APIs

- `src/core/model.ts`: `createProject(template?: 'atelier' | 'portfolio' | 'blank')`, `createSection(kind)`, `parseProject(text)`, `serializeProject(project)`, `cloneProject(project)`, `createSectionItem(kind?, index?)`, `MAX_PROJECT_BYTES`, and `uid`, `safeHref`, `safeImage`, `safeColor` helpers.
- `src/core/render.ts`: `renderPageDocument(project, pageId, options?)`, `runtimeSource()`, `pageFileName(project, page)`, `escapeHTML(value)`.
- `src/core/export.ts`: `createExportBundle(project)` produces `index.html`, other page HTML, `styles.css`, and `runtime.js`. Images remain embedded. Page links and page-fragment links resolve to exported filenames.
- `src/core/audit.ts`: `auditProject(project)`, `contrastRatio(a,b)`.
- `src/core/styles.ts`: shared responsive `siteStyles`.
- `src/runtime/site-runtime.js`: self-contained `mountSite()` with real procedural torus, sphere, wave, and knot WebGL meshes, lighting, pointer response, pause/reduced-motion behavior, scroll presets, static fallback, and iframe editing protocol.

The schema now includes optional `Section.items: SectionItem[]` with `{id,title,body,image,imageAlt,href}` for cards and galleries. Item IDs are unique within their section, allowing section duplication without regenerating item IDs. Legacy sections without items retain a rendered fallback. NativeBridge is unchanged. No additional dependency was added.

## Parent CSP integration

The exact inline script bytes are:

```js
readFileSync('src/runtime/site-runtime.js', 'utf8')
  .replace('export function mountSite()', 'function mountSite()') + '\nmountSite();'
```

Hash those bytes in the parent CSP. `render.ts` imports the runtime with `?raw`, so production minification does not change the inline script. All user content stays in escaped text/attributes, never executable literals. Exported pages load the exact same source from local `runtime.js`.

## Security and resource handling

Imported projects are reconstructed from validated, bounded fields. Limits: 10 MiB UTF-8 JSON text (including final formatted saves), 30 pages, 100 sections per page, 300 sections total, 8 million characters per embedded raster image, and 12 items per section. Executable URLs, protocol-relative and remote images, SVG data URLs, malformed colors, duplicate IDs/slugs, unsupported enumerations, and unbounded numeric settings are rejected. Only embedded PNG/JPEG/WebP/GIF images are allowed. Export validates again, rejects filename collisions, and escapes every user-facing field. The renderer additionally checks URLs, images and colors in case in-memory editor data has not yet passed import validation.

Iframe runtime accepts messages only from `window.parent`. Text edit fields are limited to `title`, `body`, `eyebrow`, and `buttonLabel`; paste is plain text. Editor links do not navigate. Selection and scrolling use DOM matching, without interpolating arbitrary selectors. Runtime sends ready/select/edit/scroll and receives select/scrollTo/restoreScroll. Preview page navigation sends `reisian:navigate` with the page ID instead of navigating the srcdoc to a relative Vite URL. Preview external links do not navigate. Editor/preview keyboard shortcuts forward save/preview/return-editor/undo/redo/insert, while editable native undo remains local. A source-checked `reisian:flush` request receives `reisian:flushed` with the request ID and current active edits, without blurring or truncating text.

## Verification actually performed

- TDD red/green for missing model, malicious imports, round trips, semantic render, XSS escaping, offline files, contrast findings, page fragments, and filename collisions.
- `npm test -- tests/core-model.test.ts tests/core-render.test.ts`: **13 passed**.
- `npm run typecheck`: **passed**.
- `npm run build`: TypeScript passed; Vite failed because isolated engine worktree has no `/src/main.tsx` (editor-owned file). Full build must run on merged integration branch.
- Real Chromium 148 export inspection at desktop 1440×1000 and mobile 390×844: **no horizontal overflow**, **one h1**, **no JavaScript errors**, visible offline content and functional motion toggle.
- Chromium initially had no WebGL context because matching SwiftShader libraries were absent. Extracted matching bundled `swiftshader.tar.br` into `/tmp/session54-chromium`; actual WebGL then initialized successfully. All four geometry presets produced visible, shaded meshes. Screenshots were inspected. Visual QA found and corrected a depth-projection bug before delivery.
- Axe scan of default exported template with WCAG 2A, 2AA, 2.1AA and 2.2AA tags: **zero violations**. This is not a complete WCAG certification.
- Additional real iframe test: authored gallery item appeared; active editor remained `plaintext-only` after flush; Ctrl+S posted save, flush returned current edits, About link posted page ID without navigating, Escape posted return-editor, no JavaScript errors.
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
8. `c40d6337ba555df2820ba850cfbada3227f99a79` — docs: 엔진 구현과 브라우저 검증 결과 기록
9. `6b950de5bfd2a380f9ec5d3f7ee889eb4c87174e` — feat: 카드와 갤러리 항목의 안전한 편집 문서 확장
10. `068cac92a89375bf9448abb051f0be868591a5a9` — feat: 개별 카드와 작품 콘텐츠 렌더링 및 접근성 점검
11. `f870f501f4ea5921f1fc25b699a3ababa33c4f33` — fix: 미리보기 페이지 탐색을 부모 편집기에 전달
12. `c3f2be1ed4978eb2d537b54d2fafa81b7db615f1` — fix: 프로젝트 저장과 가져오기 크기를 UTF-8 기준으로 통일
13. `d7ec34a15114c4d6c0a6ef67107709e596834ac8` — fix: 활성 캔버스 텍스트 저장 동기화와 단축키 전달

Every commit was created and immediately published through the authorized GitHub Git-data integration, then fetched back to the isolated worktree. No local unpublished commit and no GitHub Actions workflow was used.

## Known scope boundaries

- Gallery and cards support individually authored item title/body/image/image alternative/link through inspector controls. Direct canvas editing currently covers section fields; item-level canvas editing is not implemented. Default gallery artwork is procedural CSS when no raster image is uploaded.
- WebGL context loss gracefully reveals the static fallback. Context restoration does not rebuild the scene until a page reload.
- Automated audit checks text contrast against solid section/theme colors. It does not establish contrast over arbitrary raster images, all dynamic focus states, or complete accessibility conformance.
- Native packaging and integrated editor smoke belong to the desktop/root branches; the engine branch does not independently claim release readiness.
