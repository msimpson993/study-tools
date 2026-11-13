---
id: jordan
order: 3
title: Jordan form
addsToExample: "What the cart becomes if the damper is tuned to critical damping (k = 1, c = 2): a repeated pole −1 with one eigenvector."
accountsFor: "The extra t·e^{−t} term that appears for the critically damped cart."
category: basis
chain:
  - title: Do the eigenvectors span the space?
  - title: If not, what is the simplest form still available?
  - title: Jordan form
    detail: Blocks with λ on the diagonal and 1s on the superdiagonal; generalized eigenvectors.
neighbors:
  - eig
  - diag
  - expm
  - tf
matlab: J = jordan(sym(A))
exampleScene: { overlays: [critical, trace], caption: "Tighten the damper to c = 2√2 and the two poles merge: there is no second eigenvector." }
---

When a repeated eigenvalue does not have enough independent eigenvectors, A is not diagonalizable. The next-best basis puts A into Jordan form: each block is λI plus a single superdiagonal of 1s. The missing pure mode is replaced by a chain, and time response picks up polynomial factors t^k e^{λt}.

**Picture it first.** When the grid of eigenvectors collapses to a single line, A cannot be a pure stretch. What it does instead is a shear.

```figure:jordan
```

```eq
J = [[λ, 1], [0, λ]] = λI + N,    N² = 0
```

```eq
e^{Jt} = e^{λt} (I + Nt) = e^{λt} [[1, t], [0, 1]]
```

````callout:note What this answers
What to do when the eigenbasis is incomplete, and why a repeated pole can produce t e^{λt} (and t^k e^{λt} for a larger block).
````

````callout:note What it raises
Does a repeated pole in G(s) automatically mean a Jordan block? No: A can have a repeated λ and still be diagonalizable (λI, or a diagonal Λ with a repeated entry).
````

````callout:note Mini example
For J = [[−1, 1], [0, −1]], the only eigenspace is span{[1, 0]ᵀ}: J + I = [[0, 1], [0, 0]] has rank 1. The matrix exponential is e^{Jt} = e^{−t} [[1, t], [0, 1]]. At t = 1 this is e^{−1} [[1, 1], [0, 1]], with e^{−1} ≈ 0.3679. The off-diagonal t is the fingerprint of the block: a second copy of e^{−t} is not enough.
````

### Common pitfalls

- A 2×2 system with a repeated eigenvalue is diagonalizable only if it already is λI. The companion matrix of (s + α)² is a single Jordan block, not a diagonal matrix.
- MATLAB's jordan needs exact (symbolic) entries: jordan(sym(A)). Numeric eig will often return a poorly conditioned V instead of telling you the Jordan structure.
- Repeated poles of G(s) can come from separate diagonal modes or from a Jordan chain; look at the state realization, not only the transfer function.
