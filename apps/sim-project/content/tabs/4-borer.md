---
id: borer
order: 4
title: Boring machine
summary: "Dorf Example 4.5 (Figs. 4.25–4.27): the Channel Tunnel boring machine, one gain K traded between following the steering command, resisting the rock, and not caring about changes in the machine."
figures: [loop, borer, tradeoff, sens, blocks]
quizTags: [borer]
---

## (a) The problem

- **The machine:** the boring machines that dug the Channel Tunnel had to steer in a straight line while the rock pushed them off course. A controller turns the steering error into a steering effort, with one adjustable gain K.
- **What the handout asks:** compare K = 20 and K = 100 for a step in the steering command (Fig. 4.25), a constant push from the rock (Fig. 4.26), and how much the loop cares about changes in the machine (Fig. 4.27).
- **Takeaway:** **raising K holds the line better against the rock** (the *offset*, how far off course a steady push leaves it, is 1/K: 0.05 at K = 20, 0.01 at K = 100) **and makes the loop less sensitive** (changes in the machine matter less), **but it overshoots more** (swings past the new line: 4 % → 22 %).
- **No setting wins everything:** the handout picks K = 20 for overshoot, then notes K = 100 is better for the rock.
- **The advantages it shows:** Dorf §4.9 says this example demonstrates reduced sensitivity to process changes, adjustment of the transient response (the swing on the way to the target), and reduced steady-state error (the error left at the end).

## (b) The setup

```figure:loop preset=borer
```


**The blocks, in plain words:**
- **What s means:** read s as "rate of change" and 1/s as "add up over time". A block's fraction in s is its *transfer function*, its input-to-output rule.
- **The machine, G = 1/(s(s+1)):** steering effort in, position out. The 1/s means a held effort keeps moving the machine sideways (it adds up); the (s+1) means the response is sluggish, with a 1 s lag.
- **The controller, Gc = K + 11s:** the effort is K × (how far off you are) plus 11 × (how fast the error is changing). The 11 is the *rate gain*, called **Kd** on this page's sliders. The handout keeps Kd = 11 and only turns K.
- **The rock, T_d:** a push that adds straight to the effort, after the controller.
- **The sensor:** unity feedback; the position is measured and compared directly.

**The model (Dorf Eq. 4.57):**

```eq
Y(s) = (K + 11s)/(s² + 12s + K) · R(s)  +  1/(s² + 12s + K) · T_d(s)
```

- **First part:** how the position follows the command R.
- **Second part:** how much the rock T_d moves it.
- **Both share the denominator s² + 12s + K.** It sets how the machine moves no matter which input started it, so K changes both responses at once.
- **Poles:** the roots of that denominator. Each pole is one way the machine can move on its own: a real pole is a smooth fade, a pair with an imaginary part is a swing. The further left a pole sits, the faster that motion dies out.
- **The j in a pole:** j = √−1 marks the swing part. A pair like −6 ± 8j swings at 8 rad/s while dying out at rate 6; a pole with no j part doesn't swing.

## (c) What's going on

1. **K sets how springy the response is.**
   - **Damping ratio:** the denominator is the standard "mass on a spring with a damper" form. Its *damping ratio* ζ (zeta) says how strongly swings are damped, so how far it overshoots and how many swings it makes: ζ ≥ 1 means the poles alone give no swing; a small ζ means a bouncy response.
   - **Here:** ζ = 6/√K (not in lab handout), so K = 20 gives ζ = 1.34 (heavily damped) and K = 100 gives ζ = 0.6 (bouncy).
   - **The dividing line:** *critical damping*, ζ = 1, is K = 36, where the two poles meet at −6.
   - **Look for:** with **K = 36 (ζ = 1)** set:
     - in the poles plot, the two × poles sit on top of each other at −6;
     - the grey dots are the poles at K = 20 (−2 and −10, on the horizontal axis) and K = 100 (−6 ± 8j, above and below it);
     - in the readout, ωn is the *natural frequency* (how fast it would swing with no damping), OS the *overshoot* (how far past the target it goes) and Ts the *settling time* (when it stays within 2 % of the target).

```figure:borer preset=k36 panels=splane,step
```

2. **The command step: higher K is faster but overshoots.**
   - **Terms:** overshoot is P.O. in the handout and OS in the readout; settling time is T_s in the handout and Ts in the readout.
   - **Numbers:** K = 20 gives 3.9 % and 0.91 s; K = 100 gives 22 % and 0.67 s.
   - **Look for:** with **K = 100** set, the step curve rises past 1 to a peak about a fifth too high, then settles inside the 2 % band at about 0.67 s (readout: 0.667 s). The grey curve is K = 20, slower but nearly flat on top.

```figure:borer preset=k100 panels=step
```

3. **Why K = 20 overshoots at all (not in lab handout).**
   - **The puzzle:** with ζ = 1.34 the poles alone would give no overshoot.
   - **The reason:** the rate term 11s puts a *zero* in the command response at s = −K/11 = −1.82: a root of the top of the fraction, which adds a kick at the start.
   - **Numbers:** the poles alone give 0 % at K = 20 and 9.5 % at K = 100. Even at K = 36 (ζ = 1) the zero leaves 9.2 % overshoot.
   - **Look for:** with **K = 20** set, the poles plot shows the zero ○ at −1.82 just right of the slow pole × at −2, and the step curve peaks slightly above 1 (OS 3.86 %).

```figure:borer preset=k20 panels=splane,step
```

4. **The rock: higher K gives a smaller offset.**
   - **The rule:** a steady push of 1 leaves the machine off by 1/K. That comes from the *final value theorem*, the handout's shortcut: set s = 0 in the model to read where it ends up.
   - **Numbers:** 0.05 at K = 20 and 0.01 at K = 100.
   - **Why it never reaches zero:** the controller only fights back in proportion to the error, so some error must remain to hold off the push.
   - **Look for:** with **rock push, K = 100** set, the push curve climbs to a peak of 0.01095 at 0.393 s and levels off at 1/K = 0.0100 (the readout's offset). Drag K to 20 and the offset grows to 0.0500.

```figure:borer preset=push panels=push
```

5. **The trade, on one chart.**
   - **What it shows:** sweeping K from 5 to 400 puts overshoot and push offset on the same axes. Each one gets better as the other gets worse, and the designer picks the point.
   - **A spec point (not in lab handout):** K = 38.7 is where overshoot hits 10 %, with offset 0.026.
   - **Look for:** with **boring machine, K = 100** set, the dot sits on the yellow K = 100 mark (OS 22.03 %, offset 0.01); the K = 20 mark is up and to the left. Then click **10 % overshoot (own)**.

```figure:tradeoff preset=borer panels=curve
```

6. **Sensitivity: higher K means changes in the machine matter less.**
   - **What S measures:** feed the loop a steady wiggle at rate ω (in rad/s; 1 rad/s is one full wiggle every 6.3 s). If the machine G changes by 10 % for that wiggle, the overall response changes by |S| × 10 %.
   - **Notation:** the handout writes this as S(jω), "S at wiggle rate ω" (the same wiggle idea as the Engine tab's frequency response). The j is the one from the poles: it lets one number carry two things, how much bigger or smaller the wiggle comes out (its size, |S|) and how far behind it trails.
   - **Here:** S = s(s+1)/(s² + 12s + K) ≈ s/K for slow wiggles. At ω = 0.1 rad/s, |S| = 0.005 at K = 20 and 0.001 at K = 100.
   - **For fast wiggles |S| climbs to about 1:** there, feedback no longer helps.
   - **Look for:** with **Fig. 4.27 (K = 20)** set:
     - the probe sits at ω = 1 and reads |S| = 0.0629, so a 10 % change in the machine there changes the loop by only 0.63 %;
     - in the |S| plot (Fig. 4.27 bottom), the solid curve rises from bottom left and levels off at 1, with the dashed s/K shortcut hugging it at low ω;
     - in the path plot (Fig. 4.27 top), S is drawn as a point: across is its *real part* (the axis labelled Re S) and up is its *imaginary part*, the j part (Im S). As ω rises it travels from near 0 out to 1.

```figure:sens preset=fig427 panels=path,mag
```

## (d) Try it

| Handout case | Button (on this tab's figures) | What you should see |
|---|---|---|
| Fig. 4.25(a), K = 100 step | **K = 100** | 22 % overshoot, T_s 0.67 s |
| Fig. 4.25(b), K = 20 step | **K = 20** | 3.9 % overshoot, T_s 0.91 s |
| Fig. 4.26, the rock | **rock push, K = 100**, then **rock push, K = 20** | offsets 0.01 and 0.05 |
| Table 4.3, the trade | **boring machine, K = 100** | the two handout points on the curve |
| Fig. 4.27, sensitivity | **Fig. 4.27 (K = 20)**, then **K = 100** | ≈ s/K at low ω, near 1 at high ω |
| Critical damping (not in lab handout) | **K = 36 (ζ = 1)** | ζ = 1, still 9.2 % from the zero |
| Without the rate term (not in lab handout) | **no rate term (own)** | Kd = 0: 85 % overshoot, T_s 7.6 s |
| The scripts, line by line | **Fig. 4.25 (command step)** and **Fig. 4.26 (rock push)** on the script figure in Check your work | each line lights its block |

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

**The script, one line at a time:** step the *line* slider through the script. Each line lights the block it builds, and the fraction so far is written underneath.

- **Look for:** with **Fig. 4.26 (rock push)** set at its last line, `feedback(sysg,sys1)` has put the machine forward and the controller in the return path, giving 1/(s² + 12s + K), and `minreal` has tidied it.

```figure:blocks preset=borerpush
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
The text points to Fig. 4.14 (Section 4.8), which isn't in the project PDF. The block diagram in The setup draws it from Eq. 4.57 and the scripts (not in lab handout).
````

## (f) For your report

- **Advantages shown:** reduced steady-state error to a disturbance (offset 1/K), adjustable transient response (K sets ζ), and reduced sensitivity to changes in the machine (S ≈ s/K), as listed in Dorf §4.9.
- **Discussion points:**
  - **The trade:** one knob moves overshoot and push offset in opposite directions (Table 4.3). Say which you would pick and why; the handout prefers K = 20 for overshoot, then K = 100 for the rock, and leaves the final choice to the designer.
  - **The zero (not in lab handout):** the rate term's zero at −K/11 explains why K = 20 still overshoots with ζ = 1.34, and why "critically damped" K = 36 still gives 9.2 %.
  - **Where feedback stops helping:** |S| rises to about 1 for fast wiggles, so feedback only protects against slow changes. At K = 100, |S| even goes slightly above 1 (1.04 at 18.7 rad/s; not in lab handout).

<p class="src">Sources: Dorf Example 4.5, Eq. 4.57, Figs. 4.25–4.27, Table 4.3, pp.260–263; §4.9 introduction. Not in lab handout: the ζ = 6/√K reading, the zero at −K/11 and the poles-only overshoot, K = 36 and K = 38.7, the K and Kd sweeps, |S| above 1 at K = 100, the `stepinfo`/`dcgain` check lines.</p>
