---
id: tf
order: 8
title: Transfer functions
addsToExample: "Reads the speaker's peak from its pole pair: ζ ≈ 0.28, so the poles sit fairly close to the jω axis and |H| peaks near 660 Hz, a little below fs = 717 Hz."
accountsFor: "Why lighter damping would make a sharper, louder resonance, and why the peak is below fs."
category: signals
neighbors:
  - ss
  - expm
  - kalman
  - laplace
matlab: G = tf(ss(A, B, C, D))    % or [b, a] = ss2tf(A, B, C, D)
exampleScene: { overlays: [poles, bode], caption: "Stand on the jω axis: the closer you are to a pole, the bigger |H|." }
level: Some algebra
check: [c-laplace-1, c-ft-1, q3]
---

**The question:** what do the poles and zeros of H(s) tell you directly? This is the box *Poles and zeros*, after *Laplace and Z*: factor H(s), and the gain at any frequency is a ratio of distances from the point jω to the zeros and to the poles.

### The big idea

The i/o map in the s-domain, and the precise sense in which poles are the eigenvalues of A.

### See it

**Picture it first.** To find how a system responds to a sine of frequency ω, stand at the point jω on the s-plane and measure the distance to each pole. The response is the product of those distances, inverted.

```figure:tf
```

```figure:eigfn
```

```eq
G(s) = C (sI − A)⁻¹ B + D
```

```eq
Y(s) = G(s) U(s)    (zero state)
```

### The math

Taking the (zero-state) Laplace transform of the state equations and eliminating X(s) produces G(s). This is the same object as the Laplace transform of the impulse response. In the best-basis language, each mode contributes a term r / (s − λ), unless that mode is uncontrollable or unobservable, in which case its residue is zero and the pole cancels.

**What each symbol means.**

- Pole $p$: a value of $s$ where $H(s)$ blows up, a natural rhythm $e^{pt}$.
- Zero: a value of $s$ where $H(s) = 0$, an input the system blocks.
- $|j\omega - p|$: the distance from the test pitch to a pole; the gain is (distances to zeros)/(distances to poles) times a constant.
- $\zeta$: the damping ratio (0 = no damping, 1 = critical).

### Worked example: on the earbud

1. The earbud's poles sit at $-1{,}267 \pm j4{,}322$ rad/s, damping ratio ζ ≈ 0.28.
2. Walk up the jω axis: near $\omega \approx 4{,}130$ rad/s (658 Hz) the distance to the upper pole is smallest, so the gain peaks at ×1.85.
3. Far above, both distances grow like ω, so the gain falls like $1/\omega^2$: 40 dB per decade.

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), with B = [0, 1]ᵀ and C = [1, 0], (sI − A)⁻¹ = 1/(s² + 3s + 2) · [[s + 3, 1], [−2, s]], so G(s) = 1/((s + 1)(s + 2)). Partial fractions: 1/(s+1) − 1/(s+2), hence h(t) = (e^(−t) − e^(−2t)) u(t), matching C e^(At) B. With the uncontrollable B = [1, −2]ᵀ the same algebra yields (s+1)/((s+1)(s+2)) = 1/(s+2): the cancelled pole is exactly the hidden eigenvalue.

### What it can't do

H(s) is the outside view: it shows only what gets from input to output. It doesn't show what the system stores inside, and it can hide modes that cancel.

**Next question.** G(s) forgets hidden modes and initial conditions. If you need the full natural response, stay with the state, or put x(0) back into the Laplace identity sX − x(0) = AX + BU.

### Common pitfalls

- G(s) is the zero-state i/o map. Initial conditions produce an extra term C(sI − A)⁻¹ x(0).
- Poles of G(s) equal eigenvalues of A if and only if the realization is minimal. Always ask whether a cancellation already happened.
- MIMO systems have a matrix G(s). Transmission zeros are not the zeros of the individual entries.
