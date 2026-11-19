---
id: diffeq
order: 7
title: Solving ODEs and difference equations as algebra
addsToExample: "Runs the earbud's noise cancelling: a digital filter on the ANC chip is a difference equation, y[n] = Σ bₖu[n − k] − Σ aₖy[n − k], and the Z-transform turns it into H(z). Feedforward ANC filters the outside microphone; feedback ANC filters the in-ear microphone."
accountsFor: "How the chip makes anti-noise one sample at a time, and why its filters are designed as H(z) in the z-plane."
category: signals
neighbors:
  - inverse
  - laplace
  - sampling
  - lti
matlab: "y = filter(b, a, x)    % runs the difference equation"
exampleScene: { overlays: [anc], diagram: [anc-ff, anc-fb], caption: "Feedforward and feedback noise cancelling: each filter is a difference equation. Illustrative waveforms, not a simulated FxLMS." }
level: Worked calculation
check: [c-deq-1, c-deq-2]
---

**The question:** what does the transform buy you for differential and difference equations? It comes from *Laplace and Z*: derivatives become multiplication by s and delays become z⁻¹, so an equation in time turns into algebra, and the initial conditions come along as extra terms.

### The big idea

Where the shape of the answer comes from: one term for each pole of the input (the forced response) and one for each pole of the system (the natural response).

### See it

**Picture it first.** A difference equation's poles and zeros sit in the z-plane; their distances to points on the unit circle shape the frequency response.

```figure:zfilter
```

```figure:sampling
```

### The math

The shift rule makes a difference equation into algebra: y(n − k) ↔ z⁻ᵏY(z) when the initial conditions are zero, and y(n − 1) ↔ z⁻¹Y(z) + y(−1) in the one-sided transform when they are not. For ODEs, ẏ ↔ sY − y(0⁻).

**Recipe.**

1. Transform both sides.
2. Solve for Y(z): it is H(z)X(z) plus initial-condition terms.
3. Partial fractions on Y(z)/z (if there is a z upstairs), then invert term by term.
4. Check y(0) and y(1) against the recursion.

$$y(n)+a_1y(n-1)+a_2y(n-2)=x(n)\;\Longrightarrow\;H(z)=\frac{z^2}{z^2+a_1z+a_2}$$

**What each symbol means.**

- $y(n)$: the output sample number $n$; $x(n)$ the input sample.
- $a_1, a_2$: feedback weights on past outputs; $b_k$: weights on inputs.
- $z^{-1}$: a one-sample delay.
- $H(z)$: the filter's transfer function.

### Worked example: on the earbud

1. Sampled at 8 kHz, the earbud's ring becomes the recursion $y(n) = 1.464\,y(n-1) - 0.729\,y(n-2) + b\,x(n)$: the weights are $2r\cos\theta$ and $r^2$ with $r \approx 0.854$, $\theta \approx 31°$.
2. The Z-transform turns it into $H(z) = b\,z^2/(z^2 - 1.464z + 0.729)$, poles at radius 0.854, angle ±31°.
3. The ANC chip runs filters of exactly this kind on the microphone signals to make anti-noise.

**Exam-style example.** y(n) = −¾y(n − 1) − ⅛y(n − 2) + x(n), x(n) = (½)ⁿu(n), zero initial conditions. Then H(z) = z²/((z + ¼)(z + ½)), X(z) = z/(z − ½), and

$$\frac{Y(z)}{z}=\frac{z^2}{(z-\frac12)(z+\frac14)(z+\frac12)}=\frac{1/3}{z-\frac12}-\frac{1/3}{z+\frac14}+\frac{1}{z+\frac12},$$

so y(n) = [⅓(½)ⁿ − ⅓(−¼)ⁿ + (−½)ⁿ]u(n). Check: y(0) = 1 and y(1) = −¾ + ½ = −¼, as the recursion gives.

### What it can't do

A difference equation runs one sample at a time; on its own it doesn't tell you whether the filter rings, settles or blows up. Reading the poles of H(z) does.

**Next question.** In the earbud the filter coefficients are not fixed: FxLMS adapts them while the music plays so the residual noise at the error microphone keeps shrinking. That is still a difference equation, just with slowly changing coefficients.

### Common pitfalls

- Moving −¾y(n − 1) to the left side makes it +¾: the characteristic polynomial is z² + ¾z + ⅛.
- Doing partial fractions on Y(z) instead of Y(z)/z leaves you handling delays.
- With nonzero initial conditions, use the one-sided shift rule with the y(−1) term.
