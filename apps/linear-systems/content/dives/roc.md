---
id: roc
order: 5
title: Region of convergence
addsToExample: "Puts the speaker's ROC to the right of both poles, Re s > −1,267 rad/s: the click response is causal, and the ROC contains the jω axis, so the speaker is stable and has a frequency response."
accountsFor: "Why the speaker's frequency response exists at all, and why its ring dies away instead of growing."
category: signals
chain:
  - title: Where does the Laplace integral (or Z sum) converge?
  - title: In a region bounded by poles
    detail: Half-plane or strip in s; disc, ring or exterior in z.
  - title: The region encodes sidedness and stability
    detail: Right-sided ⇒ right of all poles; stable ⇔ contains the jω axis or |z| = 1.
neighbors:
  - laplace
  - inverse
  - stab
  - dtft
matlab: "% no single command: list the pole radii with abs(roots(a)) and pick the ring"
exampleScene: { overlays: [click, poles], caption: "The click response starts at t = 0, so its ROC is everything right of the two poles." }
---

The Laplace integral ∫x(t)e^(−st)dt converges only for some s, because e^(−σt) has to tame x(t) at both ends. The Z sum Σx[n]z⁻ⁿ is the same story with |z| playing the role of e^(σ). That region of convergence (ROC) is part of the transform.

**Picture it first.** Draw the poles. The ROC is a region with no poles in it, so its edges run through poles: a vertical strip or half-plane in s, a ring, disc or exterior in z. Each choice of region between the poles is a *different signal* with the same formula.

```figure:laplace
```

| Signal | ROC in s | ROC in z |
|---|---|---|
| right-sided (zero before some time) | right of the rightmost pole | outside the outermost pole |
| left-sided | left of the leftmost pole | inside the innermost pole |
| two-sided | a strip between two poles | a ring between two poles |
| finite length | the whole plane (maybe not 0 or ∞) | the whole plane (maybe not 0 or ∞) |

$$\text{stable (BIBO)}\iff j\omega\text{ axis}\subset\text{ROC}\qquad\iff\qquad |z|=1\subset\text{ROC}$$

````callout:note What this answers
Which of several signals a formula like 1/((z − ½)(z + 2)(z + 3)) means: with four possible regions (|z| < ½, ½ < |z| < 2, 2 < |z| < 3, |z| > 3) there are four different sequences. Only |z| > 3 is right-sided, and it is not stable, because the unit circle |z| = 1 is not in it.
````

````callout:note What it raises
How do you invert term by term once the ROC is fixed? Each pole inside the inner edge contributes a right-sided term, each pole outside the outer edge a left-sided one. See *Going back*.
````

````callout:note Mini example
Convolution multiplies transforms, and the ROC of the product contains the overlap of the two ROCs. h = e^(−t)u(t) has Re s > −1 and x = e^(2t)u(−t) has Re s < 2, so Y = −1/((s + 1)(s − 2)) has ROC −1 < Re s < 2: a strip, so y is two-sided, y = ⅓e^(−t)u(t) + ⅓e^(2t)u(−t).
````

### Common pitfalls

- Right-sided and stable are different questions. A right-sided signal with a pole at |z| = 3 is not stable; a stable signal can be two-sided.
- The ROC of a sum or product is at least the intersection of the ROCs, never the union.
- The ROC never contains a pole, so "the ROC is |z| > ½" is impossible if there is also a pole at 2.
