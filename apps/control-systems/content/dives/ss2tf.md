---
id: ss2tf
order: 27
title: "From A, B, C back to G(s)"
category: state
neighbors: [ss, tf, cc]
level: Worked calculation
check: [q-ss2tf, ck-ss2tf-1]
---

**The question:** given a state-space model, how do we get its transfer function back? This is the side box *From A, B, C back to G(s)*, under *Look inside: state space*.

### The big idea

Transform, eliminate x, and the transfer function falls out; its denominator is det(sI − A), so its poles are A's eigenvalues, unless a mode cancels (*Can we reach and see every state?*).

### See it

The corner's eigenvalues in the phase portrait are the poles of the G(s) worked out below; the board's s7 pair does the same inversion step by step.

```figure:states
```

### The math

```eq
G(s) = C(sI − A)⁻¹B + D,   det(sI − A) = the characteristic polynomial
```

Realizations aren't unique: different A, B, C can give the same G.

````callout:derivation Full derivation
sX = AX + BU, so X = (sI − A)⁻¹BU and Y = [C(sI − A)⁻¹B + D]U.

Corner: (sI − A)⁻¹ = [[s + 4, 1], [−64, s]]/(s² + 4s + 64), so G = 0.0025/(s² + 4s + 64).

House (B = [b, 0]ᵀ, C = [0, 1]): G₂ = b/(s² + 2.4s + 0.44).
````

### Worked example: on the corner and the house

Corner: G = 0.0025/(s² + 4s + 64), poles −2 ± 7.75j, the same as eig(A). House: G₂ = 0.0036/(s² + 2.4s + 0.44), poles −0.2 and −2.2.

### Exam examples

LN1 slides 28–32 (SS → TF) and 33–38 (TF → phase variable).

### What it can't do

G(s) loses any mode that cancels: a state that can't be reached or seen disappears from the fraction.
