---
id: dtft
order: 15
title: DTFT
category: transforms
chain:
  - title: What if time is already a sequence?
    detail: A discrete-time signal, or samples of a continuous one.
  - title: How do I write it in the exponential basis z^n at z = e^{jΩ}?
  - title: The DTFT
    detail: Time discrete and aperiodic → frequency continuous and 2π-periodic.
neighbors:
  - dft
  - ft
  - laplace
  - sampling
matlab: "[H, w] = freqz(b, a)    % or fft(x, Nfft) as samples of the DTFT of a finite x"
---

The DTFT is the analysis of a discrete-time, typically aperiodic, sequence against e^{j Ω n}. Sampling in time periodizes frequency: e^{j(Ω + 2π) n} = e^{j Ω n}, so X(e^{jΩ}) is always 2π-periodic in the radian frequency Ω (radians per sample). The inverse still has a 1/2π, now integrating over any 2π interval. The DTFT of an LTI system's impulse response is its frequency response.

$$X(e^{j\Omega})=\sum_{n=-\infty}^{\infty} x[n]\,e^{-j\Omega n}$$

$$x[n]=\frac{1}{2\pi}\int_{\text{any }2\pi\text{ interval}} X(e^{j\Omega})\,e^{j\Omega n}\,d\Omega$$

````callout:note What this answers
The frequency content of a sequence, why discrete time forces a periodic frequency axis, and the discrete-time convolution theorem.
````

````callout:note What it raises
In practice you compute only finitely many samples of this continuous function of Ω, at Ω = 2π k / N: that is the DFT of a finite record. If the sequence is the samples of a continuous-time signal, the periodization is aliasing.
````

````callout:note Mini example
For x[n] = (1/2)^n u[n], the DTFT is X(e^{jΩ}) = 1 / (1 − ½ e^{−jΩ}), which is the Z-transform 1 / (1 − ½ z^{−1}) evaluated on the unit circle (legal because the ROC is |z| &gt; 1/2). At Ω = 0, X = 2. At Ω = π, X = 2/3. At Ω = π/2, X = 0.8 − 0.4j, with magnitude 2/√5 ≈ 0.894.
````

### Common pitfalls

- Ω is radians per sample, not rad/s. To convert, Ω = ω T = 2π f / f\_s. Nyquist is Ω = π, not π/T, in these units.
- The DTFT is not the DFT. The DFT is samples of a DTFT (of a finite or periodically extended record).
- Writing X(Ω) instead of X(e^{jΩ}) is common and harmless, but the argument really lives on the unit circle in the z-plane.
