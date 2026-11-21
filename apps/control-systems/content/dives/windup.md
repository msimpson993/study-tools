---
id: windup
order: 16
title: "When the push hits its limit: integrator windup"
category: pid
neighbors: [tuning, integral, lab, failures]
level: Conceptual
check: [q-windup, ck-windup-1]
---

**The question:** what goes wrong with integral action when the motor can't give the torque the controller asks for? This is the side box *When the push hits its limit*, under *Choosing the three gains*.

### The big idea

A real motor has a maximum torque. During a big move the controller asks for more than it can give, but the integrator doesn't know, and keeps accumulating error. When the dish finally arrives, the stored integral drives it past. Anti-windup stops integrating while saturated (clamping) or bleeds the excess off (back-calculation).

### See it

The shaded stretch is where the motor is pinned at its limit. At 0.2 rad windup barely shows (7.9 % vs 7.4 %); at 2 rad it triples the overshoot.

```figure:windup
```

### The math

- Clamping: İ = 0 while |u| = u_max and e has the same sign as u.
- Back-calculation: İ = e + (u_sat − u)/T_t.

**What each symbol means.** I: the integrator state; u: the torque asked for; u_sat: the torque delivered; T_t: the tracking time constant (s).

### Worked example: on the dish, tuned PID (2000, 1000, 200), D on measurement

| re-point | no limit | 200 N·m, no AW | 200 N·m, clamping |
|---|---|---|---|
| 0.2 rad | 7.4 % (Tₛ 2.2 s) | 7.9 % (2.4 s) | 5.9 % (1.6 s) |
| 2 rad | 7.4 % (2.2 s; asks 4000 N·m) | 21.6 % (4.6 s) | 3.8 % (0.8 s) |

In the PID Lab (derivative filtered at N_f = 200 rad/s) the two windup presets read **21.2 %** (none) and **3.4 %** (clamp).

### What it can't do

Anti-windup can't make the motor stronger: the slew still takes as long as the torque allows.

<p class="src">Not in lecture notes: windup and anti-windup.</p>
