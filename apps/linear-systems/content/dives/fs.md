---
id: fs
order: 11
title: Fourier series
addsToExample: "Plays a 200 Hz square-wave buzz through the speaker: harmonics at 200, 600, 1000 Hz, … each scaled by |H| at its own frequency."
accountsFor: "Why the 600 Hz harmonic is boosted near the resonance and the high harmonics fade."
category: signals
neighbors:
  - ft
  - dft
  - ortho
  - lti
matlab: c = fft(x) / N    % x = one period, N samples; this is a DFS / sampled-period approximation
exampleScene: { overlays: [series, forces], caption: "A buzz is a sum of harmonics; the speaker scales each by |H| at its own frequency." }
level: Some algebra
check: [c-fs-1, c-pars-1]
---

**The question:** how do you find each harmonic of a periodic signal? It follows *Orthogonality*: project the signal onto each harmonic e^(jkω₀t) in turn, and the projections are the Fourier series coefficients.

### The big idea

How a periodic continuous-time signal is a discrete set of harmonic phasors, and why periodic time ⇔ discrete frequency.

### See it

**Picture it first.** Any periodic signal is a chain of rotating arrows. Add arrows of the right lengths, spinning at multiples of the base frequency, and the tip draws the waveform.

```figure:fs
```

```figure:ortho
```

$$c_k=\frac{1}{T}\int_{\text{one period }T} x(t)\,e^{-jk\omega_0 t}\,dt,\qquad \omega_0=\frac{2\pi}{T}$$

$$x(t)=\sum_{k=-\infty}^{\infty} c_k\,e^{jk\omega_0 t}$$

### The math

A period-T signal is already a discrete superposition of harmonics e^(j k ω₀ t) with ω₀ = 2π / T. The coefficients are inner products over one period. Periodicity in time is what makes frequency discrete; the spectrum is a train of lines, and it is not periodic in k. Convention here: analysis carries the 1/T, synthesis is the unweighted sum.

**What each symbol means.**

- $T$: the repeat period (s); $\omega_0 = 2\pi/T$ the fundamental angular frequency.
- $c_k$: the complex amount of the $k$-th harmonic (its size and phase).
- $x(t)$: the repeating signal (volts).

### Worked example: on the earbud

1. A 200 Hz square-wave buzz of amplitude 1 V has sine harmonics of size 4/(πk) V for odd k: 1.27 V at 200 Hz, 0.42 V at 600 Hz, 0.25 V at 1 kHz.
2. The earbud scales each by its gain at that pitch: ×1.07, ×1.79 and ×0.81.
3. So in the cone motion the 600 Hz harmonic is boosted relative to the fundamental, and the sharp corners of the square are rounded off: the high harmonics fade.

**Exam-style example.** x(t) = cos(2π t) has period T = 1 and ω₀ = 2π. Because cos θ = (e^(jθ) + e^(−jθ))/2, the series is a two-line spectrum: c₁ = c\_{−1} = 1/2, and c\_k = 0 otherwise. There is no DC term (c₀ = 0). If you instead expand a square wave, infinitely many odd harmonics appear, with amplitude falling as 1/k, and partial sums show the Gibbs overshoot.

On the [six-domains board](#/board?pair=fs&preset=fsview): repeat the ring periodically and its spectrum becomes a row of harmonic lines under the same envelope.

### What it can't do

A Fourier series only describes signals that repeat for ever. A single click or a word happens once; for those the harmonics merge into a continuum, the Fourier transform.

**Next question.** If you also discretize time (or take one period of a sampled periodic signal), frequency becomes discrete and periodic: the DFT. If you drop periodicity but keep continuous time, the lines smear into the FT.

### Common pitfalls

- Some books put the 1/T on the synthesis side (and use c\_k = ∫ x e^(−j k ω₀ t) dt). Mixing the two conventions off by a factor of T is a standard error.
- The series represents the periodic extension. If your period is just a record you plan to treat as aperiodic, you want the FT or a DTFT, not a Fourier series.
- A real x has c\_{−k} = conjugate(c\_k). For a cosine, the two lines are equal and real; for a sine they are imaginary and odd.
