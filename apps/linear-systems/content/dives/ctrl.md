---
id: ctrl
order: 24
title: Controllability
addsToExample: "Asks whether one actuator can reach every state of the car. On the main car a push at the centre of gravity moves both modes: [B AB A²B A³B] has rank 4. On the symmetric car (kf·a = kr·b) the same push makes no torque and can never start pitch: rank 2. On the main car the blind spot moves to the pitch still point, x = +0.56 m."
accountsFor: "Which actuator positions can control both bounce and pitch, and which leave pitch out of reach."
category: structure
neighbors:
  - obs
  - kalman
  - tf
  - eig
matlab: "rank(ctrb(A, B)) == size(A, 1)    % PBH: rank([lam*eye(n)-A, B]) == n"
exampleScene: { scene: car, overlays: [centre], caption: "Symmetric car, a push at the centre: it heaves, but pitch never starts." }
level: Some algebra
check: [c-ctrl-1, c-ctrl-2, m8]
---

**The question:** once B is there, can the input push every mode? It belongs to *Do inside and outside match?*: B pushes some directions, A carries those pushes into new ones, and together they must span the state space: rank [B AB ⋯] = n.

### The big idea

Before designing an actuator, check that it can do the job at all. A system is controllable if the input, given time, can steer the state to any value; if it is not, some mode moves on its own whatever you push. The test is a rank check on B, AB, A²B and so on.

### See it

**Picture it first.** Push the car's body up at one point. Does the push move both modes, or is one out of reach? Move the push point and switch cars below. The main car is the default; the symmetric car is the blind-spot case from Box 13.

```figure:ctrl
```

**Second figure: what reachability does to the transfer function.** It opens on the symmetric car, the blind-spot case from Box 13, with the push at the centre.

```figure:kalman
```

*Look for here:* push at the centre and only the bounce hump survives in |G|; move the push point off the centre and the pitch hump comes back, as the bars above predict.

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
- $n$: number of states (4 for the car).

### Worked example: on the car

1. One actuator force $F$ at a point $x$ metres ahead of the centre of gravity: $B = (0, 0, 1/m, x/J)$, a heave push $F/m$ plus a torque $xF/J$.
2. Main car, push at the centre ($x = 0$): no direct torque, but heave and pitch are coupled in $A$, so $AB$, $A^2B$ and $A^3B$ fill in the rest: rank 4, controllable.
3. Symmetric car, push at the centre: the pitch mode is decoupled and the push makes no torque, so pitch can never start: rank 2 of 4. On the main car the same failure happens at $x = +0.56$ m, the pitch mode's still point (exact only because the shocks are proportional to the springs, C = 0.08 s·K; with ordinary shocks it is only nearly blind).

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), B = [0, 1]ᵀ gives Ctrb = [B, AB] = [[0, 1], [1, −3]], with det = −1 and rank 2 — controllable (as a companion form should be). The left eigenvector at λ = −1 is w₁ = [2, 1]ᵀ, and w₁ᵀ B = 1 ≠ 0. Now take B = [1, −2]ᵀ, which is actually v₂. Then w₁ᵀ B = 0, so the −1 mode is invisible to u. Indeed AB = −2 B, so Ctrb = [[1, −2], [−2, 4]] has rank 1. PBH at λ = −1: [λI − A, B] = [[−1, −1, 1], [2, 2, −2]] has rank 1, not 2; at λ = −2 the same test still has rank 2. Only the −1 mode is uncontrollable.

### What it can't do

The rank test is yes/no: it doesn't say which mode is lost, nor how hard a reachable target is to reach. PBH answers the first, Gramians the second.

**Next question.** Even if I can reach every mode, can I see every mode in y? That is observability. If some modes are hidden from u or y, they will cancel in G(s).

### Common pitfalls

- PBH for controllability uses left eigenvectors (w\* A = λ w\*). Using a right eigenvector here is the usual mix-up with observability.
- For several inputs, Ctrb is n × (n m) and you need rank n, not a nonzero determinant.
- Controllable is stronger than stabilizable. Stabilizable means every unstable mode is controllable; the stable ones may be left alone.
- Why stop at A^(n−1)? Cayley–Hamilton: higher powers of A are linear combinations of I, A, …, A^(n−1).
