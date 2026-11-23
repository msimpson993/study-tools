---
id: engine
order: 5
title: Engine speed with the PID Tuner
summary: "Project 1 (MathWorks example scdspeedctrlpidblock): tuning a PI controller for an engine's speed with PID Tuner's two sliders, then checking it on the full Simulink model."
figures: [loop, pi, tuner, engine-fit]
quizTags: [engine]
---

## (a) The problem

A Simulink model of a car engine has to hold a commanded speed in rpm. The throttle is the input, and a *PI controller* sets it from the speed error. The handout has you open MathWorks' PID Tuner, accept its initial design, slide it slower, then use both sliders for a final design, write the gains back to the block, and check the full model on a 2000 → 3000 rpm step. The goals: **settling in under 5 s and zero steady-state error** to a step.

- **Takeaway:** when the machine is too tangled to write down, the tuner makes a simple copy of it near the operating point and picks P and I from two sliders, *Response time* (speed) and *Transient behavior* (calm). **The I term is what removes the steady error.** The final design (1.5 s, 0.72) is both quicker and calmer than the first: 0 % overshoot and 1.81 s, against 7.5 % and 1.96 s.
- **Two things here are this page's reconstructions (not in lab handout):** a *stand-in engine* fitted to the tuner's tables, and an *emulated tuner* that turns the sliders into P and I. They let the live figures move; the handout's own tables remain the numbers to quote.

## (b) The setup

**Live figure:** `loop`, preset `engine` (new figure, see FIGURES.md), drawn from the model picture on handout p.1.

```figure:loop preset=engine
```


**The blocks, in plain words** (left to right in scdspeedctrlpidblock):
- **Speed Reference:** a step block, the commanded rpm.
- **The summer:** reference minus measured speed gives the error.
- **PID Controller (PI):** sets the throttle angle from the error, as **P + I·1/s** (the handout's "compensator formula", p.6). *What s means:* read s as "rate of change" and 1/s as "add up over time". So P pushes on the error *now*, and I pushes on the error *added up so far*.
- **Throttle & Manifold:** throttle angle and engine speed in, air charge out (how much air reaches the cylinders).
- **Induction to Power Stroke Delay:** the air takes time to reach the power stroke, a pure time delay.
- **Combustion:** air charge in, engine torque out.
- **Drag Torque (Load):** the load the engine has to turn.
- **Vehicle Dynamics:** engine torque minus load torque spins up the engine; out comes speed N in rad/s.
- **rad/s to rpm, 30/π:** converts speed for the scope and the feedback.

**The model the tuner uses:** the full model is *nonlinear* (its parts don't scale in proportion), so the handout prints no transfer function. When the tuner launches, it *linearizes*: it makes a straight-line copy of the engine around its current operating point and designs on that copy.

**The stand-in engine (not in lab handout):** fitted to the 8 frequency-response points that the handout's four tuner tables pin down (three designs plus the baseline P = I = 1). It matches all 8 to within 0.5 %:

```eq
G(s) ≈ 311 · 3.42² · e^(−0.015s) / (s² + 6.40s + 11.70)      throttle → rpm
DC gain 311 rpm per unit throttle; ζ = 0.935 (just under 1: almost no swing on its own); 15 ms delay
```

## (c) What's going on

1. **Why PI and not just P: a speed needs a held push.** The engine settles where torque balances drag, so holding a speed needs the throttle held open. P pushes only while there is an error, so with P alone a leftover error has to hold the throttle open. On the stand-in, the initial P alone stops 43 % short (not in lab handout). I adds up the error, so it keeps pushing until the error is zero: that gives the "zero steady-state error" goal. **Live figure:** `pi`, preset `ponly`, then `initial`.

```figure:pi preset=ponly
```

2. **The tuner makes a copy, then designs on it.** Linearize, tune, verify: the tuner's design is exact only for the straight-line copy, which is why the handout ends by running the full model. Starting from P = I = 1 the loop is unstable (phase margin −46.6°, gain margin −19.9 dB; the tuner reports "Closed-loop stability: Undefined"). **Live figure:** `engine-fit` (new) shows the 8 points and the stand-in curve.

```figure:engine-fit
```

3. **Two sliders, two targets.** *Crossover* ω_c is the wiggle rate where the loop's gain falls to 1, roughly how fast the loop reacts. *Phase margin* (PM) is how much extra lag the loop could take before it swung forever; more margin means less overshoot. From all three tables (not in lab handout): **Response time sets the crossover, ω_c = 2/t_resp**, and **Transient behavior sets the margin, PM ≈ 100° × robustness**. The tuner solves for the P and I that hit both. **Live figure:** `tuner`, preset `initial`: 0.678 s and 0.6 give 59.9° at 2.95 rad/s, then 7.5 % overshoot and 1.96 s.

```figure:tuner preset=initial
```

4. **Slower design: P drops to 0.** The handout slides response time to 3.1 s "to reduce the overshoot". At ω_c = 0.645 rad/s the engine lags only 21°, so holding 60° of margin would need 99° of lag from the controller. A PI controller can lag at most 90° (pure I), so the tuner returns P = 0 and the margin becomes 69.3° instead (lag reasoning not in lab handout). Result: 0.401 % overshoot, but 3.45 s. **Live figure:** `tuner`, preset `slower`; `pi`, preset `ionly`.

```figure:tuner preset=slower
```
```figure:pi preset=ionly
```

5. **Final design: faster and calmer together.** Response time 1.5 s raises the crossover to 1.33 rad/s, and robustness 0.72 raises the margin to 72°. Result: 0 % overshoot, 1.81 s settling, P = 0.0014551, I = 0.0043791. **Live figure:** `tuner`, preset `final`; compare `aggressive` (robustness 0.4: 28 % overshoot, not in lab handout).

```figure:tuner preset=final
```

6. **Write back and verify on the full engine.** *Update Block* writes P and I into the Simulink block. The full model then steps 2000 → 3000 rpm (handout p.6 scope) and settles at 3000 well inside 5 s. On the linear stand-in the same step is within 2 % of 3000 rpm 1.82 s after the step (not in lab handout). **Live figure:** `tuner`, preset `final` with *rpm axis* on (new toggle).

```figure:tuner preset=final rpm=true
```


## (d) Try it

| Handout case | Live figure and preset | What you should see |
|---|---|---|
| Why I (not in lab handout) | `pi` → **P only (initial P)** (`ponly`) | stops 43 % short |
| Initial design (p.3) | `tuner` → **initial (0.678 s, 0.6)** (`initial`); `pi` → **initial design** | 7.5 %, 1.96 s |
| Slower design (p.4) | `tuner` → **slower (3.1 s, 0.6)** (`slower`); `pi` → **I only (slower design)** (`ionly`) | P = 0, 0.401 %, 3.45 s |
| Final design (p.5) | `tuner` → **final (1.5 s, 0.72)** (`final`) | 0 %, 1.81 s |
| Too aggressive (not in lab handout) | `tuner` → **aggressive (own)** (`aggressive`) | 28 % overshoot |
| Nonlinear check (p.6) | `tuner` → `final`, *rpm axis* on | 2000 → 3000 rpm (stand-in, linear) |
| Where the stand-in comes from | `engine-fit` (new) | 8 points on one curve |

**Sliders to play with:** in `tuner`, Response time (0.3–5 s) and Transient behavior (0.3–0.9), with *show handout table* to put the handout's numbers beside the emulation's. In `pi`, P and I directly.

| Knob | What it sets | Move it toward faster or more robust | Move it the other way |
|---|---|---|---|
| **Response time** | crossover ω_c = 2/t_resp | quicker, but the engine and its delay lag more there, so holding the margin gets harder | slower; at about 2.1 s (robustness 0.6) P reaches 0 |
| **Transient behavior** | phase margin ≈ 100° × robustness | calmer: 0.678 s at 0.8 gives 0 % but 4.7 s | aggressive: 0.678 s at 0.4 gives 28 % |
| **P** | throttle per rpm of error now | stronger correction; alone, less leftover error (P = 0.01: 24 %) | gentler |
| **I** | throttle per rpm·s of error so far | error removed faster; too much swings | error removed slowly; I = 0 leaves the P-only error |

Slider values outside the handout's three designs come from the emulated tuner (not in lab handout).

## (e) Check your work

| Design | Sliders | P | I | Rise | Settle | Overshoot | PM | GM |
|---|---|---|---|---|---|---|---|---|
| Initial (p.3) | 0.678 s, 0.6 | 0.0042253 | 0.0092411 | 0.45 s | 1.96 s | 7.5 % | 59.9° @ 2.95 rad/s | 25.4 dB @ 16.7 rad/s |
| Slower (p.4) | 3.1 s, 0.6 | 0 | 0.0021263 | 2.06 s | 3.45 s | 0.401 % | 69.3° @ 0.645 | 18.9 dB @ 3.27 |
| Final (p.5) | 1.5 s, 0.72 | 0.0014551 | 0.0043791 | 1.09 s | 1.81 s | 0 % | 72° @ 1.33 | 32.8 dB @ 15 |

- **Goals met:** settling under 5 s in all three; zero steady error from the I term.
- **The stand-in's reproduction (not in lab handout):** with the handout's gains, 0.450 / 1.961 s / 7.47 %, 2.070 / 3.467 s / 0.37 %, 1.091 / 1.816 s / 0 %. The emulated tuner gives P and I within 0.4 % of the tables (its initial design rounds to 7.4 %; quote the handout's 7.5 %).

**MATLAB and Simulink, the handout's steps:**

```matlab
open_system('scdspeedctrlpidblock')
% double-click PID Controller > Main tab > Tune...  (PID Tuner opens)
% Show parameters; move Response time / Transient behavior; Update Block
% run the model and read the Engine Speed (rpm) scope
bdclose('scdspeedctrlpidblock')
```

**Checking the tables on the stand-in** (not in lab handout; needs Control System Toolbox):

```matlab
G = tf(311*3.42^2, [1 6.3954 11.6964], 'InputDelay', 0.015);
C = pid(0.0014551, 0.0043791);        % final design: P, I
T = feedback(C*G, 1);
stepinfo(T)                            % about 0 % overshoot, 1.8 s settling
margin(C*G)                            % about 72 deg at 1.33 rad/s
```

````callout:trap "3.4 to 1.5 seconds": the screenshot says 3.1
The text says you "reduce the response time from 3.4 to 1.5 seconds", but the slower design's screenshot (p.4) shows **3.1 s**, and 2/3.1 = 0.645 rad/s is that table's crossover (2/3.4 would be 0.59). Quote 3.1 s.
````

````callout:trap "Overshoot of zero and a settling time of 4 seconds": the table says otherwise
The text describes the slower design that way, but its table (p.4) shows **0.401 %** and **3.45 s**. Quote the table.
````

````callout:note Smaller mismatches
- **"Settling time of 2 seconds"** (p.2) is the table's 1.96 s rounded.
- **The block path:** the text says you design "scdspeedctrl/PID Controller", but the model you open is scdspeedctrlpidblock (the same text names "scdspeedctrlpidblock/Speed Reference"). Look for the PID Controller block inside scdspeedctrlpidblock.
````

## (f) For your report

- **Advantage shown:** zero steady-state error to a step, bought by the I term, on a machine you never write down. Also: designing on a linear copy and verifying on the real (nonlinear) model.
- **Discussion points:**
  - **The slider trade:** Response time and Transient behavior move along the same speed-versus-calm trade the boring machine and disk head showed; the final design shows both sliders together beat either alone.
  - **Why P went to 0 (not in lab handout):** at the slow crossover the engine lags too little for a 60° margin, and PI cannot lag more than 90°, so the tuner uses pure I.
  - **Linear vs nonlinear:** the tuner's numbers hold for the straight-line copy at its operating point (presumably the starting 2000 rpm; not in lab handout); the p.6 scope is the check that the design still works on the full engine.

<p class="src">Sources: PID Tuner handout pp.1–6 (model, goals, workflow, three tables, slider values, Update Block, compensator formula, nonlinear scope). Not in lab handout: the stand-in engine fit, the ω_c = 2/t_resp and PM ≈ 100° × robustness rules, the lag argument for P = 0, the P-only error, the emulated slider values, the rpm-axis stand-in result, the stand-in check script.</p>
