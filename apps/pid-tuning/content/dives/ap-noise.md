---
id: ap-noise
order: 21
title: "A6 · Noisy / jittery actuator"
category: fail
chain:
  - title: "What does 'Noisy / jittery actuator' look like, and what do I turn?"
  - title: "A6 · Noisy / jittery actuator"
  - title: "Measurement noise is amplified into a chattering control signal."
neighbors:
  - failures
---
**A6 · Noisy / jittery actuator**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-noise
```

Measurement noise is amplified into a chattering control signal.

*<b>Simulated.</b> Teaching plant 1/((s+1)(0.5s+1)); PID with sensor noise σ = 0.02. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- <i>y</i> looks fine but <i>u</i> is fuzzy / chattering (the plant filters the noise, the actuator doesn't)
- Heard or felt as buzzing valves, hot motors, wear
- Worse with large <i>K</i><sub>d</sub> and large derivative-filter <i>N</i>

#### What to try

- Filter the derivative: lower <i>N</i> (or the filter coefficient in the block) so D stops amplifying high frequencies (Deep dive B).
- ↓ <i>K</i><sub>d</sub>, or drop D entirely — a PI controller (as in Project 1) has no D noise problem.
- Filter or choose a better sensor; avoid raising <i>K</i><sub>p</sub> just to chase speed.

````callout:note Which knob?
<b>Which knob?</b> ↓ <i>N</i> (filter D harder) or ↓ <i>K</i><sub>d</sub>.
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **y**: the measured output of the plant
- **u**: the control signal the actuator applies
- **Kp**: proportional gain: u from the present error
- **Kd**: derivative gain: u from the error's slope
````
