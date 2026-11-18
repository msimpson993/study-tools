---
id: stab
order: 22
title: Stability
addsToExample: "Checks the house: eigenvalues −0.2 and −2.2 per hour, both negative, so with the heater off it always returns to the outdoor temperature."
accountsFor: "Why the house always cools down, and why the slow mode decides how long it takes."
category: state
neighbors:
  - expm
  - tf
  - laplace
  - sampling
matlab: "max(real(eig(A)))    % discrete: max(abs(eig(A)))"
exampleScene: { scene: house, overlays: [poles, trace], caption: "Both eigenvalues are negative: every start returns to the outdoor temperature." }
---

**The question:** when does every starting state die out? It follows *How does it evolve?*: each mode goes as e^(λt), so the state settles exactly when every eigenvalue has Re λ < 0 (|λ| < 1 for sampled systems).

Asymptotic (internal) stability of x′ = Ax is equivalent to every eigenvalue of A sitting in the open left half-plane. In discrete time, every eigenvalue of A must sit inside the open unit disk. The same geometry appears in Laplace and Z: decaying natural responses are left-half-plane poles, or poles inside the unit circle. BIBO stability is a statement about G(s) (or G(z)), and can hide an unstable mode that cancelled.

**Picture it first.** Stability is not mysterious: it is the location of the eigenvalues. Left half-plane, the mode decays; right half-plane, it grows.

The figure below is an application: feedback. A thermostat that sets the heater from room 1's temperature, u = −kp·T₁, changes A and so moves the eigenvalues; the stability test is the same eigenvalue test.

```figure:stab
```

```eq
continuous:  Re(λ) < 0 for every eigenvalue of A
```

```eq
discrete:  |λ| < 1 for every eigenvalue of A
```

````callout:note What this answers
When the unforced state goes to 0, and how that is read off the poles of a minimal realization — or off the eigenvalues of A directly.
````

````callout:note What it raises
If a mode is unstable, can the input still stabilize it? That is stabilizability (the unstable modes must be controllable). Dually, detectability for observers.
````

````callout:note Mini example
For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), λ = −1, −2, both with negative real part, so ẋ = Ax is asymptotically stable. Sampled with period T = 0.1, the discrete matrix e^(AT) has eigenvalues e^(−0.1) ≈ 0.9048 and e^(−0.2) ≈ 0.8187, both inside the unit circle, so the sampled system is stable too. If one eigenvalue were +1, the continuous system would be unstable; if a discrete eigenvalue were −1, that mode would alternate and not decay (marginally stable only if the Jordan block is 1×1).
````

### Common pitfalls

- Re(λ) ≤ 0 is not enough for asymptotic stability. A simple jω-axis eigenvalue is Lyapunov (marginally) stable; a Jordan block of size 2 or more on the axis is unstable (terms t sin, t cos).
- Internal stability looks at every eigenvalue of A. BIBO looks at the poles of G(s). A cancelled unstable mode can make G(s) look fine while the state blows up.
- The left half-plane mapping inside the unit circle is not a styling choice. Sampling gives |z| = e^(σ T), so σ &lt; 0 if and only if |z| &lt; 1.
