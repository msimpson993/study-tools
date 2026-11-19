---
id: obs
order: 25
title: Observability
addsToExample: "Tries sensors on the car. On the symmetric car a height sensor at the centre of gravity reads only heave and cannot see pitch (observability rank 2); a pitch gyro there cannot see bounce. On the main car a height sensor at the pitch still point, x = +0.56 m, is blind to pitch."
accountsFor: "Why the sensor's position decides whether you can tell what the body is doing."
category: structure
neighbors:
  - ctrl
  - kalman
  - tf
  - eig
matlab: "rank(obsv(A, C)) == size(A, 1)    % PBH: rank([lam*eye(n)-A; C]) == n"
exampleScene: { scene: car, overlays: [centre, pitch], caption: "A height sensor at the balance point: pitch moves the nose and tail, not the centre." }
level: Some algebra
check: [c-obs-1, m9]
---

**The question:** with an output y = Cx, can you tell what the state is? It hangs under *Do inside and outside match?*, and is the dual of controllability: every mode has to show up in y, rank [C; CA; ⋯] = n.

### The big idea

A sensor might not see everything going on inside. A system is observable if watching the output for a while is enough to work out the starting state; if not, some mode can move unseen. The test is a rank check on C, CA, CA² and so on.

### See it

**Picture it first.** A sensor sees only one *shadow* of the state. Observability asks whether two different states can ever cast the same shadow for all time. The picture shows the simplest case.

```picture:pic-obs-shadow A height sensor at the centre of the symmetric car reads only heave: two example states with different pitch cast the same shadow, so pitch is unobservable there.
Two states at the same heave but different pitch project onto the same reading.
```

```figure:obs
```

**Second figure: what an unseen mode does to the transfer function.** This opens on the symmetric car, the blind-spot case from Box 13, with the sensor at the centre.

```figure:kalman
```

*Look for here:* with the sensor at the centre only the bounce hump shows in |G|: the pitch mode the sensor cannot see is missing from G(s).

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

### Worked example: on the car

1. A height sensor $x$ metres ahead of the centre of gravity reads $y = z + x\theta$, so $C = [1, x, 0, 0]$.
2. Symmetric car, sensor at the centre: $C = [1, 0, 0, 0]$. In the pitch mode the centre does not move, $Cv = 0$, so $[C;\ CA;\ CA^2;\ CA^3]$ has rank 2: pitch is unobservable.
3. A pitch gyro, $C = [0, 1, 0, 0]$, is the opposite: blind to the symmetric car's bounce, which has no pitch in it. On the main car a height sensor is blind to pitch at the still point, $x = +0.56$ m (exact only because the shocks are proportional to the springs, C = 0.08 s·K; with ordinary shocks it is only nearly blind).

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), eigenvectors v₁ = [1, −1]ᵀ and v₂ = [1, −2]ᵀ: with C = [1, 0] (output y), C v₁ = 1 and C v₂ = 1, both nonzero. The observability matrix is O = [C; CA] = I, rank 2 — observable. Now take C = [1, 1]. Then C v₁ = [1, 1] · [1, −1]ᵀ = 0, so the −1 mode is invisible in y. Indeed CA = [−2, −2] and O = [[1, 1], [−2, −2]] has rank 1. PBH at λ = −1: the stacked matrix has rows [−1, −1], [2, 2], [1, 1], which are all multiples of one row, so rank 1.

### What it can't do

Like the controllability rank, this test is yes/no and doesn't name the blind mode. PBH checks mode by mode.

**Next question.** What is the input-output map after you discard modes that u cannot reach or y cannot see? That is the minimal realization, and it is what G(s) actually sees.

### Common pitfalls

- PBH for observability uses right eigenvectors (A v = λ v) and C v ≠ 0. The controllability test used left eigenvectors and w\* B ≠ 0.
- O is (n p) × n. For several outputs you need rank n, not a square determinant.
- Observable is stronger than detectable. Detectable means every unstable mode is observable — the condition you need for an asymptotic observer or a Kalman filter.
