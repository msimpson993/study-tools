---
id: parseval
order: 12
title: Parseval's theorem
addsToExample: "Adds up the energy in the speaker's click response two ways: ∫h(t)²dt in time, and (1/2π)∫|H(jω)|²dω in frequency. Most of it sits near the resonance, where |H| peaks."
accountsFor: "Why cancelling the strongest few frequencies removes most of the noise energy, which is why ANC focuses on the low, loud part of the band."
category: signals
neighbors:
  - ortho
  - fs
  - ft
  - dft
matlab: "sum(abs(x).^2) - sum(abs(fft(x)).^2)/numel(x)    % ≈ 0"
exampleScene: { overlays: [click, bode], caption: "The click's energy in time equals the area under |H|² in frequency." }
level: Some algebra
check: [c-pars-1, c-fs-1]
---

**The question:** if the pieces are perpendicular, how does the energy split among them? It is the second step from *Orthogonality*: like Pythagoras, the energy of the signal is the sum of the energies of its harmonics, in time or in frequency.

### The big idea

Where a signal's energy is, and how to compute energy in whichever domain is easier.

### See it

**Picture it first.** Add harmonics one at a time: each adds |cₖ|² to the power, and the partial sums close in on the signal's total.

```figure:fs
```

```figure:ortho
```

### The math

Orthogonal pieces add their energies, so the Fourier transform preserves energy (up to the 2π convention):

$$\int_{-\infty}^{\infty}|x(t)|^2dt=\frac{1}{2\pi}\int_{-\infty}^{\infty}|X(j\omega)|^2d\omega,\qquad \frac1T\int_T|x(t)|^2dt=\sum_k|c_k|^2,\qquad \sum_n|x[n]|^2=\frac1N\sum_k|X[k]|^2.$$

**What each symbol means.**

- $|x(t)|^2$: power at an instant; its integral is the energy.
- $|X(j\omega)|^2$: the energy density at pitch $\omega$.
- $c_k$: harmonic amounts of a periodic signal; $|c_k|^2$ the power in harmonic $k$.
- $X[k]$, $N$: DFT bins and block length.

### Worked example: on the earbud

A square wave of amplitude 1 has power 1. Its harmonics are cₖ = 2/(jπk) for odd k, so the fundamental pair carries 2·(2/π)² = 8/π² ≈ 0.81 of the power. Harmonics 1–3 (only 1 and 3 are nonzero) carry 0.90; adding the 5th gives 0.93.

### What it can't do

Parseval counts energy but throws away phase: two very different signals can have the same energy spectrum. It also needs the signal to have finite energy, so it does not apply to a growing ring.

**Next question.** Cutting out a block of a signal changes its spectrum (windowing), so measured energy per bin depends on the window.

### Common pitfalls

- Mind the convention: with frequency in Hz there is no 1/2π.
- Energy (finite-energy signals) and power (periodic signals) are different versions.
