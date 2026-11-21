---
id: derivative
order: 17
title: "Derivative action: braking before you arrive"
category: pid
neighbors: [integral, tuning, blocks]
level: Some algebra
check: [q-der, ck-der-1, ck-der-2]
---

**The question:** P and I don't add damping; what term brakes the dish before it overshoots? This is the box *Derivative action*, after *Integral action*.

### The big idea

Derivative action opposes motion, so the dish brakes before it arrives. Mathematically it adds Kd to the friction B, exactly like a stiffer shock absorber on the car. Taking the derivative of the error adds a zero (more overshoot, plus a spike when the command steps); taking it from the measured rate of turn (a tachometer, which measures how fast the dish turns) gives the damping without the zero.

### See it

Switch between D on error and D on measurement: same poles, two overshoots.
- **Ideal D (the numbers in the text):** 15.6 % on the error, 4.6 % on the measurement.
- **This figure** filters D at N_f = 200 rad/s, as a real loop must: 16.1 % and 3.8 %.
- **Why the two differ:** D on the error adds a zero at −Kp/Kd.

Turn noise on to see what D does to the torque.

```figure:derivative
```

### The math

```eq
Js² + (B + Kd)s + Kp = 0,   ζ = (B + Kd)/(2√(KpJ))
```

```eq
D on error: Θ/R = (Kd s + Kp)/(Js² + (B + Kd)s + Kp)   (zero at −Kp/Kd)
```

```eq
D on measurement: Θ/R = Kp/(Js² + (B + Kd)s + Kp)   (no zero)
```

**What each symbol means.** Kd: derivative gain (N·m·s/rad); T_D = Kd/Kp: derivative time (s).

### Worked example: on the dish

Kp = 1000, Kd = 120 gives ζ = 0.7, poles −7 ± 7.14j. D on error: 15.6 %, Tₛ 0.50 s. D on measurement: 4.6 %, Tₛ 0.60 s. Kd = 140 gives −8 ± 6j: 12.6 % / 1.5 %. The wind error is unchanged at 1.15°: D does nothing at rest.

**Look back to the corner.** The corner's force c·ż is D on the measurement and k(w − z) is P on the error; the road input enters through both, which is the zero at −k/c = −16 seen in *Close the loop*.

### What it can't do

D amplifies sensor noise (its gain grows with frequency), so it needs a filter N_f in practice; it can't remove steady error.

<p class="src">Sources: LN1 s.69–72. Exam practice: Review › Mini exam 2, Problem 3 (boring machine).</p>
