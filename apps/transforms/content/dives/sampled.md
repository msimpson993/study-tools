---
id: sampled
order: 3
title: "Sampling the ring: copies and aliasing"
addsToExample: "Samples the ring every T and shows its spectrum copied every fs, with the copies added together."
accountsFor: "Why a ring above fs/2, or one that decays fast, looks different after sampling."
category: transforms
chain:
  - title: "I only keep samples x(nT) of the ring."
  - title: "What happens to its spectrum?"
  - title: "It repeats every fs, and the copies add"
neighbors:
  - spectrum
  - zmap
matlab: "[Xd, w] = freqz(x, 1, 1024, fs);   % periodic spectrum"
---

Sampling multiplies the signal by a train of impulses. In frequency, that becomes *adding up shifted copies of the spectrum*, one every fs. As long as the copies do not reach each other (fs larger than twice the highest frequency present), a low-pass filter can pick out the original. When they overlap, no filter can undo it.

**Picture it first.** Keep the spectrum of the ring in view and slide copies of it in from the left and right. When fs is high the copies sit far apart; as fs falls they crowd, and then slide on top of each other. The yellow curve is what the samples can show you: the sum of all of them.

```figure:sampled
```

```eq
T · X(e^(jωT)) = Σ_k X(j(ω − kω_s)) + A T / 2
```

````callout:trap The wide spectrum of a decaying ring
A ring that decays fast is not band-limited, so its copies overlap even when f₀ is far below fs/2. Aliasing is about the whole spectrum, not just the tone.
````
