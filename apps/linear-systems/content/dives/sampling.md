---
id: sampling
order: 13
title: Sampling
addsToExample: "Samples the earbud's microphones in the ANC chip (drawn at 8 kHz so the samples show; real ANC converters run much faster to keep the delay small). Hybrid ANC uses both an outside and an in-ear microphone."
accountsFor: "Why the chip needs an anti-alias filter and a high sample rate, and why delay matters for cancelling noise."
category: signals
neighbors:
  - laplace
  - dtft
  - dft
  - stab
matlab: sysd = c2d(sys, T, 'zoh')    % poles of sysd satisfy z = exp(s*T)
exampleScene: { overlays: [sampler], diagram: [spk-digital, anc-hybrid], caption: "Sample, filter, hold: the digital path inside a hybrid noise-cancelling earbud." }
level: Conceptual
check: [c-samp-1, m14, m15]
---

**The question:** a periodic signal gave a discrete spectrum; what does the reverse, discrete time, do to the spectrum? It comes from *Fourier series*: sampling makes the spectrum periodic, with copies every fs, and anything above fs/2 folds back.

### The big idea

The precise link between the s- and z-planes, why aliases share a z-pole, and why stability regions match under that map.

### See it

**Picture it first.** Two different tones can pass through exactly the same samples. Sampling copies the spectrum at multiples of the rate, and whichever copy falls in the band is what you see.

```figure:sampling
```

```figure:dtft
```

```eq
x[n] = x(n T),    z = e^(s T),    |z| = e^(σ T)
```

```eq
s  and  s + j 2π k / T    map to the same z
```

### The math

Sampling a mode e^(s t) at t = n T produces (e^(s T))^n = z^n, so the planes are related by z = e^(s T). This map is many-to-one: s and s + j 2π k / T land on the same z, which is aliasing. Equivalently, sampling in time periodizes the spectrum with period 2π / T (or f\_s). The left half-plane maps to the interior of the unit circle because |z| = e^(σ T), not because someone chose to draw it that way. Pole mapping of a continuous system under exact discretization is z = e^(s T); a ZOH equivalent also inserts the hold's dynamics, so G\_d(z) is not simply G(s) evaluated at s = (ln z)/T.

**What each symbol means.**

- $f_s$: the sample rate (samples per second); $T = 1/f_s$ the sample spacing.
- $f$: a tone's frequency (Hz).
- $f_s/2$: the Nyquist frequency, the highest pitch the samples can tell apart.
- $z = e^{sT}$: how a continuous rate $s$ appears after sampling.

### Worked example: on the earbud

1. Draw the ANC chip sampling at 8 kHz, so the Nyquist frequency is 4 kHz.
2. A 5 kHz tone gives exactly the same samples as a 3 kHz tone, and a 7 kHz tone the same as 1 kHz: they alias.
3. So the microphones need an anti-alias low-pass filter before the converter, and real ANC chips sample much faster than 8 kHz to keep the delay small.

**Exam-style example.** Sample x(t) = cos(2π · 5 t) at f\_s = 6 Hz (T = 1/6). Then x[n] = cos(2π · 5 n / 6) = cos(2π n − 2π n / 6) = cos(2π · 1 · n / 6): a 1 Hz discrete-time cosine. The two complex poles at e^(± j 2π · 5 / 6) are the same unit-circle points as e^(∓ j 2π · 1 / 6). You cannot tell from the samples whether the original tone was at 5 Hz or at 1 Hz — that is the many-to-one map s → e^(s T).

### Back to continuous time: reconstruction

To turn samples back into a curve, each sample is replaced by a copy of a *reconstruction kernel* and the copies are added (a convolution).

- **Zero-order hold (ZOH):** hold each sample for one period T, a staircase. It is causal (it needs only the samples so far), its average delay is T/2, and its frequency response droops like sin(πf/f\_s)/(πf/f\_s): about 3.9 dB down at f\_s/2. This is what a DAC does.
- **First-order hold (FOH)**, drawn here as straight chords between samples (a triangle kernel): smoother, and it suppresses the spectral copies (images) better, but it droops more in band (its response is the ZOH's squared, about 7.8 dB down at f\_s/2), and each chord needs the next sample, so it runs one sample late.
- **Ideal (sinc) reconstruction:** a brick-wall low-pass at f\_s/2. It rebuilds a band-limited signal exactly, but the sinc kernel is infinitely long and non-causal, so real systems only approximate it.

See them side by side on the [six-domains board](#/board?pair=samp&preset=zohsinc), with [a tone aliasing](#/board?pair=samp&preset=alias) and [the poles carried by z = e^(sT)](#/board?pair=map&preset=oversamp).

### What it can't do

Sampling decides which pitches survive, but it does not yet give a spectrum we can compute. The sampled signal's spectrum is the DTFT, and that repeats every $f_s$.

**Next question.** The sampled signal's own spectrum: the DTFT, and how the four Fourier tools are the periodize-or-sample versions of one another.

### Common pitfalls

- Nyquist is f\_s / 2, or Ω = π rad/sample. A real signal whose spectrum is not strictly bandlimited to that will alias, even if a single tone looks like a valid lower frequency.
- Exactly at f\_s/2 the samples can lose the tone altogether: a cosine at f\_s/2 sampled at its zero crossings gives all zeros. So the sample rate must be strictly above twice the highest frequency ([see it at z = −1](#/board?pair=map&preset=atnyq)).
- c2d(sys, T, 'zoh') is not the substitution s = (ln z)/T into G(s). Poles do map as z = e^(s T); zeros generally do not.
- Impulse-invariant and bilinear (Tustin) mappings are different choices, with different frequency warping. Name the method when you discretize.
