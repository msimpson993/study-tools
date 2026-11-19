---
id: mini-exam-1
order: 1
title: "Mini exam 1: modeling, block diagrams, state space, circuits, first order"
summary: "Everything in Lecture Notes 1 up to the first-order step response: transfer functions, block diagrams, controllers, state space, circuits and op-amps, first-order response. A topic checklist that links back to the map, a one-page formula sheet and the 22-question self-test."
covers: "Lecture Notes 1, slides 1–49"
quizTag: mini-exam
---
**How to use this page.** Work down the checklist: if you cannot say what an item means in one sentence, open its link (each goes to the map box or deep dive where the idea is built up), then take the self-test. The formula sheet is a printable one-pager of the patterns the self-test rewards.

### Topic checklist (Lecture Notes 1)

| Slides | Topic: can you…? | Where it is on the map |
|---|---|---|
| 3–5 | define a transfer function (output over input, zero initial conditions), and say how it relates to convolution and the impulse response g(t) | [Why model, why Laplace](#/dive/model) |
| 6–9 | draw and read a block diagram: summing and branch points, cascade, parallel and feedback loop, open-loop G·H versus feedforward G | [The loop: command path and disturbance path](#/dive/blocks) |
| 10–17 | name the controller types (on/off, P, I, PI, PD, PID) and write each one's transfer function with Kp, Ti and Td | [What P, I and D each do](#/dive/ctrl) |
| 18–20 | find C/R and C/D for a loop with a disturbance, and reduce a multi-loop diagram step by step | [The loop: command path and disturbance path](#/dive/blocks) |
| 21–27 | define state, state vector and state space; write ẋ = Ax + Bu, y = Cx + Du for the mass–spring–damper | [Look inside: state space](#/dive/ss) |
| 28–32 | derive G(s) = C(sI − A)⁻¹B + D (and the transfer matrix for several inputs and outputs) | [From state space to the transfer function](#/dive/ss2tf) |
| 33–37 | write the phase-variable (companion) form for an nth-order ODE, with and without input derivatives; know a realization is not unique | [Look inside: state space](#/dive/ss) |
| 42–45 | get G(s) for an LRC circuit and cascaded RC sections; op-amp inverting and non-inverting stages, lag/lead networks, the op-amp PID | [Getting G(s) for real hardware](#/dive/circuits) |
| 38–41 | say how many states a plant needs (independent energy stores) | [Why a plant has the order it has](#/dive/order) |
| 47–49 | sketch the first-order step and impulse responses, and read K and τ off K/(τs + 1) (63.2 % at t = τ) | [The simplest plant](#/dive/first) |
| (Lectures; slides 50–72 are in the [Mini exam 2 carry-over](#/review/mini-exam-2)) | read ζ and ωₙ off two poles; decide which poles dominate | [ζ and ωₙ](#/dive/second), [Which poles matter](#/dive/dominant) |

Lecture Notes 1 writes the time constant as T and the output as C(s); this site writes τ and Y(s) so those letters stay free for the period and the complementary sensitivity. The slides are the authority for your exam's notation.

<div class="formula-sheet">

#### Formula sheet: Mini exam 1

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

#### First order K/(τs+1)

- 63% at <i>τ</i>, 98% at 4<i>τ</i>
- No overshoot, ever
- Initial slope <i>K</i>/<i>τ</i>; impulse (<i>K</i>/<i>τ</i>)<i>e</i><sup>−<i>t</i>/<i>τ</i></sup>

#### Second order

- ω<sub>n</sub>²/(<i>s</i>²+2ζω<sub>n</sub><i>s</i>+ω<sub>n</sub>²)
- %OS = 100<i>e</i><sup>−ζπ/√(1−ζ²)</sup> (ζ only)
- <i>τ</i><sub>s</sub> ≈ 4/(ζω<sub>n</sub>), <i>τ</i><sub>p</sub> = π/ω<sub>d</sub>
- cos θ = ζ; radius = ω<sub>n</sub>
- Zeros add overshoot; extra poles slow it down

#### Steady state

- <i>e</i><sub>ss</sub> = lim <i>sE</i>(<i>s</i>), stable loop only!
- Step, type 0: 1/(1+<i>L</i>(0))
- Integrator in <i>L</i> → step error 0
- P leaves error; I removes it; D doesn't affect it

</div>

### Self-test

The 22 questions of the mini exam are tagged to these topics. Use the **Take the self-test** button above; wrong answers link back to the guide section that explains them.
