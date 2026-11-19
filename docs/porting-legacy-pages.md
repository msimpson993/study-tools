# Porting legacy single-file pages

Approach used for the transforms page (since folded into `apps/linear-systems`, board in `src/board/`) (a 1,200-line single HTML file) and `apps/linear-systems` (a Canvas dashboard):

1. **Inventory first.** Count what exists (nodes, edges, dives, examples, controls) and write it into `subject.yaml › expect:`. The build then refuses to drop anything silently.
2. **Extract content into data**, with a one-off script (kept out of the repo): maps → `graph.yaml`, prose → `dives/*.md`, examples/quiz → YAML. Keep wording 1:1; only fix markup.
3. **Add the map-first entry** if the legacy page lacked one: a question map whose nodes link (`live:`/`dive:`/`link:`) into the old views.
4. **Pure math → `packages/core/dsp`** with unit tests (compare against the legacy page's own self-check, e.g. `apps/linear-systems/src/board/test/model.test.ts` reproduces `__check`).
5. **Complex interactive DOM → keep as a legacy module** (`apps/linear-systems/src/board/board.ts`, `// @ts-nocheck`): wrap the old script in `mountBoard(host, params)`, load the HTML fragment with `?raw`, nest its CSS under `.legacy-board` (replace `:root`/`body` rules with `&`), scope `data-theme="dark"` on the host if it needs its own palette, and expose test globals on `window`. Port its test script to Playwright against the mounted board (`tests/e2e/transforms.spec.ts` reuses the original evaluate strings).
6. Check `docs/verification-checklist.md`, compare screenshots with the original.

## Control Systems Tutor (ported 2026-11-13)
The three legacy pages (course-topics, pid-tuning, mini quiz) and the Control Systems Hub Canvas Pages were ported following steps 1-6 above. In Nov 2026 `apps/control-systems` was rebuilt in the question-chain format on three running examples (house, car corner, antenna dish) and the pid-tuning app was folded into it and removed (its Lab, tuning figures, failure cards and quiz now live in control-systems). The course guide is kept as the legacy board, and the quizzes moved into `quiz.yaml`. See the app's README for counts.
