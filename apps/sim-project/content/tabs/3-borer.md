---
id: borer
order: 3
title: Boring machine
summary: "Dorf Example 4.5 (Figs. 4.25–4.27): the Channel Tunnel boring machine, one gain K traded between following the steering command, resisting the rock, and not caring about changes in the machine."
figures: [loop, borer, tradeoff, sens, blocks]
quizTags: [borer]
---

## (a) The problem

The boring machines that dug the Channel Tunnel had to steer in a straight line while the rock pushed them off course. A controller turns the steering error into a steering effort, with one adjustable gain K. The handout compares K = 20 and K = 100: the step in the steering command (Fig. 4.25), a constant push from the rock (Fig. 4.26), and how much the loop cares about changes in the machine (Fig. 4.27).

- **Takeaway:** **raising K holds the line better against the rock** (offset 1/K: 0.05 at K = 20, 0.01 at K = 100) **and makes the loop less sensitive**, **but it overshoots more** (4 % → 22 %). There is no setting that wins everything; the handout picks K = 20 for overshoot, then notes K = 100 is better for the rock.
- **The advantages it shows:** Dorf §4.9 says this example demonstrates reduced sensitivity to process changes, adjustment of the transient response, and reduced steady-state error.

## (b) The setup

**Live figure:** `loop`, preset `borer` (new figure, see FIGURES.md).

```figure:loop preset=borer
```


**The blocks, in plain words:**
- **What s means:** read s as "rate of change" and 1/s as "add up over time". A block's fraction in s is its *transfer function*, its input-to-output rule.
- **The machine, G = 1/(s(s+1)):** steering effort in, position out. The 1/s means a held effort keeps moving the machine sideways (it adds up); the (s+1) means the response is sluggish, with a 1 s lag.
- **The controller, Gc = K + 11s:** the effort is K × (how far off you are) plus 11 × (how fast the error is changing). The handout keeps the rate gain at 11 and only turns K.
- **The rock, T_d:** a push that adds straight to the effort, after the controller.
- **The sensor:** unity feedback; the position is measured and compared directly.

**The model (Dorf Eq. 4.57):**

```eq
Y(s) = (K + 11s)/(s² + 12s + K) · R(s)  +  1/(s² + 12s + K) · T_d(s)
```

- **First part:** how the position follows the command R.
- **Second part:** how much the rock T_d moves it.
- **Both share the denominator s² + 12s + K.** It sets how the machine moves no matter which input started it, so K changes both responses at once.

## (c) What's going on

1. **K sets how springy the response is.** The denominator is the standard "mass on a spring with a damper" form. Its *damping ratio* ζ (zeta) says how fast swings die out: ζ ≥ 1 means no swing from the poles, small ζ means a bouncy response. Here ζ = 6/√K, so K = 20 gives ζ = 1.34 (heavily damped) and K = 100 gives ζ = 0.6 (bouncy). Critical damping, the dividing line ζ = 1, is K = 36. **Live figure:** `borer`, presets `k20`, `k100`, `k36`.

```figure:borer preset=k20
```

2. **The command step: higher K is faster but overshoots.** *Overshoot (P.O.)* is how far past the target the response goes; *settling time T_s* is when it stays within 2 % of the target. K = 20 gives 3.9 % and 0.91 s; K = 100 gives 22 % and 0.67 s. **Live figure:** `borer`, input *command*, presets `k20` then `k100`.

```figure:borer preset=k20
```

3. **Why K = 20 overshoots at all (not in lab handout).** With ζ = 1.34 the poles alone would give no overshoot. The rate term 11s puts a *zero* in the command response at s = −K/11 = −1.82, a kick that adds the 3.9 %. The poles alone give 0 % at K = 20 and 9.5 % at K = 100. Even at K = 36 (ζ = 1) the zero leaves 9.2 % overshoot. **Live figure:** `borer`, turn on *ghosts* to see the poles-only curve.

```figure:borer
```

4. **The rock: higher K gives a smaller offset.** A steady push of 1 leaves the machine off by 1/K, by the *final value theorem* (the handout's shortcut: set s = 0 in the model to read where it ends up). That is 0.05 at K = 20 and 0.01 at K = 100. The controller only fights back in proportion to the error, so some error must remain to hold off the push. **Live figure:** `borer`, preset `push`.

```figure:borer preset=push
```

5. **The trade, on one chart.** Sweeping K from 5 to 400 puts overshoot and push offset on the same axes. Each one gets better as the other gets worse, and the designer picks the point. K = 38.7 is where overshoot hits 10 %, with offset 0.026 (not in lab handout). **Live figure:** `tradeoff`, preset `borer`, then `ten`.

```figure:tradeoff preset=borer
```

6. **Sensitivity: higher K means changes in the machine matter less.** S(jω) is the response to a wiggle at ω: if G changes by 10 % at that wiggle rate, the overall response changes by |S| × 10 %. Here S = s(s+1)/(s² + 12s + K) ≈ s/K for slow wiggles, so at ω = 0.1 rad/s |S| = 0.005 at K = 20 and 0.001 at K = 100. For fast wiggles |S| climbs to about 1: there, feedback no longer helps. **Live figure:** `sens`, presets `fig427` then `k100`.

```figure:sens preset=fig427
```


## (d) Try it

| Handout case | Live figure and preset | What you should see |
|---|---|---|
| Fig. 4.25(a), K = 100 step | `borer` → **K = 100** (`k100`) | 22 % overshoot, T_s 0.67 s |
| Fig. 4.25(b), K = 20 step | `borer` → **K = 20** (`k20`) | 3.9 % overshoot, T_s 0.91 s |
| Fig. 4.26, the rock | `borer` → **rock push, K = 20 vs 100** (`push`) | offsets 0.01 and 0.05 |
| Table 4.3, the trade | `tradeoff` → **boring machine, K = 100** (`borer`) | the two handout points on the curve |
| Fig. 4.27, sensitivity | `sens` → **Fig. 4.27 (K = 20)** (`fig427`), then **K = 100** (`k100`) | ≈ s/K at low ω, near 1 at high ω |
| Critical damping (not in lab handout) | `borer` → **K = 36 (ζ = 1)** (`k36`) | ζ = 1, still 9.2 % from the zero |
| Without the rate term (not in lab handout) | `borer` → **no rate term (own)** (`nodamp`) | Kd = 0: 85 % overshoot, T_s 7.6 s |
| The scripts, line by line | `blocks` → **Fig. 4.25 (command step)** and **Fig. 4.26 (rock push)** (new presets `borerstep`, `borerpush`) | each line lights its block |

**Sliders to play with:** K (5–400), input (command, push, both), the rate gain Kd (0–30; the handout fixes 11).

| Knob | Turn it up | Turn it down |
|---|---|---|
| **K** | smaller push offset (1/K), lower sensitivity, more overshoot (K = 200: 33 %) | less overshoot, bigger offset (K = 5: 0.2), slow (T_s 2.2 s) |
| **Rate gain Kd** (not in lab handout) | more damping: K = 100 with Kd = 20 gives 10 % overshoot, same offset | Kd = 5 gives 43 %; Kd = 0 swings for 7.6 s |

Values other than K = 20 and 100 are not in lab handout.

## (e) Check your work

| Check | Handout (Table 4.3) | Exact (numbers.py) |
|---|---|---|
| P.O., K = 20 | 4 % | 3.86 % |
| P.O., K = 100 | 22 % | 22.03 % |
| T_s (2 %), K = 20 | 1.0 s | **0.913 s** |
| T_s (2 %), K = 100 | 0.7 s | 0.666 s |
| Push offset, K = 20 | 5 % (0.05) | 0.0500 |
| Push offset, K = 100 | 1 % (0.01) | 0.0100 |
| Push peak, K = 100 | – | 0.01095 at 0.393 s (9.5 % above final) |
| \|S\| at ω = 0.1, K = 20 | ≈ s/K | 0.00502 (s/K gives 0.00500) |

**MATLAB, Fig. 4.25 with the check numbers** (the handout's script; the `stepinfo` and `dcgain` lines are not in lab handout):

```matlab
numg=[1]; deng=[1 1 0]; sysg=tf(numg,deng);
K1=100; K2=20;
num1=[11 K1]; num2=[11 K2]; den=[0 1];
sys1=tf(num1,den); sys2=tf(num2,den);
sysa=series(sys1,sysg); sysb=series(sys2,sysg);
sysc=feedback(sysa,[1]); sysd=feedback(sysb,[1]);
stepinfo(sysc)      % Overshoot 22.03, SettlingTime 0.666 (2% band)
stepinfo(sysd)      % Overshoot 3.86,  SettlingTime 0.913
% Fig. 4.26: the push
dcgain(feedback(sysg,sys1))   % 0.01
dcgain(feedback(sysg,sys2))   % 0.05
```

````callout:trap Table 4.3: T_s at K = 20 is 0.91 s, not 1.0 s
The table lists 1.0 s. `stepinfo` gives 0.913 s with the same 2 % band. Quote 0.91 s and say the table rounded.
````

````callout:note Fig. 4.26(b) stops before it settles
The K = 20 push plot ends at 2.5 s, where the response is 0.04958, still 0.84 % short of 0.05. It does reach 0.05; the time axis just stops early. Run to 4 s if you want the plot to show it.
````

````callout:note "5 %" and "1 %" in Table 4.3
These are offsets per unit push (0.05 and 0.01), not percentages of anything you commanded. The final value theorem gives them as 1/K.
````

````callout:note The block diagram isn't in the project PDF
The text points to Fig. 4.14 (Section 4.8), which isn't in the project PDF. The `loop` figure draws it from Eq. 4.57 and the scripts (not in lab handout).
````

## (f) For your report

- **Advantages shown:** reduced steady-state error to a disturbance (offset 1/K), adjustable transient response (K sets ζ), and reduced sensitivity to changes in the machine (S ≈ s/K), as listed in Dorf §4.9.
- **Discussion points:**
  - **The trade:** one knob moves overshoot and push offset in opposite directions (Table 4.3). Say which you would pick and why; the handout prefers K = 20 for overshoot, then K = 100 for the rock, and leaves the final choice to the designer.
  - **The zero (not in lab handout):** the rate term's zero at −K/11 explains why K = 20 still overshoots with ζ = 1.34, and why "critically damped" K = 36 still gives 9.2 %.
  - **Where feedback stops helping:** |S| rises to about 1 for fast wiggles, so feedback only protects against slow changes. At K = 100, |S| even goes slightly above 1 (1.04 at 18.7 rad/s; not in lab handout).

<p class="src">Sources: Dorf Example 4.5, Eq. 4.57, Figs. 4.25–4.27, Table 4.3, pp.260–263; §4.9 introduction. Not in lab handout: the ζ = 6/√K reading, the zero at −K/11 and the poles-only curves, K = 36 and K = 38.7, the K and Kd sweeps, |S| above 1 at K = 100, the `stepinfo`/`dcgain` check lines.</p>
