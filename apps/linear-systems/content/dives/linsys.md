---
id: linsys
order: 0
title: What is a linear system, and why do we care?
addsToExample: "Tests the earbud: at a quiet 0.2 V drive the response to two tones is the sum of the two responses, and doubling the drive doubles the motion; at a loud 2 V the cone runs into its (illustrative ±100 µm) excursion limit and both tests fail."
accountsFor: "Why every tool in the course applies to the earbud at normal volume, and stops applying when it is driven into clipping."
category: foundations
neighbors:
  - lti
  - eigfn
  - ss
  - tf
matlab: "% superposition check on a model: max(abs(lsim(sys, u1+u2, t) - (lsim(sys, u1, t) + lsim(sys, u2, t))))"
exampleScene: { overlays: [split, forces], caption: "A tone plus a click goes in; at normal volume the motion is exactly the tone's response plus the click's response." }
level: Some algebra
check: [c-linsys-1, c-linsys-3, c-linsys-5]
---

**The question:** what is a linear system, and why do we care? This dive covers the first four boxes below the root, *What's a system?*, *The core idea*, *What counts as linear?* and *Never perfectly linear?*: before any tool can predict an output, the system has to pass two tests, and almost every system you will meet passes them for small signals.

### The big idea

What the word "linear" promises (sums and scaling pass through), what "time-invariant" adds (delays pass through), and why that pair is worth a whole course.

**Big picture.** A system is a rule that turns an input signal into an output signal. It is linear if it respects sums and scaling, and time-invariant if it behaves the same today as tomorrow. Linearity lets you split any input into simple pieces, find the response to each piece, and add the responses back up; that idea, superposition, is the whole course. Real systems are never exactly linear, but nearly all of them are close to linear for small signals, and for linear systems we have closed-form tools that work the same way in every field.

### A system is a rule: y = T{u}

A system is an operator T: it takes a whole input signal u(t) and returns a whole output signal y(t) = T{u}(t). The earbud takes the drive voltage V(t) and returns the diaphragm motion x(t). The car takes the road heights under its wheels and returns the body's heave and pitch. "The system" always means the rule, not any one input or output.

```eq
y = T{u}
```

### The tests: additivity, homogeneity, time invariance

$$\text{Additivity: } T\{u_1+u_2\}=T\{u_1\}+T\{u_2\}$$

$$\text{Homogeneity: } T\{a\,u\}=a\,T\{u\}$$

A system that passes both is **linear**; the two together say $T\{a u_1 + b u_2\} = a\,T\{u_1\} + b\,T\{u_2\}$. A separate property, **time invariance**, says that delaying the input only delays the output: if $y = T\{u\}$ then $T\{u(t-\tau)\} = y(t-\tau)$ for every delay τ. Linear and time-invariant together is **LTI**.

Non-examples, and one example:

- **y = u²** fails both: $(u_1+u_2)^2 \ne u_1^2 + u_2^2$, and doubling the input quadruples the output.
- **Clipping or saturation** (an amplifier at its rails, a speaker cone at its excursion limit) fails homogeneity at large signals: twice the input cannot give twice the output once the output has hit its limit. It also fails additivity there.
- **y = 2u + 1** is a straight line but it is **affine**, not linear: zero in does not give zero out. $T\{u_1+u_2\}$ has one +1, $T\{u_1\}+T\{u_2\}$ has two.
- **y = u·cos(ω₀t)**, an AM mixer, is linear (sums and scaling pass through) but **time-varying**: delaying u does not delay the carrier.
- **y(t) = u(2t)**, playing the input at double speed, is linear but not time-invariant: delaying the input by τ delays the output by only τ/2.
- **y(t) = u(t − 1)**, a pure delay, is LTI.

**What each symbol means.**

- $T$: the system's rule, taking a whole input signal to a whole output signal (earbud: voltage → cone motion).
- $u_1, u_2$: any two input signals (volts for the earbud).
- $a, b$: any two numbers, the scale factors.
- $T\{u\}$: the output signal the rule gives for input $u$ (micrometres of cone motion).

### See it

**Picture it first.** Run the three tests on the earbud and five other systems. At a quiet drive the earbud's two curves lie on top of each other; turn the drive up and the cone runs into its limit.

```callout:predict Before you move the slider
Play the earbud quietly, then 10 times louder. Does the diaphragm move exactly 10 times as far both times?
```

```figure:lintest
```

```figure:lti
```

### Why we care

1. **Superposition is the whole course.** If T is linear, split any input into pieces, find the response to each piece, and add the responses. Impulses as the pieces give convolution, y = h ∗ u; exponentials and tones give transfer functions and Fourier analysis; eigenvectors of A give modes. Every later box picks a different set of pieces.
2. **Almost every real system is about linear for small signals.** Around an operating point, a smooth nonlinear system $\dot x = f(x, u)$ behaves like its first-order Taylor expansion, and the linear model is the Jacobian there: $\delta\dot x = \frac{\partial f}{\partial x}\big|_0\,\delta x + \frac{\partial f}{\partial u}\big|_0\,\delta u$. A transistor amplifier's small-signal model is this expansion about its bias point; a pendulum obeys $\sin\theta \approx \theta$ (within 1% up to about 14°); a speaker at normal volume moves a few micrometres, well inside its range.
3. **Closed-form general tools.** For linear systems we have convolution, the Laplace, Z and Fourier transforms, the matrix exponential $e^{At}$ and eigenvalues: one formula covers every input. Nonlinear systems mostly lack such general tools and are often simulated case by case.
4. **The same math works across fields.** A filter, a channel, a building, a beam and a lens blur are all LTI systems; the tools carry over unchanged (see *Where this shows up* on the central-question page).

```callout:trap Linear and time-invariant are different properties
Linear and time-invariant are two separate properties. Convolution needs both; a time-varying linear system has an h that depends on when you kick it.
```

### Worked example: on the earbud

Drive the earbud with u₁ = 0.2 V at 200 Hz and u₂ = 0.12 V at 690 Hz. Its small-signal gain at 200 Hz is 42.8 µm/V × |H(200 Hz)| ≈ 45.8 µm/V, so u₁ alone moves the cone about 9.2 µm peak (the linear model; 9.1 µm with the soft limit). The response to u₁ + u₂ matches the sum of the two responses to within 0.5%, and doubling u₁ doubles the motion to within 0.7%. At 2 V the linear model predicts about 92 µm, close to the illustrative ±100 µm limit, and through the soft limit the cone actually peaks at about 72 µm. At 4 V the linear model would give 183 µm, but the cone reaches only about 95 µm, well short of 2 × 72 ≈ 145 µm: T{2u₁} falls 29% (rms) short of 2·T{u₁}.

### What it can't do

The tests tell you *whether* superposition is allowed; they do not tell you what the output is. For that you still need the response to some simple pieces, and the cone's ±100 µm limit means every result here holds only at normal volume.

**Next question.** If sums pass through, what are the best pieces to split an input into? The next box answers with impulses: y = h ∗ u.

### Common pitfalls

- Zero in must give zero out. A straight-line graph through an offset (y = 2u + 1) is affine, not linear; measure about the operating point (δy = 2δu) and it becomes linear.
- Check additivity and homogeneity with signals, not single numbers: y(t) = u(2t) maps the number 1 to 1, but it is the time axis it changes.
- A system can be linear but time-varying (the AM mixer), or nonlinear but time-invariant (the clipped earbud). The two properties are tested separately.
- A linearized model holds only near its operating point. Drive the speaker into its excursion limit and the predictions of every later box stop holding.
