---
id: sf
order: 16
title: "Full-state feedback and Ackermann's formula"
category: state
chain:
  - title: "When can we place every pole, and when can we work out states we don't measure?"
  - title: "Output feedback can only slide the poles along a fixed path. If we can measure every state, how do we put the poles exactly where we want?"
  - title: "full-state feedback, Ackermann"
    detail: "u = −Kx,  ẋ = (A − BK)x"
neighbors:
  - cc
  - obs
  - sp8
exampleScene: { overlays: [forces, sensor], diagram: sfb, caption: "State feedback acts on the whole state (x, ẋ), not just the output error: u = −Kx places both poles." }
addsToExample: "Pick ζ = 0.8 and 1 s settling: poles −4 ± 3j, desired s² + 8s + 25. A − BK gives s² + (3+k₂)s + (2+k₁), so K = [23, 5]: a spring-like gain on position and a damper-like gain on velocity."
accountsFor: "Placing both poles independently, which P control (stuck on the root locus) cannot do."
---
**If we can measure every state, how do we put the poles exactly where we want?**

**Picture it first.** The grey curves are the cart's P-control root locus: output feedback can only slide the poles along that path. The green × are where state feedback puts them — anywhere you choose, if the plant is controllable.

```figure:sf
```

When every state is measured, the control law is **u = −Kx**. Substituting into the plant ẋ = Ax + Bu gives the closed loop

ẋ = (A − BK)x.

The closed-loop poles are the eigenvalues of A − BK, i.e. the roots of det(sI − (A − BK)) = 0. If (A, B) is completely controllable, those poles can be placed at any desired locations in the complex plane (a single-input, single-output plant: full rank of Pc is enough).

This is a **regulator** problem until a reference is added: with r = 0 the states are driven to zero. The next dives add an observer (when x is not fully measured) and a reference gain (when we want to track a command).

### Coefficient matching on the cart

The cart is already in a convenient basis: A = [[0, 1], [−2, −3]], B = (0, 1)<sup>T</sup>, so

A − BK = [[0, 1], [−2 − k₁, −3 − k₂]],

and the characteristic polynomial is s² + (3 + k₂)s + (2 + k₁).

Pick ζ = 0.8 and a 1 s settling time: Ts ≈ 4/(ζωn) = 1 ⇒ ζωn = 4, ωn = 5, so the desired poles are −4 ± 3j and the desired polynomial is s² + 8s + 25. Matching coefficients,

3 + k₂ = 8  ⇒  k₂ = 5,     2 + k₁ = 25  ⇒  k₁ = 23.

So **K = [23, 5]**: a spring-like gain on position and a damper-like gain on velocity. The figure's design preset is this gain. P control at K = 7, by contrast, is stuck at −1.5 ± j2.6 on the locus and still has a 22 % steady-state error.

### Ackermann's formula

For a SISO plant there is a direct formula that produces K from the desired characteristic polynomial q(s) = s<sup>n</sup> + α<sub>n−1</sub>s<sup>n−1</sup> + ⋯ + α₀ and the controllability matrix:

K = [0  …  0  1] Pc<sup>−1</sup> q(A),

where q(A) = A<sup>n</sup> + α<sub>n−1</sub>A<sup>n−1</sup> + ⋯ + α₀ I. Pc must be invertible — that is why the last dive came first. On the cart, q(s) = s² + 8s + 25 and Ackermann returns the same K = [23, 5].

#### The notes' 1/s² example (poles −1 ± j)

For Y/U = 1/s² the matrices are A = [[0, 1], [0, 0]], B = (0, 1)<sup>T</sup>, Pc = [[0, 1], [1, 0]]. Desired poles −1 ± j give q(s) = s² + 2s + 2, and Ackermann produces **K = [2, 2]**.

#### A third-order worked example (ζ = 0.8, Ts = 1 s)

The notes take ÿẏ + 5 ÿ + 3 ẏ + 2y = u, or the companion form

A = [[0, 1, 0], [0, 0, 1], [−2, −3, −5]],  B = (0, 0, 1)<sup>T</sup>.

Then A − BK has characteristic polynomial s³ + (5 + k₂)s² + (3 + k₁)s + (2 + k₀). Choosing a dominant pair with ζωn = 4.8 and ωn = 6 (ζ = 0.8) and a third pole at −4.8 gives

(s² + 9.6s + 36)(s + 4.8) = s³ + 14.4s² + 82.08s + 172.8,

so K = [170.8, 79.08, 9.4] (the notes quote 170.8, 79.4, 9.4 from a slightly rounded 82.4). The step has no overshoot and settles in about 1 s, as designed.

````callout:recognize Recognize
- Output feedback (a single gain K on e = r − y) can only move poles along the root locus.
- State feedback u = −Kx can place every pole, if and only if det Pc ≠ 0.
- k₁ acts like an extra spring, k₂ like an extra damper — that is why both coefficients of s² + (3+k₂)s + (2+k₁) are yours to choose.
````
