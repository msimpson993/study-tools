---
id: inverse
order: 8
title: "Back to time: partial fractions"
category: describe
neighbors: [splane, first]
level: Worked calculation
check: [q-inv, ck-inv-1]
---

**The question:** given X(s), how do we get x(t) back? This is the side box *Back to time*, under *Poles and zeros*.

### The big idea

Split X(s) into one simple fraction per pole. Each fraction is a known motion (a step, a decaying exponential, a decaying sine), and the response is their sum. The poles fix the motions; the residues fix how much of each.

### See it

The solid curve is the bedroom; the dashed curves are its three terms.

```figure:partial
```

### The math

```eq
X₂(s) = 9/(s(s + 0.2)(s + 2.2)) = r₀/s + r₁/(s + 0.2) + r₂/(s + 2.2)
```

Each residue is the rest of the fraction evaluated at that pole: r = (s − p)X(s) at s = p. Complex poles: complete the square (LN1 slides 51–53; the corner's step in *Two poles: ζ and ωₙ*).

### Worked example: on the house

r₀ = 9/(0.2·2.2) = 20.45, r₁ = 9/(−0.2·2.0) = −22.5, r₂ = 9/(−2.2·−2.0) = 2.045. So x₂(t) = 20.45 − 22.5e^(−0.2t) + 2.05e^(−2.2t). The telescope's y(t) (LN2 slide 27) is done the same way.

### What it can't do

Repeated and complex poles need extra terms (t·e^(pt), sines); for anything bigger than third order, software is faster than hand residues.
