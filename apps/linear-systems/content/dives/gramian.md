---
id: gramian
order: 27
title: Gramians
addsToExample: "Computes what it costs to bring the car's body from 2° nose-down to level and still in 0.5 s. With front and rear actuators the least energy is E = 96,160 N²·s (peaks 476 N front, 652 N rear). With the front actuator alone the Gramian is nearly singular and the peak force jumps to about 12.9 kN. Allowed 1 s, about 120 N is enough. On the symmetric car a single push at the centre cannot do it at all: its Gramian is singular."
accountsFor: "Why some manoeuvres are cheap and others expensive even though the car is controllable."
category: structure
neighbors:
  - ctrl
  - optimal
  - obs
  - kalman
matlab: "W = gram(ss(A, B, C, 0), 'c')    % infinite-horizon; or integral(...) for finite T"
exampleScene: { scene: car, overlays: [active], caption: "Front and rear actuators level the body; the Gramian says what it costs." }
level: Worked calculation
check: [c-gram-1, c-gram-2]
---

**The question:** controllable, yes, but how much effort does each direction take? It hangs under *Do inside and outside match?*: the Gramian W measures how much each direction of the state can be pushed per unit of input energy.

### The big idea

Controllable says yes or no, but some directions take far more effort to reach than others. The controllability Gramian measures, direction by direction, how easily the input can push the state, and so the least energy each move costs. Its twin, the observability Gramian, measures how clearly each starting state shows up at the output.

### See it

**Picture it first.** B and AB are the directions the input can push in, and the Gramian weighs how far each gets per unit of energy. The states you can reach with one unit of energy form an ellipse (an ellipsoid in n dimensions) whose axes are the eigenvectors of W_c, with half-lengths √(eigenvalues). A long axis is a cheap direction and a short axis an expensive one; if some eigenvalue is zero the ellipse is flat and that direction is unreachable.

```picture:pic-gram-ellipse The heave and pitch the body can reach from rest in 0.5 s on the 96,160 N²·s budget (any final speed): wide with front and rear actuators (blue), a thin sliver with the front one alone (red).
Ellipses of reachable heave and pitch: wide for two actuators, a thin sliver for the front actuator alone.
```

```figure:gramian
```

**Second figure: the forces that spend exactly that energy.** The Gramian gives the cost; this figure plots the least-energy forces themselves.

```figure:optimal
```

*Look for here:* with both actuators in 0.5 s the forces are a few hundred newtons and their energy is the 96,160 N²·s of the first figure; pick the front alone and they jump to kilonewtons.

### The math

$$W_c(T)=\int_0^T e^{A\tau}BB^{\mathsf T}e^{A^{\mathsf T}\tau}\,d\tau,\qquad W_o(T)=\int_0^T e^{A^{\mathsf T}\tau}C^{\mathsf T}Ce^{A\tau}\,d\tau$$

W_c(T) is positive definite exactly when (A, B) is controllable. The least energy ∫‖u‖²dt that takes the state from 0 to x_f in time T is x_fᵀW_c(T)⁻¹x_f, and the input that does it is

$$u(t)=B^{\mathsf T}e^{A^{\mathsf T}(T-t)}W_c(T)^{-1}\big(x_f-e^{AT}x_0\big).$$

**What each symbol means.**

- $W_c(T)$: the controllability Gramian over a time window $T$; its ellipse shows which states are cheap to reach.
- $W_o(T)$: the observability Gramian, how strongly each state shows in the output.
- $x_f$: the target state; $E_{\min} = x_f^\mathsf{T}W_c^{-1}x_f$ the least energy $\int u^2\,dt$ to reach it from rest.

````callout:derivation Full derivation
Reach $x_f$ from $x(0) = 0$ at time $T$: $x(T) = \int_0^T e^{A(T-t)}Bu(t)\,dt$. Minimise $\int_0^T u^2\,dt$ subject to that constraint. A Lagrange multiplier $\eta$ gives $u(t) = B^\mathsf{T}e^{A^\mathsf{T}(T-t)}\eta$. Substitute:

$$x_f=\Big(\int_0^T e^{A\tau}BB^\mathsf{T}e^{A^\mathsf{T}\tau}d\tau\Big)\eta=W_c(T)\,\eta,$$

so $\eta = W_c^{-1}x_f$, and the energy is

$$\int_0^T u^2dt=\eta^\mathsf{T}W_c\,\eta=x_f^\mathsf{T}W_c^{-1}x_f.$$
````

### Worked example: on the car

1. Car, actuators at the front and rear axles, starting 2° nose-down at rest, target level and still at $T = 0.5$ s: the cost is $d^\mathsf{T}W_c(T)^{-1}d$ with $d = x_f - e^{AT}x_0$.
2. Front and rear: $E = 96{,}160$ N²·s, with peak forces of 476 N front and 652 N rear. Front alone: $W_c(0.5)$ is nearly singular in one direction and the peak force jumps to about 12.9 kN.
3. More time makes it cheap: with $T = 1$ s about 120 N is enough. On the symmetric car a single push at the centre cannot do it at all: pitch is unreachable and $W_c$ is singular.

**Exam-style example.** For ẋ = u (one integrator), W(T) = T and the cheapest way from 0 to 1 in time T is u = 1/T, with energy 1/T. Halving the time doubles the energy. That is review variant P2.

### What it can't do

The Gramian prices the cheapest input but only for the plain energy cost and a fixed endpoint. Other costs (state error, effort weights) need the general optimal-control machinery.

**Next question (beyond this course).** Balanced truncation: change coordinates until W_c = W_o is diagonal, then drop the states that are both hard to reach and hard to see.

### Common pitfalls

- The order is e^(Aτ)B, not Be^(Aτ).
- The infinite-horizon Gramian (from the Lyapunov equation AW + WAᵀ + BBᵀ = 0) exists only for stable A.
- A Gramian that is nearly singular means "controllable on paper, impractical in reality".
