# Reisian — a web that feels like you

## Intent
Build the fishing rod, not the fish: give people a visual instrument for creating expressive, accessible websites. The user delegated branding and implementation decisions and explicitly requested Electron, open source, visual-only editing, easy scroll/WebGL/3D authoring, many small immediately published commits, nested chatgpt namespaces and non-fast-forward merges. These are requirements. Technology and palette below are implementation decisions.

## Chosen approach
Use Electron + React + TypeScript + Vite. Keep a validated, versioned JSON document as the source of truth. A shared HTML renderer powers the canvas, preview and standalone export. A compact local WebGL runtime provides procedural sculptures with DOM text alternatives and static fallbacks. This avoids accounts, CDNs, remote rendering and executable user code.

Alternatives considered: a full generic DOM editor would allow more layout freedom but makes semantic structure and the beginner workflow fragile; a hosted CMS would add authentication and deployment scope before visual authoring works. The chosen section and element system prioritizes direct manipulation and reliable self-contained export. Arbitrary HTML/code entry is intentionally excluded.

## First complete product flow
- Start with a polished editorial template or a blank page.
- Add, select, edit, duplicate, reorder and remove sections. Direct canvas text editing and drag reorder have keyboard/button alternatives.
- Manage multiple pages, titles and descriptions.
- Adjust theme colors, typography, spacing, alignment, image alternative text and links through forms.
- Choose WebGL sculpture geometry/material/color/size and scroll animation presets without writing code.
- Preview desktop, tablet and mobile layouts. Undo/redo and local autosave protect editing.
- Save/open a `.reisian` project in Electron or the browser development surface.
- Run explainable accessibility checks and navigate to affected sections.
- Export a ZIP containing semantic HTML pages, local assets, CSS and JS. No service dependency.

## Design direction
Warm paper (#F4F1EA), aubergine ink (#30252D), plum (#71354D), sage (#D2DDD2), and a small lavender accent (#CCC5E5). Use precise typography, a clear tool/canvas separation, fine borders and purposeful blank space. The canvas is an editorial design with a sculptural object; the UI is an instrument, not a dashboard of generic cards. Brand line: “Make the web feel like you.” Korean: “당신의 감각이, 그대로 웹이 되는 곳.”

## Constraints and honesty
The first version is a working alpha, not a claim of commercial parity with mature builders. Automated checks support WCAG 2.2 AA-related authoring but cannot certify every authored site. Native packaging is verified only on platforms actually built. All features visible as active controls must perform their stated operation; unsupported functionality belongs in the roadmap.

## Architecture and ownership
- Core: `src/core/` schema, templates, commands, history, audit, render and export; `src/runtime/` WebGL/motion/browser interactions.
- Editor: `src/editor/`, App and CSS; application state, panels, iframe messaging, keyboard interactions, dialogs.
- Desktop: `electron/`, startup/build helpers, IPC/file security and native smoke tests.
- Brand/community: `public/brand/`, README, license, contribution/security/code-of-conduct documents.

## Accessible and safe defaults
Semantic navigation/main/footer, one h1 per page, real button/link elements, visible focus, minimum target sizes, no scroll hijacking, no auto-playing audio, movement disabled for prefers-reduced-motion, and a pause-motion control. Imported content is bounded and parsed against a strict schema. Electron renderer has no Node access; IPC validates sender and data, file paths originate from native dialogs.

## Evidence sources
- https://www.electronjs.org/docs/latest/tutorial/security
- https://www.w3.org/WAI/WCAG22/quickref/
- https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements
