---
id: plane
order: 9
title: "The s-plane as a landscape"
category: describe
neighbors: [splane, inverse, sens]
level: Conceptual
check: [q-plane, ck-plane-1]
---

**The question:** is there a picture of G(s) over the whole s-plane? This is the side box *The s-plane as a landscape*, under *Poles and zeros*.

### The big idea

G(s) gives a number at every point of the plane, so plot its size |G| as a height. Poles become infinitely tall peaks and zeros become pits where the surface touches the floor. Walking up the vertical axis, s = jω, gives the plant's response to a sine wave at frequency ω, its *frequency response* (*preview*: the course uses it only lightly). The picture explains at a glance why a plant amplifies some frequencies and ignores others.

### See it

Drag the probe. With the house preset, the peaks sit at −0.2 and −2.2 /h; the living-room G₁ adds a pit at −1.2. The corner preset shows two peaks at −2 ± 7.75j and a ridge along the jω axis, highest near 7.5 rad/s: the body's resonance.

```figure:plane
```

### The math

- |G(s₀)| = (product of the distances from s₀ to the zeros) ÷ (product of the distances from s₀ to the poles), times the gain.
- At s₀ = 0 the height is the DC gain; for the house, |G₂(0)| = 8.18 K/kW.
- On the jω axis the height is the gain to a sine at frequency ω (*preview*).

### Worked example: on the house

- A heater cycled once a day (ω = 2π/24 = 0.262 rad/h): |G₂(jω)| = 4.93 K/kW, against 8.18 at DC.
- Slow changes get through almost fully; faster cycling is smoothed out by the house's heat stores.

### What it can't do

Height alone loses the phase (the delay of the response), which frequency-response design also needs (*preview*). And the landscape describes the plant, not the closed loop, unless you redraw it for T(s).


### Slides

LN1 slide 61 (pole location). The landscape tool is **added**; it isn't in the notes.
