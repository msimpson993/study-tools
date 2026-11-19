---
id: dtft
order: 14
title: DTFT
addsToExample: "Maps the speaker's two poles to the z-plane after sampling at 8 kHz: radius e^(−σT) ≈ 0.85, angle ω_dT ≈ 31°."
accountsFor: "Where the digital filter's peak sits on the unit circle, and why the sampled speaker is still stable."
category: signals
neighbors:
  - dft
  - ft
  - laplace
  - sampling
matlab: "[H, w] = freqz(b, a)    % or fft(x, Nfft) as samples of the DTFT of a finite x"
exampleScene: { overlays: [sampler, zplane], caption: "Sampled at 8 kHz, the poles land inside the unit circle at radius 0.85, angle 31°." }
level: Some algebra
check: [c-dtft-1, c-samp-1, q4]
---

**The question:** what is the spectrum of a sampled signal? It follows *Sampling*: it is the Z-transform on the unit circle, z = e^(jΩ), periodic in Ω with period 2π.

### The big idea

The frequency content of a sequence, why discrete time forces a periodic frequency axis, and the discrete-time convolution theorem.

### See it

**Picture it first.** Sample a signal and its spectrum copies itself every 2π. The DTFT is that periodic spectrum, the sum of all the copies.

```figure:dtft
```

```figure:sampling
```

$$X(e^{j\Omega})=\sum_{n=-\infty}^{\infty} x[n]\,e^{-j\Omega n}$$

$$x[n]=\frac{1}{2\pi}\int_{\text{any }2\pi\text{ interval}} X(e^{j\Omega})\,e^{j\Omega n}\,d\Omega$$

### The math

The DTFT is the analysis of a discrete-time, typically aperiodic, sequence against e^(j Ω n). Sampling in time periodizes frequency: e^(j(Ω + 2π) n) = e^(j Ω n), so X(e^(jΩ)) is always 2π-periodic in the radian frequency Ω (radians per sample). The inverse still has a 1/2π, now integrating over any 2π interval. The DTFT of an LTI system's impulse response is its frequency response.

**What each symbol means.**

- $x[n]$: the $n$-th sample.
- $\Omega$: frequency in radians per sample ($\Omega = 2\pi f/f_s$); the spectrum repeats every $2\pi$.
- $X(e^{j\Omega})$: the DTFT, the Z-transform on the unit circle.

### Worked example: on the earbud

1. Sample the click ring at 8 kHz, $T = 0.125$ ms.
2. Each pole $s = -\sigma \pm j\omega_d$ maps to $z = e^{sT}$: radius $e^{-\sigma T} \approx 0.85$, angle $\omega_d T \approx 31°$.
3. The DTFT peaks where the unit circle passes closest to those poles, at about $31°/360° \times 8$ kHz ≈ 690 Hz, the ring frequency.

**Exam-style example.** For x[n] = (1/2)^n u[n], the DTFT is X(e^(jΩ)) = 1 / (1 − ½ e^(−jΩ)), which is the Z-transform 1 / (1 − ½ z^(−1)) evaluated on the unit circle (legal because the ROC is |z| &gt; 1/2). At Ω = 0, X = 2. At Ω = π, X = 2/3. At Ω = π/2, X = 0.8 − 0.4j, with magnitude 2/√5 ≈ 0.894.

### What it can't do

The DTFT is a continuous function of Ω built from infinitely many samples, so a computer cannot evaluate it exactly. The DFT samples it at N points from a finite block.

**Next question.** In practice you compute only finitely many samples of this continuous function of Ω, at Ω = 2π k / N: that is the DFT of a finite record. If the sequence is the samples of a continuous-time signal, the periodization is aliasing.

### Common pitfalls

- Ω is radians per sample, not rad/s. To convert, Ω = ω T = 2π f / f\_s. Nyquist is Ω = π, not π/T, in these units.
- The DTFT is not the DFT. The DFT is samples of a DTFT (of a finite or periodically extended record).
- Writing X(Ω) instead of X(e^(jΩ)) is common and harmless, but the argument really lives on the unit circle in the z-plane.
