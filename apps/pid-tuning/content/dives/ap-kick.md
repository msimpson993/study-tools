---
id: ap-kick
order: 23
title: "A8 · Derivative kick"
category: fail
chain:
  - title: "What does 'Derivative kick' look like, and what do I turn?"
  - title: "A8 · Derivative kick"
  - title: "A set-point step makes D produce a huge one-sample spike in u."
neighbors:
  - failures
exampleScene: { overlays: [pid], params: { K: 6, Ki: 0, Kd: 4 }, caption: "A step in the target makes the error jump, and D acts on its rate of change: the push u spikes at t = 0." }
---
**A8 · Derivative kick**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-kick
```

A set-point step makes D produce a huge one-sample spike in <i>u</i>.

*<b>Simulated.</b> Teaching plant 1/((s+1)(0.5s+1)); PID, K<sub>d</sub> = 0.5, <i>N</i> = 20; r steps 0 → 1 at t = 0. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Sharp spike in <i>u</i> exactly when <i>r</i> jumps (≈ <i>K</i><sub>d</sub>·<i>N</i> on top of the normal P kick)
- Output barely changes, but actuator slams (and may saturate)
- No spike for slow set-point changes

#### What to try

- Apply D to the <b>measurement</b> only (“derivative on measurement” / set-point weight 0 on D). It still damps the loop and ignores set-point jumps.
- Or put a set-point filter / ramp in front of the loop (A13).
- Lower <i>N</i> if the spike is still too big.

````callout:note Which knob?
<b>Which knob?</b> Not a gain: D on measurement (or set-point filter).
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **u**: the control signal the actuator applies
- **Kd**: derivative gain: u from the error's slope
````
