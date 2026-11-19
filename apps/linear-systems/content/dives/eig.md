---
id: eig
order: 2
title: Eigenvectors & eigenvalues
addsToExample: "Solves Av = λv for the car: two complex pairs, s = −2.092 ± 6.92j per second (bounce, 1.151 Hz, ζ 0.289) and s = −3.178 ± 8.328j (pitch, 1.419 Hz, ζ 0.357). Bounce is mostly up and down, its still point 1.06 m behind the rear axle; pitch turns about a still point 0.56 m ahead of the centre of gravity."
accountsFor: "Why the car sways in two distinct rhythms after a bump, and what each looks like on the body."
category: foundations
neighbors:
  - diag
  - jordan
  - ctrl
  - obs
matlab: "[V, D] = eig(A)"
exampleScene: { scene: car, overlays: [bounce, pitch], caption: "Bounce (mostly up and down) and pitch (about a point 0.56 m ahead of the centre): each fades on its own." }
level: Some algebra
check: [c-eig-1, c-eig-2, m1]
---

**The question:** everything affects everything; how do we untangle it? This is the box *Modes: untangle A*. Look for pieces the system does not even reshape: if the input is split into the right pieces, each piece comes out only scaled. Those pieces are eigenvectors (for a matrix) and eigenfunctions (for a signal system), and the scale factors are eigenvalues.

### The big idea

Most directions get twisted when A acts on them, but a few special ones are only stretched. Those are the eigenvectors, and the stretch factor is the eigenvalue. For a system, each such direction is a mode: started along it, the state stays on it and grows or fades at its own rate.

### See it

**Picture it first.** A takes a pose of the body and gives how fast it changes. Started from most poses, the body changes shape as it moves; started from a few special poses, it keeps its shape and only swings bigger or smaller. Those poses are the eigenvectors. On the car they are bounce and pitch: below, each one swings and the outline keeps its shape.

```figure:eig
```

```eq
Av = λv,    v ≠ 0
```

```eq
det(λI − A) = 0
```

### The math

An eigenvector is a line that A leaves invariant: the output is a scalar multiple of the input. That scalar is the eigenvalue, and it is the whole story of A along that line. In a linear system those lines are the modes.

**What each symbol means.**

- $v$: an eigenvector, a direction of the state that $A$ only stretches (a mode's shape).
- $\lambda$: its eigenvalue, the rate (per second for the car) at which that mode grows or fades; a complex pair is one oscillating mode.
- $\det(sI - A)$: the characteristic polynomial; its roots are the eigenvalues, which are also the poles unless a mode is hidden (Box 13). So a mode's e^(λt) is a pole's rhythm e^(pt).

### Worked example: on the car

1. Car: $\det(sI - A)$ is a quartic with roots $s = -2.092 \pm 6.92j$ and $s = -3.178 \pm 8.328j$ per second.
2. A complex pair is one oscillating mode, with $f_n = |s|/2\pi$ and $\zeta = -\operatorname{Re}s/|s|$. Bounce: $|s| \approx 7.23$ /s, so 1.151 Hz and $\zeta = 0.289$. Pitch: 1.419 Hz, $\zeta = 0.357$.
3. Each eigenvector is a pose: bounce is mostly heave, with its still point 1.06 m behind the rear axle; pitch turns about $x = +0.56$ m.
4. On the symmetric car ($k_f a = k_r b$) the two separate exactly: pure bounce and pure pitch about the centre of gravity, at 1.197 and 1.344 Hz undamped.

**Exam-style example.** Take the companion matrix of s² + 3s + 2,

```eq
A = [[0, 1], [−2, −3]]
```

The characteristic polynomial is det(sI − A) = s² + 3s + 2 = (s + 1)(s + 2), so λ₁ = −1 and λ₂ = −2. Matching eigenvectors are v₁ = [1, −1]ᵀ and v₂ = [1, −2]ᵀ. Check: A v₁ = [−1, 1]ᵀ = −1 v₁, and A v₂ = [−2, 4]ᵀ = −2 v₂. The left eigenvectors (wᵀ A = λ wᵀ) are w₁ = [2, 1]ᵀ and w₂ = [1, 1]ᵀ; they matter later for controllability.

### What it can't do

Eigenvectors untangle A only when there are enough of them. A repeated eigenvalue can leave one direction short (Jordan form), and we still need a formula for the whole motion, e^(At).

**Next question.** Do those directions span the whole space? If they do, every vector has coordinates in the eigenbasis, and A becomes a diagonal matrix there.

### Common pitfalls

- det(λI − A) and det(A − λI) differ by a sign when n is odd; the roots are the same, but match the book's convention.
- Right eigenvectors (A v = λ v) and left eigenvectors (wᵀ A = λ wᵀ) are not interchangeable. PBH uses left for controllability and right for observability.
- A real matrix can have complex eigenvalues; they come in conjugate pairs, and the real picture is a plane that A rotates and scales.
