---
id: ap-delay
order: 25
title: "A10 · Time delay (dead time)"
category: fail
chain:
  - title: "What does 'Time delay (dead time)' look like, and what do I turn?"
  - title: "A10 · Time delay (dead time)"
  - title: "Nothing happens for a while after u changes, so feedback acts on old news."
neighbors:
  - failures
---
**A10 · Time delay (dead time)**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-delay
```

Nothing happens for a while after <i>u</i> changes, so feedback acts on old news.

*<b>Simulated.</b> Teaching plant 1/(s+1) with 1 s dead time; PI. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Flat start: the output ignores <i>u</i> for the delay
- Gains that were fine without delay now ring or go unstable

#### What to try

- <b>Lower the gain</b> a lot, especially <i>K</i><sub>i</sub>: integrating on delayed information winds the loop up.
- D does not help (it can't see the future beyond the delay).
- If the delay is large compared with the plant time constant, PID is the wrong tool: use a <b>Smith predictor</b>/model-based design, or reduce the delay physically (move the sensor).

````callout:note Which knob?
<b>Which knob?</b> ↓↓ <i>K</i><sub>p</sub> and <i>K</i><sub>i</sub>; Smith predictor if delay dominates.
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **u**: the control signal the actuator applies
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
````
