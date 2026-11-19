---
id: dist
order: 23
title: "A push we didn't command: disturbances"
category: feedback
neighbors: [sse, sens, fb, tf]
level: Some algebra
check: [q-dist, ck-dist-1, ck-dist-2]
---

**The question:** back at the house, what does feedback do about a push we didn't command, like a cold front? This is the box *A push we didn't command*, after *Choosing the three gains*.

### The big idea

A disturbance is an input we didn't choose. A cold front pulls heat out of both rooms. Without feedback the bedroom simply follows the weather. With a thermostat, the drop is seen and the heater turns up, so the effect shrinks by 1 + L. Proportional control leaves a small droop, because extra heat needs a standing error; PI's integrator keeps raising the heater until the error is zero.

### See it

A −5 K cold front over 24 h, with no controller, P or PI. However you tune it, the heater ends up adding 611 W; P just needs a 0.5 K error to be told to.

```figure:regulate
```

### The math

```eq
X₂ = G₂·U + G_d·D,   G_d = 1/(5s + 1)   (outdoor → bedroom)
```

```eq
U = Kp(R − X₂)  ⇒  X₂/D = G_d/(1 + KpG₂);   droop = D·G_d(0)/(1 + L(0)) = 5/(1 + 9) = 0.5 K
```

- PI: L has an integrator, L(0) = ∞, so the droop is 0.
- Steady extra heat = 5 K × 2 × 55.6 W/K = 611 W, whatever the controller.

**What each symbol means.** d: the outdoor temperature change (K); Kp (W/K); Ki (W/(K·h)); L(0) = Kp·G₂(0). The thermostat here is Kp = 1100 W per K of error and, for PI, Ki = 200 W per K·h.

### Worked example: on the house, −5 K cold front

| controller | after 24 h | worst | extra heat (24 h) |
|---|---|---|---|
| open loop | −4.96 K | −4.96 K | 0 W |
| P 1100 | −0.50 K | −0.61 K | 550 W (peak 666) |
| PI 1100/200 | −0.007 K | −0.58 K | 611 W (peak 737) |

### Exam examples

- LN1 slides 65–68: P leaves −T_d/Kp and PI removes it (the dish, in *Why it stops short* and *Integral action*).
- The steel mill (LN2 slides 11–13): the speed drop under load is reduced to 0.0385 of open loop (slides ≈ 0.04); the amplifier gain K_a ≥ 196 for a ratio of 0.02.

### What it can't do

It can't reject what the heater can't supply: a −30 K front would need more than 2.5 kW. And it acts only after the room has started to cool (feedforward from an outdoor sensor would act earlier; *added*).
