---
id: ap-limitcycle
order: 29
title: "A14 · Limit cycle from dead zone / backlash"
category: fail
chain:
  - title: "What does 'Limit cycle from dead zone / backlash' look like, and what do I turn?"
  - title: "A14 · Limit cycle from dead zone / backlash"
  - title: "Integral action plus a sticky actuator makes the loop hunt forever around the target."
neighbors:
  - failures
exampleScene: { overlays: [shaker, phase], caption: "A steady-amplitude swing is a closed loop in the (x, ẋ) plane that never spirals in." }
---
**A14 · Limit cycle from dead zone / backlash**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-limitcycle
```

Integral action plus a sticky actuator makes the loop hunt forever around the target.

*<b>Simulated.</b> Teaching plant 1/(s(s+1)) (integrating, like a position servo); actuator dead zone ±0.3; PI. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Slow, constant-amplitude swing around <i>r</i> that never dies out
- <i>u</i> creeps through the dead zone, nothing moves, then it jumps
- The integrator keeps winding up inside the dead zone, then the actuator suddenly moves and overshoots

#### What to try

- ↓ <i>K</i><sub>i</sub> (or turn I off) so the integrator can't keep winding up inside the dead zone; accept a small residual error.
- Add a small <em>controller</em> dead band on the error, or repair the actuator (backlash/stiction).
- This is a non-linear effect: linear tuning rules only help indirectly.

````callout:note Which knob?
<b>Which knob?</b> ↓ <i>K</i><sub>i</sub> (or I off); fix the actuator.
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **u**: the control signal the actuator applies
- **Ki**: integral gain (1/s): u from the accumulated error
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
