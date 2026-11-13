---
id: leakage
order: 5
title: "Finite records: leakage, windows and resolution"
addsToExample: "Records only M samples of the ring-like tone and shows how the window smears its line."
accountsFor: "Why a real spectrum has sidelobes and leakage, and what a window or zero padding really changes."
category: transforms
chain:
  - title: "I only have M samples of the ring."
  - title: "What does the DFT show of a finite record?"
  - title: "Samples of a spectrum smeared by the window"
neighbors:
  - sampled
  - zmap
matlab: "X = fft(x .* hann(M, 'periodic'), Nfft);   % window and zero-pad"
---

A finite record is the infinite signal multiplied by a window (a rectangle if you do nothing). Multiplying in time is convolving in frequency, so the true spectral line is smeared by the window's own spectrum: a main lobe and a ladder of sidelobes. The DFT then looks at that smeared curve only at M points.

**Picture it first.** The dashed curve is the true shape the record produces; the yellow stems are where the DFT happens to look. A tone exactly on a bin hits every null of the sinc, so you see one stem. A tone between bins lands on the sidelobes and seems to leak. Zero-padding looks at more points of the same curve; only a longer record narrows it.

```figure:leakage
```

````callout:trap Resolution is not zero padding
Zero padding interpolates the DTFT; it cannot separate two tones the window already blurred together. Resolution comes from the record length, and the window decides how much sidelobe leakage you accept for it.
````
