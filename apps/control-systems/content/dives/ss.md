---
id: ss
order: 26
title: "Look inside: state space"
category: state
neighbors: [fb, ss2tf, cc, sf, order]
level: Some algebra
check: [q-state, ck-state-1, ck-state-2]
---

**The question:** back to the car: to put a computer in the suspension, what do we need to know about the corner beyond its height? This is the box *Look inside: state space*, after *Why not infinite gain?*.

### The big idea

To predict the corner's future you need its height *and* its velocity now; height alone doesn't tell you whether it's rising or falling. Those two numbers are the state. Writing the physics as first-order equations in the states gives state space: it keeps initial conditions and internal motion, handles many inputs and outputs, and sets up feeding back every state.

### See it

The two-integrator diagram (force/m → acceleration → ∫ → velocity → ∫ → height, with −64 and −4 fed back) and the phase portrait (z, ż). Every start spirals into the origin along the same shape: the eigenvalues set it.

```figure:states
```

### The math

```eq
x = [z, ż]ᵀ:   ẋ = [[0, 1], [−k/m, −c/m]]x + [0, 1/m]ᵀu,   y = [1, 0]x
```

Corner: A = [[0, 1], [−64, −4]], B = [0, 0.0025]ᵀ, C = [1, 0], D = 0; eig(A) = −2 ± 7.75j.

**Phase-variable form** (LN1 slides 33–38): for G = b₀/(sⁿ + aₙ₋₁sⁿ⁻¹ + … + a₀), A has 1s on the superdiagonal and −a_i on the last row; the corner already is in it.

**What each symbol means.** x: the state vector; A: how the states drive each other; B: how the input enters; C: what the sensor reads; D: direct feedthrough.

### Worked example: on the corner, released 5 cm high

The body swings to −2.22 cm at 0.41 s, then spirals in. G(s) can't describe this start; state space can. The eigenvalues of A are −2 ± 7.75j, the same as G's poles (*From states back to G(s)*).

### What it can't do

It's still a linear model, and the choice of states isn't unique (any invertible change of variables works).

### Slides

Taught in LN1, for Mini exam 1.
