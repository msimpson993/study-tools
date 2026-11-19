---
id: kalman
order: 28
title: Kalman decomposition & minimal realization
addsToExample: "Splits the house with both rooms heated equally and an average thermostat: the average is reached and seen, the difference neither. The transfer function keeps only the 5-hour pole."
accountsFor: "Why that house looks like a first-order system from outside, even though it has two states."
category: structure
neighbors:
  - ctrl
  - obs
  - tf
  - stab
matlab: sys_min = minreal(ss(A, B, C, D))    % or ctrbf / obsvf for the split
exampleScene: { scene: house, overlays: [both, avg, modes], diagram: house-kalman, caption: "Reached and seen: the average. Neither: the difference, which just decays on its own." }
level: Conceptual
check: [c-kal-1, c-stab-1, q3]
---

**The question:** what do you do with the modes that fail? It follows *PBH test* (and answers *Realization*'s "is this the smallest model?"): split the state into reached-and-seen, reached-only, seen-only and neither; only the first part shows up in H(s).

### The big idea

Why a pole of the state model can disappear from G(s), and what minimal actually means.

### See it

**Picture it first.** Wire every mode between the input and the output. A mode that is not wired at both ends is invisible to the transfer function.

```figure:kalman
```

```figure:obs
```

```eq
G(s) depends only on the CO subsystem
```

```eq
minimal  ⇔  controllable and observable  ⇔  deg G = n
```

### The math

A change of basis (the Kalman decomposition) splits the state into four invariant pieces: controllable and observable (CO), controllable but unobservable, uncontrollable but observable, and neither. The transfer function depends only on the CO part. A realization is minimal when it is both controllable and observable; then dim(A) equals the degree of G(s), and the poles of G are exactly the eigenvalues of A.

**What each symbol means.**

- Four parts of the state: reached and seen, reached but unseen, seen but unreached, neither.
- $G(s) = C(sI - A)^{-1}B$: the transfer function, built only from the reached-and-seen part.
- Minimal realization: only the reached-and-seen part kept.

### Worked example: on the house

1. Heat both rooms equally and read the average.
2. The average mode is reached and seen; the difference mode is neither.
3. So $G(s)$ is first order, with only the −0.2 /h (5-hour) pole: the 27-minute difference mode cancels out of it, yet it is still inside the house.

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), take C = [1, 0]. The full controllable choice B = [0, 1]ᵀ gives G(s) = 1/((s+1)(s+2)). The uncontrollable choice B = [1, −2]ᵀ — which cannot touch the −1 mode — gives C(sI − A)⁻¹ B = (s+1)/((s+1)(s+2)) = 1/(s+2). The same cancellation appears if B is the good one but C = [1, 1] (the −1 mode unobservable): again G(s) = 1/(s+2). In both cases the realization is still 2-dimensional and still has an eigenvalue at −1; it just no longer shows up as a pole of G.

### What it can't do

The Kalman split tells you what is reachable at all; it doesn't price it. How much energy a target costs is the Gramian's job.

**Next question.** If a cancelled mode is unstable, G(s) can be BIBO stable while the realization is not internally stable. Cancelling a pole on paper does not remove it from the hardware.

### Common pitfalls

- A pole-zero cancellation in G(s) does not delete that eigenvalue from A. The mode is still in the state, and it still matters for internal stability.
- minreal is numeric and depends on a tolerance; a near-cancellation may or may not be dropped. Prefer a rank test on Ctrb and O when you can.
- Minimality is about this realization, not about whether some other coordinates would hide a mode. Similarity preserves controllability and observability.
