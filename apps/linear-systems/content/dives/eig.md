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
level: Some algebra
check: [c-eig-1, c-eig-2, m1]
---

**The question:** clicks work, but is there a set of pieces the system does not even reshape? This is the box *Modes: untangle A*: if the input is split into the right pieces, each piece comes out only scaled. Those pieces are eigenvectors (for a matrix) and eigenfunctions (for a signal system), and the scale factors are eigenvalues.

### The big idea

Which directions are already simple for A, and what gain each one sees. For the house, λ = −0.2/h along (1, 1) and λ = −2.2/h along (1, −1); for ÿ + 3ẏ + 2y = u, λ = −1 and λ = −2.

### See it

**Picture it first.** Think of A as an instruction to move the whole plane. Most vectors get turned as well as stretched, but a few special directions only stretch. Try it on the house matrix A = [[−1.2, 1], [1, −1.2]] below: its eigen-directions are the average (1, 1), shrunk by 0.2 per hour, and the difference (1, −1), shrunk by 2.2 per hour.

```figure:eig
```

```figure:flow
```

```eq
Av = λv,    v ≠ 0
```

```eq
det(λI − A) = 0
```

### The math

An eigenvector is a line that A leaves invariant: the output is a scalar multiple of the input. That scalar is the eigenvalue, and it is the whole story of A along that line. In a linear system those lines are the modes.

**What each symbol means.**

- $v$: an eigenvector, a direction of the state that $A$ only stretches (a mode's shape).
- $\lambda$: its eigenvalue, the rate (per hour) at which that mode grows or fades.
- $\det(sI - A)$: the characteristic polynomial; its roots are the eigenvalues, which are also the poles.

### Worked example: on the house

1. House: $\det(sI - A) = s^2 + 2.4s + 0.44 = (s + 0.2)(s + 2.2)$.
2. $v = (1, 1)$, both rooms together, has $\lambda = -0.2$ /h: the average fades with $\tau = 5$ h.
3. $v = (1, -1)$, one room warm and one cool, has $\lambda = -2.2$ /h: the difference fades with $\tau \approx 27$ min.
4. Start with room 1 at 10 K, room 2 at 0: that is 5(1, 1) + 5(1, −1), and the gap closes within the hour while the average takes hours.

**Exam-style example.** Take the companion matrix of s² + 3s + 2,

```eq
A = [[0, 1], [−2, −3]]
```

The characteristic polynomial is det(sI − A) = s² + 3s + 2 = (s + 1)(s + 2), so λ₁ = −1 and λ₂ = −2. Matching eigenvectors are v₁ = [1, −1]ᵀ and v₂ = [1, −2]ᵀ. Check: A v₁ = [−1, 1]ᵀ = −1 v₁, and A v₂ = [−2, 4]ᵀ = −2 v₂. The left eigenvectors (wᵀ A = λ wᵀ) are w₁ = [2, 1]ᵀ and w₂ = [1, 1]ᵀ; they matter later for controllability.

### What it can't do

Eigenvectors untangle A only when there are enough of them. A repeated eigenvalue can leave one direction short (Jordan form), and we still need a formula for the whole motion, e^(At).

**Next question.** Do those directions span the whole space? If they do, every vector has coordinates in the eigenbasis, and A becomes a diagonal matrix there.

### Common pitfalls

- det(λI − A) and det(A − λI) differ by a sign when n is odd; the roots are the same, but match the book's convention.
- Right eigenvectors (A v = λ v) and left eigenvectors (wᵀ A = λ wᵀ) are not interchangeable. PBH uses left for controllability and right for observability.
- A real matrix can have complex eigenvalues; they come in conjugate pairs, and the real picture is a plane that A rotates and scales.
