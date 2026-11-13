---
id: ctrl
order: 6
title: "What P, I and D each do"
category: loop
chain:
  - title: "What can the controller do?"
  - title: "What can P, I and D each do about it?"
  - title: "controllers at a glance"
    detail: "C(s) = Kp + Ki/s + Kd·s"
neighbors:
  - blocks
  - sse
exampleScene: { overlays: [forces, push], caption: "The push u is the one force a controller chooses. P, I and D are three recipes for choosing it from the sensor reading." }
---
**What can P, I and D each do about it?**

**Picture it first.** Add one term at a time to the cart: P is fast but leaves an offset, I removes it and slows things down, D calms the ringing. The closed-loop poles are in the third plot.

```figure:pidcart
```

Proportional acts on the present error (faster, leaves some error), integral accumulates past error (removes steady-state error, can add overshoot and windup), derivative anticipates (adds damping, amplifies noise). Parallel and standard forms use different symbols for the same controller.

### What does each term fix, and what does it cost?

<b>P</b> reacts to the present error: faster, but leaves a steady-state error on type-0 plants. <b>I</b> reacts to the accumulated past: removes step steady-state error, but slows things down and adds overshoot. <b>D</b> reacts to the trend (the future): adds damping and cuts overshoot, but amplifies noise.

| Term | G<sub>c</sub>(s) | Fixes | Costs / watch for |
|---|---|---|---|
| P | <i>K</i><sub>p</sub> | Rise time, reduces (but doesn't eliminate) SSE | Too much → overshoot, oscillation |
| I | <i>K</i><sub>i</sub>/<i>s</i> | Step SSE → 0 (adds a pole at the origin) | Slower, more overshoot, windup |
| D | <i>K</i><sub>d</sub><i>s</i> | Damping, less overshoot | Noise amplification, derivative kick |
| PI | <i>K</i><sub>p</sub> + <i>K</i><sub>i</sub>/<i>s</i> | Accuracy + reasonable speed | The industrial default (Project 1 is PI) |
| PD | <i>K</i><sub>p</sub> + <i>K</i><sub>d</sub><i>s</i> | Speed + damping (adds a zero) | The boring machine's <i>K</i> + 11<i>s</i> is a PD! |
| PID | <i>K</i><sub>p</sub> + <i>K</i><sub>i</sub>/<i>s</i> + <i>K</i><sub>d</sub><i>s</i> | All three | Three knobs to tune |


The class example (Lecture 2): you ask cruise control for 70 mph and get 72 mph forever. That's the steady-state error P-only leaves behind. The integral term keeps “learning” until the error is gone.

### Parallel vs standard form: why two sets of symbols?

Same controller, two parameterizations. Parallel: <i>K</i><sub>p</sub> + <i>K</i><sub>i</sub>/<i>s</i> + <i>K</i><sub>d</sub><i>s</i>. Standard (ISA): <i>K</i><sub>p</sub>(1 + 1/(<i>T</i><sub>i</sub><i>s</i>) + <i>T</i><sub>d</sub><i>s</i>). They're related by <i>K</i><sub>i</sub> = <i>K</i><sub>p</sub>/<i>T</i><sub>i</sub> and <i>K</i><sub>d</sub> = <i>K</i><sub>p</sub><i>T</i><sub>d</sub>.

````callout:trap Trap


- In standard form, a <b>bigger</b> <i>T</i><sub>i</sub> means a <b>weaker</b> integral.
- <i>T</i><sub>d</sub> is overloaded: derivative time here, but <i>T</i><sub>d</sub>(<i>s</i>) is the <em>disturbance</em> in Lecture Notes 2. Context tells you which (the Vars panel lists both).
````

````callout:note Go deeper
Tuning methods, the PID Tuner sliders, windup, and the derivative filter are in the PID tuning guide, with a quiz &amp; flashcards.
````

Choosing the three numbers is its own map: [open the PID tuning map](../pid-tuning/index.html). It uses this same cart as plant 2.

````callout:predict Predict
Before you touch a slider, predict what it will do. P alone settles short of 1 (the offset is 1/(1 + Kp·G(0)) = 0.4 at Kp = 3). Adding Ki closes the gap, at the cost of a slower settle; add a lot of Ki and it overshoots. Kd speeds the settle up again.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **e_ss**: the error r − y once everything has settled
- **T (time constant)**: time for a first-order response to cover 63 % of the way: T = 1/|p|
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **C(s)**: the controller transfer function (PID: Kp + Ki/s + Kd·s)
````
