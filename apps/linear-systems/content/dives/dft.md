---
id: dft
order: 15
title: DFT
addsToExample: "Analyses a 64-sample block of the speaker's ring: bins every 125 Hz at 8 kHz. The click ring's own spectrum is ≈400 Hz wide because it decays in under 1 ms, so it covers several bins whatever the bin spacing."
accountsFor: "How the ANC chip can see which frequencies are loud right now."
category: signals
neighbors:
  - dtft
  - fs
  - ortho
  - sampling
matlab: "X = fft(x, N)    % inverse: x = ifft(X)"
exampleScene: { overlays: [dft, sampler], caption: "N = 64 samples in, 64 frequency bins out, 125 Hz apart." }
level: Some algebra
check: [c-dft-1, m16, c-win-1]
---

**The question:** a computer has only N samples and can only list N numbers; what does it compute? It follows the *DTFT*: the DFT samples the DTFT at N equally spaced frequencies, fs/N apart.

### The big idea

The computable transform, its implicit periodic extension in time, and when a tone lands cleanly on a bin (or leaks).

### See it

**Picture it first.** The DTFT lives on the whole unit circle. The DFT is what you get by looking at N equally spaced points of it.

```figure:dft
```

```figure:window
```

$$X[k]=\sum_{n=0}^{N-1} x[n]\,e^{-j2\pi kn/N}$$

$$x[n]=\frac{1}{N}\sum_{k=0}^{N-1} X[k]\,e^{j2\pi kn/N}$$

### The math

The N-point DFT is the discrete Fourier series of a length-N sequence viewed as one period of a periodic signal. Equivalently, it is the DTFT of that finite record, sampled at Ω = 2π k / N. Frequency is now discrete and periodic with period N. This is the one you actually compute, via the FFT. Convention here, and in MATLAB: the forward transform is the unnormalized sum, and the inverse carries 1/N.

**What each symbol means.**

- $N$: the block length (samples).
- $X[k]$: the $k$-th bin, the DTFT sampled at $\Omega = 2\pi k/N$.
- $f_s/N$: the bin spacing in Hz.

### Worked example: on the earbud

1. Take a 64-sample block at 8 kHz: bins every 8000/64 = 125 Hz.
2. The click ring decays in under a millisecond, so its spectrum is about 400 Hz wide and covers several bins whatever the spacing.
3. A steady 750 Hz hum lands exactly on bin 6 and shows one spike.

**Exam-style example.** Take N = 4 and x[n] = cos(π n / 2) = [1, 0, −1, 0], which is exactly one period of a bin-1 cosine. Then X[k] = fft(x) = [0, 2, 0, 2]: the energy sits at k = 1 and k = 3 (≡ −1 mod 4), each with amplitude N/2 = 2, as the analysis of (e^(j π n / 2) + e^(−j π n / 2))/2 predicts. A tone whose frequency is not an integer number of cycles in N still has a DTFT peaked at that Ω, but the DFT samples miss the peak and you see leakage into every bin.

On the [six-domains board](#/board?pair=dft&preset=onbin), with a generic tone rather than the earbud: an on-bin tone lands in a single bin; compare [an off-bin tone](#/board?pair=dft&preset=offbin) and [N < M, truncation](#/board?pair=fsamp&preset=trunc).

### What it can't do

The DFT treats the block as one period of a repeating signal. A tone that doesn't fit a whole number of cycles in the block leaks into every bin; that is windowing's job.

**Next question.** How does this sit next to the other three Fourier tools? See the 2×2 table in Broader picture. Windowing, zero-padding, and leakage are the practical follow-ups.

### Common pitfalls

- The DFT periodizes time with period N. Time-domain convolution implemented as ifft(fft(h).\*fft(x)) is circular, not linear, unless you zero-pad.
- For a real cosine, a forward fft of an on-bin tone of amplitude 1 has height N/2 at ±k, not 1 and not N. DC and Nyquist are the exceptions (height N).
- fftshift is needed if you want the spectrum centered at Ω = 0 rather than starting at k = 0 (DC) and running to almost 2π.
