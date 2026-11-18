---
id: optimal
order: 29
title: "The best input: Pontryagin's principle"
addsToExample: "Finds the heater profile with the least energy ∫u² dt that warms the house from outdoor temperature to (10, 7) K above it in 3 hours. The costate obeys λ̇ = −Aᵀλ, so u(t) = −bᵀλ(t)/2 is a mix of e^(0.2(t−3)) and e^(2.2(t−3)) shapes: about 1.8 kW at first, rising to 2.4 kW after 2 hours, then easing to about 1 kW at the end, because late heat mostly widens the room-1/room-2 gap (the fast difference mode) instead of warming room 2. Its energy is ∫u² dt ≈ 13.4 kW²·h, and the 2.4 kW peak is within the 2.5 kW heater."
accountsFor: "Why the cheapest warm-up is not a constant power: it leans on the slow average mode early and trims the fast difference mode at the end, and how much energy any target costs (the Gramian gives the same answer)."
category: steer
neighbors:
  - gramian
  - expm
  - ctrl
  - cayley
matlab: "% sol = bvp4c(@(t,y) M*y, @(ya,yb) [ya(1)-x0; yb(1)-xT], solinit)"
exampleScene: { scene: house, overlays: [optimal, trace], caption: "The least-energy heater profile to an illustrative target, (10, 7) K above outdoors in 3 h, and the room temperatures it produces." }
---

**The question:** we can predict the response to any input; which input is best? It follows *How does it evolve?* and *Gramians*: add a cost J, form the Hamiltonian, and Pontryagin's conditions turn the choice of u(t) into a two-point boundary value problem.

Minimise J = ∫₀ᵀ L(x, u) dt subject to ẋ = f(x, u), with x(0) given and x(T) either fixed or free.

1. **Hamiltonian:** H = L + λᵀf (this page's convention; with ½L or −L the costate is scaled or sign-flipped, but u°(t) is the same).
2. **Stationarity:** ∂H/∂u = 0 (no constraint on u), and ∂²H/∂u² > 0 for a minimum.
3. **Canonical equations:** ẋ = ∂H/∂λ, λ̇ = −∂H/∂x.
4. **Boundary conditions:** x(0) given; x(T) given *or* λ(T) = 0 if x(T) is free (transversality).

For a linear system with a quadratic cost, steps 2–3 give a linear system in (x, λ) with the Hamiltonian matrix M, whose eigenvalues come in ± pairs. Then

$$\begin{bmatrix}x(T)\\\lambda(T)\end{bmatrix}=\Phi_M(T)\begin{bmatrix}x(0)\\\lambda(0)\end{bmatrix},\qquad \Phi_M(t)=e^{Mt},$$

and the unknown λ(0) is solved from the known end condition.

**Picture it first.** The two-point problem is solved with a state transition matrix, the same object as e^(At), applied to the Hamiltonian matrix M.

```figure:optimal
```

````callout:note What this answers
How to turn "best" into equations you can solve with the tools you already have: another state transition matrix, this time of the Hamiltonian system.
````

````callout:note What it raises
With cost ∫uᵀu only, λ̇ = −Aᵀλ on its own, and the answer is the Gramian formula u = Bᵀe^(Aᵀ(T−t))W(T)⁻¹(x_f − e^(AT)x₀). Adding a state cost xᵀQx couples x and λ, and an infinite horizon leads to LQR.
````

````callout:note Mini example
ẋ = 6x + u, J = ∫₀¹(x² + 2u²)dt, x(0) = 1, x(1) = 2. H = x² + 2u² + λ(6x + u), so u° = −λ/4 and

$$\begin{bmatrix}\dot x\\\dot\lambda\end{bmatrix}=\underbrace{\begin{bmatrix}6&-\tfrac14\\-2&-6\end{bmatrix}}_{M}\begin{bmatrix}x\\\lambda\end{bmatrix},\quad \omega=\tfrac{\sqrt{146}}{2}\approx6.04,\quad \Phi_M(t)=\cosh\omega t\,I+\frac{\sinh\omega t}{\omega}M.$$

x(1) = φ₁₁(1)·1 + φ₁₂(1)λ(0) = 2 gives λ(0) ≈ 47.94, and u°(0) ≈ −11.98: push hard down first, then let the instability carry x up to 2. The full walkthrough is in the Review area (A4).
````

### Common pitfalls

- λ̇ = −∂H/∂x, with the minus sign.
- λ(T) = 0 only for a free endpoint. With x(T) fixed, λ(0) is the unknown you solve for.
- The factor in u°: 2u² gives ∂H/∂u = 4u + λ, so u° = −λ/4.
- Building e^(Mt) entry by entry from e^(±ωt). Use the full matrix (Cayley–Hamilton or the modes).
