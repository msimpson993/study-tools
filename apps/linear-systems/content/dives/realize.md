---
id: realize
order: 23
title: "Realization: from H(s) to A, B, C"
addsToExample: "Builds the speaker's state model. The full model has three states (current i, position x, velocity ẋ), but the coil's own pole −Re/Le ≈ −186,750 rad/s is about 40 times faster than the mechanical poles, so i follows V almost instantly and two states (x, ẋ) are enough. In phase-variable form A = [[0, 1], [−k/Mms, −R/Mms]], B = (0, 1)ᵀ, C = [(Bl/Re)/Mms, 0]; here the state is the scaled position w = x·Mms·Re/Bl (and ẇ). For the physical state (x, ẋ) keep the same A and use B = (0, Bl/(Re·Mms))ᵀ with C = [1, 0]."
accountsFor: "Why two numbers, position and velocity, describe the speaker across the audio band, and where each Thiele–Small value sits in A, B and C."
category: state
neighbors:
  - ss
  - kalman
  - laplace
  - ctrl
matlab: "[A, B, C, D] = tf2ss(b, a)    % note: MATLAB's ordering is reversed"
exampleScene: { overlays: [coil, state], diagram: [spk-chain, spk-model], caption: "Voltage to motion, block by block; the fast coil pole drops out and two states remain." }
level: Worked calculation
check: [c-real-1, c-ss-2]
---

**The question:** a transfer function and a state model: are they the same thing? It hangs under *State: what it remembers*: read A, B, C straight off H(s), and the poles of H become the eigenvalues of A.

### The big idea

Often we know a system only from its transfer function, but the state tools need A, B and C. A realization wires integrators so that the given H(s) comes out. Many wirings work; the minimal ones, with the fewest states, are exactly those that are controllable and observable.

### See it

**Imagine it.** Below: the speaker's two-integrator realization; a₀ = 20.28, a₁ = 2.533 (per ms², per ms) are the last row of A, as −a₀ and −a₁.

```picture:pic-spk-chain The speaker as two integrators: ẍ = −a₀x − a₁ẋ + a₀·42.8·V, with x in µm and t in ms.
Block diagram: the voltage, scaled by a₀ times the DC gain, into a sum, then two integrators giving ẋ and x, fed back with −a₁ and −a₀.
```

```figure:ss
```

### The math

Write H(s) = N(s)/D(s), strictly proper, with D monic of degree n. Introduce an internal signal w with W/U = 1/D(s). Its derivatives w, ẇ, …, w^((n−1)) are the states, the ODE D(d/dt)w = u is the last row of A, and the output y = N(d/dt)w is a fixed combination of the states.

$$\frac{b_2s^2+b_1s+b_0}{s^3+a_2s^2+a_1s+a_0}:\quad A=\begin{bmatrix}0&1&0\\0&0&1\\-a_0&-a_1&-a_2\end{bmatrix},\ B=\begin{bmatrix}0\\0\\1\end{bmatrix},\ C=\begin{bmatrix}b_0&b_1&b_2\end{bmatrix}$$

**What each symbol means.**

- $a_0, a_1, \dots$: denominator coefficients of $H(s)$, which become the last row of $A$.
- $b_0, b_1, \dots$: numerator coefficients, which become $C$.
- Phase variables: the state is a signal and its derivatives.
- Minimal: no state that the input can't reach or the output can't see.

### Worked example: on the earbud

1. The earbud's full model has three states (coil current i, position x, velocity ẋ), but the coil's pole −R_e/L_e ≈ −186,750 rad/s is about 40 times faster than the mechanical poles, so two states are enough.
2. In phase-variable form, $A = [[0, 1], [-a_0, -a_1]]$ with $a_0 \approx 2.03\times10^7\ \text{s}^{-2}$ and $a_1 \approx 2{,}533\ \text{s}^{-1}$, $B = (0, 1)^\mathsf{T}$.
3. For the physical state (x, ẋ) keep the same A and use $B = (0, Bl/(R_eM))^\mathsf{T}$, $C = [1, 0]$.

**Exam-style example.** H(s) = (6s + 1)(4s + 3)/(s³ + 8s² + 19s + 2). Expand the top: 24s² + 22s + 3. So A has last row [−2, −19, −8], B = e₃ and C = [3, 22, 24], D = 0. (MATLAB's tf2ss gives the reversed ordering, A's first row [−8, −19, −2] and C = [24, 22, 3]. Both are correct; do not mix them.)

```picture:pic-rev-b3 The realization as a block diagram: feedback −2, −19, −8 (A's last row), output taps 3, 22, 24 (C).
Block diagram: u into a sum, three integrators in a chain giving x₃, x₂, x₁, each fed back with its gain, and the output summed from the taps.
```

### What it can't do

Many (A, B, C) give the same H(s), and some carry extra states that never show. Whether a realization is minimal is the hidden-modes question.

**Next question.** If deg N = deg D (biproper), divide first: the quotient is D and the remainder is realized as above. And if a zero cancels a pole, the realization has a hidden mode: see the Kalman decomposition.

### Common pitfalls

- Forgetting the minus signs in the last row of A.
- Writing C in the reverse order for the ordering you chose.
- Not expanding the numerator first.
- Assuming a realization is minimal without checking controllability and observability.
