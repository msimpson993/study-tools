---
id: ap-disturbance
order: 20
title: "A5 · Poor disturbance rejection"
category: fail
chain:
  - title: "What does 'Poor disturbance rejection' look like, and what do I turn?"
  - title: "A5 · Poor disturbance rejection"
  - title: "A load hits and the output is knocked far away, recovering slowly."
neighbors:
  - failures
---
**A5 · Poor disturbance rejection**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-disturbance
```

A load hits and the output is knocked far away, recovering slowly.

*<b>Simulated.</b> Teaching plant 1/((s+1)(0.5s+1)); disturbance d = +1 at the plant input at t = 1 s, r = 0. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Big excursion of <i>y</i> right after the load arrives
- Slow return (or a permanent offset if there is no I)
- The set-point response may look fine: this is a separate requirement

#### What to try

- Raise the loop gain at the disturbance's speed: ↑ <i>K</i><sub>p</sub> for a bigger, faster reaction, ↑ <i>K</i><sub>i</sub> so a constant load is eventually cancelled exactly.
- If the disturbance can be measured (e.g. a load sensor), add <b>feedforward</b>: act before the output moves — PID alone can only react afterwards.
- The limit is the same trade-off as always: the more aggressively you reject, the less phase margin you have (A4).

````callout:note Which knob?
<b>Which knob?</b> ↑ <i>K</i><sub>p</sub> and <i>K</i><sub>i</sub>; feedforward if the disturbance is measurable.
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **y**: the measured output of the plant
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
````
