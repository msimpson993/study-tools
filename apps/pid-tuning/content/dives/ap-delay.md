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

**Picture it first.** The gains that were fine without delay oscillate with it: lower them, or shrink the delay.

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
Before you touch a slider, predict what it will do. The gains that were fine without delay oscillate with it: lower them, or shrink the delay.
````

````callout:note Symbols used here
- **u**: the control signal the actuator applies
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
````
