---
id: splane
order: 3
title: "Poles and zeros: the plant's own motions"
category: describe
neighbors: [tf, first, plane, inverse]
level: Conceptual
check: [q-poles, ck-poles-1, ck-poles-2]
addsToExample: "Stage H2: the two poles, −0.2 and −2.2 per hour, are the house's two natural motions (rooms cooling together, rooms evening out)."
---

**The question:** what do the roots of G(s)'s denominator tell us about how the house moves? This is the box *Poles and zeros*, after *Transfer function G(s)*.

### The big idea

- **Each root is a motion:** factor the denominator, and each root is one of the plant's natural motions.
- **Real part:** how fast the motion dies (or grows). **Imaginary part:** how fast it swings.
- **The house:** both poles are real and negative, two smooth decays, so on its own the house can never overshoot.
- **What they mean physically:** −0.2 /h is both rooms cooling together through the outer walls (τ = 5 h); −2.2 /h is the two rooms evening out through the inner wall (27 min).

### See it

Drag a pole; with "modes" on, the right panel splits the bedroom's warm-up into each pole's own term.

```figure:splane
```

Drag a pole off the real axis: the house would oscillate, which no arrangement of walls and rooms can do.

### The math

- Poles: the roots of s² + 2.4s + 0.44 = (s + 0.2)(s + 2.2).
- Eigenvectors of A: [1, 1] (average mode, −0.2) and [1, −1] (difference mode, −2.2).
- Time constant of a real pole: τ = 1/|p|.
- Zero: a root of the numerator; G₁ has z = −1.2.

**What each symbol means.** p = σ + jω: a pole, the motion e^(pt); σ < 0 decays at rate |σ|, ω ≠ 0 oscillates at ω rad/h.

### Worked example: on the house

The pole ratio is 2.2/0.2 = 11, so after about 2 h the difference has evened out (e^(−4.4) ≈ 1 %) and only the slow average mode remains.

### What it can't do

Poles say what motions exist, not how much of each appears. That takes the zeros and the input (see *Back to time: partial fractions*).

<p class="src">Sources: LN1 s.61 (pole location).</p>
