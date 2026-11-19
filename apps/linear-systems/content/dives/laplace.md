---
id: laplace
order: 4
title: Laplace & Z transforms
addsToExample: "Gives the speaker's transfer function from voltage to motion, H(s) = (Bl/Re)/(Mms s² + R s + 1/Cms) with R = Rms + Bl²/Re, read block by block off the signal chain. Its poles are −1,267 ± j4,322 rad/s."
accountsFor: "The ring frequency (≈ 690 Hz) and decay time (≈ 0.8 ms) of the click response, from two numbers."
category: signals
neighbors:
  - ft
  - dtft
  - tf
  - sampling
matlab: "X = laplace(x)    % or ztrans(x);  for systems: tf(sys), tf(sysd)"
exampleScene: { overlays: [forces, poles], diagram: spk-chain, caption: "Voltage → current → force → motion: multiply the blocks to get H(s)." }
level: Some algebra
check: [c-laplace-1, q1]
---

**The question:** what if we allow every complex s (or z), not just pure tones? This is the box *Laplace and Z*. In *Pieces: steady sine waves* e^(st) was only scaled by H(s); measuring how much of every e^(st) a signal contains is the Laplace transform (the Z-transform for sampled signals), and the transfer function becomes the ratio of output to input.

### The big idea

Where transients, ROC, and system poles live, and how Fourier analysis sits inside Laplace / Z when the axis is in the ROC.

### See it

**Picture it first.** Weight the signal by a decaying (or growing) exponential before adding it up, and you can tame signals that Fourier cannot. The region where that sum converges is the ROC.

```figure:laplace
```

```figure:inverse
```

$$X(s)=\int_{-\infty}^{\infty} x(t)\,e^{-st}\,dt,\qquad X(z)=\sum_{n=-\infty}^{\infty} x[n]\,z^{-n},\qquad z=e^{sT}$$

These are the bilateral transforms; each comes with its ROC. For state space we use the unilateral versions, $\int_{0^-}^{\infty}$ and $\sum_{n=0}^{\infty}$, which start at $0^-$ and so carry the initial conditions.

### The math

Laplace (continuous time) and Z (discrete time) are the natural transforms for control and for transient analysis. They use the full eigenfunctions e^(st) and z^n, not just the eternal phasors e^(jω t) and e^(jΩ n). The ROC is part of the transform: the same formal expression 1/(s+a) can belong to a causal decaying exponential or to an anti-causal growing one. When the ROC contains the jω axis (or the unit circle), restricting the transform recovers the FT (or DTFT). Transfer functions live in these planes, and their poles are the system modes.

**What each symbol means.**

- $s = \sigma + j\omega$: a complex rate; $\sigma$ (1/s) is growth or decay, $\omega$ (rad/s) the pitch.
- $X(s)$: the Laplace transform, how much of each $e^{st}$ the signal contains.
- $z = e^{sT}$, $X(z)$: the same for samples spaced $T$ apart.
- $H(s) = Y(s)/U(s)$: output over input, the transfer function.

### Worked example: on the earbud

1. Newton's law for the cone, $M\ddot x + R\dot x + kx = (Bl/R_e)V$, becomes $(Ms^2 + Rs + k)X(s) = (Bl/R_e)V(s)$: each derivative is a factor $s$.
2. Divide: $H(s) = X/V$, a fraction with $s^2$ in the denominator. Normalised to 1 at low pitch, $H(s) = a_0/(s^2 + a_1 s + a_0)$ with $a_0 \approx 2.03\times10^7\ \text{s}^{-2}$ and $a_1 \approx 2{,}533\ \text{s}^{-1}$.
3. Its poles, the roots of the denominator, are $-1{,}267 \pm j4{,}322$ rad/s.

**Exam-style example.** L{e^(−t) u(t)} = 1/(s+1) with ROC Re(s) &gt; −1. The Z-transform of its samples at T = ln 2 is the Z-transform of (1/2)^n u[n], namely 1 / (1 − ½ z^(−1)) with ROC |z| &gt; 1/2. That is the same pole, mapped by z = e^(s T): e^(−1 · ln 2) = 1/2. On the jω axis the Laplace transform is the FT 1/(1+jω); on the unit circle the Z-transform is the DTFT 1 / (1 − ½ e^(−jΩ)).

### What it can't do

The same formula X(s) can belong to different signals: it only means something together with the region where the integral converges. And H(s) as a formula doesn't yet say what the system does; reading poles and zeros does.

**Next question.** How do the two planes relate under sampling? The map is z = e^(s T), which is many-to-one and is the geometric origin of aliasing and of left half-plane → inside the unit circle.

### Common pitfalls

- Always carry the ROC. u(t) and −u(−t) have Laplace transforms that look like 1/s, but one ROC is Re(s) &gt; 0 and the other is Re(s) &lt; 0.
- State-space and circuit texts often use the unilateral Laplace transform (initial conditions included). Signals texts often use the bilateral one. They agree on causal signals at rest.
- Writing H(z) in z⁻¹ is just notation (z⁻¹ = one delay); a causal system is stable when its poles are inside |z| = 1.
