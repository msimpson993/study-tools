---
id: fb
order: 25
title: "Why not infinite gain? The price of feedback"
category: feedback
neighbors: [sens, dist, ss]
level: Conceptual
check: [q-noise, ck-noise-1, ck-noise-2]
---

**The question:** if more loop gain rejects more disturbance and model error, why not make it huge? This is the box *Why not infinite gain?*, after *What if the model is wrong?*.

### The big idea

The loop drives the *reading* to the set point, not the room. S = 1/(1 + L) is the share of a disturbance or model error that still gets through; C = L/(1 + L) is the share of the command, and of any sensor error, that reaches the output. S + C = 1. Make L big and S small, and C ≈ 1: sensor errors go straight into the room. High gain also costs heater effort and damping (11 % overshoot at Kp = 1100, 1.5 % at 500).

### See it

Put the sun on the thermostat (a sensor bias) or add fast flicker. Slow bias: C ≈ 1, passed straight through. Fast flicker above about 1.5 rad/h: C falls, filtered out.

```figure:sc
```

### The math

```eq
E = S·R − S·G_d·D + C·N   (sign convention as in the lecture notes)
```

```eq
S + C = 1,   C = L/(1 + L)
```

**What each symbol means.** N: the sensor error (K); C(0) = 0.9 under P 1100 and 1 under PI.

### Worked example: on the house, sun on the thermostat (+1 K reading)

P 1100 leaves the room 0.90 K cold; PI, the full 1 K. The irony: the same integral action that removes the cold-front droop makes the room obey a biased thermostat exactly, so a 1 K high reading gives a 1 K cold room. |C| peaks at 0.96 near 1.2 rad/h; S and C cross near 1.5 rad/h.

### What it can't do

No controller can beat a biased sensor; the fix is a better sensor or better placement.

<p class="src">Sources: LN2 s.1–4, 14 (noise: Y ≈ −N for large L), 15–18. Not in lecture notes: the frequency plot.</p>
