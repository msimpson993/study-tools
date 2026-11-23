---
id: blocks
order: 1
title: "Blocks and signals: reading the project's MATLAB scripts"
category: motor
neighbors: [speed, borer]
level: Some algebra
check: [ck-blocks-1, ck-blocks-2]
addsToExample: "Draws the motor as blocks: coil, load, and the back-voltage path."
accountsFor: Why every Project 2 script is just tf, series, parallel and feedback.
---

**The question:** how do we write a machine down so MATLAB can simulate it? This is the box *Blocks and signals*, the first box on the map.

````callout:short In short
- **Answer:** each part is a block whose rule is a fraction in s; `tf` makes one, `series` multiplies, `parallel` adds, `feedback` turns a loop into G/(1 + GH).
- **Knobs:** none yet; this is the toolkit every Project 2 script uses.
- **Watch for:** the typo in Fig. 4.23(b): it sets `f` and uses `b`.
````

### The big idea

- **A block is a rule:** one signal in, one signal out. The rule is a fraction in *s*, the *transfer function*.
- **s means "rate of change":** a term *Js* is "inertia times how fast the speed changes". So 1/(Js + b) says: torque in, speed out, resisted by inertia J and friction b.
- **Four commands build every script in Project 2:** `tf` makes a block, `series` chains two, `parallel` adds two side by side, `feedback` closes a loop.
- **The sign trick:** a load *slows* the motor, so it enters the diagram with a minus sign. The handout builds the loop with a plus input, then flips the sign with `sys = -sys`.

### See it

Pick a script and step through it line by line. Each line lights the block it builds; the panel underneath shows the fraction so far.

```figure:blocks
```

### The math

```eq
series:   G₁ then G₂  →  G₁·G₂
parallel: G₁ beside G₂ →  G₁ + G₂
feedback: forward G, return H  →  G/(1 + G·H)
```

**What each symbol means.** G, G₁, G₂: blocks on the forward path (from the input of interest to the output); H: the block on the return path, from the output back to the comparison point.

**Which way round?** `feedback(G, H)` needs the *forward* path from the input you are studying. For a load torque, the forward path is the machine alone, and everything else (sensor, amplifier, coil) is on the return path. That is why the disturbance scripts read `feedback(sys1, sysb)` or `feedback(sysg, Ka*sysf)`: machine first, controller second.

````callout:derivation Full derivation
Call the loop's input X and output Y. The forward path gives Y = G·(X − H·Y). Collect Y: Y·(1 + G·H) = G·X, so Y/X = G/(1 + G·H). With a plus sign at the comparison point it would be G/(1 − G·H).
````

### Worked example: on the motor

The open-loop disturbance script (Fig. 4.23):

| Line | What it builds |
|---|---|
| `sys1 = tf(1,[J b])` | the spinning load: torque in, speed out, 1/(2s + 0.5) |
| `sys2 = tf(Km*Kb/Ra, 1)` | the back-voltage path: speed → back-EMF → less current → less torque, 10 × 0.1/1 = 1 N·m·s |
| `sys_o = feedback(sys1, sys2)` | load with that path wrapped round it: 1/(2s + 0.5 + 1) = 1/(2s + 1.5) |
| `sys_o = -sys_o` | the load torque slows the motor: −1/(2s + 1.5) |
| `[yo,T] = step(sys_o)` | the speed after a 1 N·m load switches on |
| `yo(length(T))` | the last value, standing in for the final value: −0.66 rad/s |

The motor has a feedback loop built in before we add any: its own back-EMF.

````callout:trap A typo in the handout's script
Fig. 4.23(b) sets `f=0.5` but then uses `den1=[J,b]`, so in a fresh MATLAB session it stops with "Unrecognized function or variable 'b'". Write `b=0.5` (Fig. 4.24 does). Every other command in the four scripts (`tf`, `series`, `parallel`, `feedback`, `minreal`, `step`, `subplot`) is a current Control System Toolbox or MATLAB function. (The script check is mine, not in lab handout.)
````

### What it can't do

A block diagram assumes every block is *linear*: double the input, double the output. The motor is written that way; some machines are not, and the map comes back to that near its end. And a diagram says nothing yet about what happens when a load hits: that is the next box, *No feedback: the load wins*.

<p class="src">Sources: Dorf §4.9, Figs. 4.23–4.26, 4.30–4.31 (scripts); superposition, p.258. Not in lab handout: the row-by-row script reading, the "which way round" rule as stated, and the script typo check. Course background: Control Systems › <a href="../control-systems/#/dive/blocks">Close the loop: block diagrams</a>.</p>
