---
id: integral
order: 15
title: "Integral action: removing the steady error"
category: pid
neighbors: [sse, windup, derivative, tuning]
level: Some algebra
check: [q-int, ck-int-1, ck-int-2]
---

**The question:** P leaves an error against a steady wind; what kind of term keeps pushing until the error is exactly zero? This is the box *Integral action*, after *Why it stops short*.

### The big idea

An integrator's output stops changing only when its input is zero. So a PI controller can only come to rest with zero error, holding whatever torque the wind needs. The cost is an extra pole, slow and usually lightly damped, that adds overshoot; push Ki too far and the loop oscillates forever.

### See it

Turn the wind on and raise Ki: the wind error decays to zero, but the step overshoot climbs with Ki. A banner appears when Ki ≥ 2Kp.

```figure:integral
```

### The math

```eq
Gc = Kp + Ki/s  ⇒  s³ + 2s² + 0.1Kp s + 0.1Ki = 0
```

```eq
Routh (added): 2·0.1Kp > 0.1Ki  ⇒  Ki < 2Kp   (in general (B/J)·Kp)
```

**What each symbol means.** Ki: integral gain (N·m per rad·s); Ti = Kp/Ki: integral time (s).

### Worked example: on the dish

With Kp = 1000: Ki = 200 gives 75.9 % overshoot; 500 gives 80.2 % (Tₛ 5.1 s); 1000 gives 87.1 %; 2000 puts poles at ±10j, a sustained oscillation. Wind of 20 N·m under PI (1000, 500): peak 1.91° at 0.31 s, then back to zero.

### Exam example

LN1 slides 67–68: PI on the torque-disturbed servo is third order and "may become unstable". The bound above is the *added* Routh check of that remark.

### What it can't do

It removes steady error but adds no damping; on a lightly damped plant it makes things worse. It also winds up when the motor saturates (*When the push hits its limit*).
