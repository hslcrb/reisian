# Desktop implementation and verification

## Scope

The Electron foundation exposes only the `NativeBridge` defined in `src/core/types.ts`: platform, saveProject(content, name), openProject(), and exportSite(files, name). Save/open use native project pickers; export uses a native ZIP save picker. Every operation returns the existing canceled/filePath/content result shape. No generic filesystem, shell, arbitrary channel or IPC event interface reaches the renderer.

Production loads `dist/index.html`. Development requires an explicit `http://127.0.0.1:PORT/` address and rejects other protocols, hosts, credentials, paths, query strings and fragments. Packaged builds ignore the development environment override. Main-frame IPC must come from the current application window, its exact main frame and its expected URL.

BrowserWindow enables context isolation, sandbox, web security and disables Node integration, webviews and insecure content. Navigation, new windows, downloads and permissions are denied. The preview may load `about:srcdoc` / `about:blank` subframes; remote resource requests are denied. Production file requests are confined to the built distribution directory. No updater, telemetry or cloud dependency was introduced.

## File boundaries

- Native project input has a 10 MiB UTF-8 byte ceiling. Opening reads a bounded buffer from a verified regular file, including when another process grows the file. UTF-8 decoding is strict. Native validation checks the versioned document's root, theme, pages, sections, enums and primitive types before a save picker opens or open content returns. The editor's core validator remains the canonical semantic validator; it additionally validates URLs, images, colors and detailed authoring ranges.
- Native export permits at most 512 files and 40 MiB total UTF-8 content, and requires index.html. Paths reject traversal, absolute paths, backslashes, control characters, Windows reserved names, duplicate case-insensitive/normalized paths and file-directory conflicts.
- Suggested filenames remove path separators and platform-specific invalid/reserved names. Korean names are retained.
- Writes use an exclusive sibling temporary file, flush it, then rename it to the selected destination. Temporary files are cleaned on failure. Cancellation returns before any write. Disk-full, permission, missing-folder and read-only errors have actionable messages.
- Only one native file operation may be pending, avoiding overlapping picker interactions.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev:desktop` | Start Vite on loopback, then Electron; shut both down together. Optional REISIAN_DEV_PORT defaults to 5173. |
| `npm run desktop` | Launch the previously built production app. Run npm run build first. |
| `npm run test:desktop` | Playwright-driven native IPC, file transaction, ZIP and isolation smoke. |
| `npm run package` | Build renderer and package Linux unpacked directory into release/linux-unpacked. |
| `npm run package:win` | Build renderer and request a Windows portable executable. Windows runtime behavior is unverified. |

The packaging commands explicitly select `electron-builder.config.cjs`: electron-builder did not auto-detect this filename during the initial experiment. Packaged files are limited to the built renderer, Electron implementation, package metadata and production dependencies. No signing credentials or native icon assets are assumed.

## Observed evidence

1. `vitest run tests/desktop-guards.test.ts tests/desktop-storage.test.ts`: **21 tests passed**. Cases include malformed/oversized imports, nested structural failure, archive traversal, case duplicates, path collisions, export limits, main-frame sender authority, platform filename suggestions, atomic replacement, preservation after failed writes, strict UTF-8 and actionable errors.
2. `tsc --noEmit`: passed for the desktop branch state.
3. `node --check` passed for main process, development helper, smoke helper and builder config.
4. Electron's npm package initially lacked its downloaded executable. `node node_modules/electron/install.js --no` with the authorized network environment installed the binary. `node node_modules/electron/cli.js --no-sandbox --version` then reported **v45.0.0**.
5. Actual Electron45 headless smoke against a temporary local HTML fixture passed **8 checks**: isolated bridge and preferences; real WebGL pixel; project save/open through IPC and filesystem; save/open/export cancellation; malformed import and archive traversal rejection; real ZIP contents; write-failure messaging; denied external navigation, windows and requests. Native dialog return values are stubbed in the main-process test; the IPC, filesystem code and ZIP creation run unchanged. This validates the native foundation, not the final editor UI.
6. Actual WebGL allocated a context, cleared it red and returned `[255, 0, 0, 255]` from `readPixels`, using Electron's software graphics stack. The context reported `WebGL 1.0 (OpenGL ES 2.0 Chromium)`.
7. Development failure lifecycle was exercised: the root-owned container rejected an Electron launch without the no-sandbox flag. The helper now closes Vite and exits nonzero on that signal instead of hanging or reporting success. Production behavior does not automatically bypass the Chromium sandbox.
8. Linux directory packaging exited zero in the isolated worktree, but its shared `node_modules` symlink made npm/electron-builder fail to enumerate JSZip transitive dependencies. Archive inspection confirmed the missing dependencies. **That worktree package is not a verified usable deliverable.** The integration owner must package from the main checkout's real `node_modules`, inspect and launch the resulting package.

### Container-specific native command

```sh
REISIAN_ELECTRON_NO_SANDBOX=1 REISIAN_ELECTRON_HEADLESS=1 REISIAN_ELECTRON_SOFTWARE_GL=1 npm run test:desktop
```

This environment runs as root without a display server. The explicit test-only variable adds `--no-sandbox`; the desktop application itself retains sandbox:true and never supplies that flag. Consequently the smoke confirms sandbox configuration, **not OS sandbox enforcement in this container**. Running outside the tool's syscall sandbox was also necessary. A normal desktop user should run the default command with a working display, or use Xvfb on Linux.

The software-graphics option adds `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` solely to the test process. Headless uses `--ozone-platform=headless`. Neither option changes shipped defaults.

For a built Linux application, add `REISIAN_ELECTRON_EXECUTABLE=/absolute/path/release/linux-unpacked/reisian` to repeat the same smoke against the packaged executable.

## Remaining integration checks

The integration owner must repeat smoke on the actual built editor and on a package created from a non-symlink dependency tree. Desktop UI pickers have not been manually exercised. Windows portable configuration is present, but Windows packaging/runtime, macOS packaging/signing and native OS sandbox behavior remain unverified. No release-readiness claim is made from the fixture run.

## Published implementation history

Each change was immediately published via GitHub Git-data endpoints before the next change began; no workflows were added.

- 5f88838108b159642eecd913b42bf5c148d5e027 — desktop file guards and tests.
- 587dddd3d7f623a967137c4e448029664f3ce3d9 — isolated main/preload, native IO and storage tests.
- 4d790f3a52830a4c73961bd527b337ef36253bca — development and packaging commands.
- 6455dcaed84cfb96b8b2fcee2e1044567f336230 — native IO smoke.
- a43c32d455daff4a0caedad762905dcf24bab925 — explicit builder configuration selection.
- e9d305ed119089ec03d4d5ea580c96aeeefb498b — WebGL pixel and packaged executable smoke options.

Reference checked for frame-navigation semantics: https://www.electronjs.org/docs/latest/api/web-contents/#event-will-frame-navigate . Installed Electron45 TypeScript declarations corroborate the event-details API used in main.cjs.
