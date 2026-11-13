---
id: ap-twodof
order: 28
title: "A13 · Set-point vs disturbance trade-off (2-DOF)"
category: fail
chain:
  - title: "What does 'Set-point vs disturbance trade-off (2-DOF)' look like, and what do I turn?"
  - title: "A13 · Set-point vs disturbance trade-off (2-DOF)"
  - title: "Gains tuned to reject disturbances fast make the set-point step overshoot."
neighbors:
  - failures
---
**A13 · Set-point vs disturbance trade-off (2-DOF)**

**Picture it first.** Add a set-point filter: the overshoot goes, the disturbance response is untouched.

```figure:fail-twodof
```

Gains tuned to reject disturbances fast make the set-point step overshoot.

*<b>Simulated.</b> Teaching plant 1/((s+1)(0.5s+1)); PI K<sub>p</sub> = 1.5, K<sub>i</sub> = 4; load disturbance −1 at t = 15 s. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Strong integral action: quick recovery from the load, but big overshoot on the set-point step
- Lowering gains fixes the step but slows the load recovery — a conflict with one controller

#### What to try

- Use a <b>two-degree-of-freedom</b> structure: keep the feedback gains for disturbances, and shape the set-point separately (set-point weight <i>b</i> &lt; 1 on P, or a set-point filter <i>T</i><sub>f</sub>).
- The disturbance response is unchanged; only the set-point path is softened.
- PID Tuner offers a 2-DOF controller type for this.

````callout:note Which knob?
<b>Which knob?</b> Not a gain: set-point filter / weight (2-DOF).
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Add a set-point filter: the overshoot goes, the disturbance response is untouched.
````

````callout:note Symbols used here
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
