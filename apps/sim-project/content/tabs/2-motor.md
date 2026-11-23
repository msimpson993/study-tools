---
id: motor
order: 2
title: Speed controlled motor
summary: "Dorf Example 4.4 (Figs. 4.23–4.24): a DC motor holding its speed against a load, without and with a tachometer loop."
figures: [loop, motor, blocks]
quizTags: [motor]
---

## (a) The problem

- **The machine:** a DC motor spins a load at a set speed, and a brake-like *load torque* T_d (a twisting force that drags on the shaft) suddenly switches on.
- **What the handout asks:** how much speed the load steals with no feedback (Fig. 4.23), and how much once a *tachometer* (a sensor that turns speed into volts) measures the speed and an amplifier corrects the motor's voltage (Fig. 4.24).
- **Takeaway:** feedback cuts the lost speed from 0.667 to 0.00185 rad/s per N·m of load (the handout rounds these to −0.66 and −0.002). It also makes the motor *recover 361× faster* (it gets back to its new steady speed in 1/361 of the time).
- **The advantage it shows:** *disturbance rejection*, the handout's term for shrugging off pushes nobody planned.

## (b) The setup

```figure:loop preset=motor-open
```


**The blocks, in plain words:**
- **The voltage in, V_a:** the voltage applied to the motor's coil. In this example it is held fixed, so only the load torque changes anything.
- **A block** is a box that turns one signal into another. Its rule is written as a fraction in *s*, its *transfer function*.
- **What s means:** read s as "rate of change" and 1/s as "add up over time". So a term Js means "inertia times how fast the speed is changing".
- **The coil, Km/Ra:** voltage in, torque out. Ra = 1 Ω is the coil's resistance and Km = 10 N·m/A is the torque per amp, so 10 N·m per volt.
- **The spinning load, 1/(Js + b):** torque in, speed out. J = 2 kg·m² is the inertia (how hard the load is to speed up or slow down) and b = 0.5 N·m·s is the bearing friction.
- **Back-EMF, Kb = 0.1 V·s:** the spinning motor makes a voltage that fights its own current. It acts like Km·Kb/Ra = 1 N·m·s of extra friction, so the motor has a feedback loop built in before we add one.
- **The load torque T_d:** enters with a minus sign, because it slows the motor. That is why the scripts flip the sign at the end (`sys_o = -sys_o`).
- **Added for the closed loop:**
  - **Tachometer, Kt = 1 V·s:** a small generator on the shaft that turns speed into volts.
  - **Amplifier, Ka = 54:** multiplies the speed shortfall and adds it to the motor's voltage.
- **On the diagram:** the closed-loop version is the same picture plus the outer loop through Kt and Ka; pick **motor with tachometer (Fig. 4.24)** to see it.

**The two models (Dorf p.259):**

```eq
open loop:    ω/T_d = −1/(J·s + b + Km·Kb/Ra)           = −1/(2s + 1.5)
closed loop:  ω/T_d = −1/(J·s + b + Km·(Ka·Kt + Kb)/Ra) = −1/(2s + 541.5)
```

ω is the change in shaft speed (rad/s) after a 1 N·m load switches on.

## (c) What's going on

1. **No feedback: the speed falls until drag balances the load.**
   - **Why:** the only thing resisting the load is the motor's own drag, 0.5 + 1 = 1.5 N·m·s, so a 1 N·m load costs 1 ÷ 1.5 = 0.667 rad/s.
   - **How fast:** the *time constant* τ = J ÷ drag = 1.33 s is the time to cover about two-thirds of the way. Four time constants (5.3 s) gets within 2 %, which counts as "settled".
   - **Look for:** with **Fig. 4.23: open loop** set, the speed curve slides smoothly down to the dashed final value at −0.667, and the readout's first line gives τ = 1.333 s and −0.6632 at 7 s.

```figure:motor preset=open
```

2. **Feedback adds "electronic friction".**
   - **Why:** the tachometer and amplifier push back in proportion to the speed lost. To the load this feels like Km·Ka·Kt/Ra = 540 N·m·s of extra friction.
   - **Numbers:** the total drag becomes 541.5, so the sag is 1 ÷ 541.5 = 0.00185 rad/s.
   - **Look for:** with **Fig. 4.24: closed loop** set, the time axis runs only 0.02 s and the curve settles at −0.00185 (the readout's second line: −0.001847). The marked final value is the exact one; the handout rounds it to −0.002.

```figure:motor preset=closed
```

3. **It also recovers far faster: 361×.**
   - **Numbers:** τ = 2 ÷ 541.5 = 3.69 ms instead of 1.33 s.
   - **Why the handout's plots differ:** that is why Fig. 4.24 runs for only 0.02 s against 7 s for Fig. 4.23 ("Note the scale").
   - **Look for:** with **both loops, 7 s axis** set, the open loop (grey) sags over seconds while the closed loop is a flat line at zero. Switch *time axis* to 0.02 s: now the closed loop is a full curve and the open loop has barely started to move.

```figure:motor preset=scale
```

4. **One number runs it: the loop gain.**
   - **What it is:** follow a speed error once around the loop: tachometer (Kt), amplifier (Ka), coil (Km/Ra), back as torque, then ÷ 1.5 for the drag. That product is the *loop gain*.
   - **What it does:** both the sag and the time constant divide by 1 + loop gain = 1 + 540 ÷ 1.5 = 361.
   - **So Ka and Kt do the same job:** double either and the sag roughly halves.
   - **Look for:** with **Kt = 2** set, the sag is −0.000925 rad/s and τ = 1.849 ms, about half of step 2's values, and the readout's loop gain has doubled (not in lab handout).

```figure:motor preset=kt2
```

5. **The handout's yardstick: the 0.02 rule.**
   - **The rule:** "we generally expect" closed-loop sag ÷ open-loop sag < 0.02 (Dorf p.259). In other words, the loop removes at least 98 % of the sag.
   - **Here:** the ratio is 0.0028 (the handout rounds it to 0.003), about 7× inside the rule.
   - **The threshold (not in lab handout):** the ratio equals 0.02 exactly at Ka = 7.35. Any Ka above that passes.
   - **Look for:** with **just under 0.02** set (Ka = 7.5), the readout's third line turns green: ratio 0.01961, under 0.02. The closed curve now sags to −0.0131, visible even on the 7 s axis.

```figure:motor preset=sweep
```

6. **Inertia sets only the speed of recovery, never the final sag.**
   - **Why:** J appears only beside s. Once the speed stops changing, the s terms drop out.
   - **Numbers (not in lab handout):** doubling J to 4 makes τ 2.67 s open and 7.39 ms closed, with the same sag.
   - **Look for:** with **double the inertia** set, the open-loop curve takes twice as long to reach the same −0.667 line, and the readout's τ values double while both sags stay put.

```figure:motor preset=heavy
```

## (d) Try it

| Handout case | Button (on this tab's figures) | What you should see |
|---|---|---|
| Fig. 4.23, open loop | **Fig. 4.23: open loop** | sag to −0.667 rad/s, τ = 1.33 s |
| Fig. 4.24, closed loop | **Fig. 4.24: closed loop** | sag −0.00185 rad/s, τ = 3.69 ms, ratio 0.0028 |
| The 0.02 rule (not in lab handout) | **just under 0.02** | Ka = 7.5, ratio 0.0196 ✓ (the exact threshold is Ka = 7.35) |
| Heavier load (not in lab handout) | **double the inertia** | slower both ways, same sag |
| The scripts, line by line | **Fig. 4.23 (open loop)** and **Fig. 4.24 (closed loop)** on the script figure in Check your work | each line lights the block it builds |

**Sliders to play with:** Ka and Kt (same effect), J (speed only), b and Kb (open-loop sag only, nearly no effect closed).

| Knob | Turn it up | Turn it down |
|---|---|---|
| **Ka** (amplifier) | smaller sag, faster (Ka = 100: −0.0010, τ = 2.0 ms) | larger sag; Ka = 0 is open loop |
| **Kt** (tachometer) | same as Ka: Kt = 2 gives −0.00093 | Kt = 0.5 gives −0.0037 |
| **J** (inertia) | slower recovery, same sag | quicker, same sag |
| **b** (bearing friction) | open-loop sag shrinks (b = 1: −0.5); closed barely changes | open loop sags more |

Values other than the handout's settings are not in lab handout.

## (e) Check your work

| Check | Handout | Exact (numbers.py) |
|---|---|---|
| Open loop, ω at 7 s | −0.66 rad/s | −0.663 (final −0.667) |
| Closed loop, ω at 0.02 s | −0.002 rad/s | −0.00184 (final −0.00185); the plot's dashed line reads about −1.8×10⁻³ |
| Ratio closed ÷ open | 0.003 | 0.0028, under 0.02 ✓ |
| Time constants | – | 1.33 s open, 3.69 ms closed |

**MATLAB, Fig. 4.24 with the check numbers** (the handout's script; the `dcgain` lines are not in lab handout):

```matlab
Ra=1; Km=10; J=2; b=0.5; Kb=0.1; Ka=54; Kt=1;
num1=[1]; den1=[J,b]; sys1=tf(num1,den1);
num2=[Ka*Kt]; den2=[1]; sys2=tf(num2,den2);
num3=[Kb]; den3=[1]; sys3=tf(num3,den3);
num4=[Km/Ra]; den4=[1]; sys4=tf(num4,den4);
sysa=parallel(sys2,sys3);
sysb=series(sysa,sys4);
sys_c=feedback(sys1,sysb);
sys_c=-sys_c;
[yc,T]=step(sys_c); plot(T,yc), grid
yc(length(T))          % handout: about -0.002
dcgain(sys_c)          % exact final value: -0.001847
```

**The script, one line at a time:** step the *line* slider through Fig. 4.24's script. Each line lights the block it builds, and the fraction so far is written underneath.

- **Look for:** with **Fig. 4.24 (closed loop)** set at its last line, `sys_c=-sys_c` flips the fraction's sign: that is the minus sign of the load torque.

```figure:blocks preset=motorclosed
```

````callout:trap Fig. 4.23(b) won't run as printed
The script sets `f=0.5` but then uses `den1=[J,b]`, so in a fresh MATLAB session it stops with "Unrecognized function or variable 'b'". Write `b=0.5`, as Fig. 4.24 does.
````

````callout:note Rounding in the handout
- **−0.002 rad/s** is −0.00184 rounded up; the plot's own dashed line sits near −1.8×10⁻³. Quote −0.0018 (or −0.00185 for the final value).
- **0.003** is 0.0028 rounded.
- **"Steady state" from the last point:** `yo(length(T))` is the value at the end of the plot, not the true final value. At 7 s the open loop is at −0.663, still short of its final −0.667.
````

````callout:note The block diagrams aren't in the project PDF
The text points to Figs. 4.8 and 4.9 (Section 4.5) for the open- and closed-loop diagrams, but those pages aren't in the project PDF. The block diagram in The setup draws them from the scripts (not in lab handout).
````

## (f) For your report

- **Advantage shown:** disturbance rejection. Dorf §4.9 introduces this example "in an effort to reject disturbances".
- **Discussion points:**
  - **Why it works:** the loop adds Km·Ka·Kt/Ra = 540 N·m·s of effective friction, so the sag and the time constant both divide by 1 + loop gain = 361.
  - **Which knobs matter:** Ka and Kt are interchangeable (both multiply into the loop gain); J sets only how fast the speed recovers; b and Kb matter open loop but hardly closed.
  - **What the model hides (not in lab handout):** in this model more gain is always better. A real amplifier runs out of voltage, and a high gain also amplifies tachometer noise. The boring machine shows a price that is in the model itself.

<p class="src">Sources: Dorf Example 4.4, Table 4.2 (p.258), Figs. 4.23–4.24 and pp.258–260 (−0.66, −0.002, 0.003, the 0.02 rule, "Note the scale"). Not in lab handout: the "electronic friction" and loop-gain reading, the 0.02 threshold Ka = 7.35, the knob values, the amplifier and noise limits, the `dcgain` check.</p>
