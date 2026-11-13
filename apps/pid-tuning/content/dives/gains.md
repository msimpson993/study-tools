---
id: gains
order: 4
title: "What each gain does to the step response"
category: terms
chain:
  - title: "What does each gain do to the response?"
  - title: "What does each gain do to the step response?"
  - title: "rise time, overshoot, settling, error"
neighbors:
  - pid
  - integral
  - derivative
exampleScene: { overlays: [push, trace], caption: "A 1 N push is the step the controller applies: this is the open-loop response each gain has to improve on." }
---
**What does each gain do to the step response?**

**Picture it first.** Add one term at a time to the cart-like plant and watch both the step response and the closed-loop poles.

```figure:gains
```

Raising Kp speeds the rise but increases overshoot and leaves less steady-state error; raising Ki removes steady-state error but adds overshoot and slow oscillation; raising Kd adds damping but amplifies noise. The table of cause and effect is the backbone of manual tuning.

### What does increasing each gain do to the step response?

Roughly: <b>K<sub>p</sub></b> makes it faster but more oscillatory and only <em>reduces</em> offset; <b>K<sub>i</sub></b> <em>eliminates</em> offset but adds overshoot and slows settling; <b>K<sub>d</sub></b> adds damping (less overshoot, faster settling) but amplifies noise.

| Increase… | Rise time | Overshoot | Settling time | Steady-state error | Stability margin |
|---|---|---|---|---|---|
| <b>K<sub>p</sub></b> | ↓ decreases | ↑ increases | small change | ↓ decreases (not to 0) | ↓ degrades |
| <b>K<sub>i</sub></b> | ↓ decreases | ↑ increases | ↑ increases | eliminated | ↓ degrades |
| <b>K<sub>d</sub></b> | minor change | ↓ decreases | ↓ decreases | no effect (in theory) | ↑ improves (if K<sub>d</sub> modest) |


````callout:trap These are rules of thumb, not theorems
The table describes the <em>typical</em> trend near a reasonable design. Push any gain far enough and the trend can reverse. Too much K<sub>d</sub> can make things worse, and with noise it always costs actuator jitter. Use the table to <b>predict</b>, then confirm with simulation, which is exactly the habit your instructor wants.
````

*From the guide's static figure: <b>P vs PI vs PID on the same plant</b> (1/(s+1)³, unit step, simulated). <b>P</b> (K<sub>p</sub> = 2) settles at 2/3, leaving 1/3 error (= 1/(1+K<sub>p</sub>G(0))). <b>PI</b> (K<sub>p</sub> = 1, K<sub>i</sub> = 0.4) removes the offset but is slow. <b>PID</b> (K<sub>p</sub> = 2, K<sub>i</sub> = 0.8, K<sub>d</sub> = 1.6, N = 20) is fast <em>and</em> well damped. Exact numbers are in the readouts when you load these presets in the Lab.*

<b>A first-order sanity check (ties to your class).</b> With a first-order plant <i>G</i> = K/(τs+1) and P control, the closed loop is still first order:

<div class="eqbox"><span class="frac"><span>Y</span><span>R</span></span> = <span class="frac"><span>K<sub>p</sub>K</span><span>τs + 1 + K<sub>p</sub>K</span></span> = <span class="frac"><span>K<sub>p</sub>K/(1+K<sub>p</sub>K)</span><span>(τ/(1+K<sub>p</sub>K)) s + 1</span></span></div>

So raising K<sub>p</sub> <b>shrinks the time constant</b> by (1 + K<sub>p</sub>K) (faster) and pushes the DC gain toward 1 (smaller offset) but never to exactly 1. Example: τ = 1, K = 1, K<sub>p</sub> = 3 ⇒ time constant 0.25 s, final value 0.75, error 0.25. Overshoot and oscillation only appear when the closed loop is <em>second order or higher</em>, which is why the next class topic (ζ, ω<sub>n</sub>) is the natural language for tuning.

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

#### The derivative term: damping, noise, filters and “kick”

#### Why it damps

Near the target the error is small but changing fast; D sees the slope and starts braking early. It's a velocity-proportional force, a <b>shock absorber</b>, so it adds damping (raises ζ, once you meet ζ next class). In frequency terms it adds <b>phase lead</b> (up to +90°) near crossover, which increases phase margin.

#### Why it amplifies noise

Your RF intuition is exactly right here: the ideal differentiator's frequency response is K<sub>d</sub>·jω, a +20 dB/decade high-pass with unbounded gain. Sensor noise lives at high frequency, so D turns a tiny noise ripple into a large actuator chatter. Example: noise at 100 rad/s with K<sub>d</sub> = 1 gets gain 100.

<div class="eqbox">Filtered D: K<sub>d</sub> <span class="frac"><span>N s</span><span>s + N</span></span> ≈ K<sub>d</sub>s for ω ≪ N, → K<sub>d</sub>N for ω ≫ N</div>

*From the guide's static figure: <b>Same small sensor noise, three controllers</b> (noise σ = 0.01, i.e. 1% of the set-point; plant 1/(s+1)³). The <b>control signal u</b> after the transient: PI is nearly quiet; PID with a light filter (N = 100) chatters strongly; a heavier filter (N = 10) tames it. Lower N = more filtering but less phase lead, which is a trade-off.*

#### Derivative kick

If D acts on the error e = r − y and r <b>steps</b>, de/dt is an impulse, so u gets a huge spike (limited only by N). Common fix: apply D to <b>−y</b> only (“derivative on measurement”). For a constant r it's identical, but it ignores set-point jumps. Try the “D on measurement” toggle in the Lab and watch the <b>peak |u|</b> readout.

````callout:note Why a PI (not PID) is a sensible choice for Project 1
The example asks for a PI controller. That makes sense: the requirements (settle &lt; 5 s, zero step error) need the I term, and in your project they can be met without D. Leaving D out sidesteps the noise and kick issues entirely. A common practical default is <b>PI unless you really need the extra damping</b>.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise Kp: faster, but the poles pull toward each other and then ring. Add Ki: the offset vanishes but overshoot grows. Add Kd: the ringing is damped.
````

````callout:note Symbols used here
- **e**: the error e = r − y
- **d**: a disturbance entering at the plant input
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **N**: pole of the derivative filter (rad/s): how fast D may react
- **ζ, ωn**: damping ratio and natural frequency of the dominant pole pair
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **G, C**: plant transfer function G(s) and controller C(s)
````
