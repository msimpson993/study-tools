# study-tools

Interactive, map-first study pages. Each page opens on a **question-chain concept map** (start at the central question, tap any box or line to dive deeper, review mode tracks what you've seen), with deep dives, live figures and a self-check attached to the map.

**Live site:** https://msimpson993.github.io/study-tools/

| Page | URL | What it is |
|---|---|---|
| Six domains of linear systems | [/transforms/](https://msimpson993.github.io/study-tools/transforms/) | question map + the six-domain board (9 transforms, forward/inverse pair views, draggable poles, 20 examples, windows) |
| Linear systems class dashboard | [/linear-systems/](https://msimpson993.github.io/study-tools/linear-systems/) | 3 maps (64 boxes), 18 deep dives, live e^{At} figure, 24-question self-check |

Every page is also built as a **single self-contained HTML file** (`dist/<page>/index.html`, works offline from `file://`); CI uploads them as an artifact.

## Develop
```
npm ci
npm run check      # validate content, typecheck, unit tests, build, Playwright
npm run build      # dist/index.html (hub) + dist/<page>/index.html
npm run serve      # http://localhost:4173
```
Layout: `packages/core` (shared UI + DSP math), `packages/build` (content validation + Vite plugin), `apps/<page>` (content YAML/Markdown + page widgets), `schemas/`, `tests/e2e/`. Contributors and agents: start with [AGENTS.md](AGENTS.md).
