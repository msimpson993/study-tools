---
id: cayley
order: 19
title: Cayley–Hamilton
addsToExample: "Uses the house's characteristic polynomial s² + 2.4s + 0.44 to write A² = −2.4A − 0.44I, so e^(At) = α₀(t)I + α₁(t)A with α₁ = (e^(−0.2t) − e^(−2.2t))/2 and α₀ = (2.2e^(−0.2t) − 0.2e^(−2.2t))/2."
accountsFor: "Why a 2×2 matrix exponential needs only two scalar functions, both built from the two eigenvalues."
category: state
neighbors:
  - expm
  - jordan
  - optimal
  - eig
matlab: "polyvalm(poly(A), A)    % ≈ zeros(n)"
exampleScene: { scene: house, overlays: [flow, poles], caption: "Two eigenvalues, −0.2 and −2.2 per hour, fix the two coefficients α₀(t), α₁(t)." }
level: Worked calculation
check: [c-ch-1, c-ch-2]
---

**The question:** is there a way to get e^(At) without the eigenvectors? It hangs under *Modes: untangle A*, after $e^{At}$: every matrix satisfies its own characteristic polynomial, so e^(At) is a polynomial in A of degree n − 1 with time-varying coefficients.

### The big idea

How to compute e^(At) (or Aᵏ, or any analytic function of A) from the eigenvalues alone, without finding eigenvectors.

### See it

**Picture it first.** e^(At) is a blend of I and A whose weights change with time; the eigenvalues set how fast.

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

### Worked example: on the house

1. House: the characteristic polynomial $s^2 + 2.4s + 0.44$ gives $A^2 = -2.4A - 0.44I$, so every power of A is a mix of I and A.
2. Hence $e^{At} = \alpha_0(t)I + \alpha_1(t)A$, with $e^{-0.2t} = \alpha_0 - 0.2\alpha_1$ and $e^{-2.2t} = \alpha_0 - 2.2\alpha_1$.
3. Solve: $\alpha_1 = (e^{-0.2t} - e^{-2.2t})/2$, $\alpha_0 = (2.2e^{-0.2t} - 0.2e^{-2.2t})/2$. At $t = 1$ h, $\alpha_0 \approx 0.890$, $\alpha_1 \approx 0.354$, which reproduces $e^{A} \approx [[0.465, 0.354], [0.354, 0.465]]$.

**Exam-style example.** The Hamiltonian matrix M = [[6, −¼], [−2, −6]] from the A4 review problem has tr M = 0 and det M = −36.5, so M² = 36.5 I = ω²I. Then e^(Mt) = cosh(ωt)I + (sinh(ωt)/ω)M, with ω = √146/2 ≈ 6.04: two scalar functions and no eigenvectors.

### What it can't do

Cayley–Hamilton computes the motion; it doesn't ask whether it settles, or whether the input can reach every mode.

**Next question.** Why controllability only needs B, AB, …, Aⁿ⁻¹B: higher powers add nothing new, by this same theorem.

### Common pitfalls

- The theorem is about the matrix polynomial p(A), not about plugging λ into p (which is just the eigenvalue equation).
- For repeated eigenvalues, the "match at each eigenvalue" step needs derivatives too.
