---
id: fs
order: 14
title: Fourier series
category: transforms
chain:
  - title: What if the continuous-time signal is periodic?
  - title: Which exponentials actually fit in one period?
  - title: Fourier series
    detail: Time continuous and periodic → frequency discrete and aperiodic (a line spectrum).
neighbors:
  - ft
  - dft
  - ortho
  - lti
matlab: c = fft(x) / N    % x = one period, N samples; this is a DFS / sampled-period approximation
---

A period-T signal is already a discrete superposition of harmonics e^{j k ω₀ t} with ω₀ = 2π / T. The coefficients are inner products over one period. Periodicity in time is what makes frequency discrete; the spectrum is a train of lines, and it is not periodic in k. Convention here: analysis carries the 1/T, synthesis is the unweighted sum.

**Picture it first.** Any periodic signal is a chain of rotating arrows. Add arrows of the right lengths, spinning at multiples of the base frequency, and the tip draws the waveform.

```figure:fs
```

$$c_k=\frac{1}{T}\int_{\text{one period }T} x(t)\,e^{-jk\omega_0 t}\,dt,\qquad \omega_0=\frac{2\pi}{T}$$

$$x(t)=\sum_{k=-\infty}^{\infty} c_k\,e^{jk\omega_0 t}$$

````callout:note What this answers
How a periodic continuous-time signal is a discrete set of harmonic phasors, and why periodic time ⇔ discrete frequency.
````

````callout:note What it raises
If you also discretize time (or take one period of a sampled periodic signal), frequency becomes discrete and periodic: the DFT. If you drop periodicity but keep continuous time, the lines smear into the FT.
````

````callout:note Mini example
x(t) = cos(2π t) has period T = 1 and ω₀ = 2π. Because cos θ = (e^{jθ} + e^{−jθ})/2, the series is a two-line spectrum: c₁ = c\_{−1} = 1/2, and c\_k = 0 otherwise. There is no DC term (c₀ = 0). If you instead expand a square wave, infinitely many odd harmonics appear, with amplitude falling as 1/k, and partial sums show the Gibbs overshoot.
````

### Common pitfalls

- Some books put the 1/T on the synthesis side (and use c\_k = ∫ x e^{−j k ω₀ t} dt). Mixing the two conventions off by a factor of T is a standard error.
- The series represents the periodic extension. If your period is just a record you plan to treat as aperiodic, you want the FT or a DTFT, not a Fourier series.
- A real x has c\_{−k} = conjugate(c\_k). For a cosine, the two lines are equal and real; for a sine they are imaginary and odd.
