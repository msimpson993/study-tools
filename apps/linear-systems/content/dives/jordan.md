---
id: jordan
order: 20
title: Jordan form
addsToExample: "Damps the speaker critically (R = 2√(k·Mms) ≈ 0.76 kg/s): the two poles merge at −ωs ≈ −4,503 rad/s and A keeps only one eigen-direction."
accountsFor: "Why the critically damped click response is (a + bt)e^(−ωs t), the fastest response that does not ring."
category: state
neighbors:
  - eig
  - diag
  - expm
  - tf
matlab: J = jordan(sym(A))
exampleScene: { overlays: [critical, poles], caption: "Critical damping: the two poles meet, and only one eigen-direction is left." }
level: Some algebra
check: [c-jor-1, m4]
---

**The question:** what if a repeated eigenvalue has only one eigenvector? It follows *Diagonalization*, which needs n independent eigenvectors: without them the best you can do is a Jordan block, and t e^(λt) terms appear.

### The big idea

Diagonalizing needs a full set of eigenvectors, and a repeated eigenvalue sometimes supplies only one. Then the best we can do is nearly diagonal, with a 1 just above the diagonal, the Jordan form. That 1 adds motions like t·e^(λt): a rise before the fade, as at critical damping.

### See it

**Picture it first.** When the grid of eigenvectors collapses to a single line, A cannot be a pure stretch. What it does instead is a shear. On the speaker, raise the damping until its two poles meet (critical damping, ζ = 1): that is the moment the eigenvector grid collapses.

```figure:jordan
```

```figure:tf
```

```eq
J = [[λ, 1], [0, λ]] = λI + N,    N² = 0
```

```eq
e^(Jt) = e^(λt) (I + Nt) = e^(λt) [[1, t], [0, 1]]
```

### The math

When a repeated eigenvalue does not have enough independent eigenvectors, A is not diagonalizable. The next-best basis puts A into Jordan form: each block is λI plus a single superdiagonal of 1s. The missing pure mode is replaced by a chain, and time response picks up polynomial factors t^k e^(λt).

**What each symbol means.**

- $J$: a Jordan block, the eigenvalue on the diagonal and 1 just above it.
- $t\,e^{\lambda t}$: the extra term a Jordan block adds.
- Critical damping: $\zeta = 1$, the two poles meet.

### Worked example: on the earbud

1. Damp the earbud critically, $R = 2\sqrt{kM} \approx 0.76$ kg/s (about 3.6 times its real damping).
2. The two poles merge at $-\omega_s \approx -4{,}503$ rad/s and $A$ keeps only one eigen-direction.
3. The click response becomes $h(t) \propto t\,e^{-\omega_s t}$: no ring, the fastest return without overshoot.

**Exam-style example.** For J = [[−1, 1], [0, −1]], the only eigenspace is span{[1, 0]ᵀ}: J + I = [[0, 1], [0, 0]] has rank 1. The matrix exponential is e^(Jt) = e^(−t) [[1, t], [0, 1]]. At t = 1 this is e^(−1) [[1, 1], [0, 1]], with e^(−1) ≈ 0.3679. The off-diagonal t is the fingerprint of the block: a second copy of e^(−t) is not enough.

### What it can't do

Jordan form explains the t·e^(λt) term, but computing it is fragile: a tiny change splits the repeated eigenvalue. Cayley–Hamilton gives e^(At) without eigenvectors at all.

**Next question.** Does a repeated pole in G(s) automatically mean a Jordan block? No: A can have a repeated λ and still be diagonalizable (λI, or a diagonal Λ with a repeated entry).

### Common pitfalls

- A 2×2 system with a repeated eigenvalue is diagonalizable only if it already is λI. The companion matrix of (s + α)² is a single Jordan block, not a diagonal matrix.
- MATLAB's jordan needs exact (symbolic) entries: jordan(sym(A)). Numeric eig will often return a poorly conditioned V instead of telling you the Jordan structure.
- Repeated poles of G(s) can come from separate diagonal modes or from a Jordan chain; look at the state realization, not only the transfer function.
