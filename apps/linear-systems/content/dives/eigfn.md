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
level: Conceptual
check: [c-eigfn-1, c-eigfn-2, pop-tone]
---

**The question:** which signals does convolution only scale? This is the box *Pieces: steady sine waves*. For any LTI system the answer starts with the pure tone e^(jωt): it comes out as H(jω) e^(jωt), the same tone times one complex number (a gain and a delay). The same holds for every exponential e^(st), growing or dying (and zⁿ in discrete time): out comes H(s) e^(st).

### The big idea

Some inputs come out of an LTI system with their shape unchanged, only scaled: the pure tone e^(jωt) is the everyday example. If we know the scale factor for every tone, we know the system, because any input is a sum of tones. The transfer function is that list of scale factors.

### See it

**Picture it first.** A complex exponential e^(jωt) is a point running round a circle. An LTI system can stretch the circle (|H|) and rotate the starting point (∠H), but it cannot change how fast the point runs. That is why tones keep their frequency.

```figure:eigfn
```

**Second figure: the scale factor H(jω) at every frequency.** The first figure scales one tone; this one reads |H| for every tone off the pole picture.

```figure:tf
```

*Look for here:* at 690 Hz the dB curve reads the same ×1.83 gain the phasor above shows.

### The math

Put an exponential e^(st) into a convolution and look at what comes out:

$$y(t)=\int h(\tau)\,e^{s(t-\tau)}\,d\tau=\underbrace{\int h(\tau)e^{-s\tau}d\tau}_{H(s)}\;e^{st}.$$

The output is the input times one complex number. So e^(st) is an **eigenfunction** of every LTI system, and the transfer function H(s) is its **eigenvalue**. In discrete time the same calculation with zⁿ gives H(z) = Σ h[n] z⁻ⁿ.

**What each symbol means.**

- $e^{st}$: an exponential input with complex rate $s = \sigma + j\omega$ ($\omega$ in rad/s sets the pitch; $\sigma$ sets growth or decay).
- $h(\tau)$: the earbud's click response.
- $H(s)$: one complex number per $s$; its size is the gain and its angle the phase shift.
- $H(j\omega)$: the same number on steady tones, the frequency response.

### Worked example: on the earbud

1. Play a 500 Hz tone: $s = j2\pi\cdot500 \approx j3{,}142$ rad/s.
2. The model gives $|H| \approx 1.55$ (+3.8 dB) and a lag of about 37°, so the cone moves about 66 µm per volt (42.8 µm/V in the bass × 1.55).
3. Near the peak, 658 Hz, the gain is about ×1.85 (+5.4 dB, 79 µm/V, lag ≈ 73°); at 3 kHz it is ×0.06 (2.6 µm/V).
4. In every case the output is a 500 Hz (or 658 Hz, or 3 kHz) tone: only size and timing change.

**More on the running example.** For the speaker, H(s) = X(s)/V(s) = (Bl/Re) / (Mms s² + R s + 1/Cms), with R = Rms + Bl²/Re. At 500 Hz, s = j2π·500 = j3,142 rad/s, which is below the 4,322 rad/s ring frequency, so the tone is boosted relative to the bass and lags by less than 90°.

### What it can't do

Real signals are not single eternal tones: a click, a buzz or speech is a mix of many pitches, and a tone switched on at t = 0 also excites a transient. To use the fingerprint on those we must first split a signal into tones.

**Next question.** Which s can we use? For real tones s = jω (Fourier). For decaying or growing signals we need s off the axis, and then the integral may only converge in part of the plane: the Laplace transform and its ROC.

### Common pitfalls

- e^(st) is an *eternal* signal. A tone switched on at t = 0 also excites the natural modes, so there is a transient before the output settles to H(jω)e^(jωt).
- A real sinusoid cos ωt is two exponentials, e^(jωt) and e^(−jωt); for a real system they get conjugate factors, giving |H| cos(ωt + ∠H).
- The eigenvalue depends on s. "The eigenvalue of the system" only makes sense once you say which exponential.
