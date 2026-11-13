---
id: ctrl
order: 8
title: Controllability
category: control
chain:
  - title: The state has modes, each along an eigenvector.
  - title: Can I steer every mode with the input u?
  - title: Controllability
    detail: A range question about the controllability matrix, or a test on left eigenvectors (PBH).
neighbors:
  - obs
  - kalman
  - tf
  - eig
matlab: "rank(ctrb(A, B)) == size(A, 1)    % PBH: rank([lam*eye(n)-A, B]) == n"
---

The system (A, B) is controllable when the input can move the state from any x(0) to any x(T) in finite time (or, discretely, in at most n steps). Equivalently, the range of the controllability matrix Ctrb = [B AB … A^{n−1} B] is the whole state space. In the eigenbasis this is: can u write into every mode? The PBH test makes that literal: no left eigenvector of A may be orthogonal to the columns of B.

**Picture it first.** Imagine every state you could reach by pushing with a bounded input for a time T. That blob is the reachable set, and controllability asks whether it fills the plane.

```figure:ctrl
```

```eq
Ctrb = [B,  AB,  A²B,  …,  A^{n−1}B],    rank(Ctrb) = n
```

```eq
PBH:  rank[λI − A,  B] = n    for every eigenvalue λ of A
```

```eq
equivalently:  if w* A = λ w*  and w ≠ 0,  then w* B ≠ 0
```

````callout:note What this answers
Whether every mode is reachable from the input, as a concrete linear-algebra question (range of Ctrb; left eigenvectors not orthogonal to B).
````

````callout:note What it raises
Even if I can reach every mode, can I see every mode in y? That is observability. If some modes are hidden from u or y, they will cancel in G(s).
````

````callout:note Mini example
For the running A, B = [0, 1]ᵀ gives Ctrb = [B, AB] = [[0, 1], [1, −3]], with det = −1 and rank 2 — controllable (as a companion form should be). The left eigenvector at λ = −1 is w₁ = [2, 1]ᵀ, and w₁ᵀ B = 1 ≠ 0. Now take B = [1, −2]ᵀ, which is actually v₂. Then w₁ᵀ B = 0, so the −1 mode is invisible to u. Indeed AB = −2 B, so Ctrb = [[1, −2], [−2, 4]] has rank 1. PBH at λ = −1: [λI − A, B] = [[−1, −1, 1], [2, 2, −2]] has rank 1, not 2; at λ = −2 the same test still has rank 2. Only the −1 mode is uncontrollable.
````

### Common pitfalls

- PBH for controllability uses left eigenvectors (w\* A = λ w\*). Using a right eigenvector here is the usual mix-up with observability.
- For several inputs, Ctrb is n × (n m) and you need rank n, not a nonzero determinant.
- Controllable is stronger than stabilizable. Stabilizable means every unstable mode is controllable; the stable ones may be left alone.
- Why stop at A^{n−1}? Cayley–Hamilton: higher powers of A are linear combinations of I, A, …, A^{n−1}.
