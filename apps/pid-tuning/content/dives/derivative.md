---
id: derivative
order: 6
title: "The derivative term: damping, noise, filters and kick"
category: terms
chain:
  - title: "How do I calm the ringing?"
  - title: "What does D buy, and what does it cost?"
  - title: "damping, noise, filter N, kick"
    detail: "Kd·N·s/(s + N)  (filtered derivative)"
neighbors:
  - gains
  - tuning
exampleScene: { overlays: [pid, noise], params: { K: 10, Ki: 0, Kd: 3, noise: 0.04 }, caption: "D brakes the cart by acting on the error's rate of change, but it also acts on sensor noise: the push u turns jittery." }
---
**What does D buy, and what does it cost?**

**Picture it first.** A noisy sensor and a set-point step both go through the derivative. Compare unfiltered D, a low N, and D on the measurement.

```figure:derivative
```

D adds damping by reacting to the rate of change, which cuts overshoot. An ideal derivative amplifies high-frequency sensor noise, so it is filtered (time constant 1/N) and usually applied to the measurement, not the error, to avoid a kick when the set-point steps.

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
Before you touch a slider, predict what it will do. Turn on D with N = 100: the control u turns into noise although y looks fine. Lower N to 10, or switch D to the measurement: the spike and the hair go away.
````

````callout:note Symbols used here
- **u**: the control signal the actuator applies
- **e**: the error e = r − y
- **Kd**: derivative gain: u from the error's slope
- **N**: pole of the derivative filter (rad/s): how fast D may react
- **ζ, ωn**: damping ratio and natural frequency of the dominant pole pair
- **PM**: phase margin: how far the loop phase is from −180° at the 0 dB crossover
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
