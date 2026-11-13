---
id: ft
order: 13
title: Fourier transform
addsToExample: "Evaluates the cart on s = jω: its frequency response, a resonance-free low-pass for this damping."
accountsFor: "How much a vibration at each frequency moves the cart."
category: transforms
chain:
  - title: Eigenfunctions of continuous-time LTI systems are e^{jω t} (and e^{st}).
  - title: How do I write an aperiodic continuous-time signal in that basis?
  - title: The Fourier transform
    detail: Time continuous and aperiodic → frequency continuous and aperiodic.
neighbors:
  - fs
  - dtft
  - laplace
  - lti
matlab: X = fourier(x, t, w)    % Symbolic Math Toolbox; or fft of a sampled record as an approximation
---

The Fourier transform is the analysis formula for a continuous aperiodic time signal against the basis {e^{jω t}}. The transform is a function of a continuous frequency ω, and (unlike the DTFT) it is not periodic in ω, because a continuous-time exponential e^{jω t} does not repeat when you add 2π to ω. Convention here: radian frequency ω in rad/s, with the 1/2π factor on the inverse.

**Picture it first.** Wind the signal around a circle at some rate. If the signal has a component at that rate, its bumps pile up on one side; otherwise they cancel. The pile's size, as a function of the winding rate, is the Fourier transform.

```figure:ft
```

$$X(j\omega)=\int_{-\infty}^{\infty} x(t)\,e^{-j\omega t}\,dt$$

$$x(t)=\frac{1}{2\pi}\int_{-\infty}^{\infty} X(j\omega)\,e^{j\omega t}\,d\omega$$

````callout:note What this answers
The frequency content of a nonperiodic continuous-time signal, and the continuous-time half of the convolution theorem: convolution in t is multiplication in ω.
````

````callout:note What it raises
What if x is periodic? Then only discrete harmonics fit, and you want a Fourier series. What if you only have samples? Then the DTFT, and a periodized frequency axis.
````

````callout:note Mini example
For x(t) = e^{−t} u(t), the integral gives X(jω) = 1/(1 + jω). This is the restriction of the Laplace transform 1/(s+1) to s = jω, which is legal because the jω axis lies in the ROC Re(s) &gt; −1. At DC, X(j0) = 1. At ω = 1, |X(j1)| = 1/√2. As ω → ∞, |X| falls as 1/ω — a single pole, one order of rolloff.
````

### Common pitfalls

- Books disagree about where the 2π goes, and about ω versus f in hertz. State the convention before comparing numbers. This page uses ω with 1/2π on the inverse.
- Sinusoids and complex exponentials that last for all time are not L1, and their FTs are distributions (impulses), not ordinary functions.
- Existence is not guaranteed: a constant, a step, or a growing exponential needs the Laplace transform (and an ROC), or distribution theory.
