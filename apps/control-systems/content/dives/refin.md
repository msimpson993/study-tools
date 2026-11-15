---
id: refin
order: 19
title: "Reference inputs"
category: state
chain:
  - title: "How do we plug the estimate into the control law, and why can we design the two separately?"
  - title: "How do we make it follow a command instead of just returning to zero?"
  - title: "reference input"
    detail: "u = −Kx + N̄ r"
neighbors:
  - sep
exampleScene: { overlays: [forces, sensor], diagram: refin, caption: "A command r enters through the gain N̄; with N̄ = 25 the cart steps to 1 m instead of returning to 0." }
addsToExample: "Plain u = −Kx drives the cart back to 0. With u = −Kx + N̄ r and K = [23, 5], DC gain from r to x is N̄/25, so N̄ = 25 makes it track a 1 m step."
accountsFor: "The difference between a regulator and a tracker, and the notes' M and N reference-gain structure (or feeding y − r to the observer)."
---
**How do we make it follow a command instead of just returning to zero?**

**Picture it first.** The same K as before, but now there is a 1 m command. With N̄ = 0 the cart is a regulator: it ignores r and stays at 0. Slide N̄ to 25 and the cart steps to 1 m.

```figure:refin
```

Full-state feedback u = −Kx is a **regulator**: every state is driven to zero. A **tracker** has to follow a command r. The simplest addition is a scalar gain on the reference,

u = −Kx + N̄ r.

The closed-loop plant is then ẋ = (A − BK)x + B N̄ r, y = Cx. At rest, x = −(A − BK)<sup>−1</sup> B N̄ r, so the DC gain from r to y is

N̄ · (−C (A − BK)<sup>−1</sup> B).

Choose N̄ so that this gain is 1, and a step command of size r settles at y = r (for a plant with no integrator, and with the poles already stable).

### The cart

With K = [23, 5], A − BK has characteristic polynomial s² + 8s + 25, and the DC gain from the force to x is 1/25. Therefore the DC gain from r to x is N̄/25, and **N̄ = 25** makes the cart track a 1 m step. That is the figure's design preset. Any other N̄ simply scales the final position (N̄ = 12.5 settles at 0.5 m).

### The notes' M and N structure, and an alternative

The general state-variable compensator in the notes lets the reference enter both the control law and the observer,

u = −K x̂ + N r,     x̂' = A x̂ + Bu + L(y − C x̂) + M r.

Two convenient special cases:

1. **M = BN** (equivalently M = B N̄ and N = N̄). The estimation error is then independent of r, and the design of N̄ is exactly the DC-gain calculation above. The running cart uses this case.
2. **N = 0 and M = −L**, which is the same as feeding the observer the tracking error y − r instead of y. The estimate is driven by the tracking error; a constant N is no longer needed, but the observer now sees a different input and the transient changes.

Both are ways of turning the regulator into a tracker. The cart figure uses the first, because N̄ = 25 has a direct reading: it is the reciprocal of the closed-loop DC gain.

````callout:recognize Recognize
- Regulator: u = −Kx, states → 0, the command is ignored.
- Tracker (this dive): u = −Kx + N̄ r, with N̄ chosen so the DC gain from r to y is 1.
- The notes' alternative, M = −L and N = 0, feeds y − r to the observer instead of introducing N̄.
````
