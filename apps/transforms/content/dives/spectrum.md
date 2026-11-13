---
id: spectrum
order: 2
title: "From the ring to its spectrum"
addsToExample: "Reads the ring's poles along the imaginary axis to get its spectrum: a peak at f₀ whose width is about σ/π."
accountsFor: "Why a long ring is a sharp line and a short ring a broad smear."
category: transforms
chain:
  - title: "I know the poles of the ring."
  - title: "Where is its energy in frequency?"
  - title: "Read the s-plane along the imaginary axis: s = jω"
neighbors:
  - ring
  - sampled
matlab: "H = freqs(b, a, 2*pi*f);   plot(f, abs(H))"
---

The Fourier transform is the Laplace transform evaluated on the imaginary axis, s = jω. Geometrically: walk up the vertical axis of the s-plane and ask, at each height, how close the poles are. Close to a pole, the response is large.

**Picture it first.** The pole pair sits at height ±ω_d. As you walk past height ω_d the distance to the pole is smallest, so the spectrum peaks at f₀. How sharp that peak is depends on how far left the pole sits, which is the decay rate σ.

```figure:spectrum
```

```eq
|X(jω)| ≈ A / |jω − p|    near the pole,   width ≈ σ/π  Hz
```

````callout:note Time and frequency trade places
A long ring is a narrow line; a short ring is a broad smear. You cannot make both narrow: that trade-off returns, again, as window length in the DFT.
````
