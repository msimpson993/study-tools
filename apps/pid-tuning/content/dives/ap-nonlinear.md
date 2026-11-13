---
id: ap-nonlinear
order: 27
title: "A12 · Nonlinearity / operating-point change"
category: fail
chain:
  - title: "What does 'Nonlinearity / operating-point change' look like, and what do I turn?"
  - title: "A12 · Nonlinearity / operating-point change"
  - title: "The plant's gain depends on where it is operating, so one set of gains is right only near one point."
neighbors:
  - failures
---
**A12 · Nonlinearity / operating-point change**

**Picture it first.** Gains tuned at r = 1 are three times too hot at r = 9: divide them, or gain-schedule.

```figure:fail-nonlinear
```

The plant's gain depends on where it is operating, so one set of gains is right only near one point.

*<b>Simulated.</b> Teaching plant: static curve v² followed by 1/((s+1)(0.5s+1)), PI (K<sub>p</sub> = 2, K<sub>i</sub> = 1.5), plotted as y/r. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Same controller: fine for a small step, increasingly oscillatory for a bigger one (here incremental gain grows as 2√r)
- Behaviour differs with load/speed/temperature
- PID Tuner linearizes at one operating point — that is its blind spot (Project 1: verify on the nonlinear model)

#### What to try

- Tune for the <em>worst</em> (highest-gain) operating point, accepting a slower response elsewhere.
- Or use <b>gain scheduling</b>: change gains with the operating point (as the dashed curve does).
- Always verify the linear design on the nonlinear simulation.

````callout:note Which knob?
<b>Which knob?</b> ↓ gains for the high-gain point, or schedule them with operating point.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Gains tuned at r = 1 are three times too hot at r = 9: divide them, or gain-schedule.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
````
