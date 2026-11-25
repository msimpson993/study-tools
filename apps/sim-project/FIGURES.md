# Figure specs for sim-project (for Study Tools Manager)

All models are in `/workspace/cs-lab/numbers.py`; port them to `apps/sim-project/src/model/` and pin the numbers below in `test/numbers.test.ts`. Use `packages/core/src/ctrlviz.ts` (`drawStepResponse`, `drawSPlane`, `drawBode`) and `@study/core/dsp` `tf` wherever it fits. Colours: theme variables only (true-black default). Every panel needs a title and labelled axes with units.

## Models (exact)

| id | model | notes |
|---|---|---|
| motor-open | ω/T_d = −1/(J s + b + Km·Kb/Ra) | J=2, b=0.5, Km=10, Ra=1, Kb=0.1 → −1/(2s+1.5) |
| motor-closed | ω/T_d = −1/(J s + b + Km·(Ka·Kt + Kb)/Ra) | Ka=54, Kt=1 → −1/(2s+541.5) |
| borer-step | (Kd s + K)/(s² + (1+Kd) s + K) | handout Kd = 11 |
| borer-push | 1/(s² + (1+Kd) s + K) | |
| borer-S | s(s+1)/(s² + (1+Kd) s + K) | sensitivity (Kd = 11 in the handout) |
| disk-seek | 5000Ka/(s³ + 1020s² + 20000s + 5000Ka) | |
| disk-shock | −(s+1000)/(s³ + 1020s² + 20000s + 5000Ka) | = −G₂/(1+KaG₁G₂) |
| disk-stand | 5Ka/(s² + 20s + 5Ka) | "drop the coil" toggle |
| engine (stand-in, NOT in handout) | G = 311·3.42²·e^(−0.015s)/(s² + 6.3954s + 11.6964) | fitted to the handout's tuner tables; simulate the delay with a sample buffer (numbers.py uses dt = 0.2 ms, ZOH) or a 3rd-order Padé for Bode only (use the exact e^(−jωτ) for Bode) |
| tuner emulation (NOT in handout) | ω_c = 2/t_resp; target PM = 100·rob (deg); ∠C = −180° + PM − ∠G(jω_c), clamped to [−90°, 0°]; |C| = 1/|G(jω_c)|; P = |C|cos∠C, I = −|C|sin∠C·ω_c | reproduces the handout's P, I within 0.4 % |

Metrics: overshoot vs final value; rise 10–90 %; settling = last exit from a ±2 % band (MATLAB stepinfo default); same as numbers.py `metrics()`.

## Live figures (figures.yaml)

### blocks
- Panels: (1) code pane showing the chosen script (the handout's exact lines, with `b=0.5` fixed in motor-open and a ⚠ note on that line: "handout has f=0.5; b is undefined"), current line highlighted; (2) block diagram with the block built by that line outlined yellow; (3) "fraction so far" in plain Unicode.
- Scripts: motor-open (Fig. 4.23: 6 steps), motor-closed (Fig. 4.24: 8 steps: sys1, sys2=Ka·Kt, sys3=Kb, sys4=Km/Ra, parallel, series, feedback, sign flip), borer-step (Fig. 4.25: sysg, sys1, series, feedback), borer-push (Fig. 4.26: sysg, sys1, feedback(sysg,sys1), minreal), disk-seek (Fig. 4.30: sysf, sysg, series(Ka*sysf,sysg), feedback), disk-shock (Fig. 4.31: sysf, sysg, feedback(sysg,Ka*sysf), sign flip). `line` max adapts to the script length.

### motor
- Scene panel: motor + load disc + brake pad (load torque arrow T_d) + tachometer and amplifier drawn only when loop ≠ open; shaft spin rate ∝ speed (exaggerate the change ×100 open, ×30 000 closed and say so in a corner label "speed change drawn ×N").
- Plot panel: speed change after a 1 N·m step load at t = 0; `axis` "7 s" (y −0.7…0) or "0.02 s" (y −2.0e−3…0, label "×10⁻³"). Final-value dashed lines.
- Readout: open sag −1/(b+KmKb/Ra); closed sag; τ open/closed; loop gain Km·Ka·Kt/(Ra·(b+KmKb/Ra)); ratio vs the 0.02 line (green ✓ under, red over).
- Pinned numbers: −0.6667, −0.6632 at 7 s, −0.0018467, −0.0018385 at 0.02 s, ratio 0.00277, τ 1.333 s / 3.693 ms, loop gain 360, Ka for 0.02 = 7.35.

### borer
- Scene: plan view of the tunnel: planned line (dashed), cutter head drawn at y(t) (lateral offset exaggerated, labelled), rock push arrow when input = push.
- Plots: command step (overshoot, ±2 % band, Ts marked); push step (final 1/K marked); s-plane with poles of s²+(1+Kd)s+K and the zero at −K/Kd, ζ rays 1 and 0.6, ghosts at K = 20, 100.
- Readout: ζ, ωₙ, overshoot, Ts, push offset, poles. Pinned: K=20 → 3.86 %, 0.913 s, 0.05, poles −2, −10; K=100 → 22.03 %, 0.666 s, 0.01, −6 ± 8j, push peak 0.01095 at 0.393 s; K=36 → 9.23 %; Kd 0 / 5 / 20 at K = 100 → 85.45 / 42.62 / 10.08 %.

### tradeoff
- One panel: parametric curve (overshoot %, offset) for K (or Ka) on a log grid 5…400 (disk: 5…2000, axes overshoot vs |shock offset| = 1/(5Ka)); dot at the slider value; yellow marks at handout settings (borer 20, 100; disk 10, 80); text labels on the marks.
- Pinned: K=38.70 ↔ 10 %, offset 0.0258; disk Ka=41.13 ↔ 5 %, 0.00486.

### sens
- Left: S(jω) path in the complex plane, ω from 0.1 to 1000 (log spaced, 400 pts), with arrows showing increasing ω; probe dot.
- Right: log-log |S| and dashed |s/K|, probe vertical line. Readout: "|S| = x at ω; a 10 % change in the machine at this rate changes the loop by 10·x %".
- Pinned (K=20): |S| 0.0050 @0.1, 0.0629 @1, 0.697 @10, 0.995 @100; max Im S 0.539 at Re 0.464. K=100: peak 1.043 @18.7; > 1 above 13.27 rad/s.

### disk
- Scene: drive from above, arm pivot, head over concentric tracks; seek moves the head to the next track (y(t) mapped to angle); shock = jolt arrow.
- Plots: seek with stand-in overlay when toggled; shock response (final −1/(5Ka)); s-plane zoomed to the arm poles (range ~ ±30), inset arrow "coil pole at −1000" (its live value).
- Readout: Ka, overshoot, Ts, shock offset, "ceiling Ka = 4080 (×N above you)"; when Ka > 4080 show "UNSTABLE" and clip the trace.
- Pinned: Ka=10 → 0 %, 1.397 s, poles −1000.05/−17.01/−2.94, shock −0.02; Ka=80 → 17.11 %, 0.409 s, peak 1.171 @0.181 s, poles −1000.41, −9.796 ± 17.432j, stand-in 16.30 %; shock −0.0025, dip −0.002928 @0.180 s; Ka=200 → 37.18 %; ceiling 4080 at 141.4 rad/s.

### pi
- Top: speed (unit step reference) on the stand-in engine. Bottom: P·e(t) and I·∫e dt stacked or as two lines, throttle units.
- Pinned: P-only at 0.0042253 → final 0.568 (error 0.432); at 0.01 → error 0.243.

### tuner
- Scene strip: engine + throttle + rpm gauge (needle follows the response when animating).
- Slider strip drawn like the PID Tuner toolbar (Slower ↔ Faster; Aggressive ↔ Robust) mirroring the controls.
- Left: step response (tuner's "Step Plot: Reference tracking"), ghost = previous preset. Right: Bode of L = C·G with PM and GM bars (`drawBode` margins). Table: P, I, rise, settling, overshoot, peak, GM (dB @ rad/s), PM (deg @ rad/s), stability; "handout" column filled only at the three presets.
- Label in the figure: "Stand-in engine and emulated tuner (not in lab handout)".
- Pinned: emulated P, I at the presets (0.0042220/0.0092107; 0/0.0021303; 0.0014529/0.0043857); stand-in metrics with handout gains (0.450/1.961/7.47 %; 2.070/3.467/0.37 %; 1.091/1.816/0 %); PM 59.9/69.4/72.1; GM 25.4/18.9/32.7; P clamps at t_resp ≈ 2.12 s (rob 0.6); rob 0.4 → 28.4 %; rob 0.8 → 0 %, 4.73 s.

### knobs
- One plot + arrow strip. Machine → main response: motor = load step (closed loop), borer = command step + push offset readout, disk = seek + shock offset readout, engine = step on the stand-in (robustness/response time through the emulated tuner; P, I directly).
- Arrow strip rows: steady error/offset, overshoot, settling, margin (borer/disk: distance to ζ=0 or ceiling; engine: PM). Green ↑ better, red ↓ worse, grey = unchanged (J leaves the sag unchanged).

## Pop-up figures (quiz-figure renderers; fixed params)

| renderer | params | draws |
|---|---|---|
| `lab-scene` | `machine: motor|borer|disk|engine` | static drawing of the machine with labelled parts (same art as the live scenes) |
| `lab-block` | `sys: motor-open|motor-closed|borer|disk|engine`, `show: script` (optional) | block diagram; with `show: script`, each block tagged with the script line that builds it |
| `lab-step` | `sys`, plus `loop`, `T`, `input`, `K: [..]`, `Ka: [..]`, `P`, `I: [..]`, `design: [..]`, or `sys: generic, order: 1|2` | one or more traces with final-value lines and overshoot/settling markers; `generic` = schematic one-store vs two-store responses at three gains (no numbers on axes) |
| `lab-splane` | `sys: borer|disk`, `K: [..]` / `Ka: [..]` | poles (and borer zero), ζ rays; disk inset arrow to the coil pole |
| `lab-sens` | `K`, `panel: mag|path` | Fig. 4.27 halves |
| `lab-trade` | `sys: borer|disk` | the trade-off curve with the handout's two settings marked |
| `lab-knob` | `sys: motor, knob: Ka` | sag ratio vs Ka (log x 0.1…100, log y), 0.02 line, marks at 7.35 and 54 |
| `lab-tuner` | `resp`, `rob` | the two-slider strip above the stand-in step response |
| `lab-table` | `table: tuner3` | the handout's three-design table (values verbatim from handout pp.3–5) |
| `lab-flow` | `flow: tuner` | four-step loop: linearize → tune → Update Block → simulate full model (↺ if it fails) |

---

# Tabs layout: new and changed figures

The `knobs` figure is no longer registered (Manager: drop it). The rest of this file is the pass-1 specs; the block below is the tabs-layout delta from the tutor.

# Figure specs: changes for the tabs layout (for Study Tools Manager)

Only new or changed figures are here. Everything else is unchanged from `/workspace/cs-lab/package/FIGURES.md` (pass-1 version), including the models table, metrics, and the specs for `blocks`, `motor`, `borer`, `tradeoff`, `sens`, `disk`, `pi`, `tuner` and `knobs`. `figures.yaml` in this folder is the pass-1 file with the changes below applied. Every number below is in `numbers_output.txt`.

## Summary

| Figure | Change | Used in tab |
|---|---|---|
| `loop` | **NEW**, a static block diagram per machine (also covers build item B2) | (b) of all four problem tabs |
| `engine-fit` | **NEW**, the stand-in engine's 8 fitted points (not in lab handout) | Engine, (c) step 2 |
| `blocks` | 3 new presets: `borerstep`, `borerpush`, `diskseek` (scripts already exist) | Borer and disk (d) |
| `disk` | 1 new preset: `ka200` | Disk (d) |
| `tuner` | new toggle `rpm` (rpm axis for the 2000 → 3000 step) | Engine, (c) step 6 |
| `knobs` | unchanged; **not referenced by any tab** (Manager's call) | – |

## How the tabs reference figures

On the four problem tabs, each section (c) step is a regular page section: the step text, then its live figures drawn once at full size (two abreast from 1000 px when a step has two figures, stacked on a phone), then that step's controls under the plots. A single-plot figure uses the full frame, capped at 72 rem. The setup block diagram and the handout-script figures are the same kind of full-size figure. There are no tiles or a tap-to-expand overlay for the plots.

Each step in (c) and each row in (d) names a figure by its figures.yaml id and a preset id, e.g. "**Live figure:** `motor`, preset `open`". Suggested embedding (Manager's call, since the one-off layout has no dives): a fenced block with the preset as an argument, ```` ```figure:motor preset=open``` ````, rendering the figure with that preset applied. One figure per step is enough. If a step names two presets ("`k20` then `k100`"), embed the figure once with the first and let the reader click the second.

## NEW: loop

- **Purpose:** the setup section (b) of each problem tab. A real block diagram: summer circle with + and − signs, forward path left to right, feedback path along the bottom, disturbance arrow from above at its true entry point and sign, and the measured output fed back. No animation and no time axis.
- **Controls:** `machine` (motor-open, motor-closed, borer, disk, engine); `words` (plain words | symbols | values) switches each box's caption. Hover or tap a box for a tooltip: "in: … out: … what it does: …".
- **Colours:** forward path `--acc`, feedback path `--fg`, disturbance `--org`, summer signs in `--fg`.
- **Diagrams (box: symbol · value · plain words):**
  - **motor-open (Fig. 4.23):** input V_a (= 0 here) → coil Km/Ra · 10 N·m/V · "volts to torque" → summer (+ motor torque, − T_d "load torque") → load 1/(Js + b) · 1/(2s + 0.5) · "torque to speed" → output ω. Inner loop from ω through Kb · 0.1 V·s · "back-EMF: speed makes a voltage that fights the current" into a summer (−) before the coil. Caption: "drag felt by the load: b + Km·Kb/Ra = 1.5 N·m·s".
  - **motor-closed (Fig. 4.24):** as motor-open, plus an outer loop from ω through tachometer Kt · 1 V·s · "speed to volts" and amplifier Ka · 54 · "multiplies the speed shortfall", into the input summer (−). Caption: "sag and time constant ÷ (1 + loop gain) = ÷ 361".
  - **borer (Eq. 4.57):** R "planned line" → summer (+R, −Y) → controller K + 11s · K = 20 or 100 · "push on the error now, plus 11 × how fast it is changing" → summer (+ effort, + T_d "the rock") → machine 1/(s(s + 1)) · "effort to position" → Y. Unity feedback. Caption: "both responses share s² + 12s + K".
  - **disk (Fig. 4.29):** R "new track" → summer (+R, −Y) → amplifier Ka · 10 or 80 · "volts per unit error" → coil G₁ = 5000/(s + 1000) · "volts to force, builds in 1 ms" → summer (+ force, − T_d "shock") → arm G₂ = 1/(s(s + 20)) · "force to position" → Y. Sensor H = 1. Caption: "the arm's 1/s gives zero step error".
  - **engine (handout p.1 model):** Speed Reference (step) → summer (+ ref, − speed) → PID Controller (PI) · P = 0.0014551, I = 0.0043791 (final design, p.6) · "throttle from the error now and the error so far" → Throttle & Manifold · "throttle angle and speed to air charge" → Induction to Power Stroke Delay · "air takes time to reach the cylinders" → Combustion · "air charge to torque" → Vehicle Dynamics (Teng in, Tload in from Drag Torque/Load) · "torque minus load spins the engine" → rad/s to rpm · 30/π → Engine Speed (rpm) scope, and back to the summer. Inner signal: engine speed N also feeds Throttle & Manifold and Combustion (draw it thin). Caption: "nonlinear: no single transfer function; the tuner linearizes it".
- **Pinned numbers:** 10, 1.5, 540, 361 (motor); none beyond the handout values elsewhere.
- **Presets:** `motor-open`, `motor-closed`, `borer`, `disk`, `engine` (see figures.yaml).

## NEW: engine-fit (not in lab handout)

- **Purpose:** the engine tab, step 2: shows where the stand-in engine comes from, so "fitted to the tables" is visible and not a black box.
- **Panels:** Bode magnitude (|G|, log) and phase (°) against ω (log, 10^−0.5 to 10^2 rad/s). Yellow dots at the 8 points, the stand-in curve in `--acc`, and (toggle `delay`) the same model without the 15 ms delay, dashed `--muted`. A probe line at ω = 10^w with a readout of |G| and phase from both the point (if within 2 % of a point's ω) and the curve.
- **The 8 points (ω rad/s: |G| from tables, phase °), pinned:** 2.950: 190.12, −83.55; 16.700: 12.60, −172.54; 0.645: 303.34, −20.70; 3.270: 174.55, −90.00; 1.330: 277.80, −41.84; 15.000: 15.44, −168.66; 19.000: 9.87, −176.99; 60.300: 1.00, 134.35 (plot this one as −225.65°, i.e. unwrapped). Fit values at the same ω: 190.42, 12.63, 303.02, 173.72, 278.36, 15.54, 9.83, 1.00; phases −83.55, −172.54, −20.65, −90.10, −41.76, −168.65, −177.11, 134.39.
- **Corner label:** "Stand-in, not in lab handout. Points derived from the handout's PID Tuner tables (pp.3–5 and the P = I = 1 baseline)."
- **Model:** G(s) = 311·3.42²·e^(−0.015s)/(s² + 6.3954s + 11.6964); exact e^(−jωτ) for the phase.

## CHANGED: blocks (3 presets)

- `borerstep`: "Fig. 4.25 (command step)", `{ script: borer-step, line: 4 }`.
- `borerpush`: "Fig. 4.26 (rock push)", `{ script: borer-push, line: 4 }`.
- `diskseek`: "Fig. 4.30 (disk seek)", `{ script: disk-seek, line: 4 }`.
- No code change: the scripts exist in `src/figs/blocks.ts`.

## CHANGED: disk (1 preset)

- `ka200`: "shock target (own)", `{ lgKa: 2.301, input: both, stand: false }`; about: "Ka = 200: shock offset −0.001, seek overshoot 37 %, 0.36 s (not in lab handout)."
- Pinned: Ka = 200 → PO 37.18 %, Ts 0.3563 s, shock final −0.001.

## CHANGED: tuner (rpm toggle)

- New control `rpm` (toggle, group more, default off): "rpm axis (2000 → 3000 step)".
- When on, the step-response panel's y axis becomes rpm, 1500…3500, the x axis 0…15 s (matching the handout's p.6 scope), and the curve is 2000 + 1000·y(t − 2) for t ≥ 2 s, flat 2000 before. Mark 2980 rpm (2 % band) and the time it is reached.
- Corner label: "Linear stand-in, not the nonlinear Simulink engine (not in lab handout). The handout's scope (p.6) is the real check."
- Pinned: final design reaches 2980 rpm at t₀ + 1.82 s.

## Unchanged and not referenced: knobs

The `knobs` figure (every knob on every machine) has no slot in the five tabs, since each tab's (d) has its own knob table. Options: drop it, or add it to the Overview tab under "How to use the tabs" as a "compare the knobs" panel. Manager's call.

