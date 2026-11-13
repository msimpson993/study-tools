---
id: ss
order: 9
title: "State space: the cart as two states"
category: state
chain:
  - title: "What if I also need the internal states and initial conditions?"
  - title: "Is there a description that tracks the inside too?"
  - title: "state space ẋ = Ax + Bu, y = Cx + Du"
    detail: "ẋ = Ax + Bu,  y = Cx + Du"
neighbors:
  - model
  - ss2tf
exampleScene: { overlays: [forces, sensor, phase], caption: "The state (x, ẋ) is one point; A turns the forces into where it goes next; the sensor reads only x." }
---
**Is there a description that tracks the inside too?**

**Picture it first.** The same cart written as two first-order equations: a position and a velocity. Push it and release it and watch both states.

```figure:states
```

State space writes the plant as first-order equations in the energy-storage variables, ẋ = Ax + Bu and y = Cx + Du. It keeps initial conditions and internal states that a transfer function hides, and handles several inputs and outputs naturally.

### We already have transfer functions. Why state space?

Transfer functions only see input → output from rest. State space keeps the <em>internal</em> variables, handles initial conditions and multiple inputs/outputs (MIMO), is how computers simulate, and is the language of modern control (state feedback, observers, optimal control).

````callout:why Why it matters


- <b>Initial conditions</b>: <i>x</i>(0) is built in (compare Q3).
- <b>MIMO</b>: two inputs and three outputs is just bigger <i>B</i> and <i>C</i>, not a 3×2 grid of transfer functions.
- <b>Simulation</b>: ODE solvers (and Simulink) integrate first-order vector equations.
- <b>Hidden modes</b>: internal states that a pole–zero cancellation would hide stay visible.
````

### What do ẋ = Ax + Bu and y = Cx + Du actually say?

<b>A</b>: how the states drive each other (the dynamics, which hold the poles). <b>B</b>: where the input pushes. <b>C</b>: what you measure, i.e. which combination of states is the output. <b>D</b>: direct feedthrough from input to output (usually 0).

<div class="eqbox"><i>ẋ</i> = <i>A</i><i>x</i> + <i>B</i><i>u</i> <i>y</i> = <i>C</i><i>x</i> + <i>D</i><i>u</i></div>

*From the guide's static figure: <b>Read it like a block diagram.</b> The integrators hold the states (one per energy store). <i>A</i> is internal feedback, <i>B</i> and <i>C</i> are the input and output “ports,” and <i>D</i> bypasses everything.*

| Matrix | Size | SISO size | Meaning |
|---|---|---|---|
| <i>A</i> | <i>n</i>×<i>n</i> | <i>n</i>×<i>n</i> | State dynamics; eigenvalues = poles |
| <i>B</i> | <i>n</i>×<i>m</i> | <i>n</i>×1 (column) | Input → state derivatives |
| <i>C</i> | <i>p</i>×<i>n</i> | 1×<i>n</i> (row) | States → output |
| <i>D</i> | <i>p</i>×<i>m</i> | 1×1 (scalar) | Input → output directly |


<i>n</i> = number of states (= order), <i>m</i> = number of inputs, <i>p</i> = number of outputs.

````callout:recognize Recognize


- Dimension check catches most errors: <i>A</i> is square, <i>B</i> has as many rows as <i>A</i>, and <i>C</i> has as many columns as <i>A</i>.
- <i>D</i> ≠ 0 means the output jumps the instant the input does, so <i>G</i>(<i>s</i>) is proper but <em>not</em> strictly proper.
- Here <i>C</i> is the <b>output matrix</b>. In Lecture Notes 2, <i>C</i>(<i>s</i>) is the <b>complementary sensitivity</b>, and in many block diagrams <i>C</i> is the <b>output signal</b>. Three different C's!
````

### Which direction does the derivation go?

Physics/ODE → <b>choose states</b> → write each state derivative → read off <b>A</b> and <b>B</b>. Then, separately, write the output you care about in terms of the states → read off <b>C</b> and <b>D</b>. You never derive C and D from the dynamics.

1. <b>Write the physics</b> (KVL, Newton) as an ODE.model
2. <b>Pick states</b>: one per energy store, or phase variables <i>x</i>₁ = <i>y</i>, <i>x</i>₂ = <i>ẏ</i>, …choice
3. <b>Write ẋ<sub>i</sub></b> for each state using only states and <i>u</i>. The coefficients form <b>A</b>, and the <i>u</i>-coefficients form <b>B</b>.dynamics
4. <b>Write y</b> in terms of states and <i>u</i>. The coefficients form <b>C</b> and <b>D</b>.measurement

````callout:trap Trap
Same circuit, different output → <b>same A and B, different C and D</b>. In a series RLC with states (<i>v</i><sub>C</sub>, <i>i</i>), the output “capacitor voltage” gives <i>C</i> = [1 0], while the output “resistor voltage” gives <i>C</i> = [0 <i>R</i>]. The dynamics didn't change, only what you're looking at.
````

### How do I get phase-variable form straight from a transfer function?

For <i>G</i> = <i>b</i>₀/(<i>s</i><sup><i>n</i></sup> + <i>a</i><sub><i>n</i>−1</sub><i>s</i><sup><i>n</i>−1</sup> + … + <i>a</i>₀): write the ODE, set <i>x</i>₁ = <i>y</i>, <i>x</i>₂ = <i>ẏ</i>, …. A then has 1's on the superdiagonal and the <b>negated</b> denominator coefficients (constant term first) in the bottom row.

<div class="eqbox">A = 010001−<i>a</i>₀−<i>a</i>₁−<i>a</i>₂ B = 00<i>b</i>₀ C = 100 D = 0 (n = 3 shown)</div>

#### G(s) = 3/(s² + 2s + 3) → ODE → ABCD

1. <b>Cross-multiply</b>: (<i>s</i>² + 2<i>s</i> + 3)<i>Y</i> = 3<i>U</i>.
2. <b>Back to time</b> (<i>s</i> → d/dt, zero ICs): <i>ÿ</i> + 2<i>ẏ</i> + 3<i>y</i> = 3<i>u</i>.
3. <b>States</b>: <i>x</i>₁ = <i>y</i>, <i>x</i>₂ = <i>ẏ</i>. So <i>ẋ</i>₁ = <i>x</i>₂ (that's the definition), and <i>ẋ</i>₂ = <i>ÿ</i> = −3<i>x</i>₁ − 2<i>x</i>₂ + 3<i>u</i> (solve the ODE for <i>ÿ</i>).
4. <b>Read off</b>: A = 01−3−2 B = 03 C = 10 D = 0.

````callout:note Not unique
B = [0; 1], C = [3 0] also works: the 3 moved from the input side to the output side. Both give the same <i>G</i>(<i>s</i>) (check with Q19). A state-space realization isn't unique, but the transfer function is.
````

````callout:predict Predict
Second element of B = 1 instead of 3, with C = [1 0] kept? Show<i>G</i> = 1/(<i>s</i>² + 2<i>s</i> + 3). Same poles, DC gain drops from 1 to 1/3. B scales the input's push, so it scales the whole response.
````

#### LRC intuition (slide 40)

Series LRC, output across C, states <i>x</i>₁ = <i>e</i><sub>o</sub>, <i>x</i>₂ = <i>ė</i><sub>o</sub>. KVL gives <i>LC</i><i>ë</i><sub>o</sub> + <i>RC</i><i>ė</i><sub>o</sub> + <i>e</i><sub>o</sub> = <i>e</i><sub>i</sub>, so:

<div class="eqbox">A = 01−1/<i>LC</i>−<i>R</i>/<i>L</i> B = 01/<i>LC</i> C = 10 D = 0</div>

Same pattern as the mass–spring–damper (slides 26–27) with <i>m</i> ↔ <i>L</i>, <i>b</i> ↔ <i>R</i>, <i>k</i> ↔ 1/<i>C</i>. Annotated slides (on this computer): slide 40 annotated · slide 28 (TF from ABCD) · LRC walkthrough board.

````callout:recognize Recognize the companion pattern
A 2×2 <i>A</i> with [0 1] on top and [−<i>a</i>₀ −<i>a</i>₁] on the bottom <em>is</em> the denominator <i>s</i>² + <i>a</i>₁<i>s</i> + <i>a</i>₀, readable without any algebra. For the LRC: <i>s</i>² + (<i>R</i>/<i>L</i>)<i>s</i> + 1/(<i>LC</i>).
````

#### G(s) = 3/(s² + 2s + 3) → ODE → ABCD

1. <b>Cross-multiply</b>: (<i>s</i>² + 2<i>s</i> + 3)<i>Y</i> = 3<i>U</i>.
2. <b>Back to time</b> (<i>s</i> → d/dt, zero ICs): <i>ÿ</i> + 2<i>ẏ</i> + 3<i>y</i> = 3<i>u</i>.
3. <b>States</b>: <i>x</i>₁ = <i>y</i>, <i>x</i>₂ = <i>ẏ</i>. So <i>ẋ</i>₁ = <i>x</i>₂ (that's the definition), and <i>ẋ</i>₂ = <i>ÿ</i> = −3<i>x</i>₁ − 2<i>x</i>₂ + 3<i>u</i> (solve the ODE for <i>ÿ</i>).
4. <b>Read off</b>: A = 01−3−2 B = 03 C = 10 D = 0.

````callout:note Not unique
B = [0; 1], C = [3 0] also works: the 3 moved from the input side to the output side. Both give the same <i>G</i>(<i>s</i>) (check with Q19). A state-space realization isn't unique, but the transfer function is.
````

````callout:predict Predict
Second element of B = 1 instead of 3, with C = [1 0] kept? Show<i>G</i> = 1/(<i>s</i>² + 2<i>s</i> + 3). Same poles, DC gain drops from 1 to 1/3. B scales the input's push, so it scales the whole response.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Change c and k and watch the eigenvalues move: the same pole picture as the transfer function, now with the inside of the cart in view.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **A, B, C, D**: the state-space matrices: ẋ = Ax + Bu, y = Cx + Du
- **S, T**: sensitivity S = 1/(1 + CG) and complementary sensitivity T = CG/(1 + CG), with S + T = 1
````
