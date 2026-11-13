---
id: tf
order: 11
title: Transfer functions
addsToExample: "Collapses the cart's A, B, C into one function G(s) = 1/(s² + 3s + 2): force to position."
accountsFor: "The cart's whole input-output behaviour, with its poles at −1 and −2, in one line."
category: control
chain:
  - title: I have a state realization (A, B, C, D).
  - title: How do I write the input-output map without the state?
  - title: The transfer function
    detail: G(s) = C(sI − A)⁻¹ B + D, whose poles are the eigenvalues of A once hidden modes are cancelled.
neighbors:
  - ss
  - expm
  - kalman
  - laplace
matlab: G = tf(ss(A, B, C, D))    % or [b, a] = ss2tf(A, B, C, D)
---

Taking the (zero-state) Laplace transform of the state equations and eliminating X(s) produces G(s). This is the same object as the Laplace transform of the impulse response. In the best-basis language, each mode contributes a term r / (s − λ), unless that mode is uncontrollable or unobservable, in which case its residue is zero and the pole cancels.

**Picture it first.** To find how the cart responds to a sine of frequency ω, stand at the point jω on the s-plane and measure the distance to each pole. The response is the product of those distances, inverted.

```figure:tf
```

```eq
G(s) = C (sI − A)⁻¹ B + D
```

```eq
Y(s) = G(s) U(s)    (zero state)
```

````callout:note What this answers
The i/o map in the s-domain, and the precise sense in which poles are the eigenvalues of A.
````

````callout:note What it raises
G(s) forgets hidden modes and initial conditions. If you need the full natural response, stay with the state, or put x(0) back into the Laplace identity sX − x(0) = AX + BU.
````

````callout:note Mini example
For the running (A, B, C) with B = [0, 1]ᵀ and C = [1, 0], (sI − A)⁻¹ = 1/(s² + 3s + 2) · [[s + 3, 1], [−2, s]], so G(s) = 1/((s + 1)(s + 2)). Partial fractions: 1/(s+1) − 1/(s+2), hence h(t) = (e^{−t} − e^{−2t}) u(t), matching C e^{At} B. With the uncontrollable B = [1, −2]ᵀ the same algebra yields (s+1)/((s+1)(s+2)) = 1/(s+2): the cancelled pole is exactly the hidden eigenvalue.
````

### Common pitfalls

- G(s) is the zero-state i/o map. Initial conditions produce an extra term C(sI − A)⁻¹ x(0).
- Poles of G(s) equal eigenvalues of A if and only if the realization is minimal. Always ask whether a cancellation already happened.
- MIMO systems have a matrix G(s). Transmission zeros are not the zeros of the individual entries.
