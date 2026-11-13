# AGENTS.md: study-tools

Map-first interactive study pages for Malcolm (RF engineer, MATLAB-fluent, learns by asking *why*). One monorepo: a shared `core` plus one app per subject. Every page opens on a **question-chain concept map** rooted at the subject's central question; everything else (deep dives, live figures, quizzes) hangs off map nodes and edges.

Live: https://msimpson993.github.io/study-tools/ · Repo: https://github.com/msimpson993/study-tools

## Layout
- `packages/core`: UI + math shared by all pages (theme, shell, concept map, figures, quiz, DSP/LTI math).
- `packages/build`: content loader/validator + Vite plugin (content → `virtual:study-content`).
- `apps/<page>/`: `subject.yaml`, `content/` (YAML + Markdown), `src/` (page-specific widgets only).
- `schemas/`: JSON Schemas for content. `scripts/`: build, validate, serve. `tests/e2e/`: Playwright.

## Commands
```
npm ci                 # install
npm run validate       # schema + reference checks on all content
npm run typecheck
npm test               # vitest: math, map layout (zero overlaps), content validation
npm run build          # dist/<app>/index.html (single-file, offline) + dist/index.html hub
npm run test:e2e       # Playwright (needs `npx playwright install chromium`, or PW_CHROME=/path/to/chrome)
npm run shots          # screenshots to shots/*.png (desktop+mobile, dark+light)
npm run serve          # static server for dist/ on :4173
npm run check          # everything above in order
```

## Rules that matter
0. **Visual-first and one running example.** Each subject declares `runningExample`; every non-root node has `addsToExample` (+ `accountsFor`); every deep dive has at least one manipulable figure (`figure:<id>` fence) in the 3Blue1Brown / MATLAB Tech Talk spirit: picture first, formula second. See `docs/design-principles.md` #0b/#0c.
1. **Map first.** A new page starts with `content/graph.yaml` (central question → chain of questions). Do not build a page without the map. Every node/edge needs a non-empty popup; the build fails otherwise.
2. **Content, not code.** Add topics as YAML/Markdown. Touch `packages/core` only for behaviour every page should share.
3. **Never regress a ported page.** Pages carry an `expect:` guard in `subject.yaml` (counts of nodes/edges/dives/examples); update it deliberately.
4. **Verify in a browser** before claiming done: `docs/verification-checklist.md`.
5. Dark true-black (`#000`) default, light toggle, 390 px phone must work, explanations collapsed by default.
6. Commit small, push after every commit; CI must stay green (`.github/workflows/ci.yml`).

## Docs index (read when…)
| File | Read when |
|---|---|
| `docs/design-principles.md` | designing or reviewing any page or UI behaviour (Malcolm's ranked rules) |
| `docs/content-format.md` | writing or editing `graph.yaml`, dives, quiz, figures, examples |
| `docs/components.md` | using or changing something in `packages/core` |
| `docs/dsp-control.md` | using or changing the control math (`tf`, `pid`) in `packages/core/dsp` |
| `docs/verification-checklist.md` | before you say a change is finished |
| `docs/porting-legacy-pages.md` | moving an old single-file page (e.g. Control Systems Tutor) into this repo |
| `packages/core/README.md`, `apps/*/README.md` | working inside that package/app |
