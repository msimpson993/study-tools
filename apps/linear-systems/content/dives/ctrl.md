---
id: ctrl
order: 24
title: Controllability
addsToExample: "Asks whether the room-1 heater can reach every state: B points along room 1 and AB has a room-2 part (the wall), so [B AB] has rank 2. Heating both rooms equally, B ∝ (1, 1), gives rank 1: the difference mode is uncontrollable."
accountsFor: "Which heater placements can set both room temperatures, and which can only set their average."
category: structure
neighbors:
  - obs
  - kalman
  - tf
  - eig
matlab: "rank(ctrb(A, B)) == size(A, 1)    % PBH: rank([lam*eye(n)-A, B]) == n"
exampleScene: { scene: house, overlays: [heat, reach], caption: "B pushes room 1, the wall turns it into AB: together they span the plane." }
level: Some algebra
check: [c-ctrl-1, c-ctrl-2, m8]
---

**The question:** once B is there, can the input push every mode? It belongs to *Do inside and outside match?*: B pushes some directions, A carries those pushes into new ones, and together they must span the state space: rank [B AB ⋯] = n.

### The big idea

Whether every mode is reachable from the input, as a concrete linear-algebra question (range of Ctrb; left eigenvectors not orthogonal to B).

### See it

**Picture it first.** Imagine every state you could reach by pushing with a bounded input for a time T. That blob is the reachable set, and controllability asks whether it fills the plane.

```figure:ctrl
```

```figure:kalman
```

```eq
Ctrb = [B,  AB,  A²B,  …,  A^(n−1)B],    rank(Ctrb) = n
```

```eq
PBH:  rank[λI − A,  B] = n    for every eigenvalue λ of A
```

```eq
equivalently:  if w* A = λ w*  and w ≠ 0,  then w* B ≠ 0
```

### The math

The system (A, B) is controllable when the input can move the state from any x(0) to any x(T) in finite time (or, discretely, in at most n steps). Equivalently, the range of the controllability matrix Ctrb = [B AB … A^(n−1) B] is the whole state space. In the eigenbasis this is: can u write into every mode? The PBH test makes that literal: no left eigenvector of A may be orthogonal to the columns of B.

**What each symbol means.**

- $[B\ AB\ \cdots\ A^{n-1}B]$: the controllability matrix, the directions the input can push the state in.
- Rank $n$: every direction reachable (controllable).
- $n$: number of states (2 for the house).

### Worked example: on the house

1. Heater in room 1: $B = (3.6, 0)$, $AB = (-4.32, 3.6)$, determinant 12.96 ≠ 0: rank 2, controllable. The wall carries the heat to room 2.
2. Heat both rooms equally (each kW split 50/50): $B = (1.8, 1.8)$, $AB = (-0.36, -0.36)$: the two columns are parallel, rank 1.
3. Equal heating can raise the average but can never change the difference between the rooms.

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), B = [0, 1]ᵀ gives Ctrb = [B, AB] = [[0, 1], [1, −3]], with det = −1 and rank 2 — controllable (as a companion form should be). The left eigenvector at λ = −1 is w₁ = [2, 1]ᵀ, and w₁ᵀ B = 1 ≠ 0. Now take B = [1, −2]ᵀ, which is actually v₂. Then w₁ᵀ B = 0, so the −1 mode is invisible to u. Indeed AB = −2 B, so Ctrb = [[1, −2], [−2, 4]] has rank 1. PBH at λ = −1: [λI − A, B] = [[−1, −1, 1], [2, 2, −2]] has rank 1, not 2; at λ = −2 the same test still has rank 2. Only the −1 mode is uncontrollable.

### What it can't do

The rank test is yes/no: it doesn't say which mode is lost, nor how hard a reachable target is to reach. PBH answers the first, Gramians the second.

**Next question.** Even if I can reach every mode, can I see every mode in y? That is observability. If some modes are hidden from u or y, they will cancel in G(s).

### Common pitfalls

- PBH for controllability uses left eigenvectors (w\* A = λ w\*). Using a right eigenvector here is the usual mix-up with observability.
- For several inputs, Ctrb is n × (n m) and you need rank n, not a nonzero determinant.
- Controllable is stronger than stabilizable. Stabilizable means every unstable mode is controllable; the stable ones may be left alone.
- Why stop at A^(n−1)? Cayley–Hamilton: higher powers of A are linear combinations of I, A, …, A^(n−1).
