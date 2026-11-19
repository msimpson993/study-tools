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
lookFor: The spiral shrinks by e⁻² each second and turns at 7.75 rad/s. Those two numbers are G's poles, −2 ± 7.75j: the same plant read from A, B, C or from G(s).
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

**What each symbol means.**

- **x**: the state vector, here [height z (m), velocity ż (m/s)] for the corner.
- **u**: the input (force, N).
- **y**: the output (height, m).
- **A**: how the states drive each other's rates. Corner [[0, 1], [−64, −4]]; units 1/s and 1/s² (−64 = −k/m, −4 = −c/m).
- **B**: how the input drives the rates. Corner [0, 0.0025]: 1/m, in m/s² per N.
- **C**: which combination of states is measured. [1, 0] reads the height.
- **D**: direct input-to-output path (0 here).
- **I**: the identity matrix.
- **s**: the Laplace variable (1/s).
- **det(sI − A)**: the characteristic polynomial; its roots are the poles.
- **b₀, a₀ … aₙ₋₁**: the numerator constant and denominator coefficients of G = b₀/(sⁿ + … + a₀). Corner: b₀ = 1/m = 0.0025 m/(N·s²), a₁ = c/m = 4 /s, a₀ = k/m = 64 /s².
- **T**: an invertible matrix that relabels the states, x = Tx′. For example, swapping height and velocity, or mixing them. It changes A, B and C but not G.
- **n**: number of states (2 here).

### Worked example: on the corner and the house

- Corner: G = 0.0025/(s² + 4s + 64), poles −2 ± 7.75j, the same as eig(A). Its A is already in phase-variable form.
- House: G₂ = 0.0036/(s² + 2.4s + 0.44), poles −0.2 and −2.2.
- House with a thermostat that reads the average of the rooms, C = [½, ½]: G = 0.0018(s + 2.2)/((s + 0.2)(s + 2.2)) = 0.0018/(s + 0.2). The −2.2 mode has cancelled, because an average can't see the rooms evening out.

### What it can't do

G(s) keeps only the part of the plant that connects input to output. A cancelled mode is still there inside: if it were unstable, G would look fine while the plant drifted off (see *Can we reach and see every state?*). G also forgets initial conditions, which state space keeps.

<p class="src">Sources: LN1 s.28–38.</p>
