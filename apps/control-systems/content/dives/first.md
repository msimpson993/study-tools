---
id: first
order: 8
title: "The simplest plant: K/(τs + 1)"
category: time
chain:
  - title: "How does the simplest plant respond, as a yardstick?"
  - title: "How does the simplest plant respond?"
  - title: "first-order, K/(τs + 1)"
    detail: "y(t) = K(1 − e^(−t/τ))"
neighbors:
  - tf
  - second
exampleScene: {  overlays: [push, trace], diagram: open, caption: "The −1 pole is the slow one: after the first half second the cart's step response looks first-order with τ ≈ 1 s."  }
---
**How does the simplest plant respond?**

**Picture it first.** One pole, one time constant: it reaches 63 % of the final value at t = τ, and K sets where it ends.

```figure:first
```

A first-order system K/(τs + 1) has a step response K(1 − e^(−t/τ)): 63 % of the way after τ, about 98 % after 4τ, with no overshoot. It is the shape to compare everything else against.

### What does K/(τs + 1) do, and what's worth memorizing?

One real pole at −1/<i>τ</i>. A unit step gives <i>y</i>(<i>t</i>) = <i>K</i>(1 − <i>e</i><sup>−<i>t</i>/<i>τ</i></sup>): it reaches <b>63%</b> of the final value at <i>t</i> = <i>τ</i> and ~<b>98%</b> at 4<i>τ</i>, and it <b>never overshoots</b>. <i>K</i> sets <em>where</em> it ends; <i>τ</i> sets <em>how fast</em> it gets there.

| Quantity | Value | Why you care |
|---|---|---|
| Final value <i>y</i>(∞) | <i>K</i> (= <i>G</i>(0)) | DC gain: read it off with <i>s</i> = 0 |
| <i>y</i>(<i>τ</i>) | 0.632<i>K</i> | Measure <i>τ</i> from a plot: find 63% |
| Initial slope | <i>K</i>/<i>τ</i> | The tangent at <i>t</i> = 0 hits <i>K</i> at <i>t</i> = <i>τ</i> |
| Settling (2%) | ≈ 4<i>τ</i> | 3<i>τ</i> → 95%, 4<i>τ</i> → 98.2%, 5<i>τ</i> → 99.3% |
| Impulse response | (<i>K</i>/<i>τ</i>)<i>e</i><sup>−<i>t</i>/<i>τ</i></sup> | Derivative of the step response |


````callout:trap Trap
<i>G</i> = 4/(<i>s</i>+2) is first order with <b><i>K</i> = 2, <i>τ</i> = 0.5 s</b>, not <i>K</i> = 4. Divide through so the constant in the denominator is 1 before reading <i>K</i> and <i>τ</i>.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Double τ: the pole moves toward the origin, everything takes twice as long, the final value K does not change.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **DC gain**: the steady output for a unit steady input, G(0), if the plant is stable. For the cart, 0.5 m per N
- **τ (time constant)**: time for a first-order response to cover 63 % of the way: τ = 1/|p|
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
