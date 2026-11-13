---
id: sp6
order: 21
title: "The inverse Laplace transform on the map"
category: describe
chain:
  - title: "How do I get the time response back from the plane?"
  - title: "How does the inverse Laplace transform look here?"
  - title: "partial fractions and residues"
    detail: "y(t) = Σ A_k e^(p_k t)"
neighbors:
  - sp4
  - sp7
  - sp8
exampleScene: { overlays: [hammer, modes, trace], caption: "The response is a sum of one exponential per pole: e^{−t} − e^{−2t}, each mode fading on its own." }
---
**How does the inverse Laplace transform look here?**

**Picture it first.** Each pole is one exponential, each residue its weight: pull the poles apart and one mode dies quickly while the other is the tail.

```figure:partial
```

Partial fractions write G(s) as a sum of terms A_k/(s − p_k); each pole contributes A_k e^(p_k t), with the residue A_k set by the zeros. The step response adds the input's own pole at 0.

### How does the inverse Laplace transform look on the map (partial fractions)?

Every × of <i>Y</i>(<i>s</i>) contributes one term to <i>y</i>(<i>t</i>): its <b>mode</b> (decided by where the × is) times its <b>residue</b> (how big it is). Zeros don't create terms; they change the residues. So inverse-transforming is “list the ×'s, then weigh each one.”

<div class="eqbox"><i>Y</i>(<i>s</i>) = <span class="frac"><span><i>N</i>(<i>s</i>)</span><span>(<i>s</i>−<i>p</i>₁)(<i>s</i>−<i>p</i>₂)…</span></span> = <span class="frac"><span><i>r</i>₁</span><span><i>s</i>−<i>p</i>₁</span></span> + <span class="frac"><span><i>r</i>₂</span><span><i>s</i>−<i>p</i>₂</span></span> + … ⇒ <i>y</i>(<i>t</i>) = <i>r</i>₁<i>e</i><sup><i>p</i>₁<i>t</i></sup> + <i>r</i>₂<i>e</i><sup><i>p</i>₂<i>t</i></sup> + … , <i>r</i><sub><i>i</i></sub> = (<i>s</i> − <i>p</i><sub><i>i</i></sub>)<i>Y</i>(<i>s</i>)|<sub><i>s</i>=<i>p</i><sub><i>i</i></sub></sub></div>

| Example | ×'s (and ○'s) | Residues | y(t) |
|---|---|---|---|
| Step into 2/((<i>s</i>+1)(<i>s</i>+2)): <i>Y</i> = 2/(<i>s</i>(<i>s</i>+1)(<i>s</i>+2)) | × at 0, −1, −2 | 1, −2, 1 | 1 − 2<i>e</i><sup>−<i>t</i></sup> + <i>e</i><sup>−2<i>t</i></sup> |
| (<i>s</i>+1.1)/((<i>s</i>+1)(<i>s</i>+2)) impulse | × at −1, −2; ○ at −1.1 | <b>0.1</b>, 0.9 | 0.1<i>e</i><sup>−<i>t</i></sup> + 0.9<i>e</i><sup>−2<i>t</i></sup> |


The second row is the key intuition: the ○ sitting next to the × at −1 shrinks that mode's residue to 0.1. A near-cancellation leaves a small, slow tail. Move the ○ exactly onto the × and the residue is 0, so the mode vanishes from this output (but not from the system; see S2).

````callout:recognize Recognize


- The × at the origin that a step input adds has residue = final value = <i>G</i>(0). That <em>is</em> the final-value theorem in disguise.
- Complex pairs give conjugate residues, which combine into one damped sinusoid.
- A residue's size measures how much a mode matters. A dominant pole with a tiny residue isn't really dominant.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Pull the two poles apart: one mode dies quickly, the other sets the tail. Push them together: the residues grow and cancel.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
````
