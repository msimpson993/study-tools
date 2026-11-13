---
id: problem
order: 1
title: "The problem control solves"
category: why
chain:
  - title: "What exactly are we trying to do?"
  - title: "What problem does feedback control solve?"
  - title: "command, disturbance, uncertainty"
neighbors:
  - feedback
---
**What problem does feedback control solve?**

**Picture it first.** Slide the true plant gain away from what the model says and add a push: the open loop is wrong by exactly that much, the loop that measures y is not.

```figure:problem
```

We want an output (position, speed) to follow a command r even though the plant is only approximately known and disturbances push on it. Feedback measures the output and corrects from the error, instead of computing the input once and hoping.

### What problem does feedback control actually solve?

Making a physical quantity (speed, temperature, position, voltage) follow a desired value <b>automatically</b>, even though the system is imperfectly known and is being pushed around by disturbances.

Think of <b>cruise control</b>, or exactly your project: <b>engine speed control</b>. You set a desired speed <i>r</i> (the <em>reference</em>, or set-point). The engine (the <em>plant</em>) produces a speed <i>y</i>. The only thing you can touch is the throttle/actuator command <i>u</i>. Meanwhile, the world adds <em>disturbances</em> <i>d</i>: a hill, a load torque from the alternator or A/C compressor, friction that changes as the engine warms up.

So the job is: <b>choose <i>u</i>(t) so that <i>y</i>(t) ≈ <i>r</i>(t)</b>, quickly and smoothly, without knowing the disturbances in advance and with only an approximate model of the engine.

````callout:note RF analogy (you'll like this)
A phase-locked loop or an automatic gain control (AGC) loop is the same problem: a reference, a measured output, an error detector, and a loop filter that decides the correction. A PLL's loop filter is often literally a PI controller, and you've already met loop bandwidth vs. phase margin trade-offs there. Same math, different hardware.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Set the true gain to 0.6: open loop ends at 0.6, closed loop at 1. Then add a push of 0.3: open loop shifts again, closed loop returns to 1.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **y**: the measured output of the plant
- **u**: the control signal the actuator applies
- **d**: a disturbance entering at the plant input
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
````
