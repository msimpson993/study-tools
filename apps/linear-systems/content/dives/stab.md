---
id: stab
order: 22
title: Stability
addsToExample: "Checks the car: all four eigenvalues have negative real part, so after a bump it always returns to rest. Worn shocks (20%) slide the poles toward the axis, ζ 0.058 / 0.071: the overshoot rises from about 39% to 83%, and after the bump the body stays more than 1 mm from rest until 3.9 s instead of 1.2 s."
accountsFor: "Why worn shocks make a car float, and which pole decides how long the ringing lasts."
category: state
neighbors:
  - expm
  - tf
  - laplace
  - sampling
matlab: "max(real(eig(A)))    % discrete: max(abs(eig(A)))"
exampleScene: { scene: car, overlays: [worn, poles], caption: "Worn shocks pull the poles toward the axis: the ringing lasts far longer." }
level: Some algebra
check: [c-stab-1, m7, c-eig-2]
---

**The question:** when does every starting state die out? This is the box *Will it settle?*: each mode goes as e^(λt), so the state settles exactly when every eigenvalue has Re λ < 0 (|λ| < 1 for sampled systems).

### The big idea

When the unforced state goes to 0, and how that is read off the poles of a minimal realization — or off the eigenvalues of A directly.

### See it

**Picture it first.** Stability is not mysterious: it is the location of the eigenvalues. Left half-plane, the mode decays; right half-plane, it grows.

The figure below wears the car's shocks: as the damping falls the poles slide toward the imaginary axis, and past zero damping they cross it and the motion grows.

```figure:stab
```

```figure:flow
```

```eq
continuous:  Re(λ) < 0 for every eigenvalue of A
```

```eq
discrete:  |λ| < 1 for every eigenvalue of A
```

### The math

Asymptotic (internal) stability of x′ = Ax is equivalent to every eigenvalue of A sitting in the open left half-plane. In discrete time, every eigenvalue of A must sit inside the open unit disk. The same geometry appears in Laplace and Z: decaying natural responses are left-half-plane poles, or poles inside the unit circle. BIBO stability is a statement about G(s) (or G(z)), and can hide an unstable mode that cancelled.

**What each symbol means.**

- $\lambda_i$: eigenvalues of $A$ (= poles); $\operatorname{Re}\lambda_i$ is each mode's growth rate.
- Asymptotically stable: every mode fades, all $\operatorname{Re}\lambda_i < 0$ (or $|z_i| < 1$ for a sampled system).
- $\zeta$: a mode's damping ratio, $-\operatorname{Re}\lambda/|\lambda|$; the smaller it is, the longer the ring.

### Worked example: on the car

1. Car, new shocks: eigenvalues $-2.092 \pm 6.92j$ and $-3.178 \pm 8.328j$ per second, all with negative real part, so it always settles.
2. Shocks worn to 20%: the real parts shrink and $\zeta$ falls to 0.058 (bounce) and 0.071 (pitch). Still stable, but the overshoot rises from about 39% to 83%, settling takes about 8 cycles instead of 1.6, and the heave peak from a front-wheel road input rises to +14.6 dB at 1.15 Hz.
3. After a 5 cm bump at 15 m/s the body stays more than 1 mm from rest until 3.9 s, against 1.2 s with new shocks. On a road with bumps every 10 m, about 41 km/h drives bounce at resonance (about 51 km/h for pitch).

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), λ = −1, −2, both with negative real part, so ẋ = Ax is asymptotically stable. Sampled with period T = 0.1, the discrete matrix e^(AT) has eigenvalues e^(−0.1) ≈ 0.9048 and e^(−0.2) ≈ 0.8187, both inside the unit circle, so the sampled system is stable too. If one eigenvalue were +1, the continuous system would be unstable; if a discrete eigenvalue were −1, that mode would alternate and not decay (marginally stable only if the Jordan block is 1×1).

### What it can't do

Stability looks only at the eigenvalues. It doesn't ask whether the input can actually move a mode, or whether the sensor can see it: a hidden unstable mode is still unstable.

**Next question.** If a mode is unstable, can the input still stabilize it? That is stabilizability (the unstable modes must be controllable). Dually, detectability for observers.

### Common pitfalls

- Re(λ) ≤ 0 is not enough for asymptotic stability. A simple jω-axis eigenvalue is Lyapunov (marginally) stable; a Jordan block of size 2 or more on the axis is unstable (terms t sin, t cos).
- Internal stability looks at every eigenvalue of A. BIBO looks at the poles of G(s). A cancelled unstable mode can make G(s) look fine while the state blows up.
- The left half-plane mapping inside the unit circle is not a styling choice. Sampling gives |z| = e^(σ T), so σ &lt; 0 if and only if |z| &lt; 1.
