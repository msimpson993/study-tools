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
---

**The question:** a transfer function and a state model: are they the same thing? It comes from *Laplace and Z* (the dashed line says it is the same system seen from two sides): read A, B, C straight off H(s), and the poles of H become the eigenvalues of A.

Write H(s) = N(s)/D(s), strictly proper, with D monic of degree n. Introduce an internal signal w with W/U = 1/D(s). Its derivatives w, ẇ, …, w^((n−1)) are the states, the ODE D(d/dt)w = u is the last row of A, and the output y = N(d/dt)w is a fixed combination of the states.

$$\frac{b_2s^2+b_1s+b_0}{s^3+a_2s^2+a_1s+a_0}:\quad A=\begin{bmatrix}0&1&0\\0&0&1\\-a_0&-a_1&-a_2\end{bmatrix},\ B=\begin{bmatrix}0\\0\\1\end{bmatrix},\ C=\begin{bmatrix}b_0&b_1&b_2\end{bmatrix}$$

**Picture it first.** Three integrators in a chain. The input enters at the top; every integrator's output feeds back with weight −aₖ (the poles); the output taps the chain with weights bₖ (the zeros). Zeros live in C, poles live in the last row of A.

```figure:ctrl
```

````callout:note What this answers
How to go from a transfer function to a state model, and why many state models (any T⁻¹AT, T⁻¹B, CT) give the same H(s). A realization is **minimal**, with the fewest possible states, exactly when it is controllable and observable.
````

````callout:note What it raises
If deg N = deg D (biproper), divide first: the quotient is D and the remainder is realized as above. And if a zero cancels a pole, the realization has a hidden mode: see the Kalman decomposition.
````

````callout:note Mini example
H(s) = (6s + 1)(4s + 3)/(s³ + 8s² + 19s + 2). Expand the top: 24s² + 22s + 3. So A has last row [−2, −19, −8], B = e₃ and C = [3, 22, 24], D = 0. (MATLAB's tf2ss gives the reversed ordering, A's first row [−8, −19, −2] and C = [24, 22, 3]. Both are correct; do not mix them.)
````

### Common pitfalls

- Forgetting the minus signs in the last row of A.
- Writing C in the reverse order for the ordering you chose.
- Not expanding the numerator first.
- Assuming a realization is minimal without checking controllability and observability.
