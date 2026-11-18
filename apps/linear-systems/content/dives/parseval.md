---
id: parseval
order: 12
title: Parseval's theorem
addsToExample: "Adds up the energy in the speaker's click response two ways: ∫h(t)²dt in time, and (1/2π)∫|H(jω)|²dω in frequency. Most of it sits near the resonance, where |H| peaks."
accountsFor: "Why cancelling the strongest few frequencies removes most of the noise energy, which is why ANC focuses on the low, loud part of the band."
category: signals
chain:
  - title: If the Fourier pieces are perpendicular, how does energy split among them?
  - title: Like Pythagoras
    detail: The total energy is the sum of the energies of the pieces.
  - title: Energy in time = energy in frequency
    detail: ∫|x|²dt = (1/2π)∫|X|²dω; for a series, power = Σ|cₖ|².
neighbors:
  - ortho
  - fs
  - ft
  - dft
matlab: "sum(abs(x).^2) - sum(abs(fft(x)).^2)/numel(x)    % ≈ 0"
exampleScene: { overlays: [click, bode], caption: "The click's energy in time equals the area under |H|² in frequency." }
---

Orthogonal pieces add their energies, so the Fourier transform preserves energy (up to the 2π convention):

$$\int_{-\infty}^{\infty}|x(t)|^2dt=\frac{1}{2\pi}\int_{-\infty}^{\infty}|X(j\omega)|^2d\omega,\qquad \frac1T\int_T|x(t)|^2dt=\sum_k|c_k|^2,\qquad \sum_n|x[n]|^2=\frac1N\sum_k|X[k]|^2.$$

**Picture it first.** Add harmonics one at a time: each adds |cₖ|² to the power, and the partial sums close in on the signal's total.

```figure:fs
```

````callout:note What this answers
Where a signal's energy is, and how to compute energy in whichever domain is easier.
````

````callout:note What it raises
Cutting out a block of a signal changes its spectrum (windowing), so measured energy per bin depends on the window.
````

````callout:note Mini example
A square wave of amplitude 1 has power 1. Its harmonics are cₖ = 2/(jπk) for odd k, so the fundamental pair carries 2·(2/π)² = 8/π² ≈ 0.81 of the power, and the first three odd harmonics about 0.93.
````

### Common pitfalls

- Mind the convention: with frequency in Hz there is no 1/2π.
- Energy (finite-energy signals) and power (periodic signals) are different versions.
