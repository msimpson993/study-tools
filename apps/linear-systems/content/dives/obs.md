---
id: obs
order: 25
title: Observability
addsToExample: "Tries two thermostats: one in room 1 (C = [1, 0]) sees both modes; one reading the average (C = [½, ½]) is blind to the difference mode."
accountsFor: "Why the thermostat's placement decides whether you can work out room 2's temperature."
category: structure
neighbors:
  - ctrl
  - kalman
  - tf
  - eig
matlab: "rank(obsv(A, C)) == size(A, 1)    % PBH: rank([lam*eye(n)-A; C]) == n"
exampleScene: { scene: house, overlays: [avg, modes], caption: "A thermostat reading the average cannot tell the two rooms apart." }
level: Some algebra
check: [c-obs-1, m9]
---

**The question:** with an output y = Cx, can you tell what the state is? It hangs under *Do inside and outside match?*, and is the dual of controllability: every mode has to show up in y, rank [C; CA; ⋯] = n.

### The big idea

Whether every mode is visible at the output, as a null-space question (ker O = {0}; right eigenvectors not in ker C).

### See it

**Picture it first.** A sensor sees only one *shadow* of the state. Observability asks whether two different states can ever cast the same shadow for all time.

```figure:obs
```

```figure:kalman
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

### The math

The system (A, C) is observable when the initial state can be recovered from a finite record of the output (and the known input). Equivalently, the observability matrix O has trivial null space: if y is identically zero with u = 0, then x(0) = 0. In the eigenbasis this is: does every mode appear in y? PBH: no right eigenvector of A may lie in the kernel of C. Observability is dual to controllability: (A, C) is observable iff (Aᵀ, Cᵀ) is controllable.

**What each symbol means.**

- $C$: what the sensor reads from the state.
- $[C;\ CA;\ \cdots]$: the observability matrix; rank $n$ means the readings pin down the whole state.
- Unobservable mode: a mode with $Cv = 0$, invisible in the output.

### Worked example: on the house

1. Thermostat in room 1, $C = [1, 0]$: $CA = [-1.2, 1]$, rank 2, both modes show in the reading.
2. Thermostat reading the average, $C = [\tfrac12, \tfrac12]$: $CA = [-0.1, -0.1]$, parallel to $C$, rank 1.
3. The average sensor gives $Cv = 0$ for $v = (1, -1)$: it can't tell whether room 1 is warmer than room 2.

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), eigenvectors v₁ = [1, −1]ᵀ and v₂ = [1, −2]ᵀ: with C = [1, 0] (output y), C v₁ = 1 and C v₂ = 1, both nonzero. The observability matrix is O = [C; CA] = I, rank 2 — observable. Now take C = [1, 1]. Then C v₁ = [1, 1] · [1, −1]ᵀ = 0, so the −1 mode is invisible in y. Indeed CA = [−2, −2] and O = [[1, 1], [−2, −2]] has rank 1. PBH at λ = −1: the stacked matrix has rows [−1, −1], [2, 2], [1, 1], which are all multiples of one row, so rank 1.

### What it can't do

Like the controllability rank, this test is yes/no and doesn't name the blind mode. PBH checks mode by mode.

**Next question.** What is the input-output map after you discard modes that u cannot reach or y cannot see? That is the minimal realization, and it is what G(s) actually sees.

### Common pitfalls

- PBH for observability uses right eigenvectors (A v = λ v) and C v ≠ 0. The controllability test used left eigenvectors and w\* B ≠ 0.
- O is (n p) × n. For several outputs you need rank n, not a square determinant.
- Observable is stronger than detectable. Detectable means every unstable mode is observable — the condition you need for an asymptotic observer or a Kalman filter.
