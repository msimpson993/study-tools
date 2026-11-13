# Porting legacy single-file pages

Approach used for `apps/transforms` (a 1,200-line single HTML file) and `apps/linear-systems` (a Canvas dashboard):

1. **Inventory first.** Count what exists (nodes, edges, dives, examples, controls) and write it into `subject.yaml › expect:`. The build then refuses to drop anything silently.
2. **Extract content into data**, with a one-off script (kept out of the repo): maps → `graph.yaml`, prose → `dives/*.md`, examples/quiz → YAML. Keep wording 1:1; only fix markup.
3. **Add the map-first entry** if the legacy page lacked one: a question map whose nodes link (`live:`/`dive:`/`link:`) into the old views.
4. **Pure math → `packages/core/dsp`** with unit tests (compare against the legacy page's own self-check, e.g. `apps/transforms/test/model.test.ts` reproduces `__check`).
5. **Complex interactive DOM → keep as a legacy module** (`apps/transforms/src/board/board.ts`, `// @ts-nocheck`): wrap the old script in `mountBoard(host, params)`, load the HTML fragment with `?raw`, nest its CSS under `.legacy-board` (replace `:root`/`body` rules with `&`), scope `data-theme="dark"` on the host if it needs its own palette, and expose test globals on `window`. Port its test script to Playwright against the mounted board (`tests/e2e/transforms.spec.ts` reuses the original evaluate strings).
6. Check `docs/verification-checklist.md`, compare screenshots with the original.

## Control Systems Tutor (not ported yet)
Three pages live outside this repo: **pid-tuning**, **course-topics**, **mini quiz**. They were deliberately not touched. To port:
- *course-topics* → `apps/control-systems`: its topic list becomes the question map (`graph.yaml`) and one dive per topic; the course outline is the `central` md section.
- *pid-tuning* → a `figures.yaml` entry (controls Kp, Ki, Kd + presets for classic tunings, pair view = reference vs. response) with the step-response simulation as the `FigurePanel.draw` functions in `apps/control-systems/src/main.ts`; put the simulation maths in `packages/core/dsp` (or the app's `model.ts`) with unit tests.
- *mini quiz* → `content/quiz.yaml`, tagging each question to a map node so branch quizzes and the missed-only filter work.
Start with the map, then port one page at a time and keep an `expect:` guard.
