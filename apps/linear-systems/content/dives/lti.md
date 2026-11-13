---
id: lti
order: 12
title: Convolution, LTI & eigenfunctions
category: transforms
chain:
  - title: What if the operator A is an LTI system on signals?
  - title: What are its eigenfunctions?
  - title: Complex exponentials; convolution becomes multiplication
    detail: The same best-basis idea, now for convolution.
neighbors:
  - ft
  - laplace
  - tf
  - diag
matlab: y = lsim(sys, u, t)    % or y = conv(h, x)
---

A system is linear and time-invariant if and only if it is convolution with a fixed impulse response h. The signals that pass through a convolution unchanged in shape are the eternal exponentials e^{st} (or z^n in discrete time): they are eigenfunctions, and the eigenvalue is the transfer function H(s) (or H(z)). Expanding an input in that basis is what the Laplace, Z, and Fourier transforms do, and it diagonalizes convolution — that is the convolution theorem.

**Picture it first.** Convolution is a flip-and-slide: flip the cart's impulse response, slide it along the input, and take the area of the overlap.

```figure:lti
```

```eq
y = h ∗ x,    Y(s) = H(s) X(s)
```

$$H\{e^{st}\} = H(s)\,e^{st},\qquad H(s)=\int_{-\infty}^{\infty} h(t)\,e^{-st}\,dt$$

````callout:note What this answers
Why exponentials are the preferred basis for LTI systems, and why every frequency-domain tool in the class is a change of basis that turns convolution into multiplication.
````

````callout:note What it raises
How do I actually write a given signal in the exponential basis? That splits by whether time is continuous or discrete, and whether the signal is periodic or aperiodic — plus Laplace and Z when you need an ROC.
````

````callout:note Mini example
For the running system, H(s) = 1/((s+1)(s+2)). Feeding the eternal exponential e^{st} (with Re(s) &gt; −1, so the expression converges) returns H(s) e^{st}. Along the jω axis, a phasor e^{jω t} comes back multiplied by H(jω). At ω = 0, H(0) = 1/2: a constant input of 1 produces the constant output 1/2, which is the DC gain. The same H is the Laplace transform of h(t) = (e^{−t} − e^{−2t}) u(t).
````

### Common pitfalls

- The eigenfunction property is for exponentials that have existed for all time, or else for s inside the ROC of a causal H(s). A sinusoid switched on at t = 0 also produces transients.
- Linearity without time-invariance is not convolution with a single h, and exponentials need not be eigenfunctions.
- Zero-state and zero-input responses are different. The convolution y = h ∗ u is the zero-state response.
