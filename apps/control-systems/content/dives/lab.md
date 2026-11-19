---
id: lab
order: 19
title: "PID Lab: drag the gains yourself"
category: pid
neighbors: [tuning, windup, methods, failures]
level: Conceptual
check: [q-lab, ck-lab-1]
---

**The question:** can I reproduce every claim in the PID series myself? This is the side box *PID Lab*, under *Choosing the three gains*.

### The big idea

Every claim in the PID series can be reproduced here: the dish in a loop with a real motor (torque limit), a real sensor (noise) and real wind.

### See it

The default plant is the dish, 0.1/(s(s + 2)). The alternate adds the motor amplifier's 0.05 s lag, which is what lets the Ziegler–Nichols test find an oscillation. Switching plant resets the gains.

```figure:lab
```

### Every control

- Kp 0–5000 (default 1000), Ki 0–4000 (default 0), Kd 0–500 (default 0) and the derivative filter N_f 20–500 rad/s (default 200).
- Step 0.02–2 rad (default 0.1); wind toggle (20 N·m at t = 3 s); noise toggle (0.01° rms).
- Torque limit |T| 50–1000 N·m (default 200) and anti-windup {none, clamp, back-calculation}.
- D on measurement (default on); ghost toggle to keep the last run.

### Presets that reproduce the chain

P 1000; PD (1000, 0, 120); tuned (2000, 1000, 200); too much I (2000, 3000, 200); too much Kd (2000, 1000, 400); derivative kick (D on the error); windup on a 2 rad slew, without and with integrator clamping; Ziegler–Nichols on the dish with its amplifier lag (264, 531.5, 32.8).

### Worked example: on the dish

1. Reproduce the three *Choosing the three gains* panels.
2. Make the dish meet "OS < 5 %, wind peak < 0.6°, recover < 10 s" within 200 N·m. One answer: (2000, 500, 200), giving 4.8 %, 0.57° and 9.7 s.

### Frequency view (not in lecture notes)

Bode plots are not in the lecture notes; this panel shows how the gains shape the dish loop's gain and phase. Where the gain crosses 1, the phase margin says how far the loop is from oscillating:

- P 1000: crossover 9.90 rad/s, 11.4°, matching its 73 % overshoot;
- PD (1000, 0, 120): 13.86 rad/s, 67.2°;
- the tuned PID: 21.73 rad/s, 70.3°.

```figure:bodepid
```

**What each symbol means.**

- **θ_r**: the commanded dish angle (rad), the step size 0.02–2 rad.
- **θ**: the measured angle (rad); e = θ_r − θ is the error.
- **Kp**: N·m per rad of error.
- **Ki**: N·m per rad·s of accumulated error.
- **Kd**: N·m·s per rad, torque per rate of turn.
- **N_f**: derivative filter corner (rad/s). D ignores angle changes faster than about N_f.
- **T_max**: motor torque limit (N·m, default 200).
- **T_d**: wind torque, 20 N·m from t = 3 s.
- **Noise**: sensor noise, 0.01° rms.
- **Anti-windup**: what the integrator does while the torque is clipped. *Clamp* stops it; *back-calculation* bleeds it off.
- **D on measurement / on error**: whether the derivative acts on −θ (no kick at a step) or on e.

### What it can't do

A linear plant with ideal limits: no gear backlash or stiction (see *When it misbehaves*: nonlinear).

<p class="src">Sources: LN1 s.62–72. Not in lecture notes: the Lab itself, the torque limit, anti-windup and the frequency view.</p>
