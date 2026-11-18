---
id: pbh
order: 26
title: The PBH test
addsToExample: "Tests the house mode by mode. With the heater in room 1, B ∝ (1, 0) is not orthogonal to either left eigenvector, (1, 1) or (1, −1): both modes are reached. Heating both rooms equally, B ∝ (1, 1), is orthogonal to (1, −1): the difference mode is missed. A thermostat reading the average, C = [½, ½], gives Cv = 0 for v = (1, −1): the difference is unseen."
accountsFor: "Exactly which mode a heater or sensor placement loses, not just that one is lost."
category: steer
chain:
  - title: The rank test says something is uncontrollable. Which mode?
  - title: Test each eigenvalue separately
    detail: rank[A − λI, B] = n and rank[A − λI; C] = n.
  - title: In eigenvector language
    detail: wᵢᵀB ≠ 0 (left eigenvector) and Cvᵢ ≠ 0 (right eigenvector).
neighbors:
  - ctrl
  - obs
  - kalman
  - eig
matlab: "for l = eig(A).', rank([A - l*eye(n), B]), end"
exampleScene: { scene: house, overlays: [both, modes], caption: "Heat both rooms equally and the input is perpendicular to the difference mode: that mode is out of reach." }
---

The Popov–Belevitch–Hautus test checks modes one at a time.

$$\text{controllable}\iff\operatorname{rank}[A-\lambda I\;\;B]=n\ \text{for every eigenvalue }\lambda\iff w_i^{\mathsf T}B\neq0\ \text{for every left eigenvector}$$

$$\text{observable}\iff\operatorname{rank}\begin{bmatrix}A-\lambda I\\C\end{bmatrix}=n\ \text{for every eigenvalue }\lambda\iff Cv_i\neq0\ \text{for every right eigenvector}$$

**Picture it first.** A sensor y = cᵀx is a projection. It is blind to a mode exactly when that mode's direction is perpendicular to c. An input column b pushes a mode exactly when b is not perpendicular to that mode's *left* eigenvector.

```figure:kalman
```

````callout:note What this answers
Which mode fails, and what parameter values make it fail. It turns "find the conditions on b, f, g" into one dot product per mode.
````

````callout:note What it raises
Once you know which modes fail, you can split them off: the Kalman decomposition.
````

````callout:note Mini example
A = [[−1, 0, 0], [−2, −2, 0], [1, 1, −3]] with eigenvalues −1, −2, −3, right eigenvectors (−2, 4, 1), (0, 1, 1), (0, 0, 1). The sensor c = [0, f, g] gives Cv = 4f + g, f + g and g. So the pair is observable iff g ≠ 0, f + g ≠ 0 and 4f + g ≠ 0. (This is review problem B2.)
````

### Common pitfalls

- Controllability uses **left** eigenvectors (or rank[A − λI, B]); observability uses **right** ones.
- With several inputs, wᵢᵀB is a row: the mode is reached if *any* entry is nonzero.
- For a repeated eigenvalue with several eigenvectors, a single input can never reach them all; check the rank form.
