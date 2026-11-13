# Components (`packages/core`)

All vanilla TypeScript/DOM, no framework. Import from `@study/core` (UI) and `@study/core/dsp` (math). Styles come with `initTheme()`.

| Module | What it is | Notes |
|---|---|---|
| `theme.ts`, `styles/theme.css`, `core.css` | True-black dark default, light toggle, persisted (`study-theme`). | CSS variables: `--bg --panel --text --muted --accent --cyan --org --grn --vio …`. Shared class names are prefixed `st-` (`st-seg`, `st-eq`, `st-ctl`, …) so legacy page CSS cannot collide. |
| `app.ts` `mountApp(content, hooks)` | Page shell: top bar (☰, Variables, Hub, theme), collapsible sidebar, hash router, dive view, glossary drawer. | `hooks.figures[id]` mounts a figure; `hooks.board(host, params)` lazily mounts one custom board view. The board route starts with the sidebar tucked away. |
| `conceptmap.ts` `mountConceptMap` | The map. Auto layout (staggered rows, orthogonal edge tracks, collision-avoided pill labels), every box/line/dot tappable → popup, path-to-root highlight, Explore/Review modes, Recall (hide text), quiz this box / branch / missed. | Geometry lives in `maplayout.ts` (pure, unit-tested; `overlapReport`). Progress in `progress.ts` (`localStorage study-tools:<app>:progress`, status unseen/seen/correct/missed). Test ids: `concept-map map-node map-edge map-label map-panel review-bar quiz-subtree …`. |
| `figure.ts` `mountFigure(host, def, panels, controls)` | Inline panels → expand (overlay covers only the plot stage; controls stay usable) → pair view (forward+inverse, strip) with per-slot expandable legend, "how to read" only when expanded. | Supply `panels[{id,title,x,y,draw(g,w,h)}]`; use `drawPlot` from `plot.ts` for axes with named labels. |
| `figure.ts` extras | `lookFor` line, `animate` (play/pause/step, reduced-motion aware), per-panel `height`; figures embed in dives via the ```` ```figure:<id> ```` fence (`embedFigures` in `app.ts`). | |
| `controls.ts` `ControlSet` | Slider+number controls, segs, toggles, presets, "More controls" drawer, URL (de)serialization. | A preset is only a setting of visible controls. |
| `quiz.ts` `mountQuiz` | MCQ + recall flashcards, topic chips, missed-only, shuffle, keyboard, link back to the map/dive on a wrong answer. | |
| `dsp/` | `complex`, `fft` (radix-2, DFT, DTFT), `windows` (9 windows + ENBW/PSL/…), `interp` (sinc, ZOH/FOH droop), `lti` (expm, eig2, ctrb/obsv, rank). | Unit-tested (`packages/core/test/dsp.test.ts`): ZOH −3.92 dB at fs/2, FOH −7.84 dB, e^{At} for A=[[0,1],[−2,−3]], window ENBW … |

Build side (`packages/build`): `loadApp` (validate + render Markdown/KaTeX), `contentPlugin` (virtual modules `virtual:study-content`, `virtual:katex-css`), `appConfig` (single-file Vite config).

Running example UI: the map shows a collapsed "Running example: …" fold; every node popup shows two callouts ("Adds to the running example", "Lets us account for"); every dive opens with the same box.

Adding a shared feature: put it in `packages/core`, export from `index.ts`, add a unit test (pure parts) and a Playwright check, and document it here.
