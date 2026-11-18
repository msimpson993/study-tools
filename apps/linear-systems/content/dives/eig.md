---
id: eig
order: 2
title: Eigenvectors & eigenvalues
addsToExample: "Solves Av = λv for the house: v = (1, 1) with λ = −0.2 per hour (the average temperature) and v = (1, −1) with λ = −2.2 per hour (the difference between the rooms)."
accountsFor: "Why the house has one slow way of cooling (τ = 5 h) and one fast way (τ ≈ 27 min), and what each looks like."
category: foundations
neighbors:
  - diag
  - jordan
  - ctrl
  - obs
matlab: "[V, D] = eig(A)"
exampleScene: { scene: house, overlays: [modes, trace], caption: "The state splits into the average (slow) and the difference (fast); each fades on its own." }
---

**The question:** clicks work, but is there a set of pieces the system does not even reshape? It follows on from *Linearity*: if the input is split into the right pieces, each piece comes out only scaled. Those pieces are eigenvectors (for a matrix) and eigenfunctions (for a signal system), and the scale factors are eigenvalues.

An eigenvector is a line that A leaves invariant: the output is a scalar multiple of the input. That scalar is the eigenvalue, and it is the whole story of A along that line. In a linear system those lines are the modes.

**Picture it first.** Think of A as an instruction to move the whole plane. Most vectors get turned as well as stretched, but a few special directions only stretch. Try it on A = [[0, 1], [−2, −3]] (the textbook pair of modes −1 and −2), then picture the house: its eigen-directions are the average (1, 1) and the difference (1, −1).

```figure:eig
```

```eq
Av = λv,    v ≠ 0
```

```eq
det(λI − A) = 0
```

````callout:note What this answers
Which directions are already simple for A, and what gain each one sees. For the house, λ = −0.2/h along (1, 1) and λ = −2.2/h along (1, −1); for ÿ + 3ẏ + 2y = u, λ = −1 and λ = −2.
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
