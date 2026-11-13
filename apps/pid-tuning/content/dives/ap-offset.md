---
id: ap-offset
order: 17
title: "A2 · Steady-state offset"
category: fail
chain:
  - title: "What does 'Steady-state offset' look like, and what do I turn?"
  - title: "A2 · Steady-state offset"
  - title: "It settles calmly, but not at the target."
neighbors:
  - failures
---
**A2 · Steady-state offset**

**Picture it first.** Raise Kp: the offset shrinks but never vanishes. Add Ki: it is gone.

```figure:fail-offset
```

It settles calmly, but not at the target.

*<b>Simulated.</b> Teaching plant 1/((s+1)(0.5s+1)); P-only vs PI. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Flat, steady line that stays below (or above) <i>r</i>
- Error never decays to zero however long you wait
- Often appears with P-only control or after a constant load appears

#### What to try

- Add <b>integral action</b> (<i>K</i><sub>i</sub> &gt; 0). I keeps growing while any error remains, so it only stops when <i>e</i> = 0 (Deep dive A).
- Raising <i>K</i><sub>p</sub> alone only <em>shrinks</em> the offset (e<sub>ss</sub> = 1/(1+<i>K</i><sub>p</sub>·G(0))), it never removes it.
- Project 1 asks for zero steady-state error: that is why it is a PI controller.

````callout:note Which knob?
<b>Which knob?</b> Add / increase <i>K</i><sub>i</sub> (I action). <i>K</i><sub>p</sub> only shrinks the offset.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise Kp: the offset shrinks but never vanishes. Add Ki: it is gone.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **e**: the error e = r − y
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
````
