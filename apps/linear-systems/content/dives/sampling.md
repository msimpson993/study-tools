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
---

**The question:** a periodic signal gave a discrete spectrum; what does the reverse, discrete time, do to the spectrum? It comes from *Fourier series*: sampling makes the spectrum periodic, with copies every fs, and anything above fs/2 folds back.

Sampling a mode e^(s t) at t = n T produces (e^(s T))^n = z^n, so the planes are related by z = e^(s T). This map is many-to-one: s and s + j 2π k / T land on the same z, which is aliasing. Equivalently, sampling in time periodizes the spectrum with period 2π / T (or f\_s). The left half-plane maps to the interior of the unit circle because |z| = e^(σ T), not because someone chose to draw it that way. Pole mapping of a continuous system under exact discretization is z = e^(s T); a ZOH equivalent also inserts the hold's dynamics, so G\_d(z) is not simply G(s) evaluated at s = (ln z)/T.

**Picture it first.** Two different tones can pass through exactly the same samples. Sampling copies the spectrum at multiples of the rate, and whichever copy falls in the band is what you see.

```figure:sampling
```

```eq
x[n] = x(n T),    z = e^(s T),    |z| = e^(σ T)
```

```eq
s  and  s + j 2π k / T    map to the same z
```

````callout:note What this answers
The precise link between the s- and z-planes, why aliases share a z-pole, and why stability regions match under that map.
````

````callout:note What it raises
Which reconstruction (ZOH, first-order hold, sinc) you use when going back to continuous time, and how the four Fourier tools are the periodize-or-sample versions of one another.
````

````callout:note Mini example
Sample x(t) = cos(2π · 5 t) at f\_s = 6 Hz (T = 1/6). Then x[n] = cos(2π · 5 n / 6) = cos(2π n − 2π n / 6) = cos(2π · 1 · n / 6): a 1 Hz discrete-time cosine. The two complex poles at e^(± j 2π · 5 / 6) are the same unit-circle points as e^(∓ j 2π · 1 / 6). You cannot tell from the samples whether the original tone was at 5 Hz or at 1 Hz — that is the many-to-one map s → e^(s T).
````

### Common pitfalls

- Nyquist is f\_s / 2, or Ω = π rad/sample. A real signal whose spectrum is not strictly bandlimited to that will alias, even if a single tone looks like a valid lower frequency.
- c2d(sys, T, 'zoh') is not the substitution s = (ln z)/T into G(s). Poles do map as z = e^(s T); zeros generally do not.
- Impulse-invariant and bilinear (Tustin) mappings are different choices, with different frequency warping. Name the method when you discretize.
