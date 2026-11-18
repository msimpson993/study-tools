---
id: eigfn
order: 3
title: "Signals view: eˢᵗ and zⁿ are only scaled"
addsToExample: "Plays a 500 Hz tone into the speaker: after a brief transient the diaphragm moves at exactly 500 Hz, only scaled by |H(j2π·500)| and delayed by its phase."
accountsFor: "Why a speaker (or any LTI system) never changes the pitch of a tone, only its loudness and timing."
category: signals
neighbors:
  - lti
  - laplace
  - ft
  - eig
matlab: "H = tf(b, a); [mag, ph] = bode(H, 2*pi*500)"
exampleScene: { overlays: [tone], caption: "A 500 Hz tone in, a 500 Hz tone out: the speaker only scales and delays it." }
---

**The question:** which signals does convolution only scale? This is the signals branch of *Which pieces are only scaled?*. For any LTI system the answer is the exponentials e^(st) (and zⁿ in discrete time): they come out as H(s) e^(st), the same shape times one complex number.

Put an exponential e^(st) into a convolution and look at what comes out:

$$y(t)=\int h(\tau)\,e^{s(t-\tau)}\,d\tau=\underbrace{\int h(\tau)e^{-s\tau}d\tau}_{H(s)}\;e^{st}.$$

The output is the input times one complex number. So e^(st) is an **eigenfunction** of every LTI system, and the transfer function H(s) is its **eigenvalue**. In discrete time the same calculation with zⁿ gives H(z) = Σ h[n] z⁻ⁿ.

**Picture it first.** A complex exponential e^(jωt) is a point running round a circle. An LTI system can stretch the circle (|H|) and rotate the starting point (∠H), but it cannot change how fast the point runs. That is why tones keep their frequency.

```figure:eigfn
```

````callout:note What this answers
Why the transfer function is the whole system: knowing H(s) for every s means knowing the scale factor for every eigen-piece, and any input can be split into those pieces.
````

````callout:note What it raises
Which s can we use? For real tones s = jω (Fourier). For decaying or growing signals we need s off the axis, and then the integral may only converge in part of the plane: the Laplace transform and its ROC.
````

````callout:note Mini example
For the speaker, H(s) = X(s)/V(s) = (Bl/Re) / (Mms s² + R s + 1/Cms), with R = Rms + Bl²/Re. At 500 Hz, s = j2π·500 = j3,142 rad/s, which is below the 4,322 rad/s ring frequency, so the tone is boosted relative to the bass and lags by less than 90°.
````

### Common pitfalls

- e^(st) is an *eternal* signal. A tone switched on at t = 0 also excites the natural modes, so there is a transient before the output settles to H(jω)e^(jωt).
- A real sinusoid cos ωt is two exponentials, e^(jωt) and e^(−jωt); for a real system they get conjugate factors, giving |H| cos(ωt + ∠H).
- The eigenvalue depends on s. "The eigenvalue of the system" only makes sense once you say which exponential.
