---
id: optimal
order: 29
title: "Application: optimal control (Pontryagin's principle)"
addsToExample: "Finds the least-energy front and rear actuator forces (active suspension) that bring the body from 2° nose-down to level and still in 0.5 s. With ∫|u|² dt as the cost the costate obeys λ̇ = −Aᵀλ, so u(t) = −Bᵀλ(t)/2 is built from the car's modes run backwards from T: small at first, growing to peaks of 476 N front and 652 N rear near the end, with E = 96,160 N²·s. Given 1 s, about 120 N is enough."
accountsFor: "Why the cheapest levelling force starts small and grows toward the end, and why a shorter time costs so much more."
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

How to turn "best" into equations you can solve with the tools you already have: another state transition matrix, this time of the Hamiltonian system.

### See it

**Picture it first.** The two-point problem is solved with a state transition matrix, the same object as e^(At), applied to the Hamiltonian matrix M.

```figure:optimal
```

```figure:gramian
```

### The math

Minimise J = ∫₀ᵀ L(x, u) dt subject to ẋ = f(x, u), with x(0) given and x(T) either fixed or free.

1. **Hamiltonian:** H = L + λᵀf (this page's convention; with ½L or −L the costate is scaled or sign-flipped, but u°(t) is the same).
2. **Stationarity:** ∂H/∂u = 0 (no constraint on u), and ∂²H/∂u² > 0 for a minimum.
3. **Canonical equations:** ẋ = ∂H/∂λ, λ̇ = −∂H/∂x.
4. **Boundary conditions:** x(0) given; x(T) given *or* λ(T) = 0 if x(T) is free (transversality).

For a linear system with a quadratic cost, steps 2–3 give a linear system in (x, λ) with the Hamiltonian matrix M, whose eigenvalues come in ± pairs. Then

$$\begin{bmatrix}x(T)\\\lambda(T)\end{bmatrix}=\Phi_M(T)\begin{bmatrix}x(0)\\\lambda(0)\end{bmatrix},\qquad \Phi_M(t)=e^{Mt},$$

and the unknown λ(0) is solved from the known end condition.

**What each symbol means.**

- $J$: the cost to minimise, e.g. $\int (x^\mathsf{T}Qx + u^\mathsf{T}Ru)\,dt$.
- $\lambda(t)$: the costate, the running price of a unit of state.
- $\mathcal{H} = $ running cost $+ \lambda^\mathsf{T}(Ax + Bu)$: the Hamiltonian; the best $u$ minimises it at every instant.
- $M$: the Hamiltonian matrix driving $(x, \lambda)$ together; $\Phi_M = e^{Mt}$.

````callout:derivation Full derivation
Minimise $J = \int_0^T L(x, u)\,dt$ subject to $\dot x = Ax + Bu$. Adjoin the dynamics with a costate $\lambda(t)$ and define

$$\mathcal{H}=L(x,u)+\lambda^\mathsf{T}(Ax+Bu).$$

Setting the first variation of $J$ to zero gives the necessary conditions:

$$\dot x=\frac{\partial\mathcal H}{\partial\lambda},\quad \dot\lambda=-\frac{\partial\mathcal H}{\partial x},\quad \frac{\partial\mathcal H}{\partial u}=0.$$

For $L = x^\mathsf{T}Qx + u^\mathsf{T}Ru$ the last gives $u = -\tfrac12R^{-1}B^\mathsf{T}\lambda$; substituting gives the linear system $(\dot x, \dot\lambda) = M(x, \lambda)$. Boundary conditions: $x(0)$ given, and either $x(T)$ given (then $\lambda(0)$ is unknown) or $\lambda(T) = 0$ when $x(T)$ is free.
````

### Worked example: on the car

1. Car with front and rear actuators: minimise $\int_0^{0.5}|u|^2\,dt$ to go from 2° nose-down at rest to level and still.
2. With $L = |u|^2$ the costate obeys $\dot\lambda = -A^\mathsf{T}\lambda$, so $u(t) = -B^\mathsf{T}\lambda(t)/2$ is built from the car's modes run backwards from $T$; the end condition fixes $\lambda(0)$.
3. Result: small at first, growing to peaks of about 476 N front and 652 N rear near the end, with $E = 96{,}160$ N²·s; the Gramian gives the same answer. Allowed 1 s, about 120 N is enough.

**Exam-style example.** ẋ = 6x + u, J = ∫₀¹(x² + 2u²)dt, x(0) = 1, x(1) = 2. H = x² + 2u² + λ(6x + u), so u° = −λ/4 and

$$\begin{bmatrix}\dot x\\\dot\lambda\end{bmatrix}=\underbrace{\begin{bmatrix}6&-\tfrac14\\-2&-6\end{bmatrix}}_{M}\begin{bmatrix}x\\\lambda\end{bmatrix},\quad \omega=\tfrac{\sqrt{146}}{2}\approx6.04,\quad \Phi_M(t)=\cosh\omega t\,I+\frac{\sinh\omega t}{\omega}M.$$

x(1) = φ₁₁(1)·1 + φ₁₂(1)λ(0) = 2 gives λ(0) ≈ 47.94, and u°(0) ≈ −11.98: push hard down first, then let the instability carry x up to 2. The full walkthrough is in the Review area (A4).

### What it can't do

This plans one input for one start and one target, open loop. A real system meets disturbances, so in practice the optimal input is turned into feedback (LQR) — beyond this course's map.

**Next question.** With cost ∫uᵀu only, λ̇ = −Aᵀλ on its own, and the answer is the Gramian formula u = Bᵀe^(Aᵀ(T−t))W(T)⁻¹(x_f − e^(AT)x₀). Adding a state cost xᵀQx couples x and λ, and an infinite horizon leads to LQR.

### Common pitfalls

- λ̇ = −∂H/∂x, with the minus sign.
- λ(T) = 0 only for a free endpoint. With x(T) fixed, λ(0) is the unknown you solve for.
- The factor in u°: 2u² gives ∂H/∂u = 4u + λ, so u° = −λ/4.
- Building e^(Mt) entry by entry from e^(±ωt). Use the full matrix (Cayley–Hamilton or the modes).
