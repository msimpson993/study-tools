---
id: diag
order: 18
title: Diagonalization & change of basis
addsToExample: "Rewrites the car in mode coordinates (how much bounce, how much pitch): two separate damped oscillators, at 1.151 Hz and 1.419 Hz. Because the damping is proportional (C = 0.08 s·K), the mode shapes are real poses of the body."
accountsFor: "Why the motion after a bump is exactly one bounce ring plus one pitch ring."
category: state
neighbors:
  - eig
  - jordan
  - ortho
  - expm
matlab: "D = inv(V) * A * V    % equivalent: A = V * D * inv(V)"
exampleScene: { scene: car, overlays: [bounce, pitch, trace], caption: "In mode coordinates the car is two independent oscillators." }
level: Some algebra
check: [c-diag-1, m3]
---

**The question:** what does the system look like in eigenvector coordinates? It hangs under *Modes: untangle A*: change basis to the eigenvectors, A becomes the diagonal Λ, and each mode evolves on its own.

### The big idea

A coupled system is hard because every variable pushes on the others. Choose the coordinates well, along the eigenvectors, and the coupling disappears: the system becomes n separate first-order systems, one per mode. Nothing physical changes, only the way we write it down.

### See it

**Picture it first.** Ask the plane to use the eigenvectors as its grid. In those coordinates, A has nothing left to do but stretch each axis.

```picture:pic-diag-grid The main car's bounce shape (blue) and pitch shape (orange) as the axes of the heave–pitch plane. Along either axis A only stretches and fades; that is what diagonal means.
A skewed grid in the heave–pitch plane, its two axes the bounce and pitch shapes.
```

```figure:diag
```

**Second figure: the two axes of the new grid, drawn on the car.** The columns of V are the bounce and pitch shapes used above to split the pose.

```figure:eig
```

*Look for here:* each panel keeps its shape as it swings: that is what makes it a column of V, and why the split above fades part by part.

```eq
A = V Λ V⁻¹,    Λ = V⁻¹ A V
```

```eq
x = V ξ    ⇒    ξ = V⁻¹ x
```

### The math

If the eigenvectors form a basis, stack them as the columns of V and write x = V ξ. In the ξ-coordinates A does nothing but scale each axis: Λ = V⁻¹ A V is diagonal. Solving, iterating, and exponentiating A all become scalar operations on those coordinates.

**What each symbol means.**

- $V$: the matrix whose columns are the eigenvectors.
- $\xi = V^{-1}x$: mode coordinates, how much of each mode the state contains.
- $\Lambda$: the diagonal matrix of eigenvalues.

### Worked example: on the car

1. Car: with proportional damping ($C = 0.08\ \text{s}\cdot K$) the mode shapes are real poses, bounce and pitch. Stack them as the columns of $V$ (positions; the rates use the same shapes).
2. In mode coordinates each amount $q_i$ obeys its own equation, $\ddot q_i + 2\zeta_i\omega_i\dot q_i + \omega_i^2 q_i = 0$: bounce at 1.151 Hz with $\zeta = 0.289$, pitch at 1.419 Hz with $\zeta = 0.357$.
3. A pose 2° nose-down with no heave splits into some pitch and some bounce, because the pitch still point is not at the centre of gravity (the first figure shows the split).

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), with eigenvalues −1, −2 and eigenvectors v₁ = [1, −1]ᵀ, v₂ = [1, −2]ᵀ: V = [[1, 1], [−1, −2]] and V⁻¹ = [[2, 1], [−1, −1]]. A vector x = [3, −4]ᵀ has eigen-coordinates ξ = V⁻¹ x = [2, 1]ᵀ, because 2 v₁ + 1 v₂ = [3, −4]ᵀ. In these coordinates A just multiplies by −1 and −2: Λ ξ = [−2, −2]ᵀ, and V(Λ ξ) = A x.

### What it can't do

Not every matrix diagonalises: with a repeated eigenvalue and too few eigenvectors, the best you can do is Jordan form.

**Next question.** What if there are not enough independent eigenvectors? (Jordan.) And if A acts over time, what is the solution of x′ = Ax in this basis? (e^(At).)

### Common pitfalls

- The two similar-looking formulas are not the same: A = V Λ V⁻¹, so Λ = V⁻¹ A V. Writing V A V⁻¹ is a common slip.
- Having n eigenvalues, counted with multiplicity, does not make A diagonalizable. You need n independent eigenvectors (geometric multiplicity equal to algebraic, for each λ).
- Eigenvalues are similarity-invariant; the eigenvectors are not — they live in a chosen set of coordinates.
