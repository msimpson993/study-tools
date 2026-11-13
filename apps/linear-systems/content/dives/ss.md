---
id: ss
order: 5
title: State space
category: time
chain:
  - title: What if A acts over time?
  - title: How do I write the dynamics as a first-order vector equation?
  - title: State space
    detail: x′ = Ax + Bu, y = Cx + Du (or the discrete analog).
neighbors:
  - expm
  - tf
  - ctrl
  - diag
matlab: sys = ss(A, B, C, D)
---

The state is a finite list of numbers that, together with the future input, determines the future output. A first-order vector ODE (or recurrence) makes the operator over time into a matrix A, so everything about bases and modes applies directly. Different state coordinates are just a change of basis: they do not change the input-output map.

**Picture it first.** Here is the running cart, moving. The two numbers we track (position and velocity) are exactly the *state*; push it with a force and watch both.

```figure:ss
```

```eq
ẋ = Ax + Bu,    y = Cx + Du
```

```eq
x[k + 1] = A x[k] + B u[k],    y[k] = C x[k] + D u[k]
```

````callout:note What this answers
A common language for dynamics, modes, inputs, and outputs — the setting in which e^{At}, controllability, observability, and G(s) are defined.
````

````callout:note What it raises
With u = 0, how does the state actually move? That is the state transition matrix. With u ≠ 0, can the input reach every mode, and can the output see every mode?
````

````callout:note Mini example
The scalar ODE ÿ + 3ẏ + 2y = u, with phase variables x₁ = y and x₂ = ẏ, becomes ẋ₁ = x₂, ẋ₂ = −2 x₁ − 3 x₂ + u, and y = x₁. That is exactly A = [[0, 1], [−2, −3]], B = [0, 1]ᵀ, C = [1, 0], D = 0. A similarity x = T z produces an equivalent realization (Ā, B̄, C̄, D) = (T⁻¹ A T, T⁻¹ B, C T, D) with the same G(s).
````

### Common pitfalls

- State coordinates are not unique. Eigenvalues, G(s), controllability, and observability are invariant under similarity; the entries of A, B, C are not.
- Do not mix continuous A (from x′ = Ax) with discrete A (from x[k+1] = Ax). Discretizing with period T replaces A by e^{AT}, not by T A.
- D is the direct feedthrough. Many mechanical and filter models have D = 0; an RF path with an algebraic path from u to y does not.
