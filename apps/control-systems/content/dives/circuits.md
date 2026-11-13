---
id: circuits
order: 11
title: "Getting G(s) for real hardware: circuits and op-amps"
category: state
chain:
  - title: "How do I get G(s) for a circuit or op-amp stage?"
  - title: "How do I get G(s) for real hardware?"
  - title: "impedances, op-amp stages"
    detail: "R → R,  L → sL,  C → 1/(sC);  inverting stage −Zf/Zin"
neighbors:
  - model
---
**How do I get G(s) for real hardware?**

**Picture it first.** An RLC circuit is the cart in disguise: L is the mass, R the damper and 1/C the spring. Change R and the poles move exactly as they did when c changed.

```figure:rlc
```

Treat each element by its impedance (R, sL, 1/(sC)) and use voltage dividers; for an ideal inverting op-amp the stage gain is −Z_f/Z_in. The same second-order equation as the cart appears as a series RLC.

### What's the fastest way to get a circuit's transfer function?

Replace each element with its impedance (<i>R</i>, <i>sL</i>, 1/(<i>sC</i>)) and use voltage dividers, KVL, and KCL as if it were a resistor network. No differential equations needed.

| Circuit | Transfer function | Read off |
|---|---|---|
| Series RL, output across R | <i>V</i><sub>R</sub>/<i>V</i> = <i>R</i>/(<i>sL</i>+<i>R</i>) = 1/((<i>L</i>/<i>R</i>)<i>s</i>+1) | 1st order, τ = <i>L</i>/<i>R</i>, DC gain 1 |
| RC low-pass | 1/(<i>RCs</i>+1) | τ = <i>RC</i> |
| Series RLC, output across C | 1/(<i>LCs</i>² + <i>RCs</i> + 1) | ω<sub>n</sub> = 1/√(<i>LC</i>), ζ = (<i>R</i>/2)√(<i>C</i>/<i>L</i>) |


ζ = 1/(2<i>Q</i>) for the series RLC. A high-Q tank is a lightly damped second-order system that rings, and that's exactly the overshoot of Stage 11.

### How do I read an inverting op-amp stage?

<i>V</i><sub>o</sub>/<i>V</i><sub>i</sub> = −<i>Z</i><sub>f</sub>/<i>Z</i><sub>in</sub>. Whatever impedances you choose for feedback and input set the transfer function, which is how you build integrators, differentiators, filters, and PI/PD controllers.

````callout:recognize Recognize the filter from its poles and zeros


- <b>Pole at the origin</b> → integrator (infinite DC gain, −90° phase).
- <b>Zero at the origin</b> → differentiator / high-pass (zero DC gain).
- <b>One LHP pole, no zeros</b> → low-pass with corner at |<i>p</i>|.
- <b>Zero at 0 plus an LHP pole</b> → high-pass. <b>Pole at 0 plus an LHP zero</b> → PI.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Raise R: the poles are pulled onto the real axis (overdamped). Lower R: they approach the jω axis and the capacitor voltage rings.
````

````callout:note Symbols used here
- **G(s)**: the cart's transfer function from force u to position y: 1/((s + 1)(s + 2))
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **C(s)**: the controller transfer function (PID: Kp + Ki/s + Kd·s)
````
