# Security / 보안

Reisian is an early alpha. Security fixes target the current development version; there is no supported long-term release line yet. Local operation is a design choice, not a guarantee that every imported file is safe.

## Report a vulnerability

If this repository exposes **Security → Report a vulnerability**, use that private reporting route. Its availability depends on repository settings; this document does not assert that it is enabled.

If no private route is visible, open a minimal issue requesting a private security contact from the maintainer, `@hslcrb`. Include only a broad component name and how to reach you without exposing sensitive information. Do not attach an exploit, private project, token, personal information or a malicious payload to a public issue. Wait for an agreed private channel before sending details. There is no guaranteed response-time commitment.

In a private report, include the affected commit/version and OS, expected versus actual behavior, a minimal reproduction, impact and any proposed mitigation. Sanitize project content and use test accounts and disposable files. Please allow a fix and coordinated disclosure before publishing exploit details.

보안 문제는 가능한 경우 GitHub의 비공개 취약점 신고 기능으로 알려 주세요. 해당 기능이 보이지 않으면 공개 이슈에는 비공개 연락 경로 요청만 남겨 주세요. 악용 코드, 개인정보, 토큰과 비공개 프로젝트는 공개하지 마세요.

## Areas that need particular care

- `.reisian` import validation, resource limits and schema migrations.
- HTML/CSS/JavaScript generation, URL handling and exported filenames.
- Electron navigation, context isolation, sandboxing, IPC and native file dialogs.
- ZIP export paths, image handling and dependencies.

The renderer must never receive generic filesystem access, arbitrary IPC invocation or executable user code. Project authors can intentionally add links and images; review authored content before publishing a site. Exporting creates files locally and does not itself publish them to the internet.

## Maintainer handling

Reproduce with disposable data, limit disclosure to people working on the fix, add a regression check where useful, and document affected versions and migration steps when publishing a fix. Do not add GitHub Actions workflows: this repository uses local verification.
