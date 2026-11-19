---
id: inverse
order: 8
title: "Back to time: partial fractions"
category: describe
neighbors: [splane, first, tf]
level: Worked calculation
check: [q-inv, ck-inv-1]
---

**The question:** how do we get y(t) back from Y(s)? This is the side box *Back to time*, under *Poles and zeros*.

### The big idea

A Laplace-domain response is a fraction we can't read directly. Split it into one simple fraction per pole, *partial fractions*, and each piece is a motion we already know: a step, a decaying exponential, or a decaying sine. The weight of each piece, its *residue*, is set by the zeros and by the input. So the poles say which motions appear, and the residues say how much of each.

### See it

Move the poles and watch each term change. The solid curve is always their sum. With the house's poles the fast term starts at only about a tenth of the final rise, and 0.23 K of it is left after 1 h.

```figure:partial
```

### The math

- Distinct real poles: Y(s) = Σ A_k/(s − p_k), so y(t) = Σ A_k e^(p_k t).
- Residue (cover-up rule): A_k = [(s − p_k)·Y(s)] evaluated at s = p_k.
- Complex pair: complete the square, (s + σ)² + ω_d², to get e^(−σt)(cos ω_d t, sin ω_d t) terms (LN1 slides 51–53).
- For a step from rest, y(0) = 0, so the residues sum to zero.

### Worked example: on the house

The heater steps to 2.5 kW, so U = 2500/s and X₂ = 9/(s(s + 0.2)(s + 2.2)).
- At s = 0: 9/(0.2 · 2.2) = 20.45.
- At s = −0.2: 9/((−0.2)(2.0)) = −22.5.
- At s = −2.2: 9/((−2.2)(−2.0)) = 2.045.

So x₂(t) = 20.45 − 22.5e^(−0.2t) + 2.05e^(−2.2t) K. At 1 h: 20.45 − 18.42 + 0.23 = 2.26 K. The residues sum to 0, as they must.

### Exam examples

LN1 slides 51–53 (second-order step by inverse Laplace; the corner's step in *Two poles* uses the same completed square). LN2 slide 27 (the telescope's y(t)).

### What it can't do

Repeated poles need extra terms (t·e^(pt)), and the algebra grows quickly with order. For design you rarely need the full y(t): the poles and the spec formulas say most of it.


### Slides

LN1 slides 51–53; LN2 slide 27.
