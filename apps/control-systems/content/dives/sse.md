---
id: sse
order: 7
title: "Why P leaves an error and I removes it"
category: loop
chain:
  - title: "Why does proportional control leave an error and integral remove it?"
  - title: "Why does P leave an error and I remove it?"
  - title: "steady-state error, system type"
    detail: "e_ss = 1/(1 + Kp·G(0))   (P-only, step)"
neighbors:
  - ctrl
  - second
---
**Why does P leave an error and I remove it?**

**Picture it first.** Raise Kp and the predicted error 1/(1 + Kp·G(0)) shrinks but never reaches zero; set Ki above zero and it goes to zero.

```figure:sse
```

With pure P the output needs a nonzero error to keep the controller output up, so it stops short: e_ss = 1/(1 + K·G(0)) for a step. An integrator keeps growing while any error remains, so at rest the error must be exactly zero (system type 1).

### How do I compute steady-state error?

With unity feedback, <i>E</i>(<i>s</i>) = <i>R</i>(<i>s</i>)/(1 + <i>L</i>(<i>s</i>)). The final-value theorem gives <i>e</i><sub>ss</sub> = lim<sub><i>s</i>→0</sub> <i>s</i><i>E</i>(<i>s</i>), but <b>only if the closed loop is stable</b>.

<div class="eqbox"><i>e</i><sub>ss</sub> = lim<sub><i>s</i>→0</sub> <i>s</i> · <span class="frac"><span>1</span><span>1 + <i>G</i><sub>c</sub>(<i>s</i>)<i>G</i>(<i>s</i>)</span></span> · <i>R</i>(<i>s</i>) → unit step: <i>e</i><sub>ss</sub> = <span class="frac"><span>1</span><span>1 + <i>L</i>(0)</span></span></div>

````callout:trap Trap: an unstable loop has no steady state
The final-value theorem will still happily give you a number for an unstable closed loop, and that number is meaningless. Always check stability (all closed-loop poles in the LHP) <em>first</em>.
````

### Why does pure P leave an error, and why does I remove it?

<b>P:</b> <i>u</i> = <i>K</i><sub>p</sub><i>e</i>. To hold the output at a nonzero value, a type-0 plant needs a nonzero <i>u</i>, which means a nonzero <i>e</i>. So <i>e</i><sub>ss</sub> = 1/(1 + <i>K</i><sub>p</sub><i>G</i>(0)), which shrinks with gain but never reaches zero. <b>I:</b> in steady state every signal is constant, including the integrator's output. An integrator's output is constant only if its input is zero, so <b><i>e</i> = 0</b>.

In transfer-function terms, the integrator puts a pole at <i>s</i> = 0 in <i>L</i>, so <i>L</i>(0) = ∞ and 1/(1+<i>L</i>(0)) = 0. The plant can supply that integrator itself (a <b>type-1</b> plant like 1/(<i>s</i>(<i>s</i>+1)) in the boring machine). That's why the boring machine has zero step error even with a PD controller.

| System type (integrators in L) | Step error | Ramp error |
|---|---|---|
| Type 0 | 1/(1+<i>K</i><sub>p</sub>), <i>K</i><sub>p</sub> = <i>L</i>(0) | ∞ |
| Type 1 | 0 | 1/<i>K</i><sub>v</sub>, <i>K</i><sub>v</sub> = lim <i>sL</i>(<i>s</i>) |
| Type 2 | 0 | 0 |


````callout:recognize Recognize


- Flat line below the target with P only → that's 1/(1+<i>K</i><sub>p</sub><i>G</i>(0)) of error. Raising <i>K</i><sub>p</sub> shrinks it but adds overshoot.
- Adding I: the output creeps up and lands exactly on target. Too much I: overshoot, oscillation, and eventually instability (here when <i>K</i><sub>i</sub> &gt; 6(1+<i>K</i><sub>p</sub>)).
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise Kp: the predicted error shrinks as 1/(1 + 0.5·Kp) but never reaches zero. Set Ki > 0: the error is driven to zero.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **e_ss**: the error r − y once everything has settled
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **C(s)**: the controller transfer function (PID: Kp + Ki/s + Kd·s)
````
