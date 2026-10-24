# Reisian contributor and agent guide

Reisian (레이시안) is an open-source, local-first, visual-only Electron website builder.

## Product contract
- No code editor in the product. All authoring uses the canvas and labeled controls.
- Editing, preview and export share one page renderer; exported sites require no account or hosted service.
- Accessibility is a design constraint: keyboard alternatives for dragging, visible focus, semantic headings, image alternatives, contrast feedback, and reduced motion.
- Never advertise an automated audit as full WCAG conformance.
- Treat project files as untrusted. Validate schemas, bound resources, escape output, and deny executable URLs.
- Keep Electron context isolation and sandbox enabled; never expose generic filesystem or IPC access.
- Do not add or run GitHub Actions workflows. Use local build and verification scripts.

## Git contract
- Every new branch starts with `chatgpt/`.
- Namespaces are nested; each logical parent's branch is named `integration`, with child namespaces alongside it. Git cannot contain both refs `a` and `a/b`.
- All merges preserve two parents (`--no-ff` or GitHub merge method `merge`). No squash or rebase merging.
- Use tiny cohesive commits with an English prefix and Korean message, e.g. `feat: 페이지 복제 기능 추가`.
- Publish each commit immediately before starting the next change.
- In this environment Git HTTPS has no write credentials. Use the authorized GitHub integration Git-data endpoints to create each commit and immediately update its branch. Fetch the published commit back to synchronize the local checkout. Do not invent credentials or force-push.
- Work on isolated worktrees. Own disjoint files when collaborating.

## Verification
Run `npm run typecheck`, `npm test`, `npm run build`, browser end-to-end tests, and the local Electron smoke test before claiming release readiness. Record actual outcomes and platform limitations in `docs/agent-brain/`.
