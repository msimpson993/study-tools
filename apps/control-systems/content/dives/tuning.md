---
id: tuning
order: 18
title: "Choosing the three gains"
category: pid
neighbors: [derivative, lab, methods, failures, index]
level: Conceptual
check: [q-tune, ck-tune-1, ck-tune-2]
---

**The question:** with P, I and D each helping one thing and hurting another, how do we pick the three numbers? This is the box *Choosing the three gains*, after *Derivative action*.

### The big idea

Each gain moves one thing you want and one you don't. Tuning is walking that trade-off with the specs as the finish line: P for stiffness against wind, D until the damping is right, then just enough I to kill the offset in reasonable time, checking the torque against the motor's limit.

### See it

Three panels start from (2000, 1000, 200); each raises one gain against a dashed ghost of the start. Kp 4000 nearly halves the wind peak, but the slow integrator pole takes longer to clear it (7.1 s).

```figure:gains
```

The cause-and-effect table, with the dish's measured values:

```figure:tunetable
```

### The math

```eq
Gc = Kp + Ki/s + Kd·s  (D on measurement):  s³ + (2 + 0.1Kd)s² + 0.1Kp s + 0.1Ki = 0
```

**What each symbol means.** Ti = Kp/Ki, T_D = Kd/Kp. Specs used: %OS < 10 %, wind peak < 0.6°, e_ss = 0, |T| ≤ 200 N·m on a 0.1 rad step.

### Worked example: on the dish, by hand

1. P 1000: 73 % overshoot, wind 1.15°.
2. PD (1000, 0, 120): 4.6 %, wind still 1.15°.
3. Stiffer PD (2000, 0, 200): ζ 0.78, 2.0 %, Tₛ 0.37 s, wind 0.57°.
4. Add Ki: 500 gives 4.8 % and clears the wind in 9.8 s; 1000 gives 7.4 %, wind peak 0.56°, cleared (< 0.05°) in 4.8 s, poles −10.7 ± 8.6j and −0.53; 2000 gives 12.3 %. Choose (2000, 1000, 200).
5. Torque check: a 0.1 rad step asks Kp·0.1 = 200 N·m, exactly the limit.
6. Sensitivity: Kp 4000 gives 14.3 % and a wind peak of 0.325° but takes 7.1 s to clear; Ki 3000 gives 16.7 %, cleared in 1.6 s; Kd 400 gives 7.6 %, Tₛ 3.59 s (the panels above, ideal derivative).
7. With D on error instead: 15.8 % (the zero again).

<a id="menu"></a>**The controller menu.** On/off, P, I, PI, PD and PID, each with its op-amp circuit. The standard form is Gc = Kp(1 + 1/(Ti s) + T_D s), with Ki = Kp/Ti and Kd = Kp·T_D. The slides write the derivative time Td; here it is T_D, because T_d is the wind torque.

### Where next

- Recipes and tools: *Recipes: Ziegler–Nichols and PID Tuner*.
- Symptoms and fixes: *When it misbehaves*.
- Hands-on: the *PID Lab*.
- One-number scores: *The best gain in one number*.
- Other controller forms and the lecture notes' Kp, Ti, T_D notation: *The controller menu* (below).

### What it can't do

It gives no robustness margin (Bode plots and phase margin: not in lecture notes) and no single "best"; *The best gain in one number* offers one-number scores.

<p class="src">Sources: LN1 s.62–72 (what P, I and D each do). Not in lecture notes: the tuning procedure and the trade-off table.</p>
