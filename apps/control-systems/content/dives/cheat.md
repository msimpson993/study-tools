---
id: cheat
order: 15
title: "What to recognize on sight"
category: time
chain:
  - title: "What do I need to recognize on sight?"
  - title: "What should I recognize on sight?"
  - title: "cheat sheet and glossary"
neighbors:
  - fb
exampleScene: { overlays: [forces, push, poles], caption: "The cart's facts in one picture: three forces, a 1 N push, and the poles at −1 and −2." }
---
**What should I recognize on sight?**

**Picture it first.** Every cheat-sheet line is a fact about this cart: poles, DC gain, ζ, ωn, settling time. Change a parameter and check which fact moves.

```figure:cart
```

A one-page 'recognize this' list: which pole pattern, transfer function shape or block diagram means which behaviour, plus a glossary of every symbol. It is the review end of the chain.

#### Reading a transfer function

- Order = highest power of <i>s</i> in the <b>denominator</b>
- DC gain = <i>G</i>(0); unit step settles there (if stable)
- <i>b</i>/(<i>s</i>+<i>a</i>) → <i>K</i> = <i>b</i>/<i>a</i>, τ = 1/<i>a</i>
- Bare 1/<i>s</i> → integrator → type 1
- Poles: Re → decay, Im → ringing, RHP → unstable

#### Block diagrams

- Series ×, parallel +, loop <i>G</i>/(1+<i>GH</i>)
- Any input: forward path / (1 + <i>L</i>)
- <i>C</i>/<i>R</i> and <i>C</i>/<i>D</i> share 1 + <i>G</i><sub>c</sub><i>G</i> → same poles
- Disturbance at plant input: <i>G</i>/(1+<i>L</i>)

#### Order &amp; energy

- Order = # independent L, C, m, k, J
- R and dampers add no order
- Parallel C's = one store; cancellations hide modes

#### State space

- <i>ẋ</i> = <i>Ax</i> + <i>Bu</i>, <i>y</i> = <i>Cx</i> + <i>Du</i>
- Physics → states → A, B; output choice → C, D
- Phase variables: 1's above the diagonal, −<i>a</i><sub>0</sub> −<i>a</i><sub>1</sub>… in the bottom row
- <i>G</i> = <i>C</i>(<i>sI</i>−<i>A</i>)<sup>−1</sup><i>B</i> + <i>D</i>; poles = eig(<i>A</i>)
- 2×2 inverse: swap diag, negate off, ÷ det

#### Circuits &amp; op-amps

- Impedances <i>R</i>, <i>sL</i>, 1/(<i>sC</i>)
- RLC: 1/(<i>LCs</i>²+<i>RCs</i>+1)
- Op-amp: −<i>Z</i><sub>f</sub>/<i>Z</i><sub>in</sub>
- Pole at 0 = integrator; zero at 0 = differentiator

#### First order K/(Ts+1)

- 63% at <i>T</i>, 98% at 4<i>T</i>
- No overshoot, ever
- Initial slope <i>K</i>/<i>T</i>; impulse (<i>K</i>/<i>T</i>)<i>e</i><sup>−<i>t</i>/<i>T</i></sup>

#### Second order

- ω<sub>n</sub>²/(<i>s</i>²+2ζω<sub>n</sub><i>s</i>+ω<sub>n</sub>²)
- %OS = 100<i>e</i><sup>−ζπ/√(1−ζ²)</sup> (ζ only)
- <i>T</i><sub>s</sub> ≈ 4/(ζω<sub>n</sub>), <i>T</i><sub>p</sub> = π/ω<sub>d</sub>
- cos θ = ζ; radius = ω<sub>n</sub>
- Zeros add overshoot; extra poles slow it down

#### Steady state

- <i>e</i><sub>ss</sub> = lim <i>sE</i>(<i>s</i>), stable loop only!
- Step, type 0: 1/(1+<i>L</i>(0))
- Integrator in <i>L</i> → step error 0
- P leaves error; I removes it; D doesn't affect it

#### Feedback (LN2)

- <i>S</i> = 1/(1+<i>L</i>), <i>C</i> = <i>L</i>/(1+<i>L</i>), <i>S</i>+<i>C</i> = 1
- <i>E</i> = <i>SR</i> − <i>SGT</i><sub>d</sub> + <i>CN</i>
- Open-loop sensitivity 1; closed-loop 1/(1+<i>L</i>)
- Feedback: τ → τ/(1+loop gain)
- Boring machine: <i>y</i><sub>ss</sub>(<i>T</i><sub>d</sub>) = 1/<i>K</i>
- ISE ↔ big errors; ITAE ↔ late errors
- Reduce order: keep DC gain

LTILinear, time-invariant: superposition holds and coefficients are constant. Required for transfer functions. Transfer function<i>Y</i>(<i>s</i>)/<i>U</i>(<i>s</i>) with zero initial conditions; the Laplace transform of the impulse response. Pole / zeroRoots of the denominator (natural modes) / numerator (blocked input shapes). DC gain<i>G</i>(0): steady-state output per unit constant input (if stable). OrderDegree of the denominator = number of states = number of independent energy stores. System typeNumber of pure integrators (poles at <i>s</i> = 0) in the loop gain. Loop gain L<i>G</i><sub>c</sub><i>G</i>(<i>H</i>): the product around the feedback loop. Characteristic equation1 + <i>L</i>(<i>s</i>) = 0; its roots are the closed-loop poles (for every input). StateThe minimum set of variables that, with the future input, determines the future (e.g. capacitor voltage, inductor current). Phase variablesStates chosen as <i>y</i>, <i>ẏ</i>, <i>ÿ</i>, …; give the companion-form <i>A</i>. Resolvent(<i>sI</i> − <i>A</i>)<sup>−1</sup>. Time constant T (τ)First-order speed: 63% of the final value at <i>t</i> = <i>T</i>. ζ, ω<sub>n</sub>Damping ratio (shape/overshoot) and natural frequency (speed) of a second-order system. %OS, T<sub>s</sub>, T<sub>p</sub>Percent overshoot, settling time (2%), peak time. Dominant polesThe slowest (closest to the <i>j</i>ω axis) poles, which shape most of the response. Steady-state errorlim<sub><i>t</i>→∞</sub> <i>e</i>(<i>t</i>); found with the final-value theorem when the closed loop is stable. Sensitivity S1/(1+<i>L</i>): the factor on reference error and disturbances, and the relative sensitivity to plant changes. Complementary sensitivity C<i>L</i>/(1+<i>L</i>) = closed-loop <i>T</i>(<i>s</i>) for unity feedback; the factor on sensor noise. Disturbance T<sub>d</sub>An unwanted input (load torque, cutter force) that pushes the output off target. Performance indexA scalar (ISE, IAE, ITAE, ITSE) that rates a response; minimized to pick gains. Model reductionReplacing a high-order model with a lower-order one that keeps the dominant dynamics and DC gain.

Next stops

Quiz &amp; flashcards →

PID tuning guide

PID quiz &amp; flashcards

Mini-exam 1 quiz

EECE5130 Control Systems · UML · Fall 2026 · Study guide built from Lecture Notes 1–2, Lectures 1–3, and the Oct 23 lecture. Formulas are checked, but verify any grading-critical detail against the slides.

The 22-question mini-exam in the **Quiz** section tests exactly these patterns under exam conditions.

````callout:predict Predict
Before you touch a slider, predict what it will do. Take the damper away (c = 0): the poles land on the jω axis and the cart rings forever. Put it back: they slide left and the ringing decays.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **K**: the proportional gain in u = K(r − y); K = 7 gives ζ = 0.5, ωn = 3
- **T (time constant)**: time for a first-order response to cover 63 % of the way: T = 1/|p|
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **S, T**: sensitivity S = 1/(1 + CG) and complementary sensitivity T = CG/(1 + CG), with S + T = 1
````
