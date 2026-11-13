# Porting legacy single-file pages

Approach used for `apps/transforms` (a 1,200-line single HTML file) and `apps/linear-systems` (a Canvas dashboard):

1. **Inventory first.** Count what exists (nodes, edges, dives, examples, controls) and write it into `subject.yaml › expect:`. The build then refuses to drop anything silently.
2. **Extract content into data**, with a one-off script (kept out of the repo): maps → `graph.yaml`, prose → `dives/*.md`, examples/quiz → YAML. Keep wording 1:1; only fix markup.
3. **Add the map-first entry** if the legacy page lacked one: a question map whose nodes link (`live:`/`dive:`/`link:`) into the old views.
4. **Pure math → `packages/core/dsp`** with unit tests (compare against the legacy page's own self-check, e.g. `apps/transforms/test/model.test.ts` reproduces `__check`).
5. **Complex interactive DOM → keep as a legacy module** (`apps/transforms/src/board/board.ts`, `// @ts-nocheck`): wrap the old script in `mountBoard(host, params)`, load the HTML fragment with `?raw`, nest its CSS under `.legacy-board` (replace `:root`/`body` rules with `&`), scope `data-theme="dark"` on the host if it needs its own palette, and expose test globals on `window`. Port its test script to Playwright against the mounted board (`tests/e2e/transforms.spec.ts` reuses the original evaluate strings).
6. Check `docs/verification-checklist.md`, compare screenshots with the original.

## Control Systems Tutor (ported 2026-11-13)
The three legacy pages (course-topics, pid-tuning, mini quiz) and the Control Systems Hub Canvas Pages now live in `apps/control-systems` and `apps/pid-tuning`, following steps 1-6 above. Each original guide is kept as a legacy board for reference, the quizzes moved 1:1 into `quiz.yaml`, and every map box has a visual dive on the shared cart plant. See each app's README for counts.
