---
id: window
order: 16
title: Windowing and leakage
addsToExample: "Takes a steady 690 Hz hum near the resonance, 64 samples at 8 kHz. The bins are 125 Hz apart and 690 Hz falls between bins 5 and 6, so its peak reads 4.7 dB low in bin 5, 3.2 dB in bin 6, and smears over the neighbours; a tapered (Hann) window lowers the far skirts at the cost of a wider peak. (The click ring itself is no test of leakage: it has died out, to 4 × 10⁻⁵, well before 64 samples, and its spectrum is wide because of damping.)"
accountsFor: "Why the DFT of a pure tone is not one clean spike, and why the ANC chip's frequency estimates need a window."
category: signals
neighbors:
  - dft
  - dtft
  - parseval
  - sampling
matlab: "X = fft(x .* hann(N))"
exampleScene: { overlays: [dft], caption: "The click ring's DFT is wide because the ring dies out in under 1 ms (damping, not leakage); leakage is a steady tone falling between bins." }
level: Some algebra
check: [c-win-1, c-win-2]
---

**The question:** what does cutting out a finite block do to the spectrum? It follows *DFT / FFT*: a block is the signal times a window, so the spectrum is smeared by the window's own spectrum, and a tone between bins leaks into its neighbours.

### The big idea

Cutting a block out of a long signal is like looking through a window. A tone that fits the window a whole number of times lands in one frequency bin; any other tone smears across its neighbours (leakage). Tapering the window's edges trades a slightly wider peak for much less smear.

### See it

```figure:window
```

```figure:dft
```

### The math

A finite record x[n]w[n] has transform (1/2π)X ⊛ W: each spectral line is replaced by a copy of the window's transform. For the rectangular window of M samples (the samples recorded), W is a Dirichlet kernel, sin(MΩ/2)/sin(Ω/2), with a main lobe 4π/M wide and side lobes only 13 dB down. (N stays the DFT length.)

$$x[n]\,w[n]\;\longleftrightarrow\;\frac{1}{2\pi}\int X(e^{j\theta})\,W(e^{j(\Omega-\theta)})\,d\theta$$

**What each symbol means.**

- $w[n]$: the window, the weights applied to the block (rectangular = all ones; Hann = a smooth taper).
- $W(e^{j\Omega})$: the window's own spectrum; its main lobe width and side lobes set the smearing.
- $X(e^{j\Omega})$: the true spectrum, smeared by $W$.

**Choosing a window.** Two numbers describe the damage a finite block does. *Scalloping loss* is how far a tone's peak reads low when it sits exactly half a bin from the nearest bin centre. *ENBW* (equivalent noise bandwidth) is how many bins' worth of noise the window lets into each bin, $M\sum w^2/(\sum w)^2$. For a 64-sample block, every window in its periodic (DFT-even) form, as MATLAB's `hann(M,'periodic')`, with ENBW in bins of that form:

| window | peak side lobe | scalloping loss | ENBW | main lobe (null to null) | use it for |
|---|---|---|---|---|---|
| rectangular | −13 dB | 3.9 dB | 1.00 bin | 2 bins | on-bin tones, transients that fit the block |
| Hann | −31 dB | 1.4 dB | 1.50 bins | 4 bins | general purpose |
| Blackman–Harris (4-term) | −92 dB | 0.8 dB | 2.00 bins | 8 bins | weak tones next to strong ones |
| flat-top | −88 dB | 0.01 dB | 3.77 bins | 10 bins | reading a tone's amplitude |
| Kaiser, β = 6 | −44 dB | 1.5 dB | 1.47 bins | about 4.3 bins | a tunable trade: larger β, lower side lobes, wider lobe |

**Resolution.** Two tones closer than about one main lobe merge into one peak, and the main lobe is a fixed number of bins of width $f_s/M$, where $M$ is the number of samples recorded. So resolution comes from the record length (and the window), not from the DFT length $N$: zero-padding ($N > M$) only samples the same smeared curve more finely.

Try it on the [six-domains board](#/board?pair=dft&preset=offbin), with a generic tone rather than the earbud's hum: an off-bin tone leaking; then [windows compared in dB](#/board?pair=dft&preset=wincomp), [flat-top for amplitude](#/board?pair=dft&preset=flattop), [the Kaiser β trade-off](#/board?pair=dft&preset=kaiserb), and [a record too short to resolve](#/board?pair=fsamp&preset=short) next to [zero-padding with Hann](#/board?pair=fsamp&preset=zpad).

### Worked example: on the earbud

N = 64 at 8 kHz gives bins every 125 Hz. A steady 750 Hz hum sits exactly on bin 6 and shows a single spike. A steady 690 Hz hum near the resonance sits at bin 5.52 and spreads: bins 5 and 6 both read about 4 dB below the true peak (−4.7 and −3.2 dB for a cosine; a real tone's split depends on its phase, for example a sine reads about −3.9 dB in both), with a long tail of side lobes.

### What it can't do

Windowing trades a narrower peak for lower skirts; it can't remove leakage, only reshape it. And all of Fourier assumes steady signals: to handle start-up, growth and decay we need Laplace and Z.

**Next question.** Zero-padding samples the same smeared spectrum more finely; it does not add resolution. Only a longer record narrows the main lobe.

### Common pitfalls

- Leakage is not aliasing: aliasing comes from sampling too slowly, leakage from a finite record.
- A window changes the amplitude of a peak; correct for its coherent gain when reading amplitudes.
