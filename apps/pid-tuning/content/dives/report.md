---
id: report
order: 14
title: "Pitfalls, explaining your results and review"
category: tune
chain:
  - title: "How do I explain the result?"
  - title: "What are the pitfalls, and how do I explain my result?"
  - title: "report template, cheat sheet, glossary"
neighbors:
  - project
  - failures
---
**What are the pitfalls, and how do I explain my result?**

**Picture it first.** Everything in the report is a statement about one of these curves: speed, overshoot, offset, effort. Reproduce each claim with the sliders before you write it down.

```figure:gains
```

Common pitfalls (wrong form, ZN overshoot, ignoring saturation), a template for explaining results, a cheat sheet of cause and effect, and a glossary.

### What are the common pitfalls?

| Pitfall | Why it's wrong / what happens |
|---|---|
| “More K<sub>p</sub> eliminates steady-state error.” | It only <em>reduces</em> it (1/(1+K<sub>p</sub>G(0))) on a type-0 plant. Zero error needs an integrator. |
| Mixing parallel and standard forms | K<sub>i</sub> = K<sub>p</sub>/T<sub>i</sub>, K<sub>d</sub> = K<sub>p</sub>T<sub>d</sub>. ZN tables are in standard form; the Simulink block defaults to parallel. |
| “Bigger T<sub>i</sub> = more integral.” | Opposite: bigger T<sub>i</sub> = weaker I action. |
| Unfiltered derivative | Noise amplified ∝ ω. Always keep a filter (N) and use D only if you need it. |
| Ignoring actuator limits | Windup: huge overshoot after saturation. Enable anti-windup when limits exist. |
| Response-time slider direction | Left = slower = <em>longer</em> response time = lower bandwidth. (Not “left = shorter time”.) |
| Trusting the linear design blindly | Linearization is local. Verify on the nonlinear model (Update Block → simulate). |
| Changing several things at once | You can't attribute the effect. One change per run, predicted in advance. |
| Reporting “it looks good” | Report numbers vs. requirements: “Ts = 1.8 s &lt; 5 s ✓, e<sub>ss</sub> = 0 ✓, OS = 0%.” |
| Confusing overshoot with steady-state error | Overshoot is a transient peak; e<sub>ss</sub> is what's left at t → ∞. They're controlled by different things. |


### How should I explain my results in the report?

For each change: <b>Predict</b> (what and why, from theory) → <b>Run</b> → <b>Observe</b> (numbers) → <b>Explain</b> (mechanism, agree/disagree with prediction) → <b>Check</b> against requirements.

````callout:predict Template paragraph
<em>Change:</em> moved the response-time slider left (slower).<br> <em>Prediction:</em> a slower target lowers the loop bandwidth; at lower crossover frequency the plant adds less phase lag, so the phase margin increases and the overshoot should decrease, while the settling time should increase.<br> <em>Observation:</em> overshoot fell from ≈7.5% to 0%, settling time rose from ≈2 s to ≈4 s; the tuned controller became effectively integral-only (P ≈ 0).<br> <em>Explanation:</em> consistent with the prediction. At this low bandwidth the integrator alone provides enough gain at crossover with large phase margin, so proportional action is unnecessary; the integrator still guarantees zero steady-state error.<br> <em>Requirement check:</em> Ts ≈ 4 s &lt; 5 s ✓; e<sub>ss</sub> = 0 ✓.
````

- <b>Lead with the requirement</b>, end with the check. Put the three designs in one table (like Q12's).
- <b>Name the mechanism</b> in one clause: “integrator ⇒ e<sub>ss</sub> = 0,” “higher bandwidth ⇒ less PM ⇒ more overshoot,” “linearization valid near operating point.”
- <b>Show one overlay plot</b> of the three step responses (linear) and one of the final design on the nonlinear model.
- <b>State limitations:</b> linear design, single operating point, actuator limits not exercised (unless they were).

#### Cheat sheet

#### Forms

- Parallel: K<sub>p</sub> + K<sub>i</sub>/s + K<sub>d</sub>s
- Standard: K<sub>p</sub>(1 + 1/(T<sub>i</sub>s) + T<sub>d</sub>s)
- K<sub>i</sub> = K<sub>p</sub>/T<sub>i</sub> · K<sub>d</sub> = K<sub>p</sub>T<sub>d</sub>
- Filtered D: K<sub>d</sub>Ns/(s+N), HF gain K<sub>d</sub>N

#### Loop algebra

- Y/R = CG/(1+CG) · Y/D = G/(1+CG)
- E/R = 1/(1+CG)
- Step e<sub>ss</sub> = 1/(1 + C(0)G(0))
- P: 1/(1+K<sub>p</sub>G(0)) · with I: 0

#### Gain effects (↑ gain)

- K<sub>p</sub>: faster, more OS, less (≠0) e<sub>ss</sub>
- K<sub>i</sub>: e<sub>ss</sub> → 0, more OS, slower settling
- K<sub>d</sub>: less OS, faster settling, noise ↑

#### 2nd-order specs

- %OS = 100 e<sup>−πζ/√(1−ζ²)</sup>
- T<sub>s</sub>(2%) ≈ 4/(ζω<sub>n</sub>) · T<sub>p</sub> = π/ω<sub>d</sub>
- ζ ≈ PM/100 (PM ≲ 65°, rule of thumb)
- 7.5% OS ⇔ ζ ≈ 0.64

#### Ziegler–Nichols (ultimate)

- P: 0.5K<sub>u</sub>
- PI: 0.45K<sub>u</sub>, T<sub>i</sub> = T<sub>u</sub>/1.2
- PID: 0.6K<sub>u</sub>, T<sub>i</sub> = T<sub>u</sub>/2, T<sub>d</sub> = T<sub>u</sub>/8
- 1/(s+1)³: K<sub>u</sub> = 8, T<sub>u</sub> = 2π/√3 ≈ 3.63 s

#### PID Tuner &amp; Project 1

- Response time ← = slower, lower BW, less OS
- Transient → Robust = more PM, less OS
- Init: 2 s, 7.5% · Slower: 4 s, 0%, ≈I-only
- 3.4→1.5 s &amp; 0.6→0.72: 0%, &lt; 2 s
- Update Block → verify nonlinear

#### Glossary

PlantThe system being controlled (here: the engine), G(s). Reference / set-point rThe desired output value. Error ee = r − y (measured). The PID controller's input. Disturbance dAn unwanted input (load torque, hill) that pushes the output away from r. Steady-state error e<sub>ss</sub>lim<sub>t→∞</sub> e(t). For a step: 1/(1 + C(0)G(0)) with unity feedback. System typeNumber of free integrators (poles at s = 0) in the loop gain CG. Type ≥ 1 ⇒ zero step error. Overshoot (%OS)How far the peak exceeds the final value, as a % of the final value. Rise timeTime to go from 10% to 90% of the final value (MATLAB default). Settling timeTime after which the response stays within ±2% of its final value (MATLAB <code>stepinfo</code> default). Damping ratio ζSecond-order parameter: 0 &lt; ζ &lt; 1 underdamped (overshoot), ζ = 1 critically damped, ζ &gt; 1 overdamped. Natural frequency ω<sub>n</sub>Second-order “speed” parameter (rad/s); distance of the poles from the origin. Loop gain L(s)C(s)G(s)H(s), the product around the loop. Its frequency response determines stability margins. Crossover frequency ω<sub>c</sub>Frequency where |L(jω)| = 1. Sets the loop's bandwidth/speed. BandwidthFrequency range over which the closed loop tracks well (≈ ω<sub>c</sub>). Higher ⇒ faster. Phase margin (PM)180° + ∠L(jω<sub>c</sub>). Distance from the −180° oscillation condition; larger ⇒ more robust, less overshoot. Gain marginFactor by which loop gain could increase before instability (at the −180° phase frequency). RobustnessAbility to stay stable and perform well despite model error. In PID Tuner: the transient-behavior slider. Response time (PID Tuner)Design target for closed-loop speed; inversely related to bandwidth. Slider left = longer. Ultimate gain K<sub>u</sub>, period T<sub>u</sub>P-only gain giving sustained oscillation, and that oscillation's period (Ziegler–Nichols). Derivative filter NLimits D's high-frequency gain: K<sub>d</sub>Ns/(s+N). Derivative kickSpike in u when D acts on e and r steps. Fix: D on measurement. SaturationActuator hitting its physical limit. Integrator windupIntegrator accumulating during saturation, causing large overshoot afterwards. Anti-windupClamping or back-calculation to stop the integrator from winding up. LinearizationApproximating a nonlinear model by a linear one around an operating point (what PID Tuner does before designing). Operating pointThe steady condition (e.g. a given engine speed/load) about which the model is linearized.

Open the quiz &amp; flashcards →

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise Kp: faster, but the poles pull toward each other and then ring. Add Ki: the offset vanishes but overshoot grows. Add Kd: the ringing is damped.
````

````callout:note Symbols used here
- **e**: the error e = r − y
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **Ku, Tu**: ultimate gain (P-only loop on the edge of instability) and its oscillation period
- **ζ, ωn**: damping ratio and natural frequency of the dominant pole pair
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **G, C**: plant transfer function G(s) and controller C(s)
````
