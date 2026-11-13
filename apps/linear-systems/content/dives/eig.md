---
id: eig
order: 1
title: Eigenvectors & eigenvalues
addsToExample: "Solves Av = λv for the cart: λ = −1 with v = (1, −1) and λ = −2 with v = (1, −2)."
accountsFor: "The two decay rates of the cart and the shape of each mode: position and velocity move together."
category: basis
chain:
  - title: What does a linear operator A do to a vector?
  - title: Are there directions A only stretches?
    detail: No rotation of that line — just a scale factor.
  - title: Eigenvectors and eigenvalues
    detail: Those directions, and the factors they pick up.
neighbors:
  - diag
  - jordan
  - ctrl
  - obs
matlab: "[V, D] = eig(A)"
exampleScene: { overlays: [modes, trace], caption: "Released from x = 1, the state splits into two eigen-directions, and each fades on its own." }
---

An eigenvector is a line that A leaves invariant: the output is a scalar multiple of the input. That scalar is the eigenvalue, and it is the whole story of A along that line. In a linear system those lines are the modes.

**Picture it first.** Think of A as an instruction to move the whole plane. Most vectors get turned as well as stretched, but a few special directions only stretch. Try it on the running cart.

```figure:eig
```

```eq
Av = λv,    v ≠ 0
```

```eq
det(λI − A) = 0
```

````callout:note What this answers
Which directions are already simple for A, and what gain each one sees. For the running example, the modes of ÿ + 3ẏ + 2y = u live at λ = −1 and λ = −2.
````

````callout:note What it raises
Do those directions span the whole space? If they do, every vector has coordinates in the eigenbasis, and A becomes a diagonal matrix there.
````

````callout:note Mini example
Take the companion matrix of s² + 3s + 2,

```eq
A = [[0, 1], [−2, −3]]
```

The characteristic polynomial is det(sI − A) = s² + 3s + 2 = (s + 1)(s + 2), so λ₁ = −1 and λ₂ = −2. Matching eigenvectors are v₁ = [1, −1]ᵀ and v₂ = [1, −2]ᵀ. Check: A v₁ = [−1, 1]ᵀ = −1 v₁, and A v₂ = [−2, 4]ᵀ = −2 v₂. The left eigenvectors (wᵀ A = λ wᵀ) are w₁ = [2, 1]ᵀ and w₂ = [1, 1]ᵀ; they matter later for controllability.
````

### Common pitfalls

- det(λI − A) and det(A − λI) differ by a sign when n is odd; the roots are the same, but match the book's convention.
- Right eigenvectors (A v = λ v) and left eigenvectors (wᵀ A = λ wᵀ) are not interchangeable. PBH uses left for controllability and right for observability.
- A real matrix can have complex eigenvalues; they come in conjugate pairs, and the real picture is a plane that A rotates and scales.
