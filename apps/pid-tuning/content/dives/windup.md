---
id: windup
order: 7
title: "Actuator saturation and integrator windup"
category: terms
chain:
  - title: "What if the actuator saturates?"
  - title: "What happens when the actuator saturates?"
  - title: "integrator windup, anti-windup"
neighbors:
  - integral
exampleScene: { overlays: [pid, limit], params: { K: 4, Ki: 5, Kd: 0, umax: 3, r: 1 }, caption: "The push is clipped at ±3 N at the start while the I part keeps charging; it then has to discharge, so the overshoot is about 31 % instead of 24 % without the limit." }
---
**What happens when the actuator saturates?**

**Picture it first.** The actuator is limited to |u| ≤ 1.2. Watch the overshoot that appears after the control comes off the limit, then switch on anti-windup.

```figure:windup
```

When the actuator is at its limit the integrator keeps charging, so after the error changes sign the stored area has to be unwound before the output moves: a long overshoot. Anti-windup (clamping or back-calculation) stops the integrator from charging while saturated.

#### Actuator saturation and integrator windup

*From the guide's static figure: <b>Windup, simulated.</b> Plant 1/(s+1), PI K<sub>p</sub> = 2, K<sub>i</sub> = 4, actuator limited to |u| ≤ 1.2. Without anti-windup the integrator charges while u is pinned at the limit, so overshoot ≈ 18% and slower settling. With clamping (integrator frozen while saturated and the error would push it further) overshoot ≈ 1.6%. Bottom: control signal u.*

In Simulink's PID block, anti-windup lives on the <b>Output Saturation</b> tab: enable limits, then choose “clamping” or “back-calculation.”

````callout:predict Predict
Before you touch a slider, predict what it will do. With anti-windup off, the output overshoots long after the control comes off the limit. Switch it to clamping: the overshoot shrinks. Then lower Ki: the effect fades because the integral has less to wind up.
````

````callout:note Symbols used here
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
