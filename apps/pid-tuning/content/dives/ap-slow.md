---
id: ap-slow
order: 16
title: "A1 · Slow response"
category: fail
chain:
  - title: "What does 'Slow response' look like, and what do I turn?"
  - title: "A1 · Slow response"
  - title: "It gets there, but takes far too long to rise and settle."
neighbors:
  - failures
exampleScene: { overlays: [push, trace], caption: "Slow: left alone the cart takes several seconds to settle. Too little gain leaves the loop just as slow." }
---
**A1 · Slow response**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-slow
```

It gets there, but takes far too long to rise and settle.

*<b>Simulated.</b> Teaching plant 1/((s+1)(0.5s+1)); PI. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Long rise time; smooth, no overshoot
- Output creeps toward <i>r</i> and the error shrinks slowly
- Control signal <i>u</i> stays small — the controller is barely pushing

#### What to try

- Raise <i>K</i><sub>p</sub> first: more push when the error is big (faster rise).
- Then raise <i>K</i><sub>i</sub> so the last part of the error vanishes faster (watch for overshoot).
- Stop when overshoot or noise/effort starts to hurt: that is the speed limit (Q8). In PID Tuner this is dragging <em>Response time</em> to the right/shorter (Project 1 did exactly that: 3.4 s → 1.5 s).

````callout:note Which knob?
<b>Which knob?</b> ↑ <i>K</i><sub>p</sub> (and <i>K</i><sub>i</sub>) — until overshoot or effort says stop.
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **u**: the control signal the actuator applies
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
