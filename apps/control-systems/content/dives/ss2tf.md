---
id: ss2tf
order: 27
title: "From A, B, C back to G(s)"
category: state
neighbors: [ss, tf, cc]
level: Worked calculation
check: [q-ss2tf, ck-ss2tf-1]
---

**The question:** how do state space and the transfer function connect? This is the side box *From A, B, C back to G(s)*, under *Look inside: state space*.

### The big idea

The two descriptions are the same plant seen two ways. Laplace-transform the state equations, eliminate the states, and the transfer function falls out. Its denominator is det(sI − A), so G's poles are A's eigenvalues, unless a mode can't be reached or seen, in which case it cancels and vanishes from G. Going the other way, any G(s) can be written in *phase-variable (companion) form*, though that is only one of many valid A, B, C.

### See it

The corner's phase portrait: the spiral's decay and turning rate are the eigenvalues −2 ± 7.75j, the same numbers as G's poles.

```figure:states
```

### The math

```eq
G(s) = C(sI − A)⁻¹B + D,   det(sI − A) = the characteristic polynomial
```

- (sI − A)⁻¹ is how the states respond, per unit of input, in s.
- Phase-variable form for G = b₀/(sⁿ + aₙ₋₁sⁿ⁻¹ + … + a₀): 1s on the superdiagonal of A, −a₀ … −aₙ₋₁ on its last row, B = [0 … 0 1]ᵀ, C = [b₀ 0 … 0].
- Change the states by any invertible matrix T and A, B, C change but G doesn't. That is why realizations aren't unique.

````callout:derivation Full derivation
sX = AX + BU, so X = (sI − A)⁻¹BU and Y = [C(sI − A)⁻¹B + D]U.

Corner: (sI − A)⁻¹ = [[s + 4, 1], [−64, s]]/(s² + 4s + 64), so G = 0.0025/(s² + 4s + 64).

House (B = [b, 0]ᵀ, C = [0, 1]): G₂ = b/(s² + 2.4s + 0.44).
````

### Worked example: on the corner and the house

- Corner: G = 0.0025/(s² + 4s + 64), poles −2 ± 7.75j, the same as eig(A). Its A is already in phase-variable form.
- House: G₂ = 0.0036/(s² + 2.4s + 0.44), poles −0.2 and −2.2.
- House with a thermostat that reads the average of the rooms, C = [½, ½]: G = 0.0018(s + 2.2)/((s + 0.2)(s + 2.2)) = 0.0018/(s + 0.2). The −2.2 mode has cancelled, because an average can't see the rooms evening out.

### Exam examples

LN1 slides 28–32 (SS → TF) and 33–38 (TF → phase variable).

### What it can't do

G(s) keeps only the part of the plant that connects input to output. A cancelled mode is still there inside: if it were unstable, G would look fine while the plant drifted off (see *Can we reach and see every state?*). G also forgets initial conditions, which state space keeps.


### Slides

LN1 slides 28–38.
