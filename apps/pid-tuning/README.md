# pid-tuning

EECE5130 PID tuning page (Project 1). Central question: given a plant we know only roughly, how do we choose Kp, Ki and Kd so the output tracks a step quickly with little overshoot, shrugs off a push and ignores sensor noise, and how do we recognize what to turn when it does not?

- 1 question map (30 boxes, 30 lines), 29 deep dives, 23 live figures.
- PID Lab (`src/lab/`) on core `simulatePid`/`pidMetrics`: plants 1/(s+1), 1/((s+1)(0.5s+1)) = 2·cart, 1/(s+1)³; presets incl. Z-N; derivative filter N, disturbance, noise, actuator limit, anti-windup (off / clamp / back-calc), D on measurement, ghost run. Unit tests compare it with the legacy PIDSIM.
- 14 failure cards (A1-A14), each a problem-vs-fix figure. Delay, sensor-lag, nonlinear, rate-limit and dead-zone cases use an app-local port of the legacy LOOPSIM.
- The full original guide, kept as a legacy board in `src/guide/`.
- 46 quiz questions with scope plots (`src/quizfigs.ts`, core `scopeFigure`) and a 44-term glossary.
- Cross-linked with `../control-systems/`.

Guard: `expect:` in `subject.yaml`.
