---
id: lab
order: 19
title: "PID Lab: drag the gains yourself"
category: pid
neighbors: [tuning, windup, methods, failures]
level: Conceptual
check: [q-lab, ck-lab-1]
---

**The question:** can I reproduce every claim in the PID series myself? This is the side box *PID Lab*, under *Tuning by hand*.

### The big idea

Every claim in the PID series can be reproduced here: the dish in a loop with a real motor (torque limit), a real sensor (noise) and real wind.

### See it

The default plant is the dish, 0.1/(s(s + 2)). The alternates are the legacy teaching plants: p1 = 1/(s + 1), p2, and p3 = 1/(s + 1)³ (for the legacy Ziegler–Nichols example). Switching plant resets the gains.

```figure:lab
```

### Every control

- Kp 0–5000 (default 1000), Ki 0–4000 (default 0), Kd 0–500 (default 0) and the derivative filter N_f 20–500 rad/s (default 200).
- Step 0.02–2 rad (default 0.1); wind toggle (20 N·m at t = 3 s); noise toggle (0.01° rms).
- Torque limit |T| 50–1000 N·m (default 200) and anti-windup {none, clamp, back-calculation}.
- D on measurement (default on); ghost toggle to keep the last run.

### Presets that reproduce the chain

P 1000; PD (1000, 0, 120); tuned (2000, 1000, 200); too much I (2000, 3000, 200); too much Kd (2000, 1000, 400); kick (D on error); windup at 2 rad without and with clamping; Ziegler–Nichols on the dish with its amplifier lag; legacy p3 Ziegler–Nichols.

### Worked example: on the dish

1. Reproduce the three *Tuning by hand* panels.
2. Make the dish meet "OS < 5 %, wind peak < 0.6°, recover < 10 s" within 200 N·m. One answer: (2000, 500, 200), giving 4.8 %, 0.57° and 9.7 s.

### Frequency view (*preview*)

Bode plots are not in LN1/2/4; this panel previews how the gains shape the loop's frequency response.

```figure:bodepid
```

### What it can't do

A linear plant with ideal limits: no gear backlash or stiction (see *When tuning goes wrong*: nonlinear).
