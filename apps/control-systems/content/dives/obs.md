---
id: obs
order: 17
title: "The Luenberger observer"
category: state
chain:
  - title: "If we can measure every state, how do we put the poles exactly where we want?"
  - title: "How do we estimate the states we can't measure?"
  - title: "Luenberger observer"
    detail: "x̂' = A x̂ + Bu + L(y − C x̂)"
neighbors:
  - sf
  - sep
exampleScene: { overlays: [forces, sensor], diagram: observer, caption: "The sensor reads y = x only. The observer is a copy of the cart, corrected by the position error through L." }
addsToExample: "The cart's sensor reads position only; the observer runs a copy of the cart and corrects it with the position error. Example: observer poles −20 ± 15j (5× the controller's) give L = [37, 512]."
accountsFor: "Using full-state feedback when only some states are measured, and the speed vs. noise tradeoff in choosing observer poles (2–10× faster than the controller)."
---
**How do we estimate the states we can't measure?**

**Picture it first.** The cart's sensor reads position only. Start the observer with a wrong position estimate and watch the estimated velocity catch the true ẋ. Then turn the observer faster and add noise: the estimate gets jumpy.

```figure:obs
```

Full-state feedback needs every state. In practice only some states are measured. A **Luenberger observer** runs a copy of the plant and corrects it with whatever output error is available:

x̂' = A x̂ + Bu + L(y − C x̂).

The **estimation error** e = x − x̂ then obeys

e' = (A − LC)e.

If the eigenvalues of A − LC lie in the left half-plane, e(t) → 0 from any initial error, and the estimate catches the true state. Those eigenvalues can be placed anywhere if and only if (A, C) is completely observable (det Po ≠ 0) — the dual of the controllability test.

### Designing L on the cart

The cart's C = (1, 0) already passed that test. Duality gives a shortcut: place the poles of A<sup>T</sup> − C<sup>T</sup> L<sup>T</sup> with Ackermann, then transpose, or match coefficients directly.

A − LC = [[−ℓ₁, 1], [−2 − ℓ₂, −3]] has characteristic polynomial s² + (3 + ℓ₁)s + (3ℓ₁ + 2 + ℓ₂).

A common rule is to put the observer poles **2–10× faster** than the controller's, so the estimate is trustworthy on the time scale of the closed loop, without over-amplifying sensor noise. The controller poles were −4 ± 3j. Five times faster is −20 ± 15j, i.e. s² + 40s + 625, and matching coefficients gives

3 + ℓ₁ = 40  ⇒  ℓ₁ = 37,     3·37 + 2 + ℓ₂ = 625  ⇒  ℓ₂ = 512.

So **L = [37, 512]**. That is the figure's design preset. Ackermann on the dual plant returns the same gain.

### Speed versus noise

Faster observer poles mean a larger L, so the correction L(y − C x̂) reacts harder to whatever is in y — including measurement noise. The notes treat this as a design knob, not a single right answer: start around 2–10×, and look at the estimate with realistic noise (the figure's noise slider) before going further. Reduced-order observers exist when some states are already measured cleanly; the Kalman filter is the optimal observer in the presence of process and measurement noise. This course uses the full-order Luenberger observer.

````callout:recognize Recognize
- The observer is a copy of the plant plus a correction L(y − C x̂).
- e' = (A − LC)e: place those poles in the left half-plane, faster than the controller, but not so fast that noise takes over.
- det Po ≠ 0 is the condition that L can place every observer pole.
````
