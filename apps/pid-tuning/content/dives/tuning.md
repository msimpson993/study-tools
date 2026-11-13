---
id: tuning
order: 8
title: "What tuning means, and how we measure good"
category: tune
chain:
  - title: "How do I decide when it is good enough?"
  - title: "What does tuning mean, and how do we measure good?"
  - title: "speed vs overshoot vs effort, second-order specs"
    detail: "%OS = 100·e^(−πζ/√(1 − ζ²))   Ts ≈ 4/(ζωₙ)"
neighbors:
  - derivative
  - integral
  - lab
exampleScene: { overlays: [push, poles], caption: "Good tuning is a place for the poles: here are the open-loop −1 and −2 and the step response they give." }
---
**What does tuning mean, and how do we measure good?**

**Picture it first.** Good is a place in the s-plane: drag the pole pair and read overshoot, rise time and settling off the step response.

```figure:second
```

Tuning is a trade-off: faster response costs overshoot, effort, noise sensitivity and robustness. We measure it with step-response specs (percent overshoot, settling time, rise time) which, for a dominant second-order pair, come from ζ and ωₙ.

### What does “tuning” mean, and why is it hard?

Tuning = picking K<sub>p</sub>, K<sub>i</sub>, K<sub>d</sub> (and filter N) so the loop meets specs such as settling time, overshoot, steady-state error and robustness. It's hard because the specs <b>conflict</b>: faster usually means less robust, noisier and harder on the actuator.

The core trade-offs:

- <b>Speed vs robustness.</b> A faster loop needs higher gain at higher frequencies, where the plant's phase lag is larger, so less phase margin, more overshoot, and more sensitivity to model error.
- <b>Speed vs noise.</b> Higher bandwidth lets more sensor noise through to the actuator (D makes it worse).
- <b>Speed vs actuator effort.</b> Fast responses demand big, sharp control signals. Real actuators saturate, which leads to windup.
- <b>Tracking vs disturbance rejection.</b> A tuning optimized for set-point steps isn't automatically best for load disturbances.

*From the guide's static figure: <b>Conceptual trade-off map</b> (qualitative, not to scale). Good tuning means getting <em>onto</em> the frontier and then choosing where along it to sit. In the PID Tuner, the two sliders move you roughly along these two axes. That's the key to understanding your Project 1 (Deep dive D). Below the curve is achievable but not the best you could do.*

### How do we measure “good”? (A gentle preview of second-order systems)

With step-response numbers: <b>rise time</b>, <b>overshoot</b> (%), <b>settling time</b> (time to stay within ±2% of final value), and <b>steady-state error</b>. For loops that behave like a second-order system, two numbers, the damping ratio <b>ζ</b> and natural frequency <b>ω<sub>n</sub></b>, predict all of them.

Many closed loops (including a PI on a first-order plant, or an I-only loop) are exactly second order, and higher-order loops are often dominated by one pair of complex poles. The standard form is:

<div class="eqbox"><span class="frac"><span>Y</span><span>R</span></span> = <span class="frac"><span>ω<sub>n</sub>²</span><span>s² + 2ζω<sub>n</sub>s + ω<sub>n</sub>²</span></span> poles: s = −ζω<sub>n</sub> ± jω<sub>n</sub>√(1−ζ²)</div>

| Quantity | Formula (0 &lt; ζ &lt; 1) | Controlled by | Intuition |
|---|---|---|---|
| Percent overshoot | %OS = 100·e<sup>−πζ/√(1−ζ²)</sup> | <b>ζ only</b> | ζ = 0.5 → 16%, 0.6 → 9.5%, 0.7 → 4.6%, ≥1 → 0 |
| Settling time (2%) | T<sub>s</sub> ≈ 4/(ζω<sub>n</sub>) | real part of poles | Poles farther left ⇒ faster decay envelope |
| Peak time | T<sub>p</sub> = π/(ω<sub>n</sub>√(1−ζ²)) | imag part | Faster oscillation ⇒ earlier peak |
| Rise time (10–90%) | ω<sub>n</sub>T<sub>r</sub> ≈ 1.768ζ³ − 0.417ζ² + 1.039ζ + 1 (curve fit) | mostly ω<sub>n</sub> | Higher ω<sub>n</sub> ⇒ faster |


````callout:note Connection to PID
Example: an I-only controller on a first-order plant K/(τs+1) gives Y/R = KK<sub>i</sub>/(τs² + s + KK<sub>i</sub>): second order with ω<sub>n</sub> = √(KK<sub>i</sub>/τ) and ζ = 1/(2√(τKK<sub>i</sub>)). Raising K<sub>i</sub> raises ω<sub>n</sub> but <b>lowers ζ</b>, so you get more overshoot. That's the “integral adds overshoot” row of the effects table, derived rather than memorized. With PI: ζ = (1 + KK<sub>p</sub>)/(2√(τKK<sub>i</sub>)), so K<sub>p</sub> adds damping here.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Drag the pole straight up: the ringing grows but the decay rate (its real part) does not. Drag it left: faster, same shape. Overshoot depends on the angle only.
````

````callout:note Symbols used here
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **ζ, ωn**: damping ratio and natural frequency of the dominant pole pair
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
