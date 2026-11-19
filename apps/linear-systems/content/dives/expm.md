---
id: expm
order: 21
title: State transition matrix
addsToExample: "Gives the house's e^(At) = ½[[e₁ + e₂, e₁ − e₂], [e₁ − e₂, e₁ + e₂]] with e₁ = e^(−0.2t), e₂ = e^(−2.2t)."
accountsFor: "The two time scales: the gap between the rooms shrinks with a 27-minute time constant (about 90% gone in 1 h), and the whole house cools over about 5 hours."
category: state
neighbors:
  - diag
  - jordan
  - stab
  - tf
matlab: Phi = expm(A * t)
exampleScene: { scene: house, overlays: [flow, trace], caption: "e^(At) carries the temperatures along the arrows: first onto the average line, then home." }
level: Worked calculation
check: [c-expm-1, m5, m6]
---

**The question:** given the modes, how does any starting state evolve? It follows *Diagonalization* (in the Big picture, *Modes: untangle A*): x(t) = e^(At) x(0), the state transition matrix Φ(t), which in the eigenbasis is just one exponential per mode.

### The big idea

How the unforced state moves, and why diagonalization turns a matrix ODE into n scalar ones.

### See it

**Picture it first.** e^(At) is a movie of the whole plane: every possible state flows along by the same rule, and the movie is the matrix exponential.

```figure:flow
```

The same picture in modal coordinates: in the eigenbasis the two motions separate into pure exponentials.

```figure:expm
```

```eq
x(t) = e^(At) x(0),    e^(At) = Σ (At)^k / k!
```

```eq
A = V Λ V⁻¹    ⇒    e^(At) = V e^(Λt) V⁻¹
```

### The math

The unique solution of x′ = Ax is x(t) = e^(At) x(0), where e^(At) is the matrix exponential (not the elementwise one). If A = V Λ V⁻¹, then e^(At) = V e^(Λt) V⁻¹ and e^(Λt) is diagonal with entries e^(λ\_i t). That is the payoff of the best-basis question for dynamics. In discrete time the same role is played by A^k = V Λ^k V⁻¹.

**What each symbol means.**

- $e^{At}$ (also $\Phi(t)$): the state-transition matrix, taking the state now to the state $t$ later with no input.
- $x(0)$: the starting state.
- $V$, $\Lambda$: eigenvectors and eigenvalues, $A = V\Lambda V^{-1}$.
- $h(t) = Ce^{At}B$: the impulse response read off the state model.

````callout:derivation Full derivation
Start from $\dot x = Ax$. Try a power series $x(t) = \sum_k a_k t^k$: matching powers of $t$ gives $a_{k+1} = A a_k/(k+1)$, so $a_k = A^k x(0)/k!$ and

$$x(t)=\Big(\sum_{k\ge0}\frac{(At)^k}{k!}\Big)x(0)=e^{At}x(0).$$

If $A = V\Lambda V^{-1}$ then $A^k = V\Lambda^kV^{-1}$, so

$$e^{At}=V\,e^{\Lambda t}\,V^{-1},$$

with $e^{\Lambda t}$ diagonal, entries $e^{\lambda_i t}$. With an input, variation of constants gives

$$x(t)=e^{At}x(0)+\int_0^t e^{A(t-\tau)}Bu(\tau)\,d\tau.$$
````

### Worked example: on the house

1. House: $e^{At} = \tfrac12[[e_1 + e_2, e_1 - e_2], [e_1 - e_2, e_1 + e_2]]$ with $e_1 = e^{-0.2t}$, $e_2 = e^{-2.2t}$.
2. At $t = 1$ h: $e_1 \approx 0.819$, $e_2 \approx 0.111$, so $e^{A} \approx [[0.465, 0.354], [0.354, 0.465]]$.
3. From (10, 0) K the rooms after one hour are about (4.6, 3.5) K: the gap has nearly closed while the average is still falling.

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), eigenvalues −1 and −2, V Λ V⁻¹ gives the closed form

```eq
e^(At) = [[2e^(−t) − e^(−2t), e^(−t) − e^(−2t)], [−2e^(−t) + 2e^(−2t), −e^(−t) + 2e^(−2t)]]
```

At t = 0 this is I, as it must be. At t = ln 2, e^(−t) = 1/2 and e^(−2t) = 1/4, so e^(At) = [[3/4, 1/4], [−1/2, 0]]. If B = [0, 1]ᵀ and C = [1, 0], the impulse response is the (1, 2) entry: h(t) = (e^(−t) − e^(−2t)) u(t), which matches the inverse Laplace of 1/((s+1)(s+2)).

### What it can't do

e^(At) needs either eigenvectors (which may be missing) or an infinite series. Cayley–Hamilton reduces it to a finite polynomial in A.

**Next question.** Do those modes decay? (Stability.) And with an input, x(t) = e^(At) x(0) + ∫ e^(A(t−τ)) B u(τ) dτ — can u reach every mode?

### Common pitfalls

- e^(At) is not the matrix of elementwise exponentials. Use the series, a Laplace inversion of (sI − A)⁻¹, or V e^(Λt) V⁻¹.
- For time-varying A(t), the state transition is not exp(∫ A) unless the matrices A(t) commute at different times.
- A Jordan block adds factors t^k e^(λt). A repeated eigenvalue that is still diagonalizable does not.
