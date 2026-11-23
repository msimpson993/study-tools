---
id: tuning
order: 16
title: "Choosing the three gains"
category: pid
neighbors: [derivative, windup, lab, methods, failures, index]
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

<a id="toolkit"></a>
### The tuning toolkit

**The question:** the dish is tuned at (2000, 1000, 200). What else helps when a real loop needs tuning? This is the side box *Tuning toolkit*, under *Choosing the three gains*. *The controller menu* and *When the push hits its limit* use the tuned gains; the *PID Lab* opens at P 1000 with the tuned gains as a preset; each symptom card sets its own faulty gains; *Recipes* starts again from P alone with the amplifier's 0.05 s lag added; *The best gain in one number* varies Kd with Kp held at 1000. They are optional; read any of them, in any order. (The grouping is this page's, not the lecture notes'.)

**Finish the controller**

- *The controller menu* (the paragraph just above): what else the controller box can hold, from plain on/off up to PID, and how the lecture notes write PID, with two times in place of Ki and Kd.
- *When the push hits its limit*: a big turn asks for more torque than the motor's 200 N·m. While the torque is stuck at that ceiling, the I part keeps adding up error, so the dish swings past the target when it comes off. The box shows how to stop that.

**Try and find gains**

- *PID Lab: drag the gains yourself*: sliders for Kp, Ki and Kd on the dish, with switches for the wind, sensor noise and the torque limit, so you can check every number above yourself.
- *Recipes: by hand, Ziegler–Nichols, PID Tuner*: three ways to get starting gains. Go by hand from the cause-and-effect table above. Or use a classic test (Ziegler–Nichols): turn up P until the loop just keeps swinging, then read the gains off a table. Or use a MATLAB tool. (not in lecture notes)

**Judge and fix**

- *When it misbehaves: 14 symptom cards*: match what the loop does wrong, such as too slow, swinging, stuck off target or chattering, to its likely cause and the one knob to turn.
- *The best gain in one number*: add up the error over the whole response into one score, then pick the gain with the lowest score. Different scores prefer different amounts of damping.

**Where the main path goes:** back to the house, in *A push we didn't command*.

### What it can't do

It gives no robustness margin (Bode plots and phase margin: not in lecture notes) and no single "best"; *The best gain in one number* offers one-number scores.

<p class="src">Sources: LN1 s.62–72 (what P, I and D each do). Not in lecture notes: the tuning procedure and the trade-off table; the tuning toolkit grouping.</p>
