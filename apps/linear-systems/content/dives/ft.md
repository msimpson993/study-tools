---
id: ft
order: 9
title: Fourier transform
addsToExample: "Plots the speaker's frequency response |H(j2πf)|: flat in the bass, a peak near 660 Hz, then falling at 40 dB per decade."
accountsFor: "Why earbuds sound the way they do across the band, and which frequencies the ANC has to fight."
category: signals
neighbors:
  - fs
  - dtft
  - laplace
  - lti
matlab: X = fourier(x, t, w)    % Symbolic Math Toolbox; or fft of a sampled record as an approximation
exampleScene: { overlays: [tone, bode], caption: "A 500 Hz tone comes out scaled by |H| at 500 Hz: one point on the frequency response." }
level: Some algebra
check: [c-ft-1, c-ft-2]
---

**The question:** what happens on the jω axis (or the unit circle)? This is the box *Fourier: split into sines*: setting s = jω keeps only pure tones, and H(jω) says how much each tone is scaled and shifted. The Fourier series, Fourier transform, DTFT and DFT are the four versions of that idea.

### The big idea

The frequency content of a nonperiodic continuous-time signal, and the continuous-time half of the convolution theorem: convolution in t is multiplication in ω.

### See it

**Picture it first.** Wind the signal around a circle at some rate. If the signal has a component at that rate, its bumps pile up on one side; otherwise they cancel. The pile's size, as a function of the winding rate, is the Fourier transform.

```figure:ft
```

$$X(j\omega)=\int_{-\infty}^{\infty} x(t)\,e^{-j\omega t}\,dt$$

$$x(t)=\frac{1}{2\pi}\int_{-\infty}^{\infty} X(j\omega)\,e^{j\omega t}\,d\omega$$

### The math

The Fourier transform is the analysis formula for a continuous aperiodic time signal against the basis {e^(jω t)}. The transform is a function of a continuous frequency ω, and (unlike the DTFT) it is not periodic in ω, because a continuous-time exponential e^(jω t) does not repeat when you add 2π to ω. Convention here: radian frequency ω in rad/s, with the 1/2π factor on the inverse.

**What each symbol means.**

- $x(t)$: a signal in time (volts, or µm of cone motion).
- $X(j\omega)$: how much of the pitch $\omega$ it contains, with its phase.
- $\omega$: angular frequency in rad/s ($\omega = 2\pi f$).
- $e^{-j\omega t}$: the 'winding' tone the signal is compared with.

### Worked example: on the earbud

1. The earbud's frequency response is the Fourier transform of its click response: $H(j2\pi f)$.
2. Read it off the model: ×1.07 at 200 Hz, a peak of ×1.85 near 658 Hz (−3 dB band 394–842 Hz), ×0.81 at 1 kHz, ×0.06 at 3 kHz.
3. Above the resonance it falls at 40 dB per decade, the signature of two poles: the cone mass can't keep up.

**Exam-style example.** For x(t) = e^(−t) u(t), the integral gives X(jω) = 1/(1 + jω). This is the restriction of the Laplace transform 1/(s+1) to s = jω, which is legal because the jω axis lies in the ROC Re(s) &gt; −1. At DC, X(j0) = 1. At ω = 1, |X(j1)| = 1/√2. As ω → ∞, |X| falls as 1/ω — a single pole, one order of rolloff.

**Width of the peak.** How sharp a resonance is depends on how far left its poles sit. For a lightly damped pole pair −σ ± jω\_d the half-power width of the peak is about σ/π Hz: a long, slowly dying ring is a narrow line, a short ring a broad smear. For the earbud σ/π ≈ 403 Hz; its actual half-power band runs from 394 to 842 Hz, 448 Hz wide (the rule is rough at ζ ≈ 0.28). The same trade returns as record length in the DFT. Try it with the [earbud on the six-domains board](#/board?pair=ft&preset=earbud) (drawn in ms and kHz).

### What it can't do

The integral needs the signal to fade out. A signal that switches on and grows (an unstable ring, a ramp) has no Fourier transform, and the transform alone says nothing about start-up transients. That motivates Laplace and Z.

**Next question.** What if x is periodic? Then only discrete harmonics fit, and you want a Fourier series. What if you only have samples? Then the DTFT, and a periodized frequency axis.

### Common pitfalls

- Books disagree about where the 2π goes, and about ω versus f in hertz. State the convention before comparing numbers. This page uses ω with 1/2π on the inverse.
- Sinusoids and complex exponentials that last for all time are not L1, and their FTs are distributions (impulses), not ordinary functions.
- Existence is not guaranteed: a constant, a step, or a growing exponential needs the Laplace transform (and an ROC), or distribution theory.
