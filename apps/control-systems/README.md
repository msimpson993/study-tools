# control-systems

EECE5130 control systems course page. Central question: How do we make a system we only know approximately do what we command, and predict how it will behave before we build it?

- 2 question maps in the question-chain format: Big picture (22 boxes, 24 lines) and Full detail (39 boxes, 41 lines). Every box has a pop-up with a plain answer, captioned figures, its running-example line and a quick check.
- 33 deep dives (20 main, the overview, 12 children), each opening on its map question, with a math level, at least one live figure, a worked example on its running example, what it can't do and 2–3 checks.
- Three running examples: the two-room **house** (core `HOUSE` model), the **car corner** (parameters in `src/model/params.ts`: 400 kg, 25.6 kN/m, 1.6 kN·s/m) and the **antenna dish** (J = 10, B = 20, ±200 N·m), plus the **PID Lab** (dish by default; legacy p1–p3 plants as alternates) and the 14 tuning failure cards, all folded in from the former pid-tuning page.
- 56 live figures (`src/figs/`), 23 pop-up figures (`src/figs/pop.ts`), the full original interactive course guide as the board (`src/guide/`).
- 259 quiz questions (box asks, dive checks, kept course, mini-exam and PID pools), 2 mini-exam review pages, glossary.

Every number on the page is computed in `src/model/` and unit-tested against the tutor's `numbers.py` output (`test/numbers.test.ts`, fixture in `test/fixtures/`). Guard: `expect:` in `subject.yaml`.
