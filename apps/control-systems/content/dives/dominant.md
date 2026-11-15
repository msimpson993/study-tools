---
id: dominant
order: 10
title: "Which poles matter"
category: time
chain:
  - title: "Real plants have more than two poles. Which ones decide the response?"
  - title: "Which poles matter?"
  - title: "dominant poles"
    detail: "keep the slowest poles, match the DC gain"
neighbors:
  - second
  - blocks
exampleScene: {  overlays: [push, poles], diagram: poles, caption: "The pole at −1 is only twice as slow as the pole at −2, so neither can be dropped: both show in the step response."  }
---
**Which poles matter?**

**Picture it first.** Slide the extra pole from far away to close: far away, you can drop it; close, it stretches the response.

```figure:dominant
```

The pole closest to the imaginary axis decays slowest and dominates the response once the faster ones are gone. A pole about five times farther left is usually safe to ignore, provided the DC gain is kept.

### Why do some poles matter more than others?

Each pole contributes a mode <i>e</i><sup><i>pt</i></sup>. Poles far to the left die out fast; the poles <b>closest to the imaginary axis</b> are still alive when everything else is gone, so they <em>dominate</em> what you see. If a pole is roughly 5–10× farther left than the dominant ones, you can usually drop it.

A pole at −30 decays 15× faster than one at −2. By the time the slow mode has done anything visible, the fast one has disappeared. That's why design often uses a first- or second-order approximation and why the second-order specs (ζ, ωₙ, %OS) are defined for the second-order template.

````callout:recognize Recognize


- Pole ratio ≥ ~5 → the extra pole barely matters. Ratio near 1 → it's no longer negligible (slower, more sluggish response).
- When you drop a pole, <b>keep the DC gain</b>: <i>K</i>/(<i>s</i>(<i>s</i>+2)(<i>s</i>+30)) ≈ (<i>K</i>/30)/(<i>s</i>(<i>s</i>+2)), because (<i>s</i>+30) ≈ 30 at low frequency (Lecture Notes 2).
- A zero near a pole nearly cancels it, which also removes that pole's influence.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Slide p from 20 down to 1: the extra pole stops being negligible and slows the rise. Beyond about 5× the pair, you can drop it.
````



### Second reduction method: match the frequency response

Dropping a far-left pole while keeping G(0) is the first method, and the one this dive's figure is built around. There is a second, which the professor says you must know even though he will not use it in class: pick a lower-order model whose **frequency response** (the first few moments, i.e. the derivatives of G at s = 0) matches the original near s = 0.

The worked numbers live in the [feedback dive](#/dive/fb), under "Simplification of linear systems": G_H = 6/((s+1)(s+2)(s+3)) is matched by G_L = 1.60/(s² + 2.590s + 1.60). Both have DC gain 1, and the reduced poles (−1.024, −1.565) give a slightly overdamped response with T_s ≈ 3 s, almost indistinguishable from the original on a step.

````callout:trap Trap
A reduced model with more zeros than poles is not causal and cannot be built. Match moments to a proper (or strictly proper) G_L; do not "fit" your way into a numerator of higher degree than the denominator.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **DC gain**: the steady output for a unit steady input, G(0), if the plant is stable. For the cart, 0.5 m per N
````
