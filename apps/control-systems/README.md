# control-systems

EECE5130 control systems course page. Central question: how do we make a system we only know approximately do what we command, quickly, smoothly and despite disturbances and noise, and predict that from its poles before we build it?

- 2 question maps (32 boxes, 31 lines): the question chain and the s-plane as a map. The chain has a fifth chapter, Designing with state feedback (controllability, full-state feedback, observer, separation, reference input).
- 28 deep dives, each with a live figure, `addsToExample`/`accountsFor`, a Predict callout and symbols.
- 21 figures on the running example, the 1 kg cart G(s) = 1/(s²+3s+2) (shared with `linear-systems`): poles/zeros vs step response, root locus with gain drag (`locus`, animated), Bode with margins, |G(s)| height map, P/PI/PID on the cart, plus the state-feedback set (Pc/Po, Ackermann vs the locus, Luenberger observer, separation, reference gain).
- The full original interactive course guide, kept as a legacy board in `src/guide/`.
- 105 quiz questions: 83 course + 22 mini-exam, tagged to map boxes. 76-term glossary.
- The PID box links to `../pid-tuning/`.

Content in `content/`, figures in `src/figs/`, cart model in `src/cart.ts` (tested in `test/`). Guard: `expect:` in `subject.yaml`.
