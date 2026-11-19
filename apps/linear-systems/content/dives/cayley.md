---
id: cayley
order: 19
title: Cayley–Hamilton
addsToExample: "Uses the car's 4×4 A: its characteristic polynomial has degree 4, so e^(At) = α₀(t)I + α₁(t)A + α₂(t)A² + α₃(t)A³, with the four α's fixed by matching e^(λt) at the four eigenvalues −2.092 ± 6.92j and −3.178 ± 8.328j."
accountsFor: "Why a 4×4 matrix exponential needs only four scalar functions, all built from the four eigenvalues."
category: state
neighbors:
  - expm
  - jordan
  - optimal
  - eig
matlab: "polyvalm(poly(A), A)    % ≈ zeros(n)"
exampleScene: { scene: car, overlays: [poles, trace], caption: "Four eigenvalues fix the four coefficients α₀(t) … α₃(t)." }
level: Worked calculation
check: [c-ch-1, c-ch-2]
---

**The question:** is there a way to get e^(At) without the eigenvectors? It hangs under *Modes: untangle A*, after $e^{At}$: every matrix satisfies its own characteristic polynomial, so e^(At) is a polynomial in A of degree n − 1 with time-varying coefficients.

### The big idea

Computing e^(At) usually means finding A's eigenvectors first, which is slow and fails when there are too few. There is a shortcut: every square matrix obeys its own characteristic equation, so any power of A, and so e^(At), can be written with just I, A, …, A^(n−1). The weights come from the eigenvalues alone.

### See it

**Picture it first.** e^(At) is a blend of I, A, A² and A³ (for the four-state car) whose weights change with time; the eigenvalues set how fast.

```figure:cayley
```

```figure:expm
```

### The math

If p(s) = det(sI − A) = sⁿ + aₙ₋₁sⁿ⁻¹ + ⋯ + a₀, then p(A) = 0. So every power Aᵏ with k ≥ n can be rewritten with I, A, …, Aⁿ⁻¹, and so can any power series in A, including e^(At):

$$e^{At}=\alpha_0(t)I+\alpha_1(t)A+\cdots+\alpha_{n-1}(t)A^{n-1},\qquad e^{\lambda_it}=\sum_k\alpha_k(t)\lambda_i^k\ \text{for each eigenvalue}.$$

For a repeated eigenvalue, also match the derivative with respect to λ (that is where t e^(λt) comes from).

**What each symbol means.**

- $\alpha_k(t)$: scalar functions of time, the coefficients of $I, A, A^2, \dots$.
- $\lambda_i$: the eigenvalues; the same identity holds with $A$ replaced by each $\lambda_i$.
- $n$: the size of $A$ (number of states).

### Worked example: on the car

1. Car: $p(s) = \det(sI - A)$ has degree 4, so $p(A) = 0$ writes $A^4$, and every higher power, as a mix of $I, A, A^2, A^3$.
2. Hence $e^{At} = \alpha_0(t)I + \alpha_1(t)A + \alpha_2(t)A^2 + \alpha_3(t)A^3$, with $e^{\lambda_i t} = \sum_k\alpha_k(t)\lambda_i^k$ at the four eigenvalues $-2.092 \pm 6.92j$ and $-3.178 \pm 8.328j$: four equations for four unknowns.
3. At $t = 0$, $\alpha_0 = 1$ and the others are 0, because $e^{A\cdot 0} = I$. The α's are real because the eigenvalues come in conjugate pairs.

**Exam-style example.** The Hamiltonian matrix M = [[6, −¼], [−2, −6]] from the A4 review problem has tr M = 0 and det M = −36.5, so M² = 36.5 I = ω²I. Then e^(Mt) = cosh(ωt)I + (sinh(ωt)/ω)M, with ω = √146/2 ≈ 6.04: two scalar functions and no eigenvectors.

### What it can't do

Cayley–Hamilton computes the motion; it doesn't ask whether it settles, or whether the input can reach every mode.

**Next question.** Why controllability only needs B, AB, …, Aⁿ⁻¹B: higher powers add nothing new, by this same theorem.

### Common pitfalls

- The theorem is about the matrix polynomial p(A), not about plugging λ into p (which is just the eigenvalue equation).
- For repeated eigenvalues, the "match at each eigenvalue" step needs derivatives too.
