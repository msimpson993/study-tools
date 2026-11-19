---
id: expm
order: 21
title: State transition matrix
addsToExample: "Gives the car's free motion x(t) = e^(At)x(0): released 2° nose-down from rest, the body swings back to level in a mix of bounce and pitch. With new shocks the bounce ring is down to 5% in about 1.6 cycles; with shocks worn to 20%, about 8."
accountsFor: "The two rhythms in the car's motion, bounce at 1.151 Hz and pitch at 1.419 Hz, and why worn shocks make it ring on."
category: state
neighbors:
  - diag
  - jordan
  - stab
  - tf
matlab: Phi = expm(A * t)
exampleScene: { scene: car, overlays: [trace], caption: "Released nose-down, e^(At) carries the body back to level: a bounce ring plus a pitch ring." }
level: Worked calculation
check: [c-expm-1, m5, m6]
---

**The question:** given the modes, how does any starting state evolve? It follows *Diagonalization* (in the Big picture, *Modes: untangle A*): x(t) = e^(At) x(0), the state transition matrix Φ(t), which in the eigenbasis is just one exponential per mode.

### The big idea

With no input, the state of ẋ = Ax moves on its own, and one matrix, e^(At), carries any starting state forward in time. In mode coordinates it is simple: each mode just follows its own exponential. Back in ordinary coordinates, it mixes those exponentials.

### See it

**Picture it first.** e^(At) is a movie: start the car in any state and it plays the motion that follows with no input. First, for contrast, a forced response (not e^(At)x(0)): a bump drives the car through B, and the response is the front wheel's plus the rear wheel's, 0.18 s later.

```figure:flow
```

Then release the body from a pose and watch e^(At)x(0) play out; wear the shocks and it rings on.

```figure:expm
```

*Look for here:* released 2° nose-down the body levels and settles; this is e^(At)x(0) with no road input at all, unlike the bump above.

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

### Worked example: on the car

1. Car: $A$ is 4×4, so $e^{At} = Ve^{\Lambda t}V^{-1}$ with the four eigenvalues $-2.092 \pm 6.92j$ and $-3.178 \pm 8.328j$ per second; each conjugate pair gives one real damped cosine.
2. Release from rest 2° nose-down: $x(0) = (0, -0.0349, 0, 0)$, since 2° = 0.0349 rad. Then $x(t) = e^{At}x(0)$ is some bounce ring plus some pitch ring, both fading.
3. With new shocks the bounce ring is down to 5% in about 1.6 cycles; with shocks worn to 20% it takes about 8, which is what the figure's shock slider shows.

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
