---
id: ap-windup
order: 22
title: "A7 · Integrator windup (actuator saturation)"
category: fail
chain:
  - title: "What does 'Integrator windup (actuator saturation)' look like, and what do I turn?"
  - title: "A7 · Integrator windup (actuator saturation)"
  - title: "The integrator keeps charging while the actuator is pinned at its limit."
neighbors:
  - failures
---
**A7 · Integrator windup (actuator saturation)**

**Picture it first.** Switch on clamping: the overshoot after saturation disappears.

```figure:fail-windup
```

The integrator keeps charging while the actuator is pinned at its limit.

*<b>Simulated.</b> Teaching plant 1/(s+1); PI (K<sub>p</sub> = 2, K<sub>i</sub> = 4); actuator limit |u| ≤ 1.2 (same as Deep dive E). Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- <i>u</i> flat at the limit for a while
- Output overshoots far more than the linear design predicted, then recovers slowly
- Gets worse for large steps or long saturation

#### What to try

- Turn on <b>anti-windup</b>: clamping or back-calculation (Simulink PID block → <em>Output Saturation</em> tab).
- Smaller steps, or ramp the set-point so the actuator never saturates.
- Remember PID Tuner designs a <em>linear</em> loop; check the nonlinear model for this (Deep dive E).

````callout:note Which knob?
<b>Which knob?</b> Not a gain: add anti-windup (clamp / back-calculation) or avoid saturating.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Switch on clamping: the overshoot after saturation disappears.
````

````callout:note Symbols used here
- **u**: the control signal the actuator applies
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
