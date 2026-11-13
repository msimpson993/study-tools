---
id: zmap
order: 4
title: "Poles move from s to z: z = e^(sT)"
addsToExample: "Carries the ring's poles from the s-plane to the z-plane by z = e^(pT)."
accountsFor: "How the sampled ring's decay and frequency become a radius and an angle, and why the angle wraps."
category: transforms
chain:
  - title: "I sampled the ring."
  - title: "Where do its poles go?"
  - title: "To z = e^(pT): radius e^(−σT), angle 2π f₀/fs"
neighbors:
  - ring
  - sampled
matlab: "sysd = c2d(sysc, T);   pole(sysd)   % = exp(pole(sysc)*T)"
exampleScene: { overlays: [poles, zpoles], caption: "z = e^(pT) carries each pole from the s-plane to the z-plane." }
---

A sampled ring is still a sum of exponentials, now in n instead of t: zⁿ with z = e^(pT). So each s-plane pole is carried to the z-plane by the exponential map. The left half-plane becomes the inside of the unit circle; the imaginary axis wraps around the circle.

**Picture it first.** Fold the s-plane up like a rolled sheet: the strip between −π·fs and +π·fs on the imaginary axis wraps once around the unit circle, and the whole left half lands inside. Poles higher than π·fs wrap around again, which is why a too-fast ring looks slow after sampling.

```figure:zmap
```

```eq
z_p = e^(pT) = e^(−σT) · e^(±jω_d T),     r = e^(−σT),   Ω = 2π f₀ / fs
```
