---
id: methods
order: 20
title: "Recipes: by hand, Ziegler–Nichols, PID Tuner"
category: pid
neighbors: [tuning, lab, index]
level: Worked calculation
check: [q-methods, ck-zn-1]
---

**The question:** is there a recipe that turns a couple of measurements into three gains? This is the side box *Recipes*, under *Choosing the three gains*.

### The big idea

A recipe turns two measurements into three gains. Ziegler–Nichols (ZN) pushes the P loop to the edge of oscillation, reads the gain and period there, and backs off by fixed factors. It is quick and aggressive: a starting point.

### See it

The default plant is the dish with a 0.05 s amplifier lag. Press "find Ku", then apply ZN. On the ideal dish there is no ultimate gain: s² + 2s + 0.1K is stable for every K. ZN's 64 % overshoot against hand tuning's 7 %: ZN aims at fast disturbance rejection. (The Lab's ZN preset filters D at N_f = 200 and reads 67.0 %.)

```figure:zn
```

### The math

```eq
Kp = 0.6K_u,   Ti = T_u/2,   T_D = T_u/8;   Ki = Kp/Ti,   Kd = Kp·T_D
```

**What each symbol means.** K_u: the ultimate gain, where the P loop just oscillates; T_u: the period of that oscillation (s).

### Worked example: on the dish with amplifier lag 1/(0.05s + 1)

1. Characteristic equation: s³ + 22s² + 40s + 2K = 0.
2. Routh: 22·40 = 2K_u, so K_u = 440 N·m/rad; ω_u = √40 = 6.32 rad/s and T_u = 0.994 s.
3. ZN: Kp 264, Ti 0.497 s, T_D 0.124 s, so Ki 531.5 and Kd 32.8.
4. Result: 63.8 % overshoot with D on error, 77.6 % with D on measurement.

### MATLAB's PID Tuner

- Response time slider to the left: slower, lower bandwidth, less overshoot. Transient behaviour toward Robust: more phase margin, less overshoot.
- *Update Block*, then verify on the nonlinear model.

### Writing it up

Lead with the requirement and end with the check; put the designs in one table. Name the mechanism in one clause ("integrator ⇒ e_ss = 0"). Show one overlay of the step responses and one of the final design on the nonlinear model. State the limitations: linear design, one operating point, actuator limits exercised or not.

### What it can't do

It needs a plant that can oscillate under P, ignores torque limits and noise, and gives large overshoot.

<p class="src">Not in lecture notes: Ziegler–Nichols and MATLAB's PID Tuner.</p>
