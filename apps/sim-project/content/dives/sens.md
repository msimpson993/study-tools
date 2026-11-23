---
id: sens
order: 4
title: "Sensitivity: when the machine itself changes"
category: borer
neighbors: [borer, disk]
level: Some algebra
check: [ck-sens-1, ck-sens-2]
addsToExample: "Asks how much the boring machine's loop cares if the machine itself drifts."
accountsFor: Why feedback hides slow wear in the machine but not fast changes.
---

**The question:** if the machine itself changes (its parts wear, it steers less sharply), how much does the loop's behaviour change? This is the box *When the machine changes*.

````callout:short In short
- **Answer:** a 10 % change in the machine changes the loop's response to a wiggle at ω by |S| × 10 %. S ≈ s/K is tiny for slow wiggles and near 1 for fast ones.
- **Knob:** K. Raising it protects slow motions better.
- **Number to keep:** |S| = 0.063 at 1 rad/s for K = 20, so a 10 % change shows as about 0.6 %.
````

### The big idea

- **Sensitivity is a ratio of percentages:** a 10 % change in the machine G changes the loop T's response to a wiggle at ω by |S(jω)| × 10 %.
- **Open loop S = 1:** every percent of change goes straight through.
- **With feedback S = 1/(1 + Gc·G):** where the loop gain is big, S is small, and the loop hides the change.
- **Slow motions are protected, fast ones are not:** for the boring machine S ≈ s/K, tiny for slow wiggles, close to 1 for fast ones.

### See it

Drag K, then the probe frequency ω. The left panel recreates the handout's Fig. 4.27 top plot (S as a path in the complex plane); the right recreates the bottom plot (|S| on log axes, with the dashed shortcut s/K). The readout turns |S| into "a 10 % change in the machine moves the loop by …".

```figure:sens
```

### The math

```eq
S = (ΔT/T)/(ΔG/G) = 1/(1 + Gc·G)
boring machine:  S(s) = s(s + 1)/(s² + 12s + K)  ≈  s/K   for slow changes (small s)
```

**What each symbol means.** T: the closed loop (command → position); G: the machine; Gc: the controller K + 11s; s = jω: a command or motion that wiggles at ω rad/s (ω → 0 is slow, nearly steady). ΔG/G is a small, fixed change in the machine; S says how much of it shows up in the loop's response at each ω.

### Worked example: on the boring machine

| ω (rad/s) | 0.1 | 1 | 10 | 100 |
|---|---|---|---|---|
| \|S\| at K = 20 | 0.0050 | 0.063 | 0.70 | 0.99 |
| shortcut s/K | 0.0050 | 0.050 | 0.50 | 5.0 |
| \|S\| at K = 100 | 0.0010 | 0.014 | 0.84 | 1.00 |

- **A slow motion (0.1 rad/s) at K = 20:** a 10 % change in the machine moves the response 0.05 %.
- **The shortcut** is good below about 1 rad/s and useless above 10, where |S| levels off near 1 (fast changes pass straight through).
- **Higher K helps slow changes** (5× smaller at 0.1 rad/s), but at K = 100 |S| sits slightly above 1 for every change faster than about 13 rad/s, peaking at 1.04 near 19 rad/s: a little worse than no feedback there. At K = 20 it never goes above 1 (not in lab handout).
- **The complex-plane path** (Fig. 4.27, top) starts at 0 and ends at 1; at K = 20 it bulges up to 0.54j.

### Knobs

| Knob | Turn it up | Turn it down |
|---|---|---|
| **K** | S smaller at low frequency (≈ s/K): slow drift hidden better; at large K a small bump above 1 appears at mid frequencies | S larger: drift shows through more |

### What it can't do

- **Small changes only:** S is a slope. A large change (a broken part) needs a new simulation.
- **Fast motions:** where |S| ≈ 1, feedback does nothing for them. The next machine, the disk head, adds a fast part of its own: *A third part: the disk head*.

<p class="src">Sources: Dorf Example 4.5, Eq. 4.60, Fig. 4.27 (pp.263–264): S, the s/K approximation, "increasing the gain K reduces the system sensitivity". Not in lab handout: the table values, the percentage reading, the K = 100 bump above 1. Course background: Control Systems › <a href="../control-systems/#/dive/sens">What if the model is wrong? Sensitivity</a> and <a href="../control-systems/#/dive/fb">Why not infinite gain?</a> (LN2 s.7–9).</p>
