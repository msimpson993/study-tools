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

- **Disturbance:** an input we didn't choose. A cold front pulls heat out of both rooms.
- **Open loop:** the bedroom simply follows the weather.
- **With a thermostat:** the drop is seen and the heater turns up, so the effect shrinks by 1 + L.
- **P vs PI:** P leaves a small *droop*, because extra heat needs a standing error. PI's integrator keeps raising the heater until the error is zero.

### See it

A −5 K cold front over 24 h, with no controller, P or PI. Watch the right panel. PI ends up adding 611 W, enough to hold the bedroom exactly. P adds less, 550 W, because it only pushes while the bedroom is 0.5 K low, and that cooler bedroom leaks less.

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
- Steady extra heat = (5 K − droop) ÷ G₂(0). PI: 5 ÷ 8.18 K/kW = 611 W. P: 4.5 ÷ 8.18 = 550 W, which is also Kp × 0.5 K.
- Where PI's 611 W goes: the bedroom, 5 K further above outdoors, leaks 55.56 × 5 = 278 W more. That 278 W has to cross the inner wall, which needs the living room 1 K warmer (278 W ÷ 277.8 W/K), so 6 K further above outdoors. 55.56 × (6 + 5) = 611 W.

**What each symbol means.** **R** command (set point); **Y** output (the bedroom); **E = R − Y** tracking error; **D** disturbance (outdoor change, K; the lecture notes' T_d enters at the plant input, where G_d = G); **G_d** the path from D to Y; **N** sensor noise or error added to the reading. Kp (W/K); Ki (W/(K·h)); L(0) = Kp·G₂(0). The thermostat here is Kp = 1100 W per K of error and, for PI, Ki = 200 W per K·h.

### Worked example: on the house, −5 K cold front

```figure:heatbars
```

| controller | after 24 h | worst | extra heat (24 h) |
|---|---|---|---|
| open loop | −4.96 K | −4.96 K | 0 W |
| P 1100 | −0.50 K | −0.61 K | 550 W (peak 666) |
| PI 1100/200 | −0.007 K | −0.58 K | 611 W (peak 737) |

### What it can't do

It can't reject what the heater can't supply: a −30 K front would need more than 2.5 kW. And it acts only after the room has started to cool (feedforward from an outdoor sensor would act earlier).

<p class="src">Sources: LN1 s.65–68 (a constant disturbance under P alone leaves the steady error −T_d/Kp, because P can supply it only as Kp·e; the house's 0.5 K droop is the same effect; PI removes it); LN2 s.10–13. Not in lecture notes: feedforward. Exam practice: Review › Mini exam 2, Problem 2 (steel mill).</p>
