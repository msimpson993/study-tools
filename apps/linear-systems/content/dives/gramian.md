---
id: gramian
order: 27
title: Gramians
addsToExample: "Computes the house's 3-hour controllability Gramian W(3) for the room-1 heater. Its ellipse is about 4 times longer than it is wide, tilted about 31° up from the room-1 axis. Its eigenvalues are 0.78 and 12.0 K²/(kW²·h), and the thin axis points along ≈(0.51, −0.86). Reaching (10, 10) K costs ∫u² ≈ 3.1 × 10⁷ W²·h; reaching (5, −5) K (a 10 K gap with the average at the outdoor temperature, heater allowed to cool) costs about 6.0 × 10⁷ W²·h, nearly twice as much although it is half as far. These are reaching costs, not holding costs."
accountsFor: "Why some targets are cheap and others expensive even though the house is controllable, and where the least-energy warm-up comes from."
category: steer
neighbors:
  - ctrl
  - optimal
  - obs
  - kalman
matlab: "W = gram(ss(A, B, C, 0), 'c')    % infinite-horizon; or integral(...) for finite T"
exampleScene: { scene: house, overlays: [gramian, heat], caption: "States reachable with the same heating energy in 3 hours: a long, thin, tilted ellipse." }
---

**The question:** controllable, yes, but how much effort does each direction take? It follows *Controllability*: the Gramian W measures how much each direction of the state can be pushed per unit of input energy.

$$W_c(T)=\int_0^T e^{A\tau}BB^{\mathsf T}e^{A^{\mathsf T}\tau}\,d\tau,\qquad W_o(T)=\int_0^T e^{A^{\mathsf T}\tau}C^{\mathsf T}Ce^{A\tau}\,d\tau$$

W_c(T) is positive definite exactly when (A, B) is controllable. The least energy ∫‖u‖²dt that takes the state from 0 to x_f in time T is x_fᵀW_c(T)⁻¹x_f, and the input that does it is

$$u(t)=B^{\mathsf T}e^{A^{\mathsf T}(T-t)}W_c(T)^{-1}\big(x_f-e^{AT}x_0\big).$$

**Picture it first.** B and AB are the directions the input can push in, and the Gramian weighs how far each gets per unit of energy. The states you can reach with one unit of energy form an ellipse (an ellipsoid in n dimensions) whose axes are the eigenvectors of W_c, with half-lengths √(eigenvalues). A long axis is a cheap direction and a short axis an expensive one; if some eigenvalue is zero the ellipse is flat and that direction is unreachable.

```figure:ctrl
```

````callout:note What this answers
How controllable a system is, not just whether. The observability Gramian answers the dual question: how much output energy each initial state produces, so which states are hard to see.
````

````callout:note What it raises
Balanced truncation: change coordinates until W_c = W_o is diagonal, then drop the states that are both hard to reach and hard to see.
````

````callout:note Mini example
For ẋ = u (one integrator), W(T) = T and the cheapest way from 0 to 1 in time T is u = 1/T, with energy 1/T. Halving the time doubles the energy. That is review variant P2.
````

### Common pitfalls

- The order is e^(Aτ)B, not Be^(Aτ).
- The infinite-horizon Gramian (from the Lyapunov equation AW + WAᵀ + BBᵀ = 0) exists only for stable A.
- A Gramian that is nearly singular means "controllable on paper, impractical in reality".
