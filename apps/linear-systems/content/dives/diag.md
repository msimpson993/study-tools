---
id: diag
order: 2
title: Diagonalization & change of basis
category: basis
chain:
  - title: Are there directions A only stretches?
    detail: Eigenvectors.
  - title: Can every vector be written in those directions?
  - title: If yes, A is diagonalizable
    detail: A change of basis makes A a diagonal matrix of eigenvalues.
neighbors:
  - eig
  - jordan
  - ortho
  - expm
matlab: "D = inv(V) * A * V    % equivalent: A = V * D * inv(V)"
---

If the eigenvectors form a basis, stack them as the columns of V and write x = V ξ. In the ξ-coordinates A does nothing but scale each axis: Λ = V⁻¹ A V is diagonal. Solving, iterating, and exponentiating A all become scalar operations on those coordinates.

```eq
A = V Λ V⁻¹,    Λ = V⁻¹ A V
```

```eq
x = V ξ    ⇒    ξ = V⁻¹ x
```

````callout:note What this answers
How to pick coordinates so the operator is as simple as possible: independent scalar multiplies, one per mode.
````

````callout:note What it raises
What if there are not enough independent eigenvectors? (Jordan.) And if A acts over time, what is the solution of x′ = Ax in this basis? (e^{At}.)
````

````callout:note Mini example
For the same A, V = [[1, 1], [−1, −2]] and V⁻¹ = [[2, 1], [−1, −1]]. A vector x = [3, −4]ᵀ has eigen-coordinates ξ = V⁻¹ x = [2, 1]ᵀ, because 2 v₁ + 1 v₂ = [3, −4]ᵀ. In these coordinates A just multiplies by −1 and −2: Λ ξ = [−2, −2]ᵀ, and V(Λ ξ) = A x.
````

### Common pitfalls

- The two similar-looking formulas are not the same: A = V Λ V⁻¹, so Λ = V⁻¹ A V. Writing V A V⁻¹ is a common slip.
- Having n eigenvalues, counted with multiplicity, does not make A diagonalizable. You need n independent eigenvectors (geometric multiplicity equal to algebraic, for each λ).
- Eigenvalues are similarity-invariant; the eigenvectors are not — they live in a chosen set of coordinates.
