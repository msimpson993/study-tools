---
id: pbh
order: 26
title: The PBH test
addsToExample: "Tests the car mode by mode. On the symmetric car the pitch mode does not move at the centre of gravity, so a push there gives wᵀB = 0 and a height sensor there gives Cv = 0: pitch is both unreachable and unseen. On the main car the same happens at the pitch still point, x = +0.56 m."
accountsFor: "Exactly which mode an actuator or sensor placement loses, not just that one is lost."
category: structure
neighbors:
  - ctrl
  - obs
  - kalman
  - eig
matlab: "for l = eig(A).', rank([A - l*eye(n), B]), end"
exampleScene: { scene: car, overlays: [centre, pitch], caption: "A push at the pitch mode's still point cannot start it, and a sensor there cannot see it." }
level: Some algebra
check: [c-pbh-1, c-ctrl-1, c-obs-1]
---

**The question:** which mode, exactly, does the input miss (or the output)? It hangs under *Do inside and outside match?*: test one eigenvalue at a time, wᵀB for the input and Cv for the output.

### The big idea

Which mode fails, and what parameter values make it fail. It turns "find the conditions on b, f, g" into one dot product per mode.

### See it

**Picture it first.** A sensor y = cᵀx is a projection. It is blind to a mode exactly when that mode's direction is perpendicular to c. An input column b pushes a mode exactly when b is not perpendicular to that mode's *left* eigenvector.

```figure:kalman
```

```figure:ctrl
```

### The math

The Popov–Belevitch–Hautus test checks modes one at a time.

$$\text{controllable}\iff\operatorname{rank}[A-\lambda I\;\;B]=n\ \text{for every eigenvalue }\lambda\iff w_i^{\mathsf T}B\neq0\ \text{for every left eigenvector}$$

$$\text{observable}\iff\operatorname{rank}\begin{bmatrix}A-\lambda I\\C\end{bmatrix}=n\ \text{for every eigenvalue }\lambda\iff Cv_i\neq0\ \text{for every right eigenvector}$$

**What each symbol means.**

- $w_i$: a left eigenvector ($w_i^\mathsf{T}A = \lambda_i w_i^\mathsf{T}$); $w_i^\mathsf{T}B$ is how hard the input pushes mode $i$.
- $v_i$: a right eigenvector (the mode's shape); $Cv_i$ is how much of mode $i$ the sensor sees.
- $\operatorname{rank}[A - \lambda I\ \ B]$: drops below $n$ exactly at an uncontrollable eigenvalue.

### Worked example: on the car

1. Car: each mode has a shape. The pitch mode's still point is at the centre of gravity on the symmetric car and at $x = +0.56$ m on the main car.
2. A push at a point $x$ is $B = (0, 0, 1/m, x/J)$. For a mechanical model like this one, $w^\mathsf{T}B$ is proportional to how far the mode's shape moves at the push point, so it is zero at the still point: that mode is uncontrollable.
3. Likewise a height sensor at $x$, $C = [1, x, 0, 0]$, gives $Cv$ = the shape's motion at $x$: zero at the still point, so the mode is unobservable there.

**Exam-style example.** A = [[−1, 0, 0], [−2, −2, 0], [1, 1, −3]] with eigenvalues −1, −2, −3, right eigenvectors (−2, 4, 1), (0, 1, 1), (0, 0, 1). The sensor c = [0, f, g] gives Cv = 4f + g, f + g and g. So the pair is observable iff g ≠ 0, f + g ≠ 0 and 4f + g ≠ 0. (This is review problem B2.)

### What it can't do

PBH names the lost modes but says nothing about cost: a mode can be reachable yet very expensive to move. And it doesn't yet say what H(s) looks like; the Kalman split does.

**Next question.** Once you know which modes fail, you can split them off: the Kalman decomposition.

### Common pitfalls

- Controllability uses **left** eigenvectors (or rank[A − λI, B]); observability uses **right** ones.
- With several inputs, wᵢᵀB is a row: the mode is reached if *any* entry is nonzero.
- For a repeated eigenvalue with several eigenvectors, a single input can never reach them all; check the rank form.
