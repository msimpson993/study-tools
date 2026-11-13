---
id: integral
order: 5
title: "Why integral action gives zero steady-state error"
category: terms
chain:
  - title: "Why does I remove steady-state error?"
  - title: "Why does integral action give zero steady-state error?"
  - title: "deep dive A"
    detail: "e_ss = 1/(1 + C(0)G(0)), C(0) → ∞ with an integrator"
neighbors:
  - gains
  - windup
  - tuning
exampleScene: { overlays: [push, trace], caption: "A steady push leaves the cart at 0.5 m. An integrator keeps adding force until the sensor reads exactly r." }
---
**Why does integral action give zero steady-state error?**

**Picture it first.** P only leaves the output short of r; add Ki and it reaches r. Drag Kp to see that gain alone only shrinks the offset.

```figure:fail-offset
```

The integral state keeps changing while any error remains, dx_i/dt = e, so at rest e must be 0. That is also why a load disturbance is cancelled in steady state. The price is a lower phase margin: more overshoot and slower ringing.

#### Why does integral action give zero steady-state error?

#### 1. The equilibrium argument (the intuitive one)

Suppose the loop settles to steady state. Then every signal is constant, including the integrator output x<sub>i</sub> = ∫e dt. But dx<sub>i</sub>/dt = e. A constant x<sub>i</sub> requires <b>e = 0</b>. There is no other way for the loop to sit still. P-only control has no such constraint: it can sit still at any e that makes K<sub>p</sub>e equal to the needed throttle, which is why it needs an offset to “hold” the throttle open.

#### 2. The final value theorem (the one for exams)

Unity feedback, step reference R(s) = 1/s, closed loop stable:

<div class="eqbox">e<sub>ss</sub> = lim<sub>s→0</sub> s · <span class="frac"><span>1</span><span>1 + C(s)G(s)</span></span> · <span class="frac"><span>1</span><span>s</span></span> = <span class="frac"><span>1</span><span>1 + C(0)G(0)</span></span></div>

- P: e<sub>ss</sub> = 1/(1 + K<sub>p</sub>G(0)). Finite K<sub>p</sub> ⇒ finite but nonzero error (for a plant with no free integrator, i.e. “type 0”).
- PI/PID: C(s) ∋ K<sub>i</sub>/s ⇒ C(0) → ∞ ⇒ <b>e<sub>ss</sub> = 0</b>.
- If the plant <em>itself</em> has an integrator (type 1, e.g. a position servo), P alone already gives zero step error, and I is then for rejecting constant <em>disturbances</em>.

#### 3. Disturbances: the C/D view from class

<div class="eqbox"><span class="frac"><span>Y</span><span>D</span></span>(0) = <span class="frac"><span>G(0)</span><span>1 + C(0)G(0)</span></span> → <span class="frac"><span>G(0)</span><span>1 + K<sub>p</sub>G(0)</span></span> (P) or 0 (with I)</div>

*From the guide's static figure: <b>Load disturbance step</b> (d = 1 at t = 1 s, r = 0, plant 1/(s+1)³). P-only (K<sub>p</sub> = 2) is left with a permanent deviation of G(0)/(1 + K<sub>p</sub>G(0)) = 1/3. PI (K<sub>p</sub> = 2, K<sub>i</sub> = 0.8) drives it back to zero. Think: a hill under cruise control.*

````callout:trap Fine print
(i) Zero error requires the closed loop to be <b>stable</b>; the final value theorem is invalid otherwise. (ii) The integrator contributes −90° of phase at all frequencies, which is why too much K<sub>i</sub> adds overshoot and can destabilize. (iii) “Zero error” is for step references/constant disturbances; a ramp reference with a type-1 loop still leaves a finite error.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise Kp: the offset shrinks but never vanishes. Add Ki: it is gone.
````

````callout:note Symbols used here
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **G, C**: plant transfer function G(s) and controller C(s)
````
