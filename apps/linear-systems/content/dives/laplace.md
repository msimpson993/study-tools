---
id: laplace
order: 17
title: Laplace & Z transforms
addsToExample: "Takes the cart's response and its force into the s-plane, where the cart is G(s) with poles −1, −2."
accountsFor: "The cart's transient and steady-state from the same function, including growth."
category: transforms
chain:
  - title: The Fourier axis jω (or the unit circle) is only part of the eigenfunction family.
  - title: What if I need transients, growth or decay, and a region of convergence?
  - title: Laplace and Z transforms
    detail: The same exponentials e^{st} and z^n, now with a plane and an ROC.
neighbors:
  - ft
  - dtft
  - tf
  - sampling
matlab: "X = laplace(x)    % or ztrans(x);  for systems: tf(sys), tf(sysd)"
exampleScene: { overlays: [hammer, poles], caption: "The impulse response e^{−t} − e^{−2t} is read straight off the poles at −1 and −2." }
---

Laplace (continuous time) and Z (discrete time) are the natural transforms for control and for transient analysis. They use the full eigenfunctions e^{st} and z^n, not just the eternal phasors e^{jω t} and e^{jΩ n}. The ROC is part of the transform: the same formal expression 1/(s+a) can belong to a causal decaying exponential or to an anti-causal growing one. When the ROC contains the jω axis (or the unit circle), restricting the transform recovers the FT (or DTFT). Transfer functions live in these planes, and their poles are the system modes.

**Picture it first.** Weight the signal by a decaying (or growing) exponential before adding it up, and you can tame signals that Fourier cannot. The region where that sum converges is the ROC.

```figure:laplace
```

$$X(s)=\int_{0^-}^{\infty} x(t)\,e^{-st}\,dt\quad\text{(unilateral)}$$

$$X(z)=\sum_{n=0}^{\infty} x[n]\,z^{-n},\qquad z=e^{sT}$$

````callout:note What this answers
Where transients, ROC, and system poles live, and how Fourier analysis sits inside Laplace / Z when the axis is in the ROC.
````

````callout:note What it raises
How do the two planes relate under sampling? The map is z = e^{s T}, which is many-to-one and is the geometric origin of aliasing and of left half-plane → inside the unit circle.
````

````callout:note Mini example
L{e^{−t} u(t)} = 1/(s+1) with ROC Re(s) &gt; −1. The Z-transform of its samples at T = ln 2 is the Z-transform of (1/2)^n u[n], namely 1 / (1 − ½ z^{−1}) with ROC |z| &gt; 1/2. That is the same pole, mapped by z = e^{s T}: e^{−1 · ln 2} = 1/2. On the jω axis the Laplace transform is the FT 1/(1+jω); on the unit circle the Z-transform is the DTFT 1 / (1 − ½ e^{−jΩ}).
````

### Common pitfalls

- Always carry the ROC. u(t) and −u(−t) have Laplace transforms that look like 1/s, but one ROC is Re(s) &gt; 0 and the other is Re(s) &lt; 0.
- Control courses often use the unilateral Laplace transform (initial conditions included). Signals courses often use the bilateral one. They agree on causal signals at rest.
- The Z-transform is usually written in z^{−1}. That delay convention is what keeps the stable region inside the unit circle; it is not an extra geometric choice on top of z = e^{s T}.
