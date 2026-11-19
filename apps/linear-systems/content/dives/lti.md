---
id: lti
order: 1
title: Convolution, LTI & eigenfunctions
addsToExample: "Clicks the speaker with a short voltage pulse: the diaphragm rings at 688 Hz and dies away within a few milliseconds. That ring is the impulse response h(t), and any input is a row of scaled, shifted clicks."
accountsFor: "Why the speaker's response to music, or to anti-noise, can be predicted from that one ring."
category: foundations
neighbors:
  - ft
  - laplace
  - tf
  - diag
matlab: y = lsim(sys, u, t)    % or y = conv(h, x)
exampleScene: { overlays: [conv], caption: "Any input is a row of clicks; the output is the same row of rings, added up." }
level: Conceptual
check: [c-lti-2, pop-kick, q1]
---

**The question:** what is the cheapest thing to know about a system that still tells you everything? This is the box *Pieces: sharp kicks*: if the system is linear and time-invariant, one response is enough, the response to a click. Split any input into clicks, let each one ring, and add the rings: y = h ∗ u.

### The big idea

An LTI (linear, time-invariant) system is described completely by one measured response: its ring after a single sharp kick, the impulse response h(t). Any input is a row of scaled, shifted kicks, so any output is the same row of scaled, shifted rings added up: the convolution y = h ∗ u. Exponentials are special: they pass through only scaled, which is why transforms turn this convolution into multiplication.

### See it

**One click first.** A single click (bar) makes the cone ring and die away; that ring is the impulse response h(t). Box 5 on the map then adds four such rings.

```picture:pic-one-click One click (bar) makes h(t), a ring that dies away.
The earbud's impulse response: one click makes the cone ring and die away within a few milliseconds.
```

**Picture it first.** Convolution is a flip-and-slide: flip the impulse response, slide it along the input, and take the area of the overlap.

```figure:lti
```

```eq
y = h ∗ u,    Y(s) = H(s) U(s)
```

$$H\{e^{st}\} = H(s)\,e^{st},\qquad H(s)=\int_{-\infty}^{\infty} h(t)\,e^{-st}\,dt$$

### The math

A system is linear and time-invariant if and only if it is convolution with a fixed impulse response h. The signals that pass through a convolution unchanged in shape are the eternal exponentials e^(st) (or z^n in discrete time): they are eigenfunctions, and the eigenvalue is the transfer function H(s) (or H(z)). Expanding an input in that basis is what the Laplace, Z, and Fourier transforms do, and it diagonalizes convolution — that is the convolution theorem.

**What each symbol means.**

- $h(\tau)$: the impulse response, how much cone motion is still left a time $\tau$ after one voltage click.
- $u(t-\tau)$: the input that arrived a time $\tau$ ago (volts).
- $y(t)$: the output now (cone motion).
- $s$: a complex rate; $e^{st}$ is a tone that may grow or die.
- $H(s)$: the number the system multiplies $e^{st}$ by, the transfer function.

### Worked example: on the earbud

1. Click the earbud once with a short voltage pulse. The cone rings at about 688 Hz (period ≈ 1.45 ms; undamped it would ring at 717 Hz, and damping slows it to 688 Hz), and the ring's envelope decays with time constant 1/σ ≈ 0.79 ms (σ ≈ 1,266 /s): that ring is $h(t)$.
2. A 1 ms pulse is about four back-to-back clicks. Linearity scales each ring; time invariance shifts each one to its own start time.
3. Add the four shifted rings: that sum is the cone motion for the pulse, $y = h * u$. No new measurement is needed for any other input.

**Exam-style example.** For A = [[0, 1], [−2, −3]] (ÿ + 3ẏ + 2y = u), with B = [0, 1]ᵀ and C = [1, 0], H(s) = 1/((s+1)(s+2)). Feeding the eternal exponential e^(st) (with Re(s) &gt; −1, so the expression converges) returns H(s) e^(st). Along the jω axis, a phasor e^(jω t) comes back multiplied by H(jω). At ω = 0, H(0) = 1/2: a constant input of 1 produces the constant output 1/2, which is the DC gain. The same H is the Laplace transform of h(t) = (e^(−t) − e^(−2t)) u(t).

### What it can't do

Convolution is exact but tedious: every output sample is a whole integral over the past. It also hides what the system does to a given pitch. The next box looks for inputs that come out with the same shape, so the integral collapses to one multiplication.

**Next question.** Convolving every input is tedious. Is there an input that comes out with the same shape? (Yes: exponentials and sine waves, which is why the rest of the course writes signals in that basis.)

### Common pitfalls

- The eigenfunction property is for exponentials that have existed for all time, or else for s inside the ROC of a causal H(s). A sinusoid switched on at t = 0 also produces transients.
- Linearity without time-invariance is not convolution with a single h, and exponentials need not be eigenfunctions.
- Zero-state and zero-input responses are different. The convolution y = h ∗ u is the zero-state response.
