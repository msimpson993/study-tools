---
id: engine
order: 2
title: Engine speed with the PID Tuner
summary: "Project 1 (MathWorks example scdspeedctrlpidblock): tuning a PI controller for an engine's speed with PID Tuner's two sliders, then checking it on the full Simulink model."
figures: [loop, pi, tuner, engine-fit]
quizTags: [engine]
---

## (a) The problem

- **The machine:** a Simulink model of a car engine has to hold a commanded speed in rpm. The throttle is the input, and a *PI controller* (a rule that sets the throttle from the error now, P, and the error added up so far, I) sets it from the speed error.
- **What the handout asks:** open MathWorks' PID Tuner, accept its initial design, slide it slower, then use both sliders for a final design. Write the gains back to the block and check the full model on a 2000 → 3000 rpm *step* (a sudden jump in the commanded speed).
- **The goals:** **settling in under 5 s** (*settling time*: when the speed stays within 2 % of the new target) **and zero steady-state error** (no error left at the end) to a step.
- **Takeaway:** when the machine is too tangled to write down, the tuner *linearizes* it (makes a simple straight-line copy that is accurate near the current speed) and picks P and I from two sliders: *Response time* (how quickly the loop reacts) and *Transient behavior* (how calmly: less overshoot, the swing past the target).
- **The I term is what removes the steady error.** The final design (1.5 s, 0.72) is both quicker and calmer than the first: 0 % overshoot and 1.81 s, against 7.5 % and 1.96 s.
- **Two things here are this page's reconstructions (not in lab handout):** a *stand-in engine* fitted to the tuner's tables, and an *emulated tuner* that turns the sliders into P and I. They let the figures move; the handout's own tables remain the numbers to quote.

## (b) The setup

The diagram below is drawn from the model picture on handout p.1.

```figure:loop preset=engine
```


**The blocks, in plain words** (left to right in scdspeedctrlpidblock):
- **Speed Reference:** a step block, the commanded rpm.
- **The summer:** reference minus measured speed gives the error.
- **PID Controller (PI):** sets the throttle angle from the error, as **P + I·1/s** (the handout's "compensator formula", p.6). *What s means:* read s as "rate of change" and 1/s as "add up over time". So P pushes on the error *now*, and I pushes on the error *added up so far*.
- **Throttle & Manifold:** throttle angle and engine speed in, air charge out (how much air reaches the cylinders).
- **Induction to Power Stroke Delay:** the air takes time to reach the power stroke, a pure time delay.
- **Combustion:** air charge in, engine torque out.
- **Drag Torque (Load):** the load the engine has to turn. Its output is the signal *Tload* (the name on the handout's model and on the diagram).
- **Vehicle Dynamics:** engine torque minus load torque spins up the engine; out comes speed N in rad/s.
- **rad/s to rpm, 30/π:** converts speed for the scope and the feedback.

**The model the tuner uses:** the full model is *nonlinear* (its parts don't scale in proportion), so the handout prints no *transfer function* (a block's input-to-output rule, written as a fraction in s). When the tuner launches, it *linearizes*: it makes a straight-line copy of the engine around its current operating point and designs on that copy.

**Frequency response, in plain words:** wiggle the throttle steadily at some rate ω (rad/s; 1 rad/s is one full wiggle every 6.3 s) and watch the rpm wiggle that comes out. At each rate two things describe it:
- **Gain:** how many times bigger the rpm wiggle is than the throttle wiggle.
- **Lag:** how far behind the output wiggle trails the input, as an angle: a whole cycle is 360°, so 90° is a quarter cycle late and 180° is half a cycle late.

**The stand-in engine (not in lab handout):** each tuner table pins down the engine's gain and lag at a few wiggle rates. Four tables (three designs plus the baseline P = I = 1) give 8 such points, and one simple model passes within 0.5 % of all 8:

```eq
G(s) ≈ 311 · 3.42² · e^(−0.015s) / (s² + 6.40s + 11.70)      throttle → rpm
```

- **311:** the steady gain, rpm per unit throttle.
- **The fraction s² + 6.40s + 11.70:** a sluggish response with *damping ratio* ζ = 0.935 (how quickly swings die out on their own; just under 1, so almost no swing).
- **e^(−0.015s):** a 15 ms delay, standing in for the induction-to-power-stroke delay. It adds lag but doesn't change the gain.

## (c) What's going on

1. **Why PI and not just P: a speed needs a held push.**
   - **Why:** the engine settles where torque balances drag, so holding a speed needs the throttle held open. P pushes only while there is an error, so with P alone a leftover error has to hold the throttle open.
   - **Number (not in lab handout):** on the stand-in, the initial design's P alone stops 43 % short.
   - **What I adds:** I adds up the error, so it keeps pushing until the error is zero. That is the "zero steady-state error" goal.
   - **Look for:** with **P only (initial P)** set:
     - the speed levels off at 0.568 instead of 1. The readout writes the error as 0.432 = 1/(1 + P·Kₑ), where Kₑ is the engine's steady gain, 311 rpm per unit throttle;
     - in the throttle plot the I part stays at zero, so the P part has to hold the throttle open, and only a leftover error can keep it there;
     - click **initial design**: the I part grows until it carries the throttle, and the error is gone.

```figure:pi preset=ponly panels=speed,throttle
```

2. **The tuner makes a copy, then designs on it.**
   - **Linearize, tune, verify:** the tuner's design is exact only for the straight-line copy, which is why the handout ends by running the full model.
   - **The stand-in is that kind of copy (not in lab handout):** its gain and lag at each wiggle rate are fitted to the 8 points from the tables.
   - **Look for:**
     - the yellow dots (the points from the tables) sit on the solid stand-in curve in both plots: the gain falls as the wiggles get faster, and the lag grows;
     - at the probe, ω = 2.95 rad/s, the engine's gain is about 190 and it lags about 84°;
     - the dashed curve without the 15 ms delay parts from the solid one only at the fast end, where the delay adds lag.

```figure:engine-fit panels=mag,phase
```

3. **Two sliders, two targets.**
   - **Crossover ω_c:** the wiggle rate where the loop's gain (controller × engine) falls to 1. Roughly, how fast the loop reacts.
   - **Why 180° matters:** at 180° of lag, the correction arrives half a cycle late, so it pushes the same way as the error instead of against it. If the loop's gain is still 1 or more at that rate, every trip round the loop keeps the wiggle going: the loop swings forever.
   - **Phase margin (PM):** the lag still to spare at the crossover, 180° minus the loop's lag there. More margin means less overshoot.
   - **Gain margin (GM):** at the rate where the lag reaches 180°, how many times the loop's gain could still grow before it reaches 1. It is quoted in *dB* (decibels, a log scale for ratios: 0 dB is 1×, +20 dB is 10×, and a negative value means already past the edge).
   - **The two rules (not in lab handout, read from all three tables):** **Response time sets the crossover, ω_c = 2/t_resp**, and **Transient behavior sets the margin, PM ≈ 100° × robustness**. The tuner solves for the P and I that hit both.
   - **The starting point:** at P = I = 1 the loop is *unstable* (its swings grow instead of dying out): phase margin −46.6° and gain margin −19.9 dB, both past the edge (the tuner reports "Closed-loop stability: Undefined").
   - **Readout terms:** OS is the overshoot, Ts the settling time (2 % band), *Tr the rise time*: how long the speed takes to go from 10 % to 90 % of the way to the new target, and *Tp the peak time*: when the overshoot peaks.
   - **Look for:** with **initial (0.678 s, 0.6)** set:
     - the emulation's step readout shows about 7.4 % overshoot and 1.96 s settling; the handout's table says 7.5 % and 1.96 s;
     - the *Bode plot* (the loop's gain in dB on top and its phase below, against wiggle rate) has a PM bar reading 60.0° at 2.95 rad/s (handout: 59.9°) and a GM bar reading 25.4 dB.

```figure:tuner preset=initial panels=step,bode,table
```

4. **Slower design: P drops to 0.**
   - **What the handout does:** it slides response time to 3.1 s "to reduce the overshoot", which moves the crossover down to ω_c = 0.645 rad/s.
   - **The lag budget (not in lab handout):** a 60° margin allows 180° − 60° = 120° of total lag. The engine lags only 21° at 0.645 rad/s, so the controller would have to lag 120° − 21° = 99°.
   - **Why that's impossible:** a PI controller can lag at most 90° (pure I, P = 0). So the tuner returns P = 0, and the margin comes out at 180° − 90° − 21° ≈ 69.4° instead (the handout's table: 69.3°).
   - **Result:** 0.401 % overshoot, but 3.45 s.
   - **Look for:** with **slower (3.1 s, 0.6)** set, the readout shows P = 0 "(P clamped)" and the step creeps up with almost no overshoot. The PM bar reads 69.4° at about 0.64 rad/s (handout: 69.3° at 0.645), more than the 60° the slider asked for.

```figure:tuner preset=slower panels=step,bode
```

   - **The same design as P and I:** with P = 0, all of the throttle comes from I.
   - **Look for:** with **I only (slower design)** set, the P part of the throttle is flat at zero and the I part does all the work; the speed reaches 1 slowly, with about 0.4 % overshoot.

```figure:pi preset=ionly panels=speed,throttle
```

5. **Final design: faster and calmer together.**
   - **The settings:** response time 1.5 s raises the crossover to 1.33 rad/s, and robustness 0.72 raises the margin to 72°.
   - **Result:** 0 % overshoot, 1.81 s settling, P = 0.0014551, I = 0.0043791 (the handout's table).
   - **For contrast (not in lab handout):** **aggressive (own)**, robustness 0.4, gives 28 % overshoot.
   - **Look for:** with **final (1.5 s, 0.72)** set, the step curve rises to 1 without going over and settles at about 1.80 s (the readout: Ts 1.802 s, Tr 1.088 s; the handout's table: 1.81 s and 1.09 s). The PM bar reads 72.0° at 1.33 rad/s and the GM bar 32.7 dB (handout: 32.8 dB).

```figure:tuner preset=final panels=step,bode,table
```

6. **Write back and verify on the full engine.**
   - **Update Block:** writes P and I into the Simulink block.
   - **The handout's check (p.6 scope):** the full model steps 2000 → 3000 rpm and settles at 3000 well inside 5 s.
   - **On the stand-in (not in lab handout):** the same step on the linear copy gets within 2 % of 3000 rpm about 1.8 s after the step (the figure shows 1.80 s; with the handout's gains it is 1.82 s).
   - **Look for:** with **final (1.5 s, 0.72)** set and *rpm axis* on, the speed sits at 2000 rpm, steps up at t = 2 s and crosses the dashed 2980 rpm line (the 2 % band) about 1.8 s later, without going over 3000.

```figure:tuner preset=final rpm=true panels=step
```

## (d) Try it

| Handout case | Button (on this tab's figures) | What you should see |
|---|---|---|
| Why I (not in lab handout) | **P only (initial P)** | stops 43 % short |
| Initial design (p.3) | **initial (0.678 s, 0.6)**; **initial design** | handout 7.5 %, 1.96 s (the emulation shows about 7.4 %) |
| Slower design (p.4) | **slower (3.1 s, 0.6)**; **I only (slower design)** | P = 0, 0.401 %, 3.45 s |
| Final design (p.5) | **final (1.5 s, 0.72)** | 0 %, 1.81 s |
| Too aggressive (not in lab handout) | **aggressive (own)** | 28 % overshoot |
| Nonlinear check (p.6) | **final (1.5 s, 0.72)** with *rpm axis* on | 2000 → 3000 rpm on the linear stand-in |
| Where the stand-in comes from | the fit figure in step 2 | 8 points on one curve |

**Sliders to play with:** on the tuner figures, Response time (0.3–5 s) and Transient behavior (0.3–0.9), with *show handout table* to put the handout's numbers beside the emulation's. On the P-and-I figures, P and I directly.

| Knob | What it sets | Move it toward faster or more robust | Move it the other way |
|---|---|---|---|
| **Response time** | crossover ω_c = 2/t_resp | quicker, but the engine and its delay lag more there, so holding the margin gets harder | slower; at about 2.1 s (robustness 0.6) P reaches 0 |
| **Transient behavior** | phase margin ≈ 100° × robustness | calmer: 0.678 s at 0.8 gives 0 % but 4.7 s | aggressive: 0.678 s at 0.4 gives 28 % |
| **P** | throttle per rpm of error now | stronger correction; alone, less leftover error (P = 0.01: 24 %) | gentler |
| **I** | throttle per rpm·s of error so far | error removed faster; too much swings | error removed slowly; I = 0 leaves the P-only error |

Slider values outside the handout's three designs come from the emulated tuner (not in lab handout).

## (e) Check your work

| Design | Sliders | P | I | Rise (Tr, 10–90 %) | Settle (Ts, 2 %) | Overshoot | PM | GM |
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
  - **The slider trade:** Response time and Transient behavior trade speed against calm: a faster loop leaves less margin, so it swings more. The final design shows both sliders together beat either alone.
  - **Why P went to 0 (not in lab handout):** at the slow crossover the engine lags too little for a 60° margin, and PI cannot lag more than 90°, so the tuner uses pure I.
  - **Linear vs nonlinear:** the tuner's numbers hold for the straight-line copy at its operating point (presumably the starting 2000 rpm; not in lab handout); the p.6 scope is the check that the design still works on the full engine.

<p class="src">Sources: PID Tuner handout pp.1–6 (model, goals, workflow, three tables, slider values, Update Block, compensator formula, nonlinear scope). Not in lab handout: the stand-in engine fit, the ω_c = 2/t_resp and PM ≈ 100° × robustness rules, the lag argument for P = 0, the P-only error, the emulated slider values, the rpm-axis stand-in result, the stand-in check script.</p>
