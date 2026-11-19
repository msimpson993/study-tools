---
id: ss
order: 17
title: State space
addsToExample: "Writes the car as ẋ = Ax + Bu with x = (z, θ, ż, θ̇): the heave and pitch of the body and their rates. The inputs are the road heights under the front and rear wheels (and their rates); springs kf = 38,000 and kr = 42,000 N/m and shocks cf = 3,040 and cr = 3,360 N·s/m sit 1.2 m ahead of and 1.5 m behind the centre of gravity."
accountsFor: "Why a bump under one wheel makes the body both rise and pitch, from three matrices."
category: state
neighbors:
  - expm
  - tf
  - ctrl
  - diag
matlab: sys = ss(A, B, C, D)
exampleScene: { scene: car, overlays: [springs, state, bump], caption: "A bump under the front wheel, then the rear: the body heaves and pitches. The state is heave, pitch and their rates." }
level: Some algebra
check: [c-ss-1, c-ss-2]
---

**The question:** what does the system remember, and how does that memory change? This is the box *State: what it remembers*. The memory is the state x; write how it changes as ẋ = Ax + Bu, and what a sensor reads as y = Cx + Du.

### The big idea

A transfer function only links input to output. A state-space model keeps the inside too: a few numbers, the state, that remember everything that matters, and a rule for how they change. It is the setting for modes, e^(At), controllability and observability.

### See it

**Picture it first.** Here is the earbud speaker's cone, moving. The two numbers we track (cone position and velocity) are exactly the *state*; drive it with a voltage and watch both. The car on its suspension works the same way, with four numbers: heave, pitch and their rates.

```figure:ss
```

```figure:eig
```

```eq
ẋ = Ax + Bu,    y = Cx + Du
```

```eq
x[k + 1] = A x[k] + B u[k],    y[k] = C x[k] + D u[k]
```

### The math

The state is a finite list of numbers that, together with the future input, determines the future output. A first-order vector ODE (or recurrence) makes the operator over time into a matrix A, so everything about bases and modes applies directly. Different state coordinates are just a change of basis: they do not change the input-output map.

**What each symbol means.**

- $x$: the state, the memory (car: $x = (z, \theta, \dot z, \dot\theta)$, heave in m, pitch in rad, and their rates).
- $u$: the input (car: the road heights $u_f, u_r$ under the front and rear wheels, and their rates).
- $A$: how the state drives its own change (per second): the springs and shocks pulling the body back.
- $B$: where the input pushes.
- $C$: what the sensor reads; $D$: direct feed-through (0 here).

### Worked example: on the car

1. Car: mass $m = 1400$ kg, pitch inertia $J = 2000$ kg·m², front axle $a = 1.2$ m ahead of the centre of gravity, rear axle $b = 1.5$ m behind. The front spring is stretched by $z + a\theta - u_f$; it pushes the body down and, through the lever $a$, pitches it.
2. Newton for heave and for pitch: $m\ddot z = -k_f(z + a\theta - u_f) - k_r(z - b\theta - u_r) + (\text{the same with } c \text{ and rates})$ and $J\ddot\theta = -a\,k_f(z + a\theta - u_f) + b\,k_r(z - b\theta - u_r) + (\dots)$. Two second-order equations make four first-order ones: $\dot x = Ax + Bu$.
3. Because $k_f a = 45{,}600$ N is not $k_r b = 63{,}000$ N, a pure heave also makes a torque: heave and pitch are coupled in $A$.
4. Assumptions: small angles, linear springs and shocks, rigid tyres and no wheel mass, so the model is good to about 5 Hz.

**Exam-style example.** The scalar ODE ÿ + 3ẏ + 2y = u, with phase variables x₁ = y and x₂ = ẏ, becomes ẋ₁ = x₂, ẋ₂ = −2 x₁ − 3 x₂ + u, and y = x₁. That is exactly A = [[0, 1], [−2, −3]], B = [0, 1]ᵀ, C = [1, 0], D = 0. A similarity x = T z produces an equivalent realization (Ā, B̄, C̄, D) = (T⁻¹ A T, T⁻¹ B, C T, D) with the same G(s).

### What it can't do

In these coordinates everything affects everything: heave pushes pitch and back. The equations are coupled, so we can't yet read off how fast things happen.

**Next question.** With u = 0, how does the state actually move? That is the state transition matrix. With u ≠ 0, can the input reach every mode, and can the output see every mode?

### Common pitfalls

- State coordinates are not unique. Eigenvalues, G(s), controllability, and observability are invariant under similarity; the entries of A, B, C are not.
- Do not mix continuous A (from x′ = Ax) with discrete A (from x[k+1] = Ax). Discretizing with period T replaces A by e^(AT), not by T A.
- D is the direct feedthrough. Many mechanical and filter models have D = 0; an RF path with an algebraic path from u to y does not.
