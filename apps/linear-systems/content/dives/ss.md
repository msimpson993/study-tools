---
id: ss
order: 17
title: State space
addsToExample: "Writes the house as ẋ = Ax + Bu with x = (T₁, T₂) above outdoors: A = [[−1.2, 1], [1, −1.2]] per hour (shared wall 1/h, leak 0.2/h), B = (3600/C_th, 0)ᵀ = (3.6, 0) K/h per kW for a heater in room 1, C = [1, 0] for a thermostat in room 1."
accountsFor: "Why room 1 warms first and room 2 follows through the wall, from three small matrices."
category: state
neighbors:
  - expm
  - tf
  - ctrl
  - diag
matlab: sys = ss(A, B, C, D)
exampleScene: { scene: house, overlays: [heat, flows, trace], diagram: house-open, caption: "Heat flows through the wall and out to the cold; the state is the two temperatures." }
level: Some algebra
check: [c-ss-1, c-ss-2]
---

**The question:** which states does ẋ = Ax keep on a straight line? This is the box *State: what it remembers*. Write the system as ẋ = Ax + Bu, y = Cx; the eigenvectors of A are its modes.

### The big idea

A common language for dynamics, modes, inputs, and outputs — the setting in which e^(At), controllability, observability, and G(s) are defined.

### See it

**Picture it first.** Here is the earbud speaker's cone, moving. The two numbers we track (cone position and velocity) are exactly the *state*; drive it with a voltage and watch both. The house works the same way, with the two room temperatures as its state.

```figure:ss
```

```figure:eig
```

```eq
ẋ = Ax + Bu,    y = Cx + Du
```

```eq
x[k + 1] = A x[k] + B u[k],    y[k] = C x[k] + D u[k]
```

### The math

The state is a finite list of numbers that, together with the future input, determines the future output. A first-order vector ODE (or recurrence) makes the operator over time into a matrix A, so everything about bases and modes applies directly. Different state coordinates are just a change of basis: they do not change the input-output map.

**What each symbol means.**

- $x$: the state, the memory (house: $T_1, T_2$, room temperatures above outdoors, K).
- $u$: the input (heater power, kW).
- $A$: how the state drives its own change (per hour): leaks and the shared wall.
- $B$: where the input pushes (K/h per kW).
- $C$: what the sensor reads; $D$: direct feed-through (0 here).

### Worked example: on the house

1. House: $A = [[-1.2, 1], [1, -1.2]]$ per hour (shared wall 1/h, leak 0.2/h), $B = (3.6, 0)$ K/h per kW, $C = [1, 0]$.
2. Switch on 1 kW with both rooms at outdoor temperature: $\dot x = Bu = (3.6, 0)$ K/h, so room 1 starts warming at 3.6 K/h and room 2 not at all, at first.
3. Kept on, it settles where $\dot x = 0$: $x = -A^{-1}B \approx (9.8, 8.2)$ K above outdoors.

**Exam-style example.** The scalar ODE ÿ + 3ẏ + 2y = u, with phase variables x₁ = y and x₂ = ẏ, becomes ẋ₁ = x₂, ẋ₂ = −2 x₁ − 3 x₂ + u, and y = x₁. That is exactly A = [[0, 1], [−2, −3]], B = [0, 1]ᵀ, C = [1, 0], D = 0. A similarity x = T z produces an equivalent realization (Ā, B̄, C̄, D) = (T⁻¹ A T, T⁻¹ B, C T, D) with the same G(s).

### What it can't do

In these coordinates everything affects everything: room 1 pushes room 2 and back. The equations are coupled, so we can't yet read off how fast things happen.

**Next question.** With u = 0, how does the state actually move? That is the state transition matrix. With u ≠ 0, can the input reach every mode, and can the output see every mode?

### Common pitfalls

- State coordinates are not unique. Eigenvalues, G(s), controllability, and observability are invariant under similarity; the entries of A, B, C are not.
- Do not mix continuous A (from x′ = Ax) with discrete A (from x[k+1] = Ax). Discretizing with period T replaces A by e^(AT), not by T A.
- D is the direct feedthrough. Many mechanical and filter models have D = 0; an RF path with an algebraic path from u to y does not.
