---
id: obs
order: 25
title: Observability
addsToExample: "Tries two thermostats: one in room 1 (C = [1, 0]) sees both modes; one reading the average (C = [½, ½]) is blind to the difference mode."
accountsFor: "Why the thermostat's placement decides whether you can work out room 2's temperature."
category: steer
neighbors:
  - ctrl
  - kalman
  - tf
  - eig
matlab: "rank(obsv(A, C)) == size(A, 1)    % PBH: rank([lam*eye(n)-A; C]) == n"
exampleScene: { scene: house, overlays: [avg, modes], caption: "A thermostat reading the average cannot tell the two rooms apart." }
---

**The question:** with an output y = Cx, can you tell what the state is? It follows *State view*, and is the dual of *Controllability*: every mode has to show up in y, rank [C; CA; ⋯] = n.

The system (A, C) is observable when the initial state can be recovered from a finite record of the output (and the known input). Equivalently, the observability matrix O has trivial null space: if y is identically zero with u = 0, then x(0) = 0. In the eigenbasis this is: does every mode appear in y? PBH: no right eigenvector of A may lie in the kernel of C. Observability is dual to controllability: (A, C) is observable iff (Aᵀ, Cᵀ) is controllable.

**Picture it first.** A sensor sees only one *shadow* of the state. Observability asks whether two different states can ever cast the same shadow for all time.

```figure:obs
```

```eq
O = [C;  CA;  CA²;  …;  CA^(n−1)],    rank(O) = n
```

```eq
PBH:  rank of the stack [λI − A; C] equals n,  for every eigenvalue λ of A
```

```eq
equivalently:  if A v = λ v  and v ≠ 0,  then C v ≠ 0
```

````callout:note What this answers
Whether every mode is visible at the output, as a null-space question (ker O = {0}; right eigenvectors not in ker C).
````

````callout:note What it raises
What is the input-output map after you discard modes that u cannot reach or y cannot see? That is the minimal realization, and it is what G(s) actually sees.
````

````callout:note Mini example
With C = [1, 0] (output = y in the phase-variable model), C v₁ = 1 and C v₂ = 1, both nonzero. The observability matrix is O = [C; CA] = I, rank 2 — observable. Now take C = [1, 1]. Then C v₁ = [1, 1] · [1, −1]ᵀ = 0, so the −1 mode is invisible in y. Indeed CA = [−2, −2] and O = [[1, 1], [−2, −2]] has rank 1. PBH at λ = −1: the stacked matrix has rows [−1, −1], [2, 2], [1, 1], which are all multiples of one row, so rank 1.
````

### Common pitfalls

- PBH for observability uses right eigenvectors (A v = λ v) and C v ≠ 0. The controllability test used left eigenvectors and w\* B ≠ 0.
- O is (n p) × n. For several outputs you need rank n, not a square determinant.
- Observable is stronger than detectable. Detectable means every unstable mode is observable — the condition you need for an asymptotic observer or a Kalman filter.
