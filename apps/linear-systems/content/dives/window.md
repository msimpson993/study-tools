---
id: window
order: 16
title: Windowing and leakage
addsToExample: "Takes a steady 690 Hz hum near the resonance, 64 samples at 8 kHz. The bins are 125 Hz apart and 690 Hz falls between bins 5 and 6, so its peak reads about 4 dB low on both and smears over the neighbours; a tapered (Hann) window lowers the far skirts at the cost of a wider peak. (The click ring itself is no test of leakage: it has died out, to 4 × 10⁻⁵, well before 64 samples, and its spectrum is wide because of damping.)"
accountsFor: "Why the DFT of a pure tone is not one clean spike, and why the ANC chip's frequency estimates need a window."
category: signals
neighbors:
  - dft
  - dtft
  - parseval
  - sampling
matlab: "X = fft(x .* hann(N))"
exampleScene: { overlays: [dft], caption: "The click ring's DFT is wide because the ring dies out in under 1 ms (damping, not leakage); leakage is a steady tone falling between bins." }
---

**The question:** what does cutting out a finite block do to the spectrum? It follows *DFT / FFT*: a block is the signal times a window, so the spectrum is smeared by the window's own spectrum, and a tone between bins leaks into its neighbours.

A finite record x[n]w[n] has transform (1/2π)X ⊛ W: each spectral line is replaced by a copy of the window's transform. For the rectangular window W is a Dirichlet kernel, sin(NΩ/2)/sin(Ω/2), with a main lobe 4π/N wide and side lobes only 13 dB down.

$$x[n]\,w[n]\;\longleftrightarrow\;\frac{1}{2\pi}\int X(e^{j\theta})\,W(e^{j(\Omega-\theta)})\,d\theta$$

```figure:window
```

````callout:note What this answers
Why a tone that fits a whole number of periods in the block lands in one bin, and any other tone leaks into all of them.
````

````callout:note What it raises
Zero-padding samples the same smeared spectrum more finely; it does not add resolution. Only a longer record narrows the main lobe.
````

````callout:note Mini example
N = 64 at 8 kHz gives bins every 125 Hz. A steady 750 Hz hum sits exactly on bin 6 and shows a single spike. A steady 690 Hz hum near the resonance sits at bin 5.52 and spreads: bins 5 and 6 both read about 4 dB below the true peak (−4.7 and −3.2 dB for a cosine; a real tone's split depends on its phase, for example a sine reads about −3.9 dB in both), with a long tail of side lobes.
````

### Common pitfalls

- Leakage is not aliasing: aliasing comes from sampling too slowly, leakage from a finite record.
- A window changes the amplitude of a peak; correct for its coherent gain when reading amplitudes.
