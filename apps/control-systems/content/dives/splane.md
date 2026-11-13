---
id: splane
order: 2
title: "Poles and zeros: what are they telling me?"
category: describe
chain:
  - title: "What do the roots of G(s) mean?"
  - title: "What is a pole or a zero, physically?"
  - title: "the s-plane as a map"
    detail: "pole p = σ + jω  →  mode e^(σt)·cos(ωt)"
neighbors:
  - model
---
**What is a pole or a zero, physically?**

**Picture it first.** The surface is |G(s)| over the whole plane: tall ridges at the poles, pits at the zeros. The cut along the jω axis is what a sine input sees.

```figure:height
```

Every complex number s = σ + jω is a point on the s-plane. Poles (×) are where |G(s)| blows up and mark the natural modes e^(pt); zeros (○) are where G = 0 and decide how strongly each mode is excited. σ is decay rate, ω is ringing frequency.

### Poles and zeros: what are they telling me?

<b>Poles</b> (roots of the denominator) are the system's <em>natural modes</em>: each pole <i>p</i> puts a term <i>e</i><sup><i>pt</i></sup> in the response. <b>Zeros</b> (roots of the numerator) are input shapes the system blocks, like transmission notches. Poles decide stability and speed; zeros change how the modes are weighted.

Where a pole sits in the <i>s</i>-plane tells you the shape of its mode at a glance. Each mini-plot below is the mode <i>e</i><sup><i>pt</i></sup> for a pole at that location:

*From the guide's static figure: <b>The s-plane as a picture dictionary.</b> Left half-plane: decays (stable). Farther left: decays faster. Farther from the real axis: oscillates faster. On the <i>j</i>ω axis: never dies. Right half-plane: grows (unstable). Only the upper half is drawn, since complex poles come with a mirror-image conjugate below the axis. All marks here are <b>poles (×)</b>; zeros are drawn as ○ and get their own story in the s-plane map.*

````callout:recognize Recognize


- Real part of the pole → decay rate (envelope <i>e</i><sup>σ<i>t</i></sup>). Imaginary part → oscillation frequency.
- Any pole with Re &gt; 0 means the system is unstable, no matter what the others do.
- Complex poles always come in conjugate pairs for physical (real-coefficient) systems.
- A zero right on top of a pole cancels it in <i>G</i>(<i>s</i>), but the mode can still exist internally (see Q20).
````

#### This section in six stops

````callout:note The one-sentence version
A transfer function is a pattern of × and ○ marks plus a gain. <b>Poles say what motions the system can make; zeros say how much of each motion a given input and output actually see.</b> Every Laplace operation is a simple move of that pattern: add a mark, slide it, stretch it, or merge two patterns.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Lower the damper c: the poles slide toward the jω axis, the peak rises, and the cut gets a resonance bump. Add a zero: a pit appears and the cut dips.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
````
