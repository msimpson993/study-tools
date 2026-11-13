---
id: sp4
order: 19
title: "Moving a pole pair and a zero"
category: describe
chain:
  - title: "What happens when I move them?"
  - title: "What happens if I move a pole pair and a zero?"
  - title: "explorer"
neighbors:
  - sp3
  - sp5
  - sp6
---
**What happens if I move a pole pair and a zero?**

**Picture it first.** Drag the pole pair and the zero around and watch overshoot, speed and the initial dip react.

```figure:pz
```

An interactive explorer: drag a pole pair and a zero and watch the pole-zero map, the step response and the |G(jω)| curve change together. It turns the rules of thumb above into feel.

### Explorer: what happens when I move a pole pair and a zero?

Try it below. The DC gain is held at 1 (when finite), so you only see the <em>shape</em> change. Use the presets to see a LHP zero adding overshoot, a RHP zero causing a wrong-way start, near-cancellation, poles on the <i>j</i>ω axis, and poles in the RHP.

````callout:predict Predict, then check


- Slide the zero from −6 toward −0.7. What happens to the overshoot? <i>(It grows: a LHP zero near the poles adds a derivative-like kick.)</i>
- Push the zero across into the RHP. Which way does the response start? <i>(Down: wrong-way, non-minimum phase.)</i>
- Tick “× 1/s.” What does the step response turn into? <i>(A ramp. A step into an integrator never settles. The integrator's pole at 0 is a mode that never decays.)</i>
- Tick “× s.” What do you get? <i>(The impulse response: the derivative of the step response. Its final value is 0, because the zero at the origin blocks DC.)</i>
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Turn the zero on at −2 and drag it toward the origin: more overshoot. Drag it across to the right half-plane: the output dips below zero before it rises.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
