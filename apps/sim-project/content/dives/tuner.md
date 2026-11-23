---
id: tuner
order: 7
title: "PID Tuner on the engine: two sliders, three designs"
category: engine
neighbors: [pi, disk, knobs]
level: Some algebra
check: [ck-tuner-1, ck-tuner-2, ck-tuner-3]
addsToExample: "Tunes the engine's PI controller with PID Tuner's two sliders and checks it on the full model."
accountsFor: Why the handout's final design is both quicker and calmer than the first, and why the slower one dropped P.
---

**The question:** what is PID Tuner doing when it turns two sliders into P and I, and what happened in the handout's three designs? These are the boxes *Too messy? Let PID Tuner*, *Two sliders: speed and calm*, *Three designs*, the side box *Why P went to zero*, and *Check it on the real engine*.

### The big idea

- **Linearize, tune, verify:** the tuner makes a straight-line copy of the Simulink engine at its operating point, designs on the copy, and you check the result on the full model.
- **Two sliders, two targets:** *Response time* sets the loop's speed (its crossover frequency); *Transient behavior* sets its calmness (its phase margin).
- **The tool finds P and I to hit both targets.** When it can't (the slower design), it does the best a PI controller can, which happens to be P = 0.

### See it

Move the two sliders as the handout does. The figure runs an emulation of the tuner on a stand-in engine (my reconstruction, below): it shows the step response, the loop's frequency response with its margins, and the same readout table the tuner shows. The presets are the handout's three designs; **show handout table** puts its numbers beside the emulation's.

```figure:tuner
```

### The math

```eq
controller (parallel form):  C(s) = P + I/s
crossover ω_c: where |C·G| = 1;    phase margin PM = 180° + ∠C(jω_c) + ∠G(jω_c)
read from all three handout tables:   ω_c = 2/t_resp   (0.678 s → 2.95, 3.1 s → 0.645, 1.5 s → 1.33 rad/s)
and, where P > 0:   PM = 100° × robustness   (0.6 → 59.9°, 0.72 → 72°)
PI can only lag:  ∠C between −90° (P = 0) and 0° (I = 0)
```

**What each symbol means.** G: the engine's straight-line copy, throttle → rpm; ω_c: crossover frequency (rad/s), roughly how fast the loop reacts; t_resp: the Response time slider (s); PM: phase margin (°), how much extra lag the loop could take before it swung forever; ∠: phase angle (lag is negative).

**Where the stand-in engine comes from (not in lab handout).** The handout never prints the engine's fraction. But each tuner table gives a crossover and a phase margin (and a gain-margin frequency) for known P and I, and each of those pins one point of G's frequency response. Eight such points (three designs plus the baseline P = I = 1) fit, to within 0.5 %, a smooth second-order engine with a 15 ms delay:

```eq
G(s) ≈ 311 · 3.42² · e^(−0.015s) / (s² + 6.40s + 11.70)      (DC gain 311 rpm per unit throttle, ζ = 0.935)
```

On this stand-in, the handout's own gains reproduce every rise time, settling time and overshoot in its tables within 0.02 s and 0.05 %, and the emulated rule above reproduces its P and I within 0.4 %. MathWorks does not publish the tuner's algorithm; the two rules are what its outputs obey here.

### Worked example: on the engine

| Design | Sliders | P | I | Rise | Settle | Overshoot | PM | GM |
|---|---|---|---|---|---|---|---|---|
| Initial | 0.678 s, 0.6 | 0.0042253 | 0.0092411 | 0.45 s | 1.96 s | 7.5 % | 59.9° @ 2.95 | 25.4 dB @ 16.7 |
| Slower | 3.1 s, 0.6 | 0 | 0.0021263 | 2.06 s | 3.45 s | 0.401 % | 69.3° @ 0.645 | 18.9 dB @ 3.27 |
| Final | 1.5 s, 0.72 | 0.0014551 | 0.0043791 | 1.09 s | 1.81 s | 0 % | 72° @ 1.33 | 32.8 dB @ 15 |

(Handout pp.3–5. Stand-in: 0.450/1.961/7.47 %, 2.070/3.467/0.37 %, 1.091/1.816/0 %.)

- **Initial → slower:** the handout slides response time left "to reduce the overshoot". At 0.645 rad/s the engine lags only 21°; holding PM = 60° would need 99° of controller lag, more than PI's 90°. So P = 0 and PM = 180 − 90 − 21 = 69.3°: more margin, so 0.4 % overshoot, at the cost of 3.45 s.
- **Slower → final:** faster (1.5 s) *and* more robust (0.72): crossover up to 1.33 rad/s, margin up to 72°. Overshoot 0 and 1.81 s.
- **Baseline P = I = 1:** PM −46.6°, GM −19.9 dB: unstable ("Closed-loop stability: Undefined").
- **Nonlinear check:** Update Block, then the full model steps 2000 → 3000 rpm and reaches 3000 about 2 s after the step (handout p.6 scope).

### Knobs

| Knob | What it sets | Move it right | Move it left |
|---|---|---|---|
| **Response time** (Slower ↔ Faster) | crossover ω_c = 2/t_resp | faster: higher ω_c; the engine and its delay lag more there, so holding the margin gets harder | slower: lower ω_c; at 3.1 s P hits 0 |
| **Transient behavior** (Aggressive ↔ Robust) | phase margin, ≈ 100° × robustness | calmer, less overshoot, often slower to settle (0.678 s at 0.8: 0 %, 4.7 s) | more aggressive: 0.678 s at 0.4: 28 % overshoot |
| **Type** (P, PI, PID…) | which terms exist | – | – (the handout uses PI) |
| **Update Block** | writes P, I into the Simulink block | – | – |

Slider values outside the handout's three designs come from my emulation (not in lab handout).

````callout:trap The handout's text and screenshots disagree
- The text says response time goes "from 3.4 to 1.5 seconds"; the slower design's screenshot shows **3.1** (and 2/3.1 = 0.645 rad/s, the table's crossover; 2/3.4 would be 0.59).
- The text says the slower design has "an overshoot of zero and a settling time of 4 seconds"; its table shows **0.401 %** and **3.45 s**.
Quote the tables in the report.
````

### What it can't do

- **See the nonlinear engine:** the copy is exact only near its operating point; big steps or a throttle at its stop need the full simulation.
- **Make the trade for you:** the sliders move along the same speed-versus-calm trade the boring machine showed. The last box gathers all four machines: *What feedback bought*.

<p class="src">Sources: PID Tuner handout pp.1–6 (workflow, requirements, three tables, slider values, Update Block, nonlinear scope). Not in lab handout: the stand-in engine fit, the ω_c = 2/t_resp and PM = 100° × robustness rules, the lag argument for P = 0, the emulated slider values. Course background: Control Systems › <a href="../control-systems/#/dive/methods">Recipes: by hand, Ziegler–Nichols, PID Tuner</a>.</p>
