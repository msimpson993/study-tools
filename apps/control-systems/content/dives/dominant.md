---
id: dominant
order: 13
title: "Which poles matter"
category: time
chain:
  - title: "With more poles, which ones matter?"
  - title: "Which poles matter?"
  - title: "dominant poles"
    detail: "keep the slowest poles, match the DC gain"
neighbors:
  - first
  - second
---
**Which poles matter?**

**Picture it first.** Slide the extra pole from far away to close: far away, you can drop it; close, it stretches the response.

```figure:dominant
```

The pole closest to the imaginary axis decays slowest and dominates the response once the faster ones are gone. A pole about five times farther left is usually safe to ignore, provided the DC gain is kept.

### Why do some poles matter more than others?

Each pole contributes a mode <i>e</i><sup><i>pt</i></sup>. Poles far to the left die out fast; the poles <b>closest to the imaginary axis</b> are still alive when everything else is gone, so they <em>dominate</em> what you see. If a pole is roughly 5–10× farther left than the dominant ones, you can usually drop it.

A pole at −30 decays 15× faster than one at −2. By the time the slow mode has done anything visible, the fast one has disappeared. That's why design often uses a first- or second-order approximation and why the specs in Stage 11 are defined for the second-order template.

````callout:recognize Recognize


- Pole ratio ≥ ~5 → the extra pole barely matters. Ratio near 1 → it's no longer negligible (slower, more sluggish response).
- When you drop a pole, <b>keep the DC gain</b>: <i>K</i>/(<i>s</i>(<i>s</i>+2)(<i>s</i>+30)) ≈ (<i>K</i>/30)/(<i>s</i>(<i>s</i>+2)), because (<i>s</i>+30) ≈ 30 at low frequency (Lecture Notes 2).
- A zero near a pole nearly cancels it, which also removes that pole's influence.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Slide p from 20 down to 1: the extra pole stops being negligible and slows the rise. Beyond about 5× the pair, you can drop it.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
````
