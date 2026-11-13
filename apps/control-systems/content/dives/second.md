---
id: second
order: 14
title: "What ζ and ωn say about two poles"
category: time
chain:
  - title: "When two poles dominate, what sets the shape?"
  - title: "What do ζ and ωₙ say about two poles?"
  - title: "second-order specs"
    detail: "%OS = 100·e^(−πζ/√(1 − ζ²))   Ts ≈ 4/(ζωₙ)"
neighbors:
  - dominant
  - sse
---
**What do ζ and ωₙ say about two poles?**

**Picture it first.** Drag the pole pair: the angle gives the overshoot, the real part the settling time, the distance from the origin the speed.

```figure:second
```

A second-order system s² + 2ζωₙs + ωₙ² has overshoot %OS = 100·e^(−πζ/√(1 − ζ²)), settling time about 4/(ζωₙ), and peak time π/ω_d. ζ sets how much it rings, ωₙ how fast.

### What is the standard form, and what do ζ and ω<sub>n</sub> mean?

<i>G</i> = ω<sub>n</sub>²/(<i>s</i>² + 2ζω<sub>n</sub><i>s</i> + ω<sub>n</sub>²). <b>ζ (damping ratio)</b> sets the <em>shape</em> (how much it overshoots and rings). <b>ω<sub>n</sub> (natural frequency)</b> sets the <em>speed</em> (time scale). The poles are −ζω<sub>n</sub> ± <i>j</i>ω<sub>n</sub>√(1−ζ²).

| ζ | Name | Poles | Step response |
|---|---|---|---|
| 0 | Undamped | ±<i>j</i>ω<sub>n</sub> (on the axis) | Oscillates forever |
| 0 &lt; ζ &lt; 1 | Underdamped | Complex pair | Overshoots, rings, settles |
| 1 | Critically damped | Double real at −ω<sub>n</sub> | Fastest with no overshoot |
| &gt; 1 | Overdamped | Two distinct real | Sluggish, no overshoot |


````callout:recognize Recognize the geometry


- Distance from the origin = ω<sub>n</sub>. Angle from the negative real axis θ with <b>cos θ = ζ</b>.
- Real part σ = ζω<sub>n</sub> → <b>settling time</b>. Imaginary part ω<sub>d</sub> = ω<sub>n</sub>√(1−ζ²) → <b>peak time / ringing frequency</b>.
- Match coefficients to identify: <i>s</i>² + 2<i>s</i> + 3 → ω<sub>n</sub> = √3 ≈ 1.73, 2ζω<sub>n</sub> = 2 → ζ ≈ 0.577.
````

### Which spec formulas should I know?

%OS = 100·<i>e</i><sup>−ζπ/√(1−ζ²)</sup> (depends on ζ only). <i>T</i><sub>s</sub> ≈ 4/(ζω<sub>n</sub>) (2% band). <i>T</i><sub>p</sub> = π/ω<sub>d</sub>. To get ζ from a measured overshoot: ζ = −ln(OS)/√(π² + ln²(OS)).

| ζ | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 1.0 |
|---|---|---|---|---|---|---|---|---|
| %OS | 52.7 | 37.2 | 25.4 | 16.3 | 9.5 | 4.6 | 1.5 | 0 |


````callout:predict Predict
3/(<i>s</i>²+2<i>s</i>+3): overshoot and settling time? Showζ = 0.577 → %OS ≈ 10.8%. ζω<sub>n</sub> = 1 → <i>T</i><sub>s</sub> ≈ 4 s. DC gain 3/3 = 1 → it settles at 1. Press the preset to check.
````

````callout:trap Trap
These formulas are exact only for the <b>pure</b> two-pole, no-zero form. An added zero (like the PD controller in the boring machine, Q38) adds overshoot, and an extra pole slows things down. Treat them as estimates for dominant-pole systems. Also, ω<sub>n</sub> doesn't change %OS: two systems with the same ζ overshoot equally, one just does it faster.
````

````callout:predict Predict
Before you touch a slider, predict what it will do. Drag the pole straight up: the ringing grows but the decay rate (its real part) does not. Drag it left: faster, same shape. Overshoot depends on the angle only.
````

````callout:note Symbols used here
- **poles**: the roots of the denominator: the exponentials e^(pt) the plant can make. The cart's are −1 and −2
- **zeros**: the roots of the numerator: they set how much of each mode appears
- **s = σ + jω**: a point on the s-plane: σ is the decay or growth rate, ω the oscillation frequency
- **ζ, ωn**: damping ratio and natural frequency of a pole pair
- **DC gain**: the steady output for a unit steady input, G(0) = 0.5 m per N for the cart
- **T (time constant)**: time for a first-order response to cover 63 % of the way: T = 1/|p|
- **%OS, Ts**: overshoot and 2 % settling time of the step response
- **C(s)**: the controller transfer function (PID: Kp + Ki/s + Kd·s)
````
