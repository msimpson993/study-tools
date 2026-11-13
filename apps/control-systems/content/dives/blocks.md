---
id: blocks
order: 5
title: "The loop: command path and disturbance path"
category: loop
chain:
  - title: "How does G(s) sit in a loop with a controller and a disturbance?"
  - title: "How does the plant sit in a loop with a controller and a disturbance?"
  - title: "standard feedback loop, where the disturbance enters"
    detail: "Y = CG/(1 + CG)·R + G/(1 + CG)·D"
neighbors:
  - tf
  - ctrl
  - fb
---
**How does the plant sit in a loop with a controller and a disturbance?**

**Picture it first.** One loop, two paths: the same K that speeds up the command path (solid) shrinks the effect of a push (dashed on the right).

```figure:loop
```

Close the loop on the measured output: error E = R − Y feeds a controller C, the disturbance D adds somewhere in the loop, and the plant G produces Y. Closed-loop transfer functions follow from the series, parallel and feedback rules, and where D enters decides how it is transformed.

### What does the standard feedback loop look like, and what is C/R?

Reference <i>R</i> minus measured output gives error <i>E</i>. The controller <i>G</i><sub>c</sub> turns <i>E</i> into actuation, the plant <i>G</i> produces output <i>C</i> (or <i>Y</i>), and a disturbance <i>T</i><sub>d</sub> enters along the way. With unity feedback, <i>C</i>/<i>R</i> = <i>G</i><sub>c</sub><i>G</i>/(1 + <i>G</i><sub>c</sub><i>G</i>).

*From the guide's static figure: <b>The loop you'll see on every exam.</b> Two inputs (<i>R</i> and <i>T</i><sub>d</sub>), one output, one loop gain <i>L</i> = <i>G</i><sub>c</sub><i>G</i>.*

<div class="eqbox"><span class="frac"><span><i>C</i></span><span><i>R</i></span></span> = <span class="frac"><span><i>G</i><sub>c</sub><i>G</i></span><span>1 + <i>G</i><sub>c</sub><i>G</i></span></span> <span class="frac"><span><i>C</i></span><span><i>T</i><sub>d</sub></span></span> = <span class="frac"><span><i>G</i></span><span>1 + <i>G</i><sub>c</sub><i>G</i></span></span></div>

### How do I get C/D (output due to the disturbance)?

Set <i>R</i> = 0 and redraw with <i>T</i><sub>d</sub> as the input. The forward path from <i>T</i><sub>d</sub> to <i>C</i> is just <i>G</i>, and the loop is unchanged, so <i>C</i>/<i>T</i><sub>d</sub> = <i>G</i>/(1 + <i>G</i><sub>c</sub><i>G</i>).

Rule of thumb for any input: <b>numerator = forward path from that input to the output; denominator = 1 + loop gain</b>. That's why <i>C</i>/<i>R</i> and <i>C</i>/<i>T</i><sub>d</sub> share a denominator. With both inputs present, superposition gives <i>C</i> = [<i>G</i><sub>c</sub><i>G</i>·<i>R</i> + <i>G</i>·<i>T</i><sub>d</sub>]/(1 + <i>G</i><sub>c</sub><i>G</i>).

````callout:recognize Recognize


- <b>Same characteristic equation</b> 1 + <i>G</i><sub>c</sub><i>G</i> = 0 for every input. Stability and the transient “personality” (ζ, ω<sub>n</sub>) belong to the <em>loop</em>, not to the input.
- Only the <b>numerator</b> changes with the input, so the final value and the zeros differ.
````

### Why does it matter where the disturbance enters?

It changes the numerator. A disturbance entering at the plant <em>input</em> is filtered by <i>G</i>, giving <i>G</i>/(1+<i>L</i>). One at the plant <em>output</em> gives 1/(1+<i>L</i>). In both cases, making the loop gain large where the disturbance lives is what suppresses it.

````callout:predict Predict
<i>G</i><sub>c</sub> = <i>K</i> (P only), <i>G</i> = 1/(<i>s</i>+1), unit-step disturbance at the plant input, <i>R</i> = 0. Where does <i>C</i> settle?<br>ShowFVT: <i>C</i>(∞) = lim <i>s</i>·<span class="frac"><span>1/(<i>s</i>+1)</span><span>1 + <i>K</i>/(<i>s</i>+1)</span></span>·<span class="frac"><span>1</span><span><i>s</i></span></span> = 1/(1+<i>K</i>). Bigger <i>K</i> shrinks the effect but never removes it. For that you need integral action in <i>G</i><sub>c</sub> (Stage 12).
````

````callout:note Key takeaway
High loop gain helps reject disturbances, and an integrator <em>in the controller, upstream of where the disturbance enters</em> drives the steady-state effect of a constant disturbance to zero.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise K: the command path gets faster and its error smaller, and the push is held back harder, but the command path starts to ring.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **T (time constant)**: time for a first-order response to cover 63 % of the way: T = 1/|p|
- **C(s)**: the controller transfer function (PID: Kp + Ki/s + Kd·s)
````
