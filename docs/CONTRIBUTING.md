# Contributor guide

## Start locally

Use Node.js **22.12 or newer** and npm. From the repository root:

```sh
npm ci
npm run dev
```

The browser development surface is useful for editor work. To exercise native dialogs and the Electron boundary, use `npm run dev:desktop`. Build first with `npm run build` before launching a standalone development window with `npm run desktop`. Desktop tests need a display; on Linux use `xvfb-run -a npm run test:desktop` when a real display is unavailable. Platform packaging instructions are in the [README](../README.md).

## Product boundaries

Reisian is a local-first, visual-only website builder. Keep authored text, layout, appearance and motion editable through the canvas and labeled controls. Do not introduce an in-product HTML, CSS, JavaScript or prompt-only authoring requirement. The same document renderer should power canvas, preview and export.

Provide a keyboard/button alternative to dragging, visible focus, understandable labels and errors, semantic headings, meaningful image alternatives and reduced-motion behavior. Automated accessibility checks are assistance, not certification. New controls must perform their labeled operation; unfinished concepts belong in the roadmap.

Treat imported projects and asset names as untrusted. Validate the versioned schema and resource limits. Escape exported content and reject executable URLs. Preserve Electron isolation, sandboxing and narrow IPC operations. Never expose arbitrary paths or generic filesystem/IPC methods to the renderer.

## Keep changes reviewable

Start with a reproducible issue or a concise explanation of the user problem. For a broad architectural or interaction change, discuss the approach before implementation. An issue is not required for a typo or a clearly scoped fix. Use original assets or document third-party licenses. Do not upload private project files, credentials or personal information.

Every new branch begins with `chatgpt/`. Namespaces have an `integration` leaf, with child work alongside it:

```text
chatgpt/reisian/integration
chatgpt/reisian/editor/integration
chatgpt/reisian/editor/keyboard/integration
```

Git cannot store both `a` and `a/b` as branch names. Avoid creating `chatgpt/reisian` as a branch if it will contain child namespaces. Parallel contributors should use separate worktrees and agree on file ownership before editing.

Use tiny cohesive commits with an English prefix and a Korean description, for example `fix: 키보드로 섹션 순서 변경 수정`. Publish each commit immediately before beginning the next cohesive change. Do not collect unrelated edits into a final large commit. Use the approved GitHub integration when the working environment has no Git HTTPS write credentials; do not invent or expose credentials.

Merge with two-parent history (`--no-ff` locally or GitHub's **Create a merge commit**). Do not squash, rebase-merge or force-push shared history. Follow [AGENTS.md](../AGENTS.md) when working as an automated contributor.

## Verify the behavior you changed

```sh
npm run check
npm run test:e2e
npm run test:desktop
```

`check` runs TypeScript checking, unit tests and the production build. Install browser test binaries if missing with `npx playwright install chromium`; a Linux environment may also need system libraries. Electron smoke tests require an Electron binary and a graphical session. Record missing dependencies or platform restrictions instead of calling an unrun check a pass.

For UI changes, exercise the real interaction with keyboard and pointer, inspect the relevant viewport, and include a screenshot when it explains the result. For export changes, inspect the generated site and its local assets. Test native file operations in Electron. Add a focused regression test for a behavioral defect when it will detect a recurrence; avoid tests that only repeat implementation details.

Keep verification local. **Do not create or run GitHub Actions workflows.** Record substantial validation outcomes and remaining limitations in `docs/agent-brain/`. Before a release-readiness claim, complete type checking, unit tests, build, browser end-to-end tests and native Electron smoke verification on the platforms being claimed.

## Open a pull request

Explain the user problem, the resulting behavior, verification performed and remaining limitations. Link the issue if there is one. Include only commands actually run and their outcomes. Call out document schema changes, security boundaries, accessibility effects and platform-specific behavior when relevant. Keep generated build directories, local caches, credentials and private `.reisian` projects out of the diff.

Changes are contributed under the repository's [MIT license](../LICENSE). Maintainers can request a smaller scope or decline a change that conflicts with the product contract. Korean and English contributions are both welcome.
