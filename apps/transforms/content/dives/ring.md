---
id: ring
order: 1
title: "The running example: a ring and its poles"
addsToExample: "Draws the ringing signal next to its two poles, so the curve and the pole pair are one object seen twice."
accountsFor: "How fast the ring dies (σ) and how fast it rings (ω_d) read straight off the poles."
category: transforms
chain:
  - title: "I have a signal that rings and decays."
  - title: "What is the simplest description of it?"
  - title: "Two exponentials, e^(pt), at the poles p = −σ ± jω_d"
neighbors:
  - spectrum
  - zmap
matlab: "p = roots([1 2*sig sig^2+wd^2]);   % poles of the ring"
---

Take the free response of a damped second-order system: a mass on a spring, or a ringing RLC circuit, released from rest. It is a sinusoid under a decaying envelope. Two numbers describe it: the decay rate σ and the ringing frequency ω_d.

**Picture it first.** Draw the signal on the left and, on the right, a plane whose horizontal axis is *growth rate* and vertical axis is *frequency*. A ringing, decaying signal is exactly two points on that plane (mirror images), the **poles**. Their distance left of the vertical axis is the decay; their height is the ringing. Drag the sliders and watch curve and poles move together.

```figure:ring
```

```eq
x(t) = e^(−σt) cos(ω_d t)   ⇔   poles at  s = −σ ± jω_d
```

````callout:note Why this matters for everything else
Every other box in this map is the same signal seen in a different domain: the spectrum is this plane read along the imaginary axis, sampling moves the poles to z = e^(pT), and the DFT is a finite-record peek at the spectrum.
````
