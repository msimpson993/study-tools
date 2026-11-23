# sim-project

EECE5130 Simulation Project page. Central question: What does feedback buy a real machine, and what does each knob trade away?

This app is a one-off **tabbed** page (not a question-chain map):

- Five tabs: **Overview**, **Motor**, **Boring machine**, **Disk head**, **Engine**. Each problem tab has the same six parts: the problem, the setup, what's going on (with live figures inline), try it, check your work, and for your report.
- 10 live figures, including the `loop` block diagrams and `engine-fit` (stand-in engine, not in lab handout). The `knobs` figure is not used.
- A 71-question self-test with a tab filter (defaults to All), a 55-term glossary, and a Practice page, all linked from the top-right menu.
- Project 1 figures use a stand-in engine fitted to the handout's tuner tables, labelled "(not in lab handout)".
- Linked from the hub and cross-linked to [control-systems](../control-systems/).

Every number on the page is computed in `src/model/` and unit-tested against the tutor's `numbers.py` output (`test/numbers.test.ts`, fixture in `test/fixtures/`). Guard: `expect:` in `subject.yaml`.

Tab URLs are `#/tab/<id>` so the browser Back button moves between tabs.
