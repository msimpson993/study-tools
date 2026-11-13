---
id: project
order: 13
title: "Your Project 1, step by step"
category: tune
chain:
  - title: "How does this play out on a real task?"
  - title: "How does it play out in Project 1, step by step?"
  - title: "speed-control worked example"
neighbors:
  - methods
  - report
exampleScene: { overlays: [pid, disturb], params: { K: 8, Ki: 6, Kd: 1.5, d: -2, td: 5 }, caption: "Project 1 in miniature: the PID takes the cart to the target, and when a 2 N shove hits at 5 s the integral brings it back." }
---
**How does it play out in Project 1, step by step?**

**Picture it first.** Replay the project moves on the Lab: a slower, more robust PI, then a faster one. Use the presets and the ghost to compare.

```figure:lab
```

A worked walkthrough: model the plant, open the PID block's tuner, choose PI, read the response, and move the sliders to hit the specs, with the reason for each move tied back to a concept above.

### What happens at each step of the example, and which concept explains it?

1. <b>Open the model.</b> <code>open_system('scdspeedctrlpidblock')</code>. Find the loop: <em>Speed Reference</em> step → error → <em>PID Controller</em> block → engine dynamics → measured speed fed back. Q2 block diagram, Y/R = CG/(1+CG)
2. <b>Read the requirements.</b> (a) settling time &lt; 5 s; (b) zero steady-state error to the step reference. Requirement (b) tells you immediately that you need <b>integral action</b>, which is why the block is configured as <b>PI</b>. Deep dive A
3. <b>Open PID Tuner</b> (double-click the block, Main tab → <em>Tune</em>). Simulink <b>linearizes</b> the engine model at the current operating point to get the plant the controller “sees,” and proposes an initial PI design. Q11 model-based tuning
4. <b>Initial design: settling ≈ 2 s, overshoot ≈ 7.5%.</b> (“Show parameters.”) Settling already meets the 5 s spec. If this loop behaved like a standard second-order system, 7.5% OS would correspond to ζ ≈ 0.64; you're near the “balanced” point on the trade-off map. Q9 specs, ζ ↔ %OS
5. <b>Slide Response time to the LEFT</b> (slower = longer response time). Result: <b>0% overshoot, settling ≈ 4 s</b>, and the controller becomes <b>effectively integral-only</b> (P gain ≈ 0). Still meets &lt; 5 s: you spent the spare settling-time budget to buy zero overshoot. Deep dive D: lower ω<sub>c</sub> ⇒ more PM
6. <b>Use both sliders:</b> response time <b>3.4 → 1.5 s</b> (faster) <em>and</em> robustness/transient behavior <b>0.6 → 0.72</b> (more robust). Result: <b>0% overshoot and settling &lt; 2 s</b>, better than the initial design on both counts. trade-off map: move right <em>and</em> up
7. <b>Update Block</b> writes P and I into the Simulink block. <b>Simulate the nonlinear model</b> and confirm the step response still meets both requirements. linearization validity, saturation

| Design | Slider move | Overshoot | Settling | Meets Ts &lt; 5 s? | Character |
|---|---|---|---|---|---|
| Initial (tuner default) | — | ≈ 7.5% | ≈ 2 s | ✓ | Balanced PI |
| Slower | Response time ← (longer) | 0% | ≈ 4 s | ✓ | ≈ I-only, sluggish but calm |
| Faster + more robust | Response time 3.4 → 1.5 s, robustness 0.6 → 0.72 | 0% | &lt; 2 s | ✓ | Fast and well damped |


````callout:note What to record yourself
The example doesn't list every gain value in its text, and gains differ slightly between MATLAB releases. For your report, copy P, I, rise time, settling time, overshoot, gain margin and phase margin from the “Show parameters” panel for <em>each</em> of the three designs, and screenshot each response. Also note: the slider's “response time” is a design target; it's not the same number as the measured settling time.
````

### Why did each slider move do what it did?

#### Move 1: slower response ⇒ zero overshoot, ≈4 s, “integral-only”

<b>Predict:</b> slower means lower bandwidth, means less plant phase lag at crossover, so more phase margin, so less overshoot, at the cost of settling time. <b>Observed:</b> overshoot 7.5% → 0, settling 2 → 4 s. ✓

<b>Why “integral-only”?</b> Once the crossover is pushed low enough, an integrator by itself (gain falling at −20 dB/dec, phase −90°) already crosses 0 dB with plenty of margin, so the optimizer has no need for the P term. Remember the I-only second-order result (Q9): small K<sub>i</sub> ⇒ large ζ ⇒ no overshoot, but slow. The I term alone still guarantees zero steady-state error, so the requirement holds.

#### Move 2: faster (3.4 → 1.5 s) + more robust (0.6 → 0.72) ⇒ zero overshoot, &lt; 2 s

<b>Predict each slider separately first:</b>

- Faster alone: higher ω<sub>c</sub>, so <em>less</em> PM, so overshoot comes back (likely above 7.5%).
- More robust alone: more PM, so less overshoot, typically a bit slower.

<b>Together:</b> the speed slider sets ω<sub>c</sub> high (fast), and the robustness slider forces the tuner to place the PI zero/gain so the phase margin stays large at that higher ω<sub>c</sub>. The overshoot from the speed-up is cancelled by the added margin. That this works at all tells you the plant has enough phase “room” at that frequency; for a plant with more lag or delay, you'd hit the frontier and couldn't have both.

#### Why verify on the nonlinear model?

The tuner designed against a <b>linearization at one operating point</b>. The real engine model is nonlinear, so the gains may behave differently for larger steps or other speeds, and actuator limits (throttle saturation) are invisible to a linear design. Simulating the full model after <em>Update Block</em> confirms the design really meets &lt; 5 s and zero steady-state error. If it doesn't, suspect operating-point mismatch or saturation/windup.

````callout:predict Predict
Before you touch a slider, predict what it will do. Start from PID on the third-order lag, then raise Kp: the poles slide toward the jω axis, overshoot grows and the phase margin falls. Kp = 8 with Ki = Kd = 0 sits exactly on the axis (Ku).
````

````callout:note Symbols used here
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **Ku, Tu**: ultimate gain (P-only loop on the edge of instability) and its oscillation period
- **ζ, ωn**: damping ratio and natural frequency of the dominant pole pair
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
