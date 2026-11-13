---
id: sliders
order: 12
title: "What the PID Tuner sliders really set"
category: tune
chain:
  - title: "What does the automatic tuner set?"
  - title: "What do the PID Tuner sliders really set?"
  - title: "bandwidth, phase margin, deep dive D"
neighbors:
  - methods
exampleScene: { overlays: [poles, push], caption: "The Tuner's speed and robustness sliders move the poles; this is where they start, with the step response they give." }
---
**What do the PID Tuner sliders really set?**

**Picture it first.** The MATLAB PID Tuner sliders move two loop numbers: the crossover frequency (speed) and the phase margin (robustness). Change the gains and watch both on the Bode plot.

```figure:bodepid
```

MATLAB's PID Tuner sliders map to loop bandwidth (response time) and phase margin (transient behavior): faster response means higher bandwidth, and more robustness means more phase margin and less overshoot. Gains are computed from these two targets.

### What does automatic tuning (MATLAB's PID Tuner) actually do?

It linearizes your Simulink plant at the operating point, then computes gains that achieve a target <b>speed</b> (response time ≈ bandwidth) with a target <b>robustness</b> (transient behavior ≈ phase margin). You steer with two sliders instead of three gains.

1. <b>Linearize.</b> Opening the tuner from the PID block makes Simulink compute a linear plant model seen by the controller at the current operating point. transfer function of the plant
2. <b>Design.</b> It picks P, I (and D, N if present) so the open-loop L = C·G crosses 0 dB at a chosen frequency ω<sub>c</sub> with a chosen phase margin. Its initial design aims at a balance between performance and robustness. loop shaping
3. <b>Adjust.</b> <b>Time-domain</b> mode: <em>Response time</em> slider (Slower ↔ Faster) and <em>Transient behavior</em> slider (Aggressive ↔ Robust). <b>Frequency-domain</b> mode: <em>Bandwidth</em> and <em>Phase margin</em>. Same two degrees of freedom, different labels. trade-off map
4. <b>Inspect.</b> “Show parameters” lists gains plus rise/settling time, overshoot, gain &amp; phase margins, closed-loop stability. specs
5. <b>Update Block</b> writes the gains to the Simulink block; then simulate the <b>nonlinear</b> model. verification

#### How the PID Tuner sliders map to bandwidth and phase margin

#### Two loop numbers, in your RF language

- <b>Gain crossover ω<sub>c</sub></b>: where |L(jω)| = 1 (0 dB). Closed-loop bandwidth is close to ω<sub>c</sub>, and response time scales roughly like 1/ω<sub>c</sub> (double ω<sub>c</sub> → about half the response time). The <em>Response time</em> slider moves ω<sub>c</sub>: <b>sliding left = slower = longer response time = lower bandwidth</b>.
- <b>Phase margin PM</b> = 180° + ∠L(jω<sub>c</sub>): how far the loop is from the −180° “oscillation condition” at crossover. The <em>Transient behavior</em> slider trades PM: toward <b>Robust = more PM = less overshoot</b>, toward Aggressive = less PM, snappier but more overshoot. (MATLAB's <code>pidtune</code> defaults to a 60° PM target.)
- <b>Rule of thumb</b> (derived from the standard 2nd-order loop ω<sub>n</sub>²/(s(s+2ζω<sub>n</sub>)); only approximate for other loops): ζ ≈ PM/100 for PM ≲ 65°. So PM 45° → ζ ≈ 0.45 → ~20% OS; PM 60° → ζ ≈ 0.6 → ~10% OS; PM ≳ 70° → little or no overshoot.

*From the guide's static figure: <b>Loop-gain Bode plot for three PI tunings</b> on 1/(s+1)³ (computed). Dots mark ω<sub>c</sub> on the magnitude plot and the phase at ω<sub>c</sub> on the phase plot; the gap to −180° is the PM. Readouts: . Notice: the <b>faster</b> design (higher ω<sub>c</sub>) sits where the plant's phase lag is worse, so it has <b>less PM and more overshoot</b>; the <b>robust</b> design buys PM and kills overshoot. The Lab shows ω<sub>c</sub> and PM live for any gains.*

````callout:note The sentence to remember
“Faster” alone moves you right on the trade-off map and <em>down</em> in PM, so overshoot rises. To get faster <em>and</em> calmer you must also slide toward Robust, if the plant allows it. That is exactly your Project 1's final design.
````

#### Actuator saturation and integrator windup

*From the guide's static figure: <b>Windup, simulated.</b> Plant 1/(s+1), PI K<sub>p</sub> = 2, K<sub>i</sub> = 4, actuator limited to |u| ≤ 1.2. Without anti-windup the integrator charges while u is pinned at the limit, so overshoot ≈ 18% and slower settling. With clamping (integrator frozen while saturated and the error would push it further) overshoot ≈ 1.6%. Bottom: control signal u.*

In Simulink's PID block, anti-windup lives on the <b>Output Saturation</b> tab: enable limits, then choose “clamping” or “back-calculation.”

#### How the PID Tuner sliders map to bandwidth and phase margin

#### Two loop numbers, in your RF language

- <b>Gain crossover ω<sub>c</sub></b>: where |L(jω)| = 1 (0 dB). Closed-loop bandwidth is close to ω<sub>c</sub>, and response time scales roughly like 1/ω<sub>c</sub> (double ω<sub>c</sub> → about half the response time). The <em>Response time</em> slider moves ω<sub>c</sub>: <b>sliding left = slower = longer response time = lower bandwidth</b>.
- <b>Phase margin PM</b> = 180° + ∠L(jω<sub>c</sub>): how far the loop is from the −180° “oscillation condition” at crossover. The <em>Transient behavior</em> slider trades PM: toward <b>Robust = more PM = less overshoot</b>, toward Aggressive = less PM, snappier but more overshoot. (MATLAB's <code>pidtune</code> defaults to a 60° PM target.)
- <b>Rule of thumb</b> (derived from the standard 2nd-order loop ω<sub>n</sub>²/(s(s+2ζω<sub>n</sub>)); only approximate for other loops): ζ ≈ PM/100 for PM ≲ 65°. So PM 45° → ζ ≈ 0.45 → ~20% OS; PM 60° → ζ ≈ 0.6 → ~10% OS; PM ≳ 70° → little or no overshoot.

*From the guide's static figure: <b>Loop-gain Bode plot for three PI tunings</b> on 1/(s+1)³ (computed). Dots mark ω<sub>c</sub> on the magnitude plot and the phase at ω<sub>c</sub> on the phase plot; the gap to −180° is the PM. Readouts: . Notice: the <b>faster</b> design (higher ω<sub>c</sub>) sits where the plant's phase lag is worse, so it has <b>less PM and more overshoot</b>; the <b>robust</b> design buys PM and kills overshoot. The Lab shows ω<sub>c</sub> and PM live for any gains.*

````callout:note The sentence to remember
“Faster” alone moves you right on the trade-off map and <em>down</em> in PM, so overshoot rises. To get faster <em>and</em> calmer you must also slide toward Robust, if the plant allows it. That is exactly your Project 1's final design.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise Kp: the crossover moves right (faster) and the phase margin shrinks (more overshoot). Add Kd: the phase margin comes back.
````

````callout:note Symbols used here
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **ζ, ωn**: damping ratio and natural frequency of the dominant pole pair
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
