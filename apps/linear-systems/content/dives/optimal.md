---
id: optimal
order: 29
title: "Application: optimal control (Pontryagin's principle)"
addsToExample: "Finds the least-energy front and rear actuator forces (active suspension) that bring the body from 2° nose-down to level and still in 0.5 s. With ∫|u|² dt as the cost the costate obeys ṗ = −Aᵀp, so u(t) = −Bᵀp(t)/2 is built from the car's modes run backwards from T: small at first, the front force peaking at 476 N part-way through and the rear at 652 N right at the end, with E = 96,160 N²·s. Given 1 s, about 120 N is enough."
accountsFor: "Why the cheapest levelling forces start small, swing in sign, and do their hardest work in the second half, and why a shorter time costs so much more."
category: structure
neighbors:
  - gramian
  - expm
  - ctrl
  - cayley
matlab: "% sol = bvp4c(@(t,y) M*y, @(ya,yb) [ya(1)-x0; yb(1)-xT], solinit)"
exampleScene: { scene: car, overlays: [active, trace], caption: "Least-energy active suspension: front and rear forces that level the body in 0.5 s." }
level: Worked calculation
check: [c-opt-1, c-opt-2, c-opt-3]
---

**The question:** we can predict the response to any input; which input is best? This is an application of the analysis, not part of it: it hangs under *Put it to work*, after the Gramian: add a cost J, form the Hamiltonian, and Pontryagin's conditions turn the choice of u(t) into a two-point boundary value problem.

### The big idea

Many ways of pushing reach the same target, and some cost far less than others. Optimal control finds the cheapest one: write the cost down, add a second running variable, the costate, that keeps track of what each push will cost later, and solve both together. For a linear system it comes down to one more e^(Mt).

### See it

**Picture it first.** The body starts 2° nose-down and at rest, and must be level and at rest exactly at T. Of all the force histories that do it, the least-energy one takes the path below. Finding it is a two-point problem: the state runs forward from the start while its costate p, the price of each push, runs back from the target.

```picture:pic-opt-path The least-energy path (yellow) takes the body from 2° nose-down at rest to level at rest in exactly 0.5 s, in the pitch–pitch-rate plane; left alone (dashed) it swings past and settles more slowly.
A path from a red start point to a green target point in the pitch-angle, pitch-rate plane, with the free motion dashed.
```

```figure:optimal
```

**Second figure: the price of the same move.** The forces above come from the Gramian W(T); this figure plots the least energy against the time allowed.

```figure:gramian
```

*Look for here:* at T = 0.5 s the energy is the 96,160 N²·s of the forces above; allow 1 s and it falls steeply.

### The math

Minimise J = ∫₀ᵀ L(x, u) dt subject to ẋ = f(x, u), with x(0) given and x(T) either fixed or free.

*Notation:* this page writes the Hamiltonian as script 𝓗 and the costate as p, because plain H is the transfer function H(s) and λ names eigenvalues elsewhere in the course (many textbooks use H and λ).

1. **Hamiltonian:** 𝓗 = L + pᵀf (this page's convention; with ½L or −L the costate is scaled or sign-flipped, but u°(t) is the same).
2. **Stationarity:** ∂𝓗/∂u = 0 (no constraint on u), and ∂²𝓗/∂u² > 0 for a minimum.
3. **Canonical equations:** ẋ = ∂𝓗/∂p, ṗ = −∂𝓗/∂x.
4. **Boundary conditions:** x(0) given; x(T) given *or* p(T) = 0 if x(T) is free (transversality).

For a linear system with a quadratic cost, steps 2–3 give a linear system in (x, p) with the Hamiltonian matrix M, whose eigenvalues come in ± pairs. Then

$$\begin{bmatrix}x(T)\\p(T)\end{bmatrix}=\Phi_M(T)\begin{bmatrix}x(0)\\p(0)\end{bmatrix},\qquad \Phi_M(t)=e^{Mt},$$

and the unknown p(0) is solved from the known end condition.

**What each symbol means.**

- $J$: the cost to minimise, e.g. $\int (x^\mathsf{T}Qx + u^\mathsf{T}Ru)\,dt$.
- $p(t)$: the costate, the running price of a unit of state.
- $\mathcal{H} = $ running cost $+ p^\mathsf{T}(Ax + Bu)$: the Hamiltonian; the best $u$ minimises it at every instant.
- $M$: the Hamiltonian matrix driving $(x, p)$ together; $\Phi_M = e^{Mt}$.

````callout:derivation Full derivation
Minimise $J = \int_0^T L(x, u)\,dt$ subject to $\dot x = Ax + Bu$. Adjoin the dynamics with a costate $p(t)$ and define

$$\mathcal{H}=L(x,u)+p^\mathsf{T}(Ax+Bu).$$

Setting the first variation of $J$ to zero gives the necessary conditions:

$$\dot x=\frac{\partial\mathcal H}{\partial p},\quad \dot p=-\frac{\partial\mathcal H}{\partial x},\quad \frac{\partial\mathcal H}{\partial u}=0.$$

For $L = x^\mathsf{T}Qx + u^\mathsf{T}Ru$ the last gives $u = -\tfrac12R^{-1}B^\mathsf{T}p$; substituting gives the linear system $(\dot x, \dot p) = M(x, p)$. Boundary conditions: $x(0)$ given, and either $x(T)$ given (then $p(0)$ is unknown) or $p(T) = 0$ when $x(T)$ is free.
````

### Worked example: on the car

1. Car with front and rear actuators: minimise $\int_0^{0.5}|u|^2\,dt$ to go from 2° nose-down at rest to level and still.
2. With $L = |u|^2$ the costate obeys $\dot p = -A^\mathsf{T}p$, so $u(t) = -B^\mathsf{T}p(t)/2$ is built from the car's modes run backwards from $T$; the end condition fixes $p(0)$.
3. Result: small at first; the front force dips to −476 N at 0.28 s, the rear to −652 N right at the end, with $E = 96{,}160$ N²·s; the Gramian gives the same answer. Allowed 1 s, about 120 N is enough.

**Exam-style example.** ẋ = 6x + u, J = ∫₀¹(x² + 2u²)dt, x(0) = 1, x(1) = 2. 𝓗 = x² + 2u² + p(6x + u), so u° = −p/4 and

$$\begin{bmatrix}\dot x\\\dot p\end{bmatrix}=\underbrace{\begin{bmatrix}6&-\tfrac14\\-2&-6\end{bmatrix}}_{M}\begin{bmatrix}x\\p\end{bmatrix},\quad \omega=\tfrac{\sqrt{146}}{2}\approx6.04,\quad \Phi_M(t)=\cosh\omega t\,I+\frac{\sinh\omega t}{\omega}M.$$

x(1) = φ₁₁(1)·1 + φ₁₂(1)p(0) = 2 gives p(0) ≈ 47.94, and u°(0) ≈ −11.98: push hard down first, then let the instability carry x up to 2. The full walkthrough is in the Review area (A4).

### What it can't do

This plans one input for one start and one target, open loop. A real system meets disturbances, so in practice the optimal input is turned into feedback (LQR, the linear–quadratic regulator): beyond this course.

**Next question.** With cost ∫uᵀu only, ṗ = −Aᵀp on its own, and the answer is the Gramian formula u = Bᵀe^(Aᵀ(T−t))W(T)⁻¹(x_f − e^(AT)x₀). Adding a state cost xᵀQx couples x and p, and an infinite horizon leads to LQR (the linear–quadratic regulator), beyond this course.

### Common pitfalls

- ṗ = −∂𝓗/∂x, with the minus sign.
- p(T) = 0 only for a free endpoint. With x(T) fixed, p(0) is the unknown you solve for.
- The factor in u°: 2u² gives ∂𝓗/∂u = 4u + p, so u° = −p/4.
- Building e^(Mt) entry by entry from e^(±ωt). Use the full matrix (Cayley–Hamilton or the modes).
