---
id: sse
order: 14
title: "Why it stops short: steady-state error and system type"
category: pid
neighbors: [ctrl, integral, dist]
level: Some algebra
check: [q-sse, q-type, ck-sse-1]
---

**The question:** once the motion stops, how far from the target does the dish end up, and why? This is the box *Why it stops short* (and its side box *System type*), after *Turn up the gain (P)*.

### The big idea

- **Steady-state error:** what's left once the motion stops.
- **Final-value theorem (FVT):** reads it from s → 0 without solving anything.
- **No load:** the dish's angle is the integral of its speed, so it always reaches the target exactly.
- **Steady wind:** it must be held by an equal motor torque, and P makes torque only from error, so an error remains.

### See it

Pick step, wind or ramp, and P or PI. The band shows the beam's 3 dB footprint against the pointing error. Doubling Kp halves the wind error; switching to PI removes it.

```figure:sse
```

### The math

```eq
e(∞) = lim_{s→0} s·E(s)   (only if the closed loop is stable)
```

```eq
Wind: E/T_d = −1/(Js² + Bs + Kp)  ⇒  e_ss = −T_d/Kp
```

```eq
Ramp θ_r = ωt: e_ss = Bω/Kp = ω/K_v,  K_v = Kp/B
```

**What each symbol means.** E: the error r − θ; T_d: wind torque at the motor (N·m); ω: the command's slew rate (rad/s); K_v: velocity constant (1/s).

<a id="type"></a>**System type**. The type is the number of integrators in L. Step error 1/(1 + K_pos); ramp error ω/K_v; type 2 tracks ramps.

````callout:derivation Full derivation
E(s) = R − Θ. With R = 1/s and P: E = (Js² + Bs)/(Js² + Bs + Kp)·(1/s), so sE → 0. With a wind step T_d/s: sE → −T_d/Kp. With a ramp R = ω/s²: sE → ω·B/Kp.
````

### Worked example: on the dish

```figure:torquebal
```

- Kp = 1000, T_d = 20 N·m: −0.02 rad = 1.15°.
- A 1.2 m Ku-band (12 GHz) dish has a 3 dB beam ≈ 70λ/D = 1.46° wide; 1.15° off costs ≈ 12(θ/θ₃)² = 7.4 dB, most of the signal.
- For 0.1° under P you'd need Kp ≥ 11 459 (ζ = 0.03).
- Ramp 1°/s: 0.020°, K_v = 50 /s.

### What it can't do

The FVT gives nonsense for an unstable loop, and says nothing about how long the error takes to settle.

<p class="src">Sources: LN1 s.62–66, 72; LN2 s.19–22 (final-value theorem). Not in lecture notes: system type and K_v; the dish's beam-width estimate. Exam practice: Review › Mini exam 2, Problems 3 and 5.</p>
