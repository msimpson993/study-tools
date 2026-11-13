---
id: ap-sensorlag
order: 26
title: "A11 · Measurement (sensor) lag"
category: fail
chain:
  - title: "What does 'Measurement (sensor) lag' look like, and what do I turn?"
  - title: "A11 · Measurement (sensor) lag"
  - title: "The sensor is slow, so the controller sees an old, smoothed copy of y."
neighbors:
  - failures
---
**A11 · Measurement (sensor) lag**

**Picture it first.** The controller reacts to the lagged copy, so the true output rings; lower the gains or fix the sensor.

```figure:fail-sensorlag
```

The sensor is slow, so the controller sees an old, smoothed copy of <i>y</i>.

*<b>Simulated.</b> Teaching plant 1/((s+1)(0.5s+1)); sensor 1/(1.5s+1); PI. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- True <i>y</i> overshoots and rings; the measured signal is a delayed, smoother copy
- Behaves like extra phase lag/delay (compare A10) — gains too high for the real loop
- Derivative acts on the lagged signal, so it helps less than expected

#### What to try

- Detune: ↓ <i>K</i><sub>p</sub> and <i>K</i><sub>i</sub> until the <em>true</em> output is calm (the lag eats phase margin).
- Best cure is hardware: faster sensor, less filtering, better placement.
- Don't over-filter the measurement for noise (A6) unless you re-check stability.

````callout:note Which knob?
<b>Which knob?</b> ↓ <i>K</i><sub>p</sub> and <i>K</i><sub>i</sub>; fix/replace the sensor if you can.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. The controller reacts to the lagged copy, so the true output rings; lower the gains or fix the sensor.
````

````callout:note Symbols used here
- **y**: the measured output of the plant
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
