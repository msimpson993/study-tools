---
id: kalman
order: 10
title: Kalman decomposition & minimal realization
addsToExample: "Splits a state into the parts the force can push and the sensor can see. For the cart, both modes are controllable and observable, so nothing hides."
accountsFor: "Why G(s) is the cart's complete description (and what would be missing if a mode were hidden)."
category: control
chain:
  - title: Some modes may be unreachable, or invisible, or both.
  - title: Can I split the state into those four kinds of mode?
  - title: Kalman decomposition and minimal realization
    detail: Only the controllable-and-observable part appears in G(s).
neighbors:
  - ctrl
  - obs
  - tf
  - stab
matlab: sys_min = minreal(ss(A, B, C, D))    % or ctrbf / obsvf for the split
---

A change of basis (the Kalman decomposition) splits the state into four invariant pieces: controllable and observable (CO), controllable but unobservable, uncontrollable but observable, and neither. The transfer function depends only on the CO part. A realization is minimal when it is both controllable and observable; then dim(A) equals the degree of G(s), and the poles of G are exactly the eigenvalues of A.

**Picture it first.** Wire every mode between the input and the output. A mode that is not wired at both ends is invisible to the transfer function.

```figure:kalman
```

```eq
G(s) depends only on the CO subsystem
```

```eq
minimal  ⇔  controllable and observable  ⇔  deg G = n
```

````callout:note What this answers
Why a pole of the state model can disappear from G(s), and what minimal actually means.
````

````callout:note What it raises
If a cancelled mode is unstable, G(s) can be BIBO stable while the realization is not internally stable. Cancelling a pole on paper does not remove it from the hardware.
````

````callout:note Mini example
Keep the running A and C = [1, 0]. The full controllable choice B = [0, 1]ᵀ gives G(s) = 1/((s+1)(s+2)). The uncontrollable choice B = [1, −2]ᵀ — which cannot touch the −1 mode — gives C(sI − A)⁻¹ B = (s+1)/((s+1)(s+2)) = 1/(s+2). The same cancellation appears if B is the good one but C = [1, 1] (the −1 mode unobservable): again G(s) = 1/(s+2). In both cases the realization is still 2-dimensional and still has an eigenvalue at −1; it just no longer shows up as a pole of G.
````

### Common pitfalls

- A pole-zero cancellation in G(s) does not delete that eigenvalue from A. The mode is still in the state, and it still matters for internal stability.
- minreal is numeric and depends on a tolerance; a near-cancellation may or may not be dropped. Prefer a rank test on Ctrb and O when you can.
- Minimality is about this realization, not about whether some other coordinates would hide a mode. Similarity preserves controllability and observability.
