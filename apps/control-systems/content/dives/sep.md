---
id: sep
order: 31
title: "Use the estimate: the separation principle"
category: state
neighbors: [obs, sf, refin]
level: Worked calculation
check: [q-sep, ck-sep-1]
---

**The question:** if we feed back the estimate instead of the true state, do the controller and observer designs interfere? This is the box *Use the estimate*, after *Estimate what we can't measure*.

### The big idea

Feeding back the estimate seems to couple the designs. It doesn't: the estimation error evolves on its own, so the closed loop's poles are simply the controller's and the observer's together. Design K and L_o separately.

### See it

True-state feedback against estimate feedback on a ride-height step, with the difference shaded. The difference is a short blip that shrinks as the observer gets faster.

```figure:sep
```

### The math

```eq
u = −Kx̂:   poles = eig(A − BK) ∪ eig(A − L_oC)
```

**What each symbol means.** x̂ = x − e: the estimate; K: the controller gains; L_o: the observer gains.

````callout:derivation Full derivation
u = −K(x − e), so ẋ = (A − BK)x + BKe, and ė = (A − L_oC)e. Stacked: [[A − BK, BK], [0, A − L_oC]]. The determinant of a block-triangular matrix is the product of the diagonal blocks' determinants.
````

### Worked example: on the corner

Poles −8 ± 6j and −40 ± 30j. Raise the ride height 2 cm with the estimate 1 cm off: the largest difference is 0.441 cm at 0.144 s, down to 0.014 cm at 0.5 s.

### What it can't do

Separation holds for the nominal model; with model error the halves interact and robustness isn't guaranteed.

<p class="src">Sources: LN4 s.30–40. Not in lecture notes: robustness under model error. Exam practice: Review › Mini exam 2, LN4 worked examples (inverted pendulum).</p>
