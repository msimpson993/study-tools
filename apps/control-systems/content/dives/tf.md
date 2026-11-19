---
id: tf
order: 2
title: "Transfer function G(s): the plant as one fraction"
category: describe
neighbors: [model, splane, ss2tf, circuits]
level: Some algebra
check: [q-tf, ck-tf-1, ck-tf-2]
---

**The question:** can the two coupled room equations become one input-to-output relation? This is the box *Transfer function G(s)*, after *Write the plant down*.

### The big idea

With everything starting at rest, the Laplace transform turns each derivative into a factor s. The ODEs become algebra, and the plant becomes one fraction, G(s): output over input for any input. Series blocks multiply, so building loops becomes algebra too. The price: initial conditions are assumed zero (state space keeps them).

### See it

Step through the derivation on the left; the right panel shows what the finished fraction predicts for the 2.5 kW heater.

```figure:tfbuild
```

### The math

```eq
sX₁ = −1.2X₁ + X₂ + 0.0036U,   sX₂ = X₁ − 1.2X₂  ⇒  X₁ = (s + 1.2)X₂
```

```eq
G₂(s) = X₂/U = 0.0036/(s² + 2.4s + 0.44) = 0.0036/((s + 0.2)(s + 2.2))
```

```eq
G₁(s) = X₁/U = 0.0036(s + 1.2)/((s + 0.2)(s + 2.2))
```

**What each symbol means.**

- s: the Laplace variable (1/h here).
- U, X₁, X₂: transforms of the heater power and the two room temperatures.
- DC gain G(0): the steady output per unit of steady input. G₂(0) = 0.0036/0.44 = 8.18 K/kW; G₁(0) = 9.82 K/kW.

The living room's G₁ has a zero at −1.2 that the bedroom's G₂ doesn't: heat reaches the living room directly.

### Worked example: on the house

Take the outdoor temperature as the input instead. Both rooms leak to it equally, so X₂/D = 0.2/(s + 0.2) = 1/(5s + 1): first order, DC gain 1. A 5 K cold front reaches the bedroom with a 5 h time constant (DIST uses this).

### What it can't do

G(s) hides initial conditions and internal states (a room that starts warm), and it only exists for linear time-invariant models.
