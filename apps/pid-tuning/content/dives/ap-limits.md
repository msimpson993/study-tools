---
id: ap-limits
order: 24
title: "A9 · Actuator saturation & rate limits"
category: fail
chain:
  - title: "What does 'Actuator saturation & rate limits' look like, and what do I turn?"
  - title: "A9 · Actuator saturation & rate limits"
  - title: "The actuator can only deliver so much (amplitude) and so fast (rate)."
neighbors:
  - failures
exampleScene: { overlays: [limit], params: { K: 20, umax: 1.5, r: 0.5 }, caption: "With K = 20 the demanded push starts at 10 N, but the actuator gives at most 1.5 N: the push is flat-topped, and the limit, not the gain, sets how fast the cart can go." }
---
**A9 · Actuator saturation & rate limits**

**Picture it first.** Solid is the problem, dashed is a fixed version of the same loop. Watch what goes wrong first, then drag the sliders toward the dashed curve.

```figure:fail-limits
```

The actuator can only deliver so much (amplitude) and so fast (rate).

*<b>Simulated.</b> Left: plant 1/((s+1)(0.5s+1)), PI, step r = 2, |u| ≤ 2.5 with clamping anti-windup. Right: plant 1/(s+1)³, PI, step r = 1, rate limit 0.5 u/s. Top plot = amplitude limit, bottom plot = rate limit. Solid = the problem; dashed green = a fixed version, shown for contrast. Teaching plant, not your engine model.*

#### Symptoms

- Amplitude limit: response is slower than the linear design promised for big steps (rise set by <i>u</i><sub>max</sub>, not by the gains)
- Rate limit: extra lag ⇒ more overshoot / ringing than the linear model predicts
- <i>u</i> is straight-line (ramp) or flat-topped instead of smooth

#### What to try

- Don't demand what the actuator can't deliver: smaller steps or a set-point ramp (rate limiter on <i>r</i>).
- With a rate limit, lower <i>K</i><sub>p</sub> / <i>K</i><sub>i</sub> (the loop is effectively slower than you thought).
- Always pair limits with anti-windup (A7); if the limit is the real bottleneck, a bigger actuator beats any retuning.

````callout:note Which knob?
<b>Which knob?</b> ↓ aggressiveness; ramp the set-point; anti-windup.
````

````callout:predict Predict
Before you drag anything, guess which slider turns the solid curve into the dashed one, then try it. The dashed trace shows what the fix looks like; the notes below say why.
````

````callout:note Symbols used here
- **r**: the reference (set-point), here a unit step r = 1
- **u**: the control signal the actuator applies
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
