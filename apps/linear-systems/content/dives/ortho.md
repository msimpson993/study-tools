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
---

**The question:** why can a signal be split into tones without the pieces interfering? It comes from *Fourier*: tones at different frequencies are orthogonal, so each coefficient is a projection that can be read off on its own.

Once you have a basis, coordinates are the expansion coefficients. If the basis is orthogonal, each coefficient is an inner product — no matrix inverse needed. Fourier series, the FT, the DTFT, and the DFT are all 'compute inner products against complex exponentials.' For a general (non-normal) matrix A, eigenvectors need not be orthogonal, which is why V can be ill-conditioned even when A is diagonalizable.

**Picture it first.** A dot product is a shadow. And two different sinusoids are as perpendicular as two functions can be.

```figure:ortho
```

```eq
⟨u, w⟩ = u* w    (conjugate the first argument)
```

```eq
x = Σ ⟨v_k, x⟩ / ⟨v_k, v_k⟩    v_k    when the v_k are orthogonal
```

````callout:note What this answers
How to read off coordinates with inner products, and why the analysis formula of every Fourier tool is an inner product against an exponential.
````

````callout:note What it raises
Which family of exponentials? That is the next branch: continuous or discrete time, periodic or aperiodic — the four Fourier tools, plus Laplace and Z when you need an ROC.
````

````callout:note Mini example
The N = 4 DFT basis v\_k[n] = e^(j2π kn / 4), n, k = 0, 1, 2, 3, is orthogonal: ⟨v\_k, v\_ℓ⟩ = 4 δ\_{kℓ}. That is why the inverse DFT divides by N = 4, and why X[k] = ⟨v\_k, x⟩ equals Σ\_n x[n] e^(−j 2π kn / 4). For a non-normal A the eigenvectors need not do this: V\* V is not diagonal, and expanding in modes requires V⁻¹, not a list of inner products.
````

### Common pitfalls

- Which argument is conjugated must be fixed. With ⟨u, w⟩ = u\* w, the DFT analysis is X[k] = ⟨v\_k, x⟩ for v\_k[n] = e^(j2π kn / N).
- The DFT basis is orthogonal, not orthonormal, until you divide by √N. The 1/N of the inverse DFT is that normalization (all of it on the inverse, in the usual convention).
- Stability of A (Re(λ) &lt; 0) does not prevent transient growth when the eigenbasis is skewed — a non-normal A can still kick hard before it decays.
