---
id: failures
order: 15
title: "What can go wrong, and which knob fixes it"
category: fail
chain:
  - title: "What if it misbehaves?"
  - title: "What can go wrong, and which knob fixes it?"
  - title: "gallery of 14 failure cards"
neighbors:
  - report
  - ap-slow
  - ap-offset
  - ap-overshoot
---
**What can go wrong, and which knob fixes it?**

**Picture it first.** Fourteen things that go wrong, each with its own live figure on the next fourteen map boxes. This is the first: a PI that is too timid; walk the sliders to the dashed fix.

```figure:fail-slow
```

Fourteen simulated failures, each with symptoms, cause, what to try and the knob to turn: slow, offset, overshoot, oscillation, poor disturbance rejection, noise, windup, kick, saturation, delay, sensor lag, nonlinearity, set-point versus load, limit cycles.

#### Symptom → first thing to try

| Symptom | First thing to try | Dive |
|---|---|---|
| Too slow | raise Kp and Ki | [A1](#/dive/ap-slow) |
| Settles short of r | add Ki | [A2](#/dive/ap-offset) |
| Overshoot | lower Ki, add Kd | [A3](#/dive/ap-overshoot) |
| Rings forever or grows | lower Kp | [A4](#/dive/ap-oscillation) |
| A load knocks it far away | raise Kp and Ki | [A5](#/dive/ap-disturbance) |
| Jittery actuator | lower N | [A6](#/dive/ap-noise) |
| Overshoot after saturation | anti-windup | [A7](#/dive/ap-windup) |
| Spike at a set-point step | D on measurement | [A8](#/dive/ap-kick) |
| Limits slow it down | allow for the limits | [A9](#/dive/ap-limits) |
| Rings with a delay | lower the gains | [A10](#/dive/ap-delay) |
| Sensor lag | lower the gains or fix the sensor | [A11](#/dive/ap-sensorlag) |
| Works at one operating point only | gain-schedule | [A12](#/dive/ap-nonlinear) |
| Set-point overshoot against disturbance | set-point filter | [A13](#/dive/ap-twodof) |
| Hunting around the target | lower Ki, shrink the dead zone | [A14](#/dive/ap-limitcycle) |

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise Kp and Ki toward the dashed fix: the rise and settling times shrink.
````

````callout:note Symbols used here
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
