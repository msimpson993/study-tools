---
id: pbh
order: 26
title: The PBH test
addsToExample: "Tests the house mode by mode. With the heater in room 1, B ∝ (1, 0) is not orthogonal to either left eigenvector, (1, 1) or (1, −1): both modes are reached. Heating both rooms equally, B ∝ (1, 1), is orthogonal to (1, −1): the difference mode is missed. A thermostat reading the average, C = [½, ½], gives Cv = 0 for v = (1, −1): the difference is unseen."
accountsFor: "Exactly which mode a heater or sensor placement loses, not just that one is lost."
category: structure
neighbors:
  - ctrl
  - obs
  - kalman
  - eig
matlab: "for l = eig(A).', rank([A - l*eye(n), B]), end"
exampleScene: { scene: house, overlays: [both, modes], caption: "Heat both rooms equally and the input is perpendicular to the difference mode: that mode is out of reach." }
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

### Worked example: on the house

1. House: left eigenvectors (1, 1) (average) and (1, −1) (difference).
2. Heater in room 1, $B \propto (1, 0)$: both products are nonzero, both modes reached.
3. Equal heating, $B \propto (1, 1)$: orthogonal to (1, −1), the difference mode is missed. An average thermostat, $C = [\tfrac12, \tfrac12]$, gives $Cv = 0$ for $v = (1, -1)$: the difference is unseen.

**Exam-style example.** A = [[−1, 0, 0], [−2, −2, 0], [1, 1, −3]] with eigenvalues −1, −2, −3, right eigenvectors (−2, 4, 1), (0, 1, 1), (0, 0, 1). The sensor c = [0, f, g] gives Cv = 4f + g, f + g and g. So the pair is observable iff g ≠ 0, f + g ≠ 0 and 4f + g ≠ 0. (This is review problem B2.)

### What it can't do

PBH names the lost modes but says nothing about cost: a mode can be reachable yet very expensive to move. And it doesn't yet say what H(s) looks like; the Kalman split does.

**Next question.** Once you know which modes fail, you can split them off: the Kalman decomposition.

### Common pitfalls

- Controllability uses **left** eigenvectors (or rank[A − λI, B]); observability uses **right** ones.
- With several inputs, wᵢᵀB is a row: the mode is reached if *any* entry is nonzero.
- For a repeated eigenvalue with several eigenvectors, a single input can never reach them all; check the rank form.
