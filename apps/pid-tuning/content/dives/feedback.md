---
id: feedback
order: 2
title: "Why feedback, and what goes wrong"
category: why
chain:
  - title: "How can the output be made to follow?"
  - title: "Why feedback, and what goes wrong with it?"
  - title: "sensors, delay, saturation, instability"
neighbors:
  - problem
  - pid
---
**Why feedback, and what goes wrong with it?**

**Picture it first.** The same P-only loop on 1/(s+1)³ at three gains: calm, sustained ringing at the ultimate gain, and growing swings. Feedback fixes the error and costs stability.

```figure:fail-oscillation
```

Feedback is robust to model error and disturbances because it reacts to what actually happened, but it needs a sensor, can be noisy, adds lag and delay, runs into actuator limits, and can go unstable if the loop gain is too high at the wrong frequency.

### Why use feedback instead of just computing the right throttle (open loop)?

Open loop only works if you know the plant exactly and nothing disturbs it. Feedback <b>measures the result</b> and corrects for whatever went wrong, whether that's model error or disturbances, without needing to know why.

Open loop: “1200 rpm needs 18% throttle, so command 18%.” That fails as soon as the load changes or the engine is warmer than the day you calibrated. Closed loop: measure <i>y</i>, form the <b>error</b> <i>e</i> = <i>r</i> − <i>y</i>, and let a controller <i>C</i>(s) turn the error into a command.

*From the guide's static figure: <b>The loop.</b> Everything in this guide lives in this picture. Tuning changes only the blue block; the orange inputs (<i>d</i>, <i>n</i>) are what the world throws at you. The actuator limit (saturation) matters later for windup.*

From class: with forward path <i>CG</i> and unity feedback, superposition gives two transfer functions with the <b>same denominator</b>:

<div class="eqbox"><span class="frac"><span>Y</span><span>R</span></span> = <span class="frac"><span>C G</span><span>1 + C G</span></span><br><span class="frac"><span>Y</span><span>D</span></span> = <span class="frac"><span>G</span><span>1 + C G</span></span><br><span class="frac"><span>E</span><span>R</span></span> = <span class="frac"><span>1</span><span>1 + C G</span></span></div>

Read them like an engineer: wherever the loop gain |<i>CG</i>| is <b>large</b>, <i>Y</i>/<i>R</i> → 1 (good tracking) and <i>Y</i>/<i>D</i> → 0 (disturbance rejected). That one sentence is the reason feedback works, and it's the seed of why integral action (infinite gain at DC) gives zero steady-state error.

### So what goes wrong with feedback?

Feedback acts on <em>delayed, lagged</em> information. Push too hard and you overshoot or oscillate; push too gently and you're slow or leave a permanent offset. Noise and actuator limits add their own problems.

| Symptom | What you see on a step response | Typical cause | Usual PID fix |
|---|---|---|---|
| <b>Slow</b> ▸A1 | Long rise / settling time | Gains too low (low bandwidth) | ↑ K<sub>p</sub> (and K<sub>i</sub>) |
| <b>Steady-state offset</b> ▸A2 | Settles, but not at <i>r</i> | No integrator in the loop (type-0) | Add I action |
| <b>Overshoot</b> ▸A3 | Goes past <i>r</i>, then comes back | Too aggressive; too much I; low phase margin | ↓ K<sub>i</sub>, ↓ K<sub>p</sub>, or add K<sub>d</sub> |
| <b>Oscillation / instability</b> ▸A4 | Ringing that decays slowly, persists, or grows | Loop gain too high where phase lag reaches −180° | Detune; add D; more robustness |
| <b>Poor disturbance rejection</b> ▸A5 | Big dip when load hits; slow recovery | Low loop gain at the disturbance frequencies | ↑ gains; I action for constant loads |
| <b>Noisy / jittery actuator</b> ▸A6 | Control signal chatters | Derivative (or high K<sub>p</sub>) amplifying sensor noise | Filter D; ↓ K<sub>d</sub> |
| <b>Windup</b> ▸A7 | Huge overshoot after a long saturation | Integrator keeps charging while actuator is maxed | Anti-windup |


▸A1–A7 link to a simulated picture of each row in the appendix.

Keep this table in mind. The rest of the guide is basically: <em>which knob fixes which row, and what does it cost in the other rows?</em>

````callout:predict Predict
Before you touch a slider, predict what it will do. Kp = 8 rings forever, 12 grows, 2 is calm: back the gain off.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **y**: the measured output of the plant
- **e**: the error e = r − y
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
