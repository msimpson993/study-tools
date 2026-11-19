---
id: roc
order: 5
title: Region of convergence
addsToExample: "Puts the speaker's ROC to the right of both poles, σ > −1.27 /ms (−1,266 /s): the click response is causal, and the ROC contains the jω axis, so the speaker is stable and has a frequency response."
accountsFor: "Why the speaker's frequency response exists at all, and why its ring dies away instead of growing."
category: signals
neighbors:
  - laplace
  - inverse
  - stab
  - dtft
matlab: "% no single command: list the pole radii with abs(roots(a)) and pick the ring"
exampleScene: { overlays: [click, poles], caption: "The click response starts at t = 0, so its ROC is everything right of the two poles." }
level: Some algebra
check: [c-roc-1, c-roc-2, c-roc-3]
---

**The question:** where does the transform actually exist? It comes from *Laplace and Z*: the integral or sum only converges for some s or z, and that region, bounded by the poles, is part of the answer. The same formula with a different region is a different signal.

### The big idea

The same transform formula can belong to several different signals. What tells them apart is the region of convergence: the set of s (or z) where the transform's sum or integral stays finite. Its shape says whether the signal runs forward, backward or both ways in time, and whether it is stable.

### See it

**Picture it first.** Draw the poles. The ROC is a region with no poles in it, so its edges run through poles: a vertical strip or half-plane in s, a ring, disc or exterior in z. Each choice of region between the poles is a *different signal* with the same formula.

```figure:laplace
```

**Second figure: one signal, from one choice of ROC.** The figure inverts the speaker's H(s) with the right-sided ROC σ > −1.27 /ms (−1,266 /s), the only one that gives a causal ring.

```figure:inverse
```

*Look for here:* each pole gives one term; with the right-sided ROC both run forward in time and fade.

| Signal | ROC in s | ROC in z |
|---|---|---|
| right-sided (zero before some time) | right of the rightmost pole | outside the outermost pole |
| left-sided | left of the leftmost pole | inside the innermost pole |
| two-sided | a strip between two poles | a ring between two poles |
| finite length | the whole plane (maybe not 0 or ∞) | the whole plane (maybe not 0 or ∞) |

$$\text{stable (BIBO)}\iff j\omega\text{ axis}\subset\text{ROC}\qquad\iff\qquad |z|=1\subset\text{ROC}$$

### The math

The Laplace integral ∫x(t)e^(−st)dt converges only for some s, because e^(−σt) has to tame x(t) at both ends. The Z sum Σx[n]z⁻ⁿ is the same story with |z| playing the role of e^(σ). That region of convergence (ROC) is part of the transform.

**What each symbol means.**

- ROC: the region of convergence, the set of $s$ (or $z$) where the transform integral (or sum) converges.
- $j\omega$ axis / unit circle $|z| = 1$: where steady tones live; if it is inside the ROC the system is stable and has a frequency response.
- Right-sided: zero before some time, ROC to the right of the poles.

### Worked example: on the earbud

1. The earbud's click response starts at t = 0 (causal), so its ROC lies to the right of both poles: σ > −1.27 /ms (−1,266 /s).
2. That region contains the jω axis, so the earbud is BIBO stable and $H(j\omega)$ exists.
3. The same formula with a left-sided ROC would describe a ring running backwards in time, which no speaker does.

**Exam-style example.** Convolution multiplies transforms, and the ROC of the product contains the overlap of the two ROCs. h = e^(−t)u(t) has Re s > −1 and x = e^(2t)u(−t) has Re s < 2, so Y = −1/((s + 1)(s − 2)) has ROC −1 < Re s < 2: a strip, so y is two-sided, y = ⅓e^(−t)u(t) + ⅓e^(2t)u(−t).

```picture:pic-ex-roc-strip Left: h's ROC Re s > −1 (blue) and x's Re s < 2 (orange) overlap in the strip −1 < Re s < 2. Right: the two-sided y(t).
The s-plane with two half-planes overlapping in a vertical strip, and y(t) rising as e^(2t)/3 before 0 and decaying as e^(−t)/3 after.
```

### What it can't do

The ROC tells you which signal a formula means; it doesn't give the signal back. For that you invert, pole by pole.

**Next question.** How do you invert term by term once the ROC is fixed? In s, each pole to the left of the ROC contributes a right-sided term and each pole to its right a left-sided one (in z: poles inside the ring, outside the ring). See *Going back*.

### Common pitfalls

- Right-sided and stable are different questions. A right-sided signal with a pole at |z| = 3 is not stable; a stable signal can be two-sided.
- The ROC of a sum or product is at least the intersection of the ROCs, never the union.
- The ROC never contains a pole, so "the ROC is |z| > ½" is impossible if there is also a pole at 2.
