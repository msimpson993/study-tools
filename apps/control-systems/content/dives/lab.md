---
id: lab
order: 18
title: "PID Lab: drag the gains yourself"
category: pid
neighbors: [tuning, windup, methods, failures]
level: Conceptual
check: [q-lab, ck-lab-1]
---

**The question:** can I reproduce every claim in the PID series myself? This is the side box *PID Lab*, in the *Tuning toolkit* under *Choosing the three gains*.

### The big idea

Every claim in the PID series can be reproduced here: the dish in a loop with a real motor (torque limit), a real sensor (noise) and real wind.
- **Filtered D:** the Lab filters the derivative (N_f = 200 rad/s), as a real loop must.
- **So overshoots read a little lower** than the text's ideal-derivative values where D matters: PD 3.8 % vs 4.6 %; tuned 6.3 % vs 7.4 %.
- **Wind numbers hardly move:** the tuned loop is back inside 0.05° 4.83 s after the gust either way.

### See it

The default plant is the dish, 0.1/(s(s + 2)). The alternate adds the motor amplifier's 0.05 s lag, which is what lets the Ziegler–Nichols test find an oscillation. Switching plant resets the gains.

```figure:lab
```

### Every control

- Kp 0–5000 (default 1000), Ki 0–4000 (default 0), Kd 0–500 (default 0) and the derivative filter N_f 20–500 rad/s (default 200).
- Step 0.02–2 rad (default 0.1); wind toggle (20 N·m at t = 10 s); noise toggle (0.01° rms).
- Torque limit |T| 50–1000 N·m (default 200) and anti-windup {none, clamp, back-calculation}: anti-windup stops the integrator piling up error while the torque is clipped (*When the push hits its limit*).
- D on measurement (default on); ghost toggle to keep the last run.
- Window 4–40 s (default 16 s): how long each run lasts. The gust comes at 10 s, so windows of 10 s or less have no gust.
- **Readouts** (green = passes, red = fails, grey = no spec): overshoot (< 10 %); settling to ±2 %; steady error (θ_r − θ just before the gust; zero passes); wind peak, the largest |e| after the gust (< 0.6°); recovery to ±0.05° (spec < 10 s): seconds from the 10 s gust until the error stays inside ±0.05° to the window's end; "not back by T s" means it hadn't settled back when the window ended (a fail; widen the window to see when it does); offset at end, θ_r − θ at the last sample, wind on only (< 0.05°, the page's back-on-target band; PD stays at e = −T_d/Kp, so it fails); peak torque (≤ 200 N·m); stability.

### Presets that reproduce the chain

P 1000; PD (1000, 0, 120); tuned (2000, 1000, 200); too much I (2000, 3000, 200); too much Kd (2000, 1000, 400); derivative kick (D on the error); windup on a 2 rad slew, without and with integrator clamping; Ziegler–Nichols on the dish with its amplifier lag (264, 531.5, 32.8).

PD has no integrator, so the motor can hold the 20 N·m wind only by sitting off target: at rest Kp·e + T_d = 0, so the offset is e = −T_d/Kp = −20/1000 rad = **−1.146°** (the dish 1.146° past the target). Kd does nothing at rest. The P 1000 preset reads −1.149° at the default 16 s window because, with ζ = 0.1, it is still ringing 6 s after the gust; widen the window to 21 s and it reads −1.146°.

### Worked example: on the dish

1. Reproduce the three *Choosing the three gains* panels.
2. Make the dish meet "OS < 5 %, wind peak < 0.6°, recover < 10 s" within 200 N·m.
   - **One answer:** (2000, 500, 200).
   - **What the Lab reads** (derivative filtered at N_f = 200): **3.8 %** overshoot, a **0.574°** wind peak.
   - **Recovery:** at the default 16 s window the Recovery row reads "not back by 16 s" (red: a fail). Widen the window to 21 s: it reads **9.78 s**, and the offset at 21 s is **−0.037°**.
   - **Why the steady-error check fails:** the slow integrator is still **−0.013°** off when the gust arrives at 10 s. That is the price of a small Ki.

### Frequency view (not in lecture notes)

Bode plots are not in the lecture notes; this panel shows how the gains shape the dish loop's gain and phase. Where the gain crosses 1, the phase margin says how far the loop is from oscillating:

- P 1000: crossover 9.90 rad/s, 11.4°, matching its 73 % overshoot;
- PD (1000, 0, 120): 13.86 rad/s, 67.2°;
- the tuned PID: 21.73 rad/s, 70.3°.

The step panel beside it uses D on the error, because one loop function L = Gc·G can only describe that form. That is why it reads 15.8 % for the tuned gains (the D-on-error value in *Choosing the three gains*, step 7) rather than the Lab's 6.3 % with D on the measurement.

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
- **T_d**: wind torque, 20 N·m from t = 10 s.
- **Noise**: sensor noise, 0.01° rms.
- **Anti-windup**: what the integrator does while the torque is clipped. *Clamp* stops it; *back-calculation* bleeds it off.
- **D on measurement / on error**: whether the derivative acts on −θ (no kick at a step) or on e.
- **Offset at end**: θ_r − θ at the window's last sample (°), shown only with the wind on; passes when |offset| < 0.05°.
- **Recovery**: time after the gust (s) until |θ_r − θ| stays below 0.05°; wind on only.

### What it can't do

A linear plant with ideal limits: no gear backlash or stiction (see *When it misbehaves*: nonlinear).

<p class="src">Sources: LN1 s.62–72. Not in lecture notes: the Lab itself, the torque limit, anti-windup and the frequency view.</p>
