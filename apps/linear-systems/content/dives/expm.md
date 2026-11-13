---
id: expm
order: 6
title: State transition matrix
addsToExample: "Gives the cart's state transition matrix e^{At}: multiply by it to jump the state forward t seconds."
accountsFor: "The cart's free motion x(t) = e^{At}x(0) in closed form."
category: time
chain:
  - title: In state space, what if u = 0?
    detail: x′ = Ax.
  - title: In the eigenbasis, what happens to each coordinate?
    detail: It simply multiplies by e^{λt}.
  - title: The state transition matrix
    detail: x(t) = e^{At} x(0), and e^{At} is easy once A is diagonalized.
neighbors:
  - diag
  - jordan
  - stab
  - tf
matlab: Phi = expm(A * t)
exampleScene: { overlays: [flow, modes, trace], caption: "e^{At} carries the state along the flow arrows; each mode shrinks by its own factor." }
---

The unique solution of x′ = Ax is x(t) = e^{At} x(0), where e^{At} is the matrix exponential (not the elementwise one). If A = V Λ V⁻¹, then e^{At} = V e^{Λt} V⁻¹ and e^{Λt} is diagonal with entries e^{λ\_i t}. That is the payoff of the best-basis question for dynamics. In discrete time the same role is played by A^k = V Λ^k V⁻¹.

**Picture it first.** e^{At} is a movie of the whole plane: every possible state flows along by the same rule, and the movie is the matrix exponential.

```figure:flow
```

The same picture in modal coordinates: in the eigenbasis the two motions separate into pure exponentials.

```figure:expm
```

```eq
x(t) = e^{At} x(0),    e^{At} = Σ (At)^k / k!
```

```eq
A = V Λ V⁻¹    ⇒    e^{At} = V e^{Λt} V⁻¹
```

````callout:note What this answers
How the unforced state moves, and why diagonalization turns a matrix ODE into n scalar ones.
````

````callout:note What it raises
Do those modes decay? (Stability.) And with an input, x(t) = e^{At} x(0) + ∫ e^{A(t−τ)} B u(τ) dτ — can u reach every mode?
````

````callout:note Mini example
For the running A, V Λ V⁻¹ gives the closed form

```eq
e^{At} = [[2e^{−t} − e^{−2t}, e^{−t} − e^{−2t}], [−2e^{−t} + 2e^{−2t}, −e^{−t} + 2e^{−2t}]]
```

At t = 0 this is I, as it must be. At t = ln 2, e^{−t} = 1/2 and e^{−2t} = 1/4, so e^{At} = [[3/4, 1/4], [−1/2, 0]]. If B = [0, 1]ᵀ and C = [1, 0], the impulse response is the (1, 2) entry: h(t) = (e^{−t} − e^{−2t}) u(t), which matches the inverse Laplace of 1/((s+1)(s+2)).
````

### Common pitfalls

- e^{At} is not the matrix of elementwise exponentials. Use the series, a Laplace inversion of (sI − A)⁻¹, or V e^{Λt} V⁻¹.
- For time-varying A(t), the state transition is not exp(∫ A) unless the matrices A(t) commute at different times.
- A Jordan block adds factors t^k e^{λt}. A repeated eigenvalue that is still diagonalizable does not.
