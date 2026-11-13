# study-tools

Interactive, map-first study pages. Each page opens on a **question-chain concept map** (start at the central question, tap any box or line to dive deeper, review mode tracks what you've seen), with deep dives, live figures and a self-check attached to the map. Each subject carries one running example through every box (linear-systems, control-systems and pid-tuning share the same spring-damper cart, G(s) = 1/(s²+3s+2)).

**Live site:** https://msimpson993.github.io/study-tools/

| Page | URL | What it is |
|---|---|---|
| Six domains of linear systems | [/transforms/](https://msimpson993.github.io/study-tools/transforms/) | question map + the six-domain board (9 transforms, forward/inverse pair views, draggable poles, 20 examples, windows) |
| Linear systems class dashboard | [/linear-systems/](https://msimpson993.github.io/study-tools/linear-systems/) | 3 maps (64 boxes), 18 deep dives, live e^{At} figure, 24-question self-check |
| Control systems (EECE5130) | [/control-systems/](https://msimpson993.github.io/study-tools/control-systems/) | 2 maps (27 boxes), 23 deep dives, 16 live figures (s-plane, root locus, Bode, step metrics) on the cart plant, full original course guide, 90-question quiz (course + mini-exam) |
| PID tuning (EECE5130) | [/pid-tuning/](https://msimpson993.github.io/study-tools/pid-tuning/) | question map (30 boxes), 29 deep dives, 23 live figures incl. the PID Lab and 14 failure cards (problem vs fix), full original guide, 46-question quiz with scope plots |

Every page is also built as a **single self-contained HTML file** (`dist/<page>/index.html`, works offline from `file://`); CI uploads them as an artifact.

## Develop
```
npm ci
npm run check      # validate content, typecheck, unit tests, build, Playwright
npm run build      # dist/index.html (hub) + dist/<page>/index.html
npm run serve      # http://localhost:4173
```
Layout: `packages/core` (shared UI + DSP math), `packages/build` (content validation + Vite plugin), `apps/<page>` (content YAML/Markdown + page widgets), `schemas/`, `tests/e2e/`. Contributors and agents: start with [AGENTS.md](AGENTS.md).
