---
id: zn
order: 11
title: "Ziegler–Nichols: tuning from the edge of instability"
category: tune
chain:
  - title: "Is there a recipe that needs no model?"
  - title: "Can I tune from the edge of instability?"
  - title: "Ziegler–Nichols, deep dive C"
    detail: "Kp = 0.6·Ku,  Ti = Tu/2,  Td = Tu/8"
neighbors:
  - methods
exampleScene: { overlays: [shaker, trace], caption: "Shaking at one frequency shows how the plant answers it, the idea behind the ultimate period in Ziegler–Nichols." }
---
**Can I tune from the edge of instability?**

**Picture it first.** Raise Kp until the output rings forever: that is Kᵤ = 8 with a period of about 3.63 s. Then switch on the Ziegler–Nichols PID built from those two numbers.

```figure:zn
```

Raise Kp with P only until the output oscillates steadily: that is the ultimate gain Ku with period Tu. The classic PID is Kp = 0.6·Ku, Ti = Tu/2, Td = Tu/8. It aims at quarter-amplitude decay, so expect a lot of overshoot and detune.

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
Before you touch a slider, predict what it will do. Raise Kp toward 8: the closed-loop poles walk to the jω axis and the response rings forever. Then switch on the Z–N PID: fast, but with big overshoot (the rules aim for quarter-amplitude decay, not elegance).
````

````callout:note Symbols used here
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **Ku, Tu**: ultimate gain (P-only loop on the edge of instability) and its oscillation period
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
