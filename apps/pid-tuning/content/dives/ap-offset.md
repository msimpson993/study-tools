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
exampleScene: { overlays: [push, trace], caption: "A steady push leaves a 0.5 m offset: P alone does the same in the loop, and only an integrator removes it." }
---
**A2 · Steady-state offset**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

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
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **e**: the error e = r − y
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
````
