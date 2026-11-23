# sim-project

EECE5130 Simulation Project page. Central question: What does feedback buy a real machine, and what does each knob trade away?

- One question-chain map (22 boxes, 21 lines: 19 main + 2 side paths) over four running examples: a speed-controlled **motor**, the English Channel **boring machine**, a **disk-drive head**, and an **engine** tuned with PID Tuner.
- 8 deep dives, 9 live figures and 10 quiz-figure renderers, a 69-question self-test, a report checklist and practice problems, and a 47-term glossary.
- Project 1 figures use a stand-in engine fitted to the handout's tuner tables, labelled "(not in lab handout)".
- Linked from the hub and cross-linked to [control-systems](../control-systems/) where the dives point.

Every number on the page is computed in `src/model/` and unit-tested against the tutor's `numbers.py` output (`test/numbers.test.ts`, fixture in `test/fixtures/`). Guard: `expect:` in `subject.yaml`.
