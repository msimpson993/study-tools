---
id: pid
order: 3
title: "What P, I and D are, and which form this is"
category: terms
chain:
  - title: "What do we put in the controller?"
  - title: "What are P, I and D, and which form is this?"
  - title: "parallel versus standard form"
    detail: "C(s) = Kp + Ki/s + Kd·s = Kp(1 + 1/(Ti·s) + Td·s)"
neighbors:
  - feedback
  - gains
matlab: "C = pid(Kp, Ki, Kd);   % parallel form;  pidstd(Kp, Ti, Td) is the standard form"
---
**What are P, I and D, and which form is this?**

**Picture it first.** Present, past, trend: P acts on e right now, I on the area under e so far. Watch the three traces while you change Ki.

```figure:integral
```

u = Kp·e + Ki·∫e dt + Kd·de/dt. P reacts to the present error, I to the accumulated past error, D to the trend. Parallel form uses Kp, Ki, Kd; standard form uses Kp, Ti, Td with Ki = Kp/Ti and Kd = Kp·Td.

### What is a PID controller, and why are P, I and D each there?

It adds three reactions to the error: <b>P</b> reacts to the error <b>now</b> (present), <b>I</b> to the error accumulated so far (past), <b>D</b> to how fast the error is changing (a prediction of the near future).

|  | Looks at | Intuition (driving) | Good at | Bad at / risk |
|---|---|---|---|---|
| <b>P</b> K<sub>p</sub>e | Present error | “I'm 10 mph slow → press harder, in proportion.” | Fast basic correction | Leaves offset on type-0 plants; too much ⇒ oscillation |
| <b>I</b> K<sub>i</sub>∫e dt | Past (accumulated) error | “I've been slow for a while → keep adding throttle until the error is truly gone.” | Removes steady-state error; rejects constant loads | Adds lag ⇒ overshoot; windup when saturated |
| <b>D</b> K<sub>d</sub> de/dt | Future trend | “I'm closing in fast → ease off before I overshoot.” | Damping, less overshoot | Amplifies noise; “kick” on set-point steps |


The figure below shows these three signals for an actual closed-loop step response (the PI loop of the PID Lab plant). Notice the punchline at the bottom: when the error has gone to zero, the <b>integral is still non-zero</b>, and that stored value is precisely what keeps holding the throttle where it needs to be.

*From the guide's static figure: <b>Present, past, future.</b> Top: error <i>e</i>(t). Middle: its running integral ∫e (shaded area = what I “remembers”). Bottom: slope de/dt (what D “sees coming”). Simulated: plant 1/(s+1)³, PI with K<sub>p</sub> = 1, K<sub>i</sub> = 0.5, unit step. ∫e settles at 1/K<sub>i</sub> = 2, so the I-term K<sub>i</sub>∫e = 1 supplies the full steady control effort while e = 0.*

### Why write it as u = K<sub>p</sub>e + K<sub>i</sub>∫e + K<sub>d</sub> de/dt, and what's its transfer function?

The time-domain law is literally “present + past + future.” Laplace-transform it (zero ICs) and integration becomes 1/s and differentiation becomes s, so it drops straight into block-diagram algebra: <i>C</i>(s) = K<sub>p</sub> + K<sub>i</sub>/s + K<sub>d</sub>s.

<div class="eqbox">u(t) = K<sub>p</sub> e(t) + K<sub>i</sub> ∫<sub>0</sub><sup>t</sup> e(τ) dτ + K<sub>d</sub> <span class="frac"><span>de</span><span>dt</span></span> ⟹ <span class="frac"><span>U(s)</span><span>E(s)</span></span> = K<sub>p</sub> + <span class="frac"><span>K<sub>i</sub></span><span>s</span></span> + K<sub>d</sub>s = <span class="frac"><span>K<sub>d</sub>s² + K<sub>p</sub>s + K<sub>i</sub></span><span>s</span></span></div>

Reading the transfer function like a math person:

- <b>One pole at the origin</b> (from 1/s). That pole is the whole story of zero steady-state error (Deep dive A).
- <b>Two zeros</b> (roots of K<sub>d</sub>s² + K<sub>p</sub>s + K<sub>i</sub>). Tuning is really <em>placing these two zeros and setting an overall gain</em>. A PI has one zero at s = −K<sub>i</sub>/K<sub>p</sub> = −1/T<sub>i</sub>.
- <b>Ideal D is improper</b> (more zeros than poles; gain → ∞ as ω → ∞). Real implementations add a filter: K<sub>d</sub>s → K<sub>d</sub><span class="frac"><span>N s</span><span>s + N</span></span>. This is exactly the <b>N</b> (“filter coefficient”) field in the Simulink PID block (Deep dive B).

Special cases you've seen in class: <b>P</b> (K<sub>i</sub> = K<sub>d</sub> = 0), <b>PI</b> (K<sub>d</sub> = 0), <b>PD</b> (K<sub>i</sub> = 0), <b>I-only</b> (K<sub>p</sub> = K<sub>d</sub> = 0). Hold on to I-only. Your Project 1 tuner lands on it at one point.

### Parallel form vs. standard (ideal) form: what's the difference, and how do I convert?

Same controller, different parameters. Standard form factors out K<sub>p</sub>: <i>C</i> = K<sub>p</sub>(1 + 1/(T<sub>i</sub>s) + T<sub>d</sub>s). Convert with <b>K<sub>i</sub> = K<sub>p</sub>/T<sub>i</sub></b> and <b>K<sub>d</sub> = K<sub>p</sub>T<sub>d</sub></b>.

<div class="eqbox">Parallel: K<sub>p</sub> + <span class="frac"><span>K<sub>i</sub></span><span>s</span></span> + K<sub>d</sub>s ⟺ Standard (your class): K<sub>p</sub>(1 + <span class="frac"><span>1</span><span>T<sub>i</sub>s</span></span> + T<sub>d</sub>s)</div>

|  | Parallel (K<sub>p</sub>, K<sub>i</sub>, K<sub>d</sub>) | Standard (K<sub>p</sub>, T<sub>i</sub>, T<sub>d</sub>) |
|---|---|---|
| Units | K<sub>i</sub> in 1/s × gain, K<sub>d</sub> in s × gain | T<sub>i</sub>, T<sub>d</sub> in <b>seconds</b> (physical time scales) |
| Conversion | K<sub>i</sub> = K<sub>p</sub>/T<sub>i</sub>, K<sub>d</sub> = K<sub>p</sub>T<sub>d</sub> | T<sub>i</sub> = K<sub>p</sub>/K<sub>i</sub>, T<sub>d</sub> = K<sub>d</sub>/K<sub>p</sub> |
| Change K<sub>p</sub> only… | …only P action changes | …<b>all three</b> actions scale together |
| Bigger integral parameter means… | larger K<sub>i</sub> ⇒ <b>stronger</b> I action | larger T<sub>i</sub> ⇒ <b>weaker</b> I action |
| Where you meet it | Simulink PID block default (“Parallel”: P, I, D, N) | Ziegler–Nichols tables; textbooks; Simulink “Ideal” form |


````callout:trap Trap
“Increase T<sub>i</sub> to get more integral action” is <b>wrong</b>: T<sub>i</sub> is in the denominator. And in Simulink's Ideal form the “I” field is 1/T<sub>i</sub>, not T<sub>i</sub>. Always check which form a dialog is in before you copy numbers.
````

````callout:note Quick check
K<sub>p</sub> = 2, T<sub>i</sub> = 0.5 s, T<sub>d</sub> = 0.1 s ⇒ K<sub>i</sub> = 2/0.5 = 4 s⁻¹, K<sub>d</sub> = 2 × 0.1 = 0.2 s. Physical meaning of T<sub>i</sub>: for a constant error, the I term needs T<sub>i</sub> seconds to add as much as the P term already contributes.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. With Ki = 0 the P term settles at a non-zero value, so e never reaches zero. Add Ki: the bottom trace climbs until e is zero and then stays put at exactly the control that holds y = r.
````

````callout:note Symbols used here
- **u**: the control signal the actuator applies
- **e**: the error e = r − y
- **Kp**: proportional gain: u from the present error
- **Ki**: integral gain (1/s): u from the accumulated error
- **Kd**: derivative gain: u from the error's slope
- **%OS, Ts**: overshoot and 2 % settling time of the step response
````
