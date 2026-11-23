---
id: borer
order: 3
title: "The boring machine: one knob, two goals"
category: borer
neighbors: [speed, sens, disk]
level: Worked calculation
check: [ck-borer-1, ck-borer-2, ck-borer-3]
addsToExample: "Writes the boring machine's loop and turns its K knob for a command and for a push."
accountsFor: Why the handout ends Example 4.5 without picking a K.
---

**The question:** what does the gain K do to the boring machine, and why can't one K be best? These are the boxes *Gain has a price*, *The boring machine's loop*, *K and the command*, *K and the rock's push* and *One knob, two goals*.

### The big idea

- **A software spring and shock absorber:** closed, the loop behaves like a mass on a spring of stiffness K with a damper of 12 (1 from the machine, 11 from the controller's rate term).
- **A stiffer spring with the same damper bounces:** raising K speeds the response up and adds overshoot.
- **A stiffer spring gives less under a steady push:** raising K shrinks the offset the rock leaves, 1/K.
- **So K trades calmness against holding the line.**

### See it

Drag K. The scene shows the cutter steering onto the planned line (or being pushed off it); the plots show the command step, the push step and the poles. Watch the poles meet at K = 36 and split into a swinging pair.

```figure:borer
```

The same K, seen as one point on a curve of overshoot against push offset:

```figure:tradeoff
```

### The math

```eq
machine G(s) = 1/(s(s + 1)),   controller Gc(s) = K + 11s
Y(s) = (K + 11s)/(s² + 12s + K) · R(s)  +  1/(s² + 12s + K) · T_d(s)
s² + 12s + K = s² + 2ζωₙs + ωₙ²   ⇒   ωₙ = √K,  ζ = 6/√K
push offset:  y(∞) = lim_{s→0} s · 1/(s² + 12s + K) · 1/s = 1/K
command:      e(∞) = 1 − K/K = 0
```

**What each symbol means.** Y: machine position; R: planned position; T_d: rock's push at the machine's input; K: proportional gain (the knob); 11: rate gain (fixed in the handout); ωₙ: natural frequency (rad/s), how fast the spring-mass would swing with no damper; ζ: damping ratio, calmness (≥ 1: no swing from the poles).

````callout:derivation Full derivation
Around the loop: Y = G·[Gc·(R − Y) + T_d]. Collect Y: Y·(1 + Gc·G) = Gc·G·R + G·T_d. Divide by 1 + Gc·G and multiply top and bottom by s(s + 1):
Y = (K + 11s)/(s(s + 1) + K + 11s) · R + 1/(s(s + 1) + K + 11s) · T_d, and s(s + 1) + 11s + K = s² + 12s + K.
````

### Worked example: on the boring machine

| | K = 20 | K = 100 | Handout (Table 4.3) |
|---|---|---|---|
| ζ, poles | 1.34; −2, −10 | 0.6; −6 ± 8j | – |
| Step overshoot | 3.9 % | 22.0 % | 4 %, 22 % |
| Settling (2 %) | 0.91 s | 0.67 s | 1.0 s, 0.7 s |
| Push offset | 0.05 | 0.01 | 5 %, 1 % |

- **Why 3.9 % with real poles:** the poles alone would give no overshoot; the 11s term in the numerator (a zero at s = −K/11 = −1.8) kicks the machine when the command jumps.
- **Settling at K = 20:** the exact 2 % settling time is 0.91 s; the handout's table says 1.0 s.
- **A compromise:** K ≈ 39 gives 10 % overshoot and a 2.6 % offset; a 2 % offset needs K = 50, with 12.9 % overshoot (not in lab handout).

### Knobs

| Knob | What it is, physically | Turn it up | Turn it down |
|---|---|---|---|
| **K** (proportional gain) | the spring: steering per metre of error | faster, more overshoot (K = 200: 33 %), smaller push offset (0.005) | calmer and slower, larger offset (K = 10: no overshoot, 0.1) |
| **11** (rate gain, fixed in the handout) | the controller's shock absorber: steering per m/s of error change | more damping: K = 100 with 20 instead of 11 overshoots 10 % | less damping: with 5, 43 %; with 0, 85 % |
| **1** in s(s + 1) (the machine's own drag) | the machine's natural resistance to sideways motion | adds to the damper | – (not a knob you can turn) |

Values for K = 10, 200 and for other rate gains are mine (not in lab handout).

### What it can't do

- **Hold the line exactly:** a steady push always leaves 1/K, because nothing in the controller adds up the error over time. Removing the offset would need a controller term that does.
- **Say how much a change in the machine itself matters:** that is the next box, *When the machine changes*.

<p class="src">Sources: Dorf Example 4.5, Eq. 4.57, Figs. 4.25–4.26, Table 4.3, final-value theorem (pp.260–263). Not in lab handout: the spring/damper reading, ζ and ωₙ, the zero's role, the rate-gain knob, and all values outside K = 20 and 100. Course background: Control Systems › <a href="../control-systems/#/dive/second">Two poles: ζ and ωₙ</a>, <a href="../control-systems/#/dive/sse">Why it stops short</a>; the boring machine is also Mini exam 2, Problem 3.</p>
