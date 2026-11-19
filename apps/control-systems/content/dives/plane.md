---
id: plane
order: 9
title: "The s-plane as a landscape"
category: describe
neighbors: [splane, inverse]
level: Conceptual
check: [q-plane, q-poles]
---

**The question:** what does |G(s)| look like over the whole s-plane, and why do poles and zeros matter there? This is the side box *The s-plane as a landscape*, under *Poles and zeros*.

### The big idea

Plot |G(s)| as a height over the s-plane: each pole is a peak shooting to infinity, each zero a pit going to zero. Walking up the jω axis gives the frequency response (*preview*): high where the path passes close to a peak.

### See it

House: peaks at −0.2 and −2.2, and for the living room's G₁ a pit at −1.2. Corner: peaks at −2 ± 7.75j and a resonance ridge along jω, highest near 7.5 rad/s.

```figure:plane
```

### Worked example: on the house

The daily heater cycle has ω = 2π/24 = 0.262 rad/h. There |G₂(jω)| = 4.9 K/kW, against 8.2 at DC: the slow pole filters the day-night swing.

### What it can't do

The picture is qualitative; numbers still come from evaluating G. Frequency response is only previewed here (it is not in LN1/2/4).

**Old map:** this box collects the old s-plane sub-chain's first, fourth and fifth boxes; the board's s-plane pairs are still in the Board section.
