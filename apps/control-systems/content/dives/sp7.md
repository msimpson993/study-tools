---
id: sp7
order: 22
title: "The final- and initial-value theorems"
category: describe
chain:
  - title: "Can I get the end points without inverting?"
  - title: "What do the final- and initial-value theorems mean?"
  - title: "FVT and IVT on the map"
    detail: "y(∞) = lim s→0 sY(s)   y(0⁺) = lim s→∞ sY(s)"
neighbors:
  - sp6
---
**What do the final- and initial-value theorems mean?**

**Picture it first.** The final value is G(0) and the initial slope is lim s·G(s), but the final-value theorem only applies when the poles are in the left half plane.

```figure:fvt
```

The final value is lim s→0 s·Y(s) (valid only if all other poles of sY are in the left half-plane); the initial value is lim s→∞ s·Y(s). They read the end points without inverting the transform.

### What do the final- and initial-value theorems mean on the map?

<b>FVT: look at s → 0</b> (the origin, i.e. DC): <i>y</i>(∞) = lim<sub><i>s</i>→0</sub> <i>sY</i>(<i>s</i>), valid only if every × of <i>sY</i>(<i>s</i>) is in the open LHP. <b>IVT: look at s → ∞</b> (far away, i.e. infinitely high frequency): <i>y</i>(0⁺) = lim<sub><i>s</i>→∞</sub> <i>sY</i>(<i>s</i>), which is set by the <b>relative degree</b> (#×'s − #○'s).

````callout:recognize Recognize


- FVT is a statement about the <b>neighborhood of the origin</b>: DC gain, integrators (× at 0 → ∞ gain), differentiators (○ at 0 → zero gain).
- The validity check is a statement about the <b>whole plane</b>: any × of <i>sY</i> on the <i>j</i>ω axis or in the RHP ⇒ no final value (Q27 trap).
- IVT: step response of a strictly proper <i>G</i> starts at <i>y</i>(0⁺) = 0. Relative degree 1 ⇒ it starts with a nonzero slope; relative degree 2 ⇒ it starts flat. Far from all the marks, <i>G</i> looks like 1/<i>s</i><sup>(relative degree)</sup>.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Move q to the right of zero: G(0) is still a perfectly good number, but the output runs away, so the theorem does not apply.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
````
