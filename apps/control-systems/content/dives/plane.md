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

G(s) gives a number at every point of the plane, so plot its size |G| as a height. Poles become infinitely tall peaks and zeros become pits where the surface touches the floor. Walking up the vertical axis, s = jω, gives the plant's response to a sine wave at frequency ω, its *frequency response*. The picture explains at a glance why a plant amplifies some frequencies and ignores others.

### See it

Drag the probe. With the house preset, the peaks sit at −0.2 and −2.2 /h; the living-room G₁ adds a pit at −1.2. The corner preset shows two peaks at −2 ± 7.75j and a ridge along the jω axis, highest near 7.5 rad/s: the body's resonance.

```figure:plane
```

### The math

- |G(s₀)| = (product of the distances from s₀ to the zeros) ÷ (product of the distances from s₀ to the poles), times the gain.
- At s₀ = 0 the height is the DC gain; for the house, |G₂(0)| = 8.18 K/kW.
- On the jω axis the height is the gain to a sine at frequency ω.

**What each symbol means.**

- **s = σ + jω**: a point on the plane. σ (real part) is a decay or growth rate; ω (imaginary part) is a ringing frequency. Units: 1/h and rad/h for the house; 1/s and rad/s for the corner.
- **G(s)**: the plant's fraction; **|G|** is its size, drawn as height (output per input, e.g. K/kW).
- **s₀**: the probe point.
- **ω**: the frequency of a sine input (rad/h or rad/s).
- **G₁, G₂**: heater → living room and heater → bedroom (K/W).
- **T(s)**: the closed loop's fraction, if you redraw the landscape for the loop.

### Worked example: on the house

- A heater cycled once a day (ω = 2π/24 = 0.262 rad/h): |G₂(jω)| = 4.93 K/kW, against 8.18 at DC.
- Slow changes get through almost fully; faster cycling is smoothed out by the house's heat stores.

### What it can't do

Height alone loses the phase (the delay of the response), which frequency-response design also needs. And the landscape describes the plant, not the closed loop, unless you redraw it for T(s).

<p class="src">Sources: LN1 s.61 (pole location). Not in lecture notes: the |G| landscape and the frequency response.</p>
