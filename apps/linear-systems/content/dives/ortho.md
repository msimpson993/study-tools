---
id: ortho
order: 10
title: Orthogonality & inner products
addsToExample: "Splits a 200 Hz buzz into harmonics by projecting it onto each one in turn: the projections do not interfere because the harmonics are orthogonal."
accountsFor: "Why each harmonic's strength can be measured on its own."
category: signals
neighbors:
  - diag
  - fs
  - dft
  - lti
matlab: W = dftmtx(N);  W' * W    % equals N * eye(N)
exampleScene: { overlays: [series], caption: "Each harmonic is found by one projection; the others contribute nothing to it." }
level: Conceptual
check: [c-fs-1, m16]
---

**The question:** why can a signal be split into tones without the pieces interfering? It hangs under *Fourier: split into sines*: tones at different frequencies are orthogonal, so each coefficient is a projection that can be read off on its own.

### The big idea

How to read off coordinates with inner products, and why the analysis formula of every Fourier tool is an inner product against an exponential.

### See it

**Picture it first.** A dot product is a shadow. And two different sinusoids are as perpendicular as two functions can be.

```figure:ortho
```

```eq
⟨u, w⟩ = u* w    (conjugate the first argument)
```

```eq
x = Σ ⟨v_k, x⟩ / ⟨v_k, v_k⟩    v_k    when the v_k are orthogonal
```

### The math

Once you have a basis, coordinates are the expansion coefficients. If the basis is orthogonal, each coefficient is an inner product — no matrix inverse needed. Fourier series, the FT, the DTFT, and the DFT are all 'compute inner products against complex exponentials.' For a general (non-normal) matrix A, eigenvectors need not be orthogonal, which is why V can be ill-conditioned even when A is diagonalizable.

**What each symbol means.**

- $\langle x, v\rangle$: the inner product, how well the signal $x$ lines up with the basis signal $v$.
- $v_k$: the $k$-th harmonic (or DFT basis vector).
- $\delta_{k\ell}$: 1 when $k = \ell$, 0 otherwise.

### Worked example: on the earbud

1. Project the 200 Hz buzz onto the 200 Hz harmonic: the 600 Hz and 1 kHz parts average to zero against it.
2. Project onto 600 Hz: now the 200 Hz part averages away.
3. Each projection reads one harmonic without the others getting in the way, which is why the harmonic amounts 1.27, 0.42, 0.25 V can be found one at a time.

**Exam-style example.** The N = 4 DFT basis v\_k[n] = e^(j2π kn / 4), n, k = 0, 1, 2, 3, is orthogonal: ⟨v\_k, v\_ℓ⟩ = 4 δ\_{kℓ}. That is why the inverse DFT divides by N = 4, and why X[k] = ⟨v\_k, x⟩ equals Σ\_n x[n] e^(−j 2π kn / 4). For a non-normal A the eigenvectors need not do this: V\* V is not diagonal, and expanding in modes requires V⁻¹, not a list of inner products.

### What it can't do

Orthogonality is what makes the coefficients easy. Eigenvectors of a general matrix A are not orthogonal, so modes need $V^{-1}$, not projections. It also says nothing about energy; that is Parseval.

**Next question.** Which family of exponentials? That is the next branch: continuous or discrete time, periodic or aperiodic — the four Fourier tools, plus Laplace and Z when you need an ROC.

### Common pitfalls

- Which argument is conjugated must be fixed. With ⟨u, w⟩ = u\* w, the DFT analysis is X[k] = ⟨v\_k, x⟩ for v\_k[n] = e^(j2π kn / N).
- The DFT basis is orthogonal, not orthonormal, until you divide by √N. The 1/N of the inverse DFT is that normalization (all of it on the inverse, in the usual convention).
- Stability of A (Re(λ) &lt; 0) does not prevent transient growth when the eigenbasis is skewed — a non-normal A can still kick hard before it decays.
