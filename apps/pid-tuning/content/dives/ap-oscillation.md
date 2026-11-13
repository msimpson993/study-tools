---
id: ap-oscillation
order: 19
title: "A4 · Sustained oscillation / instability"
category: fail
chain:
  - title: "What does 'Sustained oscillation / instability' look like, and what do I turn?"
  - title: "A4 · Sustained oscillation / instability"
  - title: "The loop rings forever or the amplitude grows."
neighbors:
  - failures
exampleScene: { overlays: [shaker, trace], caption: "Push at the right rhythm and the cart rings with sustained swings, which is what too much gain does to the loop." }
---
**A4 · Sustained oscillation / instability**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-oscillation
```

The loop rings forever or the amplitude grows.

*<b>Simulated.</b> Teaching plant 1/(s+1)³ (ultimate gain K<sub>u</sub> = 8). Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Constant-amplitude ringing = loop sits right at the stability edge (P-only gain = K<sub>u</sub>)
- Growing swing, often hitting actuator limits = unstable
- Period roughly the ultimate period T<sub>u</sub> (Ziegler–Nichols)

#### What to try

- <b>Back off</b>: cut <i>K</i><sub>p</sub> (and <i>K</i><sub>i</sub>). Lower gain at the frequency where phase lag reaches −180° is the fundamental cure.
- A little <i>K</i><sub>d</sub> can add phase lead and calm it — but only if the sensor is clean.
- If you must keep high gain, the plant has too much lag/delay for PID: look at A10 (delay) and A11 (sensor lag).
- In PID Tuner this is the <em>Robustness / transient behaviour</em> slider (more robust = more phase margin).

````callout:note Which knob?
<b>Which knob?</b> ↓ <i>K</i><sub>p</sub> (and <i>K</i><sub>i</sub>); more robustness / phase margin.
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **Ku, Tu**: ultimate gain (P-only loop on the edge of instability) and its oscillation period
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
````
