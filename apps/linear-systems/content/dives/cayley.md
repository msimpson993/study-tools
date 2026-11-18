---
id: cayley
order: 19
title: Cayley–Hamilton
addsToExample: "Uses the house's characteristic polynomial s² + 2.4s + 0.44 to write A² = −2.4A − 0.44I, so e^(At) = α₀(t)I + α₁(t)A with α₁ = (e^(−0.2t) − e^(−2.2t))/2 and α₀ = (2.2e^(−0.2t) − 0.2e^(−2.2t))/2."
accountsFor: "Why a 2×2 matrix exponential needs only two scalar functions, both built from the two eigenvalues."
category: state
chain:
  - title: Is there a way to get e^(At) without eigenvectors?
  - title: A satisfies its own characteristic polynomial
    detail: p(A) = 0, so Aⁿ is a combination of lower powers.
  - title: e^(At) is a polynomial in A of degree n − 1
    detail: Match the coefficients at each eigenvalue.
neighbors:
  - expm
  - jordan
  - optimal
  - eig
matlab: "polyvalm(poly(A), A)    % ≈ zeros(n)"
exampleScene: { scene: house, overlays: [flow, poles], caption: "Two eigenvalues, −0.2 and −2.2 per hour, fix the two coefficients α₀(t), α₁(t)." }
---

If p(s) = det(sI − A) = sⁿ + aₙ₋₁sⁿ⁻¹ + ⋯ + a₀, then p(A) = 0. So every power Aᵏ with k ≥ n can be rewritten with I, A, …, Aⁿ⁻¹, and so can any power series in A, including e^(At):

$$e^{At}=\alpha_0(t)I+\alpha_1(t)A+\cdots+\alpha_{n-1}(t)A^{n-1},\qquad e^{\lambda_it}=\sum_k\alpha_k(t)\lambda_i^k\ \text{for each eigenvalue}.$$

For a repeated eigenvalue, also match the derivative with respect to λ (that is where t e^(λt) comes from).

**Picture it first.** e^(At) is a blend of I and A whose weights change with time; the eigenvalues set how fast.

```figure:expm
```

````callout:note What this answers
How to compute e^(At) (or Aᵏ, or any analytic function of A) from the eigenvalues alone, without finding eigenvectors.
````

````callout:note What it raises
Why controllability only needs B, AB, …, Aⁿ⁻¹B: higher powers add nothing new, by this same theorem.
````

````callout:note Mini example
The Hamiltonian matrix M = [[6, −¼], [−2, −6]] from the A4 review problem has tr M = 0 and det M = −36.5, so M² = 36.5 I = ω²I. Then e^(Mt) = cosh(ωt)I + (sinh(ωt)/ω)M, with ω = √146/2 ≈ 6.04: two scalar functions and no eigenvectors.
````

### Common pitfalls

- The theorem is about the matrix polynomial p(A), not about plugging λ into p (which is just the eigenvalue equation).
- For repeated eigenvalues, the "match at each eigenvalue" step needs derivatives too.
