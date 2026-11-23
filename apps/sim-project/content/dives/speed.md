---
id: speed
order: 2
title: "The motor: what feedback does to a load"
category: motor
neighbors: [blocks, borer]
level: Worked calculation
check: [ck-speed-1, ck-speed-2, ck-speed-3]
addsToExample: "Adds the tachometer and amplifier: the sag shrinks to 0.3 %."
accountsFor: "Why the handout's closed-loop plot needs a much shorter time axis (0.02 s instead of 7 s): the loop recovers 361× faster."
---

**The question:** a load brakes the motor. How much speed does it lose without feedback, how much with, and which knobs set the difference? These are the boxes *No feedback: the load wins*, *Measure and correct* and *The loop-gain rule*.

````callout:short In short
- **Answer:** open loop, a 1 N·m load costs 0.667 rad/s over about 5 s; the tachometer loop cuts that to 0.00185 rad/s (ratio 0.003, inside the handout's 0.02 rule) and recovers in 3.7 ms.
- **Knobs:** Ka and Kt do the same job; Km/Ra, Kb and b change the drag; J changes only the speed of recovery.
- **One number to keep:** the loop gain, 360. Sag and time constant both divide by 361.
````

### The big idea

- **Without feedback** the speed falls until the motor's own drag balances the load. The drag is the bearings (b = 0.5) plus the back-EMF (1 N·m·s): 1.5 in all.
- **With feedback** a tachometer measures the speed and the amplifier pushes harder when it falls. To the load, that looks like 540 N·m·s of extra friction.
- **One number runs it all:** the loop gain, 360. The sag and the time constant both divide by 1 + 360.

### See it

Switch the loop on and off, then turn the knobs. The scene shows the shaft slowing as the load hits; the plot shows the speed. Use **time axis** to jump between the handout's two plots (7 s and 0.02 s).

```figure:motor
```

### The math

```eq
open:    ω/T_d = −1/(J·s + b + Km·Kb/Ra)            = −1/(2s + 1.5)
closed:  ω/T_d = −1/(J·s + b + Km·(Ka·Kt + Kb)/Ra)  = −1/(2s + 541.5)
final sag (unit load) = −1/(total drag);   time constant τ = J/(total drag)
```

**What each symbol means.** ω: change in shaft speed (rad/s); T_d: load torque (N·m); J: inertia of motor and load (kg·m²); b: bearing friction (N·m·s); Km: torque per amp (N·m/A); Ra: coil resistance (Ω); Kb: back-EMF per rad/s (V·s); Ka: amplifier gain (V/V); Kt: tachometer volts per rad/s (V·s).

### Worked example: on the motor

| | Open loop | Closed loop (Ka = 54) |
|---|---|---|
| Total drag | 1.5 N·m·s | 541.5 N·m·s |
| Final sag per N·m | −0.667 rad/s (handout: −0.66 at 7 s) | −0.00185 rad/s (handout: −0.002) |
| Time constant τ | 1.33 s | 3.69 ms |
| Settled (4τ) | 5.3 s | 14.8 ms |

- **Ratio:** 0.00185/0.667 = 0.0028; the handout rounds to 0.003 and compares it with its rule of thumb, "we generally expect" closed-loop sag ÷ open-loop sag < 0.02 (Dorf p.259). 0.0028 is about 7× inside it.
- **Loop gain:** Km·Ka·Kt/(Ra·1.5) = 540/1.5 = 360, and 1 + 360 = 361 = 1.33 s ÷ 3.69 ms.
- **Smallest Ka for the 0.02 target:** 7.35 (not in lab handout).

### Knobs

| Knob | What it is, physically | Turn it up | Turn it down |
|---|---|---|---|
| **Ka** (amplifier gain) | how many volts the motor gets per volt of speed shortfall | smaller sag, faster recovery (Ka = 100: sag −0.0010, τ = 2.0 ms) | larger sag; Ka = 0 is open loop |
| **Kt** (tachometer gain) | volts the tachometer makes per rad/s | same as Ka: Kt = 2 halves the sag to −0.00093 | Kt = 0.5 doubles it to −0.0037 |
| **Km/Ra** (motor strength) | torque per volt of coil drive | more loop gain *and* more back-EMF drag: smaller sag | weaker motor, larger sag |
| **Kb** (back-EMF) | volts the spinning motor makes back | more built-in drag: open-loop sag falls | open loop sags more |
| **J** (inertia) | how hard the load is to speed up or slow down | slower response (J = 4: τ = 2.67 s open, 7.4 ms closed); final sag unchanged | quicker response, same sag |
| **b** (friction) | bearing drag | open-loop sag shrinks (b = 1: −0.5); closed loop barely changes | open loop sags more |

The knob table's extra values are mine (not in lab handout), from numbers.py.

### What it can't do

- **No price in sight:** in this model more gain is always better. A real amplifier runs out of voltage, and a tachometer adds noise that a high gain amplifies (both not in lab handout). The next box, *Gain has a price*, finds a price in the model itself.
- **Command response:** the handout studies only the load. How fast the closed loop follows a new speed command needs the reference path of its Fig. 4.9, not reproduced in the project pages.

<p class="src">Sources: Dorf Example 4.4, Table 4.2 (p.258), Figs. 4.23–4.24 and pp.259–260 (−0.66, −0.002, 0.003, the 0.02 rule). Not in lab handout: the drag/"electronic friction" reading, the loop-gain bookkeeping, the knob table values, amplifier limits and noise. Course background: Control Systems › <a href="../control-systems/#/dive/fb">Why not infinite gain? The price of feedback</a> (the steel-mill speed loop, LN2 s.10–18).</p>
