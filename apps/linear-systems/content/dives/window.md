---
id: window
order: 16
title: Windowing and leakage
addsToExample: "Takes a 64-sample block of the speaker's 690 Hz ring at 8 kHz. The bins are 125 Hz apart and 690 Hz falls between them, so the peak smears over several bins; a tapered (Hann) window narrows the smear's skirts at the cost of a wider peak."
accountsFor: "Why the DFT of a pure tone is not one clean spike, and why the ANC chip's frequency estimates need a window."
category: signals
neighbors:
  - dft
  - dtft
  - parseval
  - sampling
matlab: "X = fft(x .* hann(N))"
exampleScene: { overlays: [dft], caption: "64 samples at 8 kHz, bins 125 Hz apart: the 688 Hz ring falls between bins, so its peak reads low and smears (leakage)." }
---

**The question:** what does cutting out a finite block do to the spectrum? It follows *DFT / FFT*: a block is the signal times a window, so the spectrum is smeared by the window's own spectrum, and a tone between bins leaks into its neighbours.

A finite record x[n]w[n] has transform (1/2π)X ⊛ W: each spectral line is replaced by a copy of the window's transform. For the rectangular window W is a Dirichlet kernel, sin(NΩ/2)/sin(Ω/2), with a main lobe 4π/N wide and side lobes only 13 dB down.

$$x[n]\,w[n]\;\longleftrightarrow\;\frac{1}{2\pi}\int X(e^{j\theta})\,W(e^{j(\Omega-\theta)})\,d\theta$$

```figure:dft
```

````callout:note What this answers
Why a tone that fits a whole number of periods in the block lands in one bin, and any other tone leaks into all of them.
````

````callout:note What it raises
Zero-padding samples the same smeared spectrum more finely; it does not add resolution. Only a longer record narrows the main lobe.
````

````callout:note Mini example
N = 64 at 8 kHz gives bins every 125 Hz. A 750 Hz tone sits exactly on bin 6 and shows a single spike; a 690 Hz tone sits at bin 5.52 and spreads, with the two nearest bins both about 4 dB below the true peak and a long tail of side lobes.
````

### Common pitfalls

- Leakage is not aliasing: aliasing comes from sampling too slowly, leakage from a finite record.
- A window changes the amplitude of a peak; correct for its coherent gain when reading amplitudes.
