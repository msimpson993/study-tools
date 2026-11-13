---
id: ap-overshoot
order: 18
title: "A3 · Overshoot"
category: fail
chain:
  - title: "What does 'Overshoot' look like, and what do I turn?"
  - title: "A3 · Overshoot"
  - title: "The output shoots past the target, then comes back."
neighbors:
  - failures
exampleScene: { overlays: [pid], params: { K: 6, Ki: 20, Kd: 0 }, caption: "Too much Ki: the running total of the error overshoots the target by about 60 % before it comes back." }
---
**A3 · Overshoot**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-overshoot
```

The output shoots past the target, then comes back.

*<b>Simulated.</b> Teaching plant 1/((s+1)(0.5s+1)); PI. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Peak above <i>r</i> (%OS), then a return, possibly with a small undershoot
- Often caused by an integral term that is too strong for the plant speed
- Lower phase margin ⇒ more overshoot (Deep dive D)

#### What to try

- Lower <i>K</i><sub>i</sub> (most common cure): the integrator is overshooting because it has stored too much area.
- Or lower <i>K</i><sub>p</sub> a bit, or add some <i>K</i><sub>d</sub> to brake the approach (costs noise sensitivity).
- If the overshoot only appears on set-point steps, a set-point filter or weight (A13) removes it without slowing disturbance recovery.
- In PID Tuner, moving <em>Response time</em> slower (left) reduced overshoot in the Project 1 example.

````callout:note Which knob?
<b>Which knob?</b> ↓ <i>K</i><sub>i</sub> (first), or ↓ <i>K</i><sub>p</sub> / ↑ <i>K</i><sub>d</sub>.
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
