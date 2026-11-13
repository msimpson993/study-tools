---
id: fb
order: 8
title: "What feedback buys, and what it costs"
category: loop
chain:
  - title: "What does closing the loop buy and cost?"
  - title: "What does feedback buy us, and what does it cost?"
  - title: "sensitivity, disturbance, transient, indices"
    detail: "S = 1/(1 + CG)   T = CG/(1 + CG)   S + T = 1"
neighbors:
  - blocks
  - cheat
---
**What does feedback buy us, and what does it cost?**

**Picture it first.** Gain is the price of speed: raise K on the open loop K/(s(s+1)(s+2)) and the loop speeds up, the margins shrink and the closed-loop step starts to ring.

```figure:bode
```

Feedback reduces sensitivity to plant changes and to disturbances by roughly the factor 1 + CG, speeds the transient, and drives steady-state error down, at the cost of sensors, noise, hardware and the possibility of instability. S + T = 1 is the trade.

### Open loop vs closed loop: what changes when you add a sensor?

Open loop applies a pre-computed input and hopes. It can't notice a disturbance or a plant change. Closed loop measures the output (sensor <i>H</i>), compares it with the reference, and acts on the <b>error</b>. The costs: a sensor, sensor <b>noise N</b> that now enters the loop, and the possibility of instability.

*From the guide's static figure: <b>Lecture Notes 2, slide 2, redrawn.</b> The loop corrects for anything that shows up in the measurement, including the noise.*

````callout:why Why it matters
Every advantage below (sensitivity, disturbance rejection, faster transients, less steady-state error) exists only because of the loop. Every disadvantage (noise, more hardware, possible instability) exists for the same reason.
````

### Error-signal analysis: what are S and C, and why does S + C = 1 matter?

With <i>H</i> = 1 and <i>L</i> = <i>G</i><sub>c</sub><i>G</i>: <i>E</i> = <b><i>S</i></b><i>R</i> − <b><i>S</i></b><i>G</i><i>T</i><sub>d</sub> + <b><i>C</i></b><i>N</i>, where <b>sensitivity</b> <i>S</i> = 1/(1+<i>L</i>) and <b>complementary sensitivity</b> <i>C</i> = <i>L</i>/(1+<i>L</i>). Small <i>S</i> means good tracking and disturbance rejection; small <i>C</i> means good noise rejection. But <i>S</i> + <i>C</i> = 1, so you can't make both small at the same frequency.

<div class="eqbox"><i>E</i>(<i>s</i>) = <span class="frac"><span>1</span><span>1 + <i>L</i></span></span><i>R</i> − <span class="frac"><span><i>G</i></span><span>1 + <i>L</i></span></span><i>T</i><sub>d</sub> + <span class="frac"><span><i>L</i></span><span>1 + <i>L</i></span></span><i>N</i> <i>S</i> + <i>C</i> = <span class="frac"><span>1 + <i>L</i></span><span>1 + <i>L</i></span></span> = 1</div>

The way out is <b>frequency separation</b>. References and disturbances are usually slow, while sensor noise is fast. So design <i>L</i> to be large at low frequency (<i>S</i> small there) and small at high frequency (<i>C</i> small there). The crossover where |<i>L</i>| ≈ 1 is the loop bandwidth.

It's a PLL loop filter. Inside the loop bandwidth the output follows the reference (and its noise); outside it, the VCO's own noise wins. Same S/C trade-off.

````callout:trap Trap: which C?
In these slides, <i>C</i>(<i>s</i>) = <i>L</i>/(1+<i>L</i>) is the complementary sensitivity, which for unity feedback equals the closed-loop transfer function <i>T</i>(<i>s</i>) = <i>Y</i>/<i>R</i>. It's not the state-space output matrix <i>C</i>, and not the output signal <i>C</i> in <i>C</i>/<i>R</i>.
````

### Sensitivity to parameter variations: why does feedback make a sloppy plant behave?

System sensitivity <i>S</i><sup><i>T</i></sup><sub><i>G</i></sub> = (∂<i>T</i>/<i>T</i>)/(∂<i>G</i>/<i>G</i>), i.e. the % change in the closed-loop transfer function per % change in the plant. <b>Open loop: 1</b> (a 10% plant drift gives a 10% output error). <b>Closed loop: 1/(1 + <i>G</i><sub>c</sub><i>G</i>)</b>, so large loop gain makes the plant's drift almost irrelevant.

<div class="eqbox"><i>S</i><sup><i>T</i></sup><sub><i>G</i></sub> = <span class="frac"><span>∂<i>T</i></span><span>∂<i>G</i></span></span>·<span class="frac"><span><i>G</i></span><span><i>T</i></span></span> = <span class="frac"><span>1</span><span>1 + <i>G</i><sub>c</sub>(<i>s</i>)<i>G</i>(<i>s</i>)</span></span> with <i>T</i> = <span class="frac"><span><i>G</i><sub>c</sub><i>G</i></span><span>1 + <i>G</i><sub>c</sub><i>G</i></span></span></div>

````callout:predict Predict
<i>G</i><sub>c</sub><i>G</i> = 100 at low frequency, and the plant gain drops 10% as it heats up. How much does the closed-loop gain change? ShowAbout 10% × 1/101 ≈ <b>0.1%</b>. The closed loop is ~100× less sensitive than the open loop.
````

This is Black's feedback amplifier (1927): an op-amp's gain varies wildly from part to part, but the closed-loop gain ≈ 1/β is set by precise resistors. Same 1/(1+<i>L</i>).

````callout:recognize Recognize
Parameter sensitivity <i>S</i><sup><i>T</i></sup><sub><i>G</i></sub> is the same function as the <i>S</i> in the error equation. Errors, plant changes, and disturbances are all divided by (1 + <i>L</i>). The slides also define sensitivity to a parameter α inside <i>G</i>: <i>S</i><sup><i>T</i></sup><sub>α</sub> = <i>S</i><sup><i>T</i></sup><sub><i>G</i></sub>·<i>S</i><sup><i>G</i></sup><sub>α</sub> (chain rule).
````

### Disturbance rejection: what does the steel-mill example show?

With <i>R</i> = <i>N</i> = 0, <i>E</i> = −<i>S</i><i>G</i><i>T</i><sub>d</sub> = −<span class="frac"><span><i>G</i></span><span>1+<i>L</i></span></span><i>T</i><sub>d</sub>. In the steel rolling mill, the load torque from the rolls slows the motor. Closing the loop with a tachometer cuts the steady-state speed drop by the loop gain, typically to <b>under 2%</b> of the open-loop drop.

|  | Steady-state speed change for load step <i>T</i><sub>d</sub> = <i>D</i>/<i>s</i> |
|---|---|
| Open loop | \|Δω\| = <i>D</i> / (<i>b</i> + <i>K</i><sub>m</sub><i>K</i><sub>b</sub>/<i>R</i><sub>a</sub>) |
| Closed loop (tachometer <i>K</i><sub>t</sub>, amplifier <i>K</i><sub>a</sub>) | \|Δω\| ≈ <i>R</i><sub>a</sub><i>D</i> / (<i>K</i><sub>a</sub><i>K</i><sub>m</sub><i>K</i><sub>t</sub>) |
| Ratio closed/open | (<i>R</i><sub>a</sub><i>b</i> + <i>K</i><sub>m</sub><i>K</i><sub>b</sub>)/(<i>K</i><sub>a</sub><i>K</i><sub>m</sub><i>K</i><sub>t</sub>), usually &lt; 0.02 |


Intuition: in open loop, only the motor's own friction and back-EMF resist the load. In closed loop, the amplifier sees the speed drop and pushes back with gain <i>K</i><sub>a</sub>. Large <i>G</i><sub>1</sub><i>G</i><sub>2</sub><i>H</i> ⇒ <i>E</i> ≈ <i>T</i><sub>d</sub>/(<i>G</i><sub>1</sub><i>H</i>).

````callout:note Noise is the flip side (same slide set)
With <i>R</i> = <i>T</i><sub>d</sub> = 0, <i>Y</i> = −<i>C</i>·<i>N</i> ≈ −<i>N</i> when <i>L</i> is large. The loop trusts the sensor completely, so it faithfully “corrects” the output to follow the noise. Attenuating measurement noise needs <em>small</em> loop gain at the noise frequencies.
````

### Control of the transient response: how does feedback make a slow motor fast?

The open-loop motor speed TF is <i>K</i><sub>1</sub>/(τ<sub>1</sub><i>s</i> + 1), and its speed is fixed by the hardware (the steel mill's huge roll inertia makes τ<sub>1</sub> large). Closing the loop moves the pole from −1/τ<sub>1</sub> to −(1 + <i>K</i><sub>a</sub><i>K</i><sub>t</sub><i>K</i><sub>1</sub>)/τ<sub>1</sub>, so the response is <b>(1 + loop gain)× faster</b> without changing the motor.

<div class="eqbox"><span class="frac"><span>ω(<i>s</i>)</span><span><i>R</i>(<i>s</i>)</span></span> = <span class="frac"><span><i>K</i><sub>a</sub><i>K</i><sub>1</sub>/τ<sub>1</sub></span><span><i>s</i> + (1 + <i>K</i><sub>a</sub><i>K</i><sub>t</sub><i>K</i><sub>1</sub>)/τ<sub>1</sub></span></span> ⇒ τ<sub>closed</sub> = <span class="frac"><span>τ<sub>1</sub></span><span>1 + <i>K</i><sub>a</sub><i>K</i><sub>t</sub><i>K</i><sub>1</sub></span></span></div>

````callout:trap Trap: speed isn't free
A faster closed loop means a big initial actuator command. In a real mill the amplifier saturates, and then the linear prediction no longer holds.
````

### Steady-state error design: what's the trade-off in the English Channel boring machine?

PD controller <i>G</i><sub>c</sub> = <i>K</i> + 11<i>s</i> on plant <i>G</i> = 1/(<i>s</i>(<i>s</i>+1)). One gain <i>K</i> must keep the angle response to commands acceptable <em>and</em> suppress the cutter's load disturbance. Step-reference error is 0 for any <i>K</i> (type-1 plant), but a step disturbance leaves <i>y</i><sub>ss</sub> = 1/<i>K</i>: <b>0.01 at K = 100, 0.05 at K = 20</b>.

<div class="eqbox"><i>Y</i>(<i>s</i>) = <span class="frac"><span><i>K</i> + 11<i>s</i></span><span><i>s</i>² + 12<i>s</i> + <i>K</i></span></span><i>R</i>(<i>s</i>) + <span class="frac"><span>1</span><span><i>s</i>² + 12<i>s</i> + <i>K</i></span></span><i>T</i><sub>d</sub>(<i>s</i>)</div>

````callout:recognize Recognize


- Same denominator <i>s</i>² + 12<i>s</i> + <i>K</i> for both inputs (Q11 again). ω<sub>n</sub> = √<i>K</i>, ζ = 6/√<i>K</i>, so a bigger <i>K</i> is less damped.
- The R-path numerator <i>K</i> + 11<i>s</i> is a zero at −<i>K</i>/11. That's why <i>K</i> = 20 (ζ &gt; 1, overdamped poles!) still overshoots: the zero does it (Q26 trap).
- The disturbance enters <em>after</em> the controller, and the controller has no integrator, so the disturbance error only shrinks as 1/<i>K</i>.
````

````callout:note Design reading
Bigger <i>K</i> buys disturbance rejection (1/<i>K</i>) and speed (ω<sub>n</sub> = √<i>K</i>) at the cost of less damping (ζ = 6/√<i>K</i>) and more actuator effort. Choosing <i>K</i> is choosing where to sit on that trade-off.
````

### Performance indices: why ISE, IAE, ITAE, ITSE?

A performance index squashes a whole error curve into one number so you can <em>optimize</em> a gain. <b>ISE</b> = ∫<i>e</i>² dt punishes big errors (mostly the early ones). <b>IAE</b> = ∫|<i>e</i>|dt weighs all errors equally. <b>ITAE</b> = ∫<i>t</i>|<i>e</i>|dt and <b>ITSE</b> = ∫<i>t</i><i>e</i>² dt multiply by time, so <b>errors that linger late get punished</b>, which favors well-damped responses.

*From the guide's static figure: <b>Each index (normalized to its own minimum) vs ζ for the standard second-order step (ω<sub>n</sub> = 1).</b> ISE is happiest at ζ = 0.5 (it tolerates ringing to get a fast rise). The time-weighted ITAE wants ζ ≈ 0.7–0.75 (it hates late ringing). Away from the minimum, ISE rises slowly (forgiving) while ITAE rises steeply (selective).*

````callout:note Slide example: space telescope pointing
Choose <i>K</i><sub>3</sub> to minimize a disturbance's effect: min ISE at <i>K</i><sub>3</sub> = √10 ≈ 3.2 (ζ = 0.50), min IAE at <i>K</i><sub>3</sub> = 4.2 (ζ = 0.665). Different index, different “optimal” design, which is the point: the index is how you encode what <em>you</em> care about.
````

````callout:recognize Recognize
“Optimal” always means “optimal for some index.” The time-weighted (T-) versions are what you choose when settling matters more than the first instant.
````

### Simplification of linear systems: when and how can I use a smaller model?

Keep the dominant dynamics and the <b>DC gain</b>; drop or approximate the rest. The simple way: delete insignificant (fast) poles while keeping <i>G</i>(0). The refined way (slides): pick a lower-order <i>G</i><sub>L</sub> whose frequency response matches the original's near <i>s</i> = 0, by matching derivatives.

Slide example: <i>G</i><sub>H</sub> = 6/((<i>s</i>+1)(<i>s</i>+2)(<i>s</i>+3)) → <i>G</i><sub>L</sub> = 1.60/(<i>s</i>² + 2.590<i>s</i> + 1.60). Both have DC gain 1. The reduced poles (−1.024, −1.565) give a slightly overdamped response with <i>T</i><sub>s</sub> ≈ 3 s.

*From the guide's static figure: <b>Third-order original vs second-order approximation.</b> Nearly indistinguishable. The approximation is good enough to design with, and it brings back the Stage 11 formulas.*

````callout:trap Trap
Dropping a pole without fixing the gain: 6/((<i>s</i>+1)(<i>s</i>+2)) has DC gain 3, not 1. Divide by the dropped pole's constant (here 3) to keep <i>G</i>(0).
````

#### Lecture Notes 2 in eight stops

````callout:note One idea behind all eight
Large loop gain |<i>L</i>| ⇒ small <i>S</i> = 1/(1+<i>L</i>) ⇒ less tracking error, less sensitivity, and less disturbance effect. But you can't make <i>L</i> large everywhere: noise, actuator limits, and stability push back. That tension is control design.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Slide K up until the gain-margin bar shrinks to zero at K = 6: that is the jω-axis crossing of the root locus, seen from the other side.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **e_ss**: the error r − y once everything has settled
- **T (time constant)**: time for a first-order response to cover 63 % of the way: T = 1/|p|
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **A, B, C, D**: the state-space matrices: ẋ = Ax + Bu, y = Cx + Du
- **C(s)**: the controller transfer function (PID: Kp + Ki/s + Kd·s)
- **S, T**: sensitivity S = 1/(1 + CG) and complementary sensitivity T = CG/(1 + CG), with S + T = 1
````
