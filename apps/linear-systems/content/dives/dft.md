---
id: dft
order: 16
title: DFT
category: transforms
chain:
  - title: In practice the record is finite — or the sequence is periodic.
  - title: What happens if I also sample the DTFT in frequency?
  - title: The DFT
    detail: Time discrete and finite (periodically extended) → frequency discrete and periodic.
neighbors:
  - dtft
  - fs
  - ortho
  - sampling
matlab: "X = fft(x, N)    % inverse: x = ifft(X)"
---

The N-point DFT is the discrete Fourier series of a length-N sequence viewed as one period of a periodic signal. Equivalently, it is the DTFT of that finite record, sampled at Ω = 2π k / N. Frequency is now discrete and periodic with period N. This is the one you actually compute, via the FFT. Convention here, and in MATLAB: the forward transform is the unnormalized sum, and the inverse carries 1/N.

$$X[k]=\sum_{n=0}^{N-1} x[n]\,e^{-j2\pi kn/N}$$

$$x[n]=\frac{1}{N}\sum_{k=0}^{N-1} X[k]\,e^{j2\pi kn/N}$$

````callout:note What this answers
The computable transform, its implicit periodic extension in time, and when a tone lands cleanly on a bin (or leaks).
````

````callout:note What it raises
How does this sit next to the other three Fourier tools? See the 2×2 table in Broader picture. Windowing, zero-padding, and leakage are the practical follow-ups.
````

````callout:note Mini example
Take N = 4 and x[n] = cos(π n / 2) = [1, 0, −1, 0], which is exactly one period of a bin-1 cosine. Then X[k] = fft(x) = [0, 2, 0, 2]: the energy sits at k = 1 and k = 3 (≡ −1 mod 4), each with amplitude N/2 = 2, as the analysis of (e^{j π n / 2} + e^{−j π n / 2})/2 predicts. A tone whose frequency is not an integer number of cycles in N still has a DTFT peaked at that Ω, but the DFT samples miss the peak and you see leakage into every bin.
````

### Common pitfalls

- The DFT periodizes time with period N. Time-domain convolution implemented as ifft(fft(h).\*fft(x)) is circular, not linear, unless you zero-pad.
- For a real cosine, a forward fft of an on-bin tone of amplitude 1 has height N/2 at ±k, not 1 and not N. DC and Nyquist are the exceptions (height N).
- fftshift is needed if you want the spectrum centered at Ω = 0 rather than starting at k = 0 (DC) and running to almost 2π.
