---
id: model
order: 1
title: "Why model at all, and why Laplace"
category: describe
chain:
  - title: "What do we need before we can predict anything?"
  - title: "How do we describe a plant without re-solving its ODE?"
  - title: "Laplace, LTI, zero initial conditions"
    detail: "G(s) = Y(s) / U(s), zero initial conditions"
neighbors:
  - splane
  - tf
  - ss
  - circuits
---
**How do we describe a plant without re-solving its ODE?**

**Picture it first.** Change the cart's mass, damper and spring and watch what the model predicts: the step response on the right is what the transfer function G(s) compresses, and the poles are its fingerprint.

```figure:cart
```

For a linear time-invariant plant, the Laplace transform turns derivatives into multiplication by s and convolution into multiplication, so a plant becomes a transfer function G(s) = Y(s)/U(s) (zero initial conditions) and blocks in series simply multiply.

### Why model at all?

A controller is a bet on how the plant will react. A model is what makes that bet informed: it predicts the output for any input, so you can design and test on paper or in Simulink before touching hardware.

Every design question in this course (“How much gain?”, “Will it overshoot?”, “Will it settle on target?”, “What happens when a load hits?”) is answered by running the model, not the machine. The model doesn't need to be perfect. Feedback (Stage 13) exists partly <em>because</em> models are never perfect. But it has to capture the dominant behavior.

````callout:why Why it matters
Every later topic (poles, ζ, steady-state error, sensitivity) is a property <em>of a model</em>. If the model is wrong in the dominant dynamics, every number you compute from it is wrong too.
````

### Why Laplace transforms and transfer functions?

For <b>linear time-invariant (LTI)</b> systems, Laplace turns differential equations into algebra: d/dt becomes multiplication by <i>s</i>, and convolution becomes multiplication. Systems in series then simply multiply.

Physical laws (KVL, Newton) give ODEs. Solving ODEs for every input is painful, and in the time domain chaining two systems means a convolution integral (Lecture 1: <i>y</i>(<i>t</i>) = ∫ <i>x</i>(τ)<i>h</i>(<i>t</i>−τ)dτ). In the <i>s</i>-domain the same chain is <i>Y</i> = <i>H</i>·<i>X</i>. That's why block diagrams work: each block is a multiplier.

The price: <b>linear</b> (superposition holds: no saturation, no dead zones) and <b>time-invariant</b> (constant coefficients: R, L, C, m don't drift). Real plants are approximately LTI around an operating point, and that approximation is good enough for most of the design.

You already think this way with impedances: <i>Z</i> = <i>j</i>ω<i>L</i> is just <i>s</i>L evaluated at <i>s</i> = <i>j</i>ω. Transfer functions are the same move, with <i>s</i> allowed off the <i>j</i>ω axis to capture transients.

````callout:recognize Recognize


- <i>s</i> ↔ d/dt, 1/<i>s</i> ↔ ∫dt (with zero initial conditions).
- “Blocks in series multiply” only holds in the <i>s</i>-domain. In time it's convolution.
- Saturation, dead zones, or time-varying parameters mean you've left the LTI world, and transfer function results are approximations.
````

### What does “zero initial conditions” mean, and what doesn't it mean?

A transfer function is <i>defined</i> with every initial condition set to zero, so it describes how the system responds to an <em>input</em> starting from rest. It doesn't claim real systems start at rest. It just leaves the initial-condition response out.

Laplace of a derivative is <i>sX</i>(<i>s</i>) − <i>x</i>(0). Setting <i>x</i>(0) = 0 for every stored quantity (capacitor voltage, inductor current, position, velocity) removes those extra terms, and the output becomes a pure ratio times the input: <i>Y</i>(<i>s</i>) = <i>G</i>(<i>s</i>)<i>U</i>(<i>s</i>).

````callout:trap Trap


- A transfer function can't show you the response to a charged capacitor with zero input. You need the ODE or state space (which carries <i>x</i>(0) naturally) for that.
- Because the system is linear, the full response = (zero-state response from <i>G</i>) + (zero-input response from the initial conditions). The transfer function only gives the first part.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Take the damper away (c = 0): the poles land on the jω axis and the cart rings forever. Put it back: they slide left and the ringing decays.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **e_ss**: the error r − y once everything has settled
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **A, B, C, D**: the state-space matrices: ẋ = Ax + Bu, y = Cx + Du
- **C(s)**: the controller transfer function (PID: Kp + Ki/s + Kd·s)
- **S, T**: sensitivity S = 1/(1 + CG) and complementary sensitivity T = CG/(1 + CG), with S + T = 1
````
