---
id: methods
order: 10
title: "How you actually find the gains"
category: tune
chain:
  - title: "How do I actually find the gains?"
  - title: "How do I actually find the gains?"
  - title: "manual, Ziegler–Nichols, automatic"
neighbors:
  - lab
  - zn
  - sliders
  - project
exampleScene: { overlays: [pid], params: { K: 6, Ki: 2, Kd: 1 }, caption: "Manual tuning: raise K for speed, add Ki to close the offset, add Kd to calm the swing, one at a time." }
---
**How do I actually find the gains?**

**Picture it first.** Manual tuning is a loop of move one gain, look, move the next. Try it on the plant: first Kp for speed, then Ki to remove the offset, then Kd to calm the ringing.

```figure:gains
```

Three practical routes: tune by hand with the cause-and-effect table, use a classic recipe such as Ziegler–Nichols (find where the loop just oscillates, then scale), or use an automatic tuner that linearizes the plant and gives you a speed and a robustness slider.

### How do you tune by hand?

Start with P, add I to kill the offset, add D only if you need damping. Change one gain at a time, by factors (×1.5 or ×2), and predict the effect before each run.

1. <b>P first.</b> Set K<sub>i</sub> = K<sub>d</sub> = 0. Raise K<sub>p</sub> until the response is reasonably fast with mild oscillation. ↑Kp: faster, more OS, less offset
2. <b>Add I.</b> Increase K<sub>i</sub> (decrease T<sub>i</sub>) until the offset disappears in acceptable time. Back off if overshoot grows. I ⇒ e<sub>ss</sub> = 0, adds lag
3. <b>Add D if needed.</b> Increase K<sub>d</sub> to reduce overshoot/ringing; stop when noise in u becomes unacceptable; keep a filter. D ⇒ damping, noise
4. <b>Iterate &amp; check margins.</b> Re-tweak K<sub>p</sub>; test with a disturbance and with the actuator limit; verify the spec numbers. robustness

#### Ziegler–Nichols: tuning from the edge of instability

| Controller (closed-loop / ultimate-gain method) | K<sub>p</sub> | T<sub>i</sub> | T<sub>d</sub> |
|---|---|---|---|
| P | 0.5 K<sub>u</sub> | — | — |
| PI | 0.45 K<sub>u</sub> | T<sub>u</sub>/1.2 | — |
| PID (classic) | 0.6 K<sub>u</sub> | T<sub>u</sub>/2 | T<sub>u</sub>/8 |


<b>Worked example (the Lab's plant 1/(s+1)³).</b> With P control the characteristic equation is (s+1)³ + K<sub>p</sub> = s³ + 3s² + 3s + (1 + K<sub>p</sub>) = 0. Routh–Hurwitz (or substitute s = jω): marginal when 3·3 = 1 + K<sub>p</sub>, so <b>K<sub>u</sub> = 8</b>, with oscillation at ω<sub>u</sub> = √3 rad/s, so <b>T<sub>u</sub> = 2π/√3 ≈ 3.63 s</b>. Classic ZN PID: K<sub>p</sub> = 4.8, T<sub>i</sub> = 1.81 s, T<sub>d</sub> = 0.45 s ⇒ K<sub>i</sub> = K<sub>p</sub>/T<sub>i</sub> ≈ 2.65, K<sub>d</sub> = K<sub>p</sub>T<sub>d</sub> ≈ 2.18.

*From the guide's static figure: <b>Finding K<sub>u</sub></b> (P-only on 1/(s+1)³). Below K<sub>u</sub> = 8 the oscillation decays; at K<sub>u</sub> it sustains with period ≈ 3.63 s (the simulation measures 3.63 s); above it, it grows (unstable). The ZN PID built from these numbers gives ≈ 43% overshoot in the Lab. That's typical: ZN aims for fast disturbance rejection (quarter-amplitude decay), not gentle set-point tracking.*

````callout:note The other ZN method (open-loop “reaction curve”)
Apply a step to the plant (no feedback), fit an S-curve with gain K, dead time L and time constant T, then e.g. PID: K<sub>p</sub> = 1.2T/(KL), T<sub>i</sub> = 2L, T<sub>d</sub> = 0.5L. Same spirit, same aggressiveness.
````

````callout:trap Caveats
Driving a real engine into sustained oscillation can be unsafe. ZN rules are in the <b>standard</b> form, so convert before typing them into a parallel-form block. And ZN gains are a starting point, not an answer.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise Kp: faster, but the poles pull toward each other and then ring. Add Ki: the offset vanishes but overshoot grows. Add Kd: the ringing is damped.
````

````callout:note Symbols used here
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **Ku, Tu**: ultimate gain (P-only loop on the edge of instability) and its oscillation period
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
