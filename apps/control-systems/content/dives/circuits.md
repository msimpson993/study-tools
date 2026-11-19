---
id: circuits
order: 7
title: "G(s) for circuits and op-amps"
category: describe
neighbors: [model, tf, order]
level: Some algebra
check: [q-circ, ck-circ-1]
---

**The question:** how do we get G(s) for a circuit or an op-amp stage? This is the side box *G(s) for circuits and op-amps*, under *Write the plant down*.

### The big idea

In the s-domain every passive part behaves like a resistance that depends on s, its *impedance*: R for a resistor, sL for an inductor, 1/(sC) for a capacitor. With impedances in place of resistances, the ordinary voltage-divider and op-amp rules give G(s) directly, with no differential equation in sight. Heat flow obeys the same rules, so the house is literally an RC circuit.

### See it

Choose the "house as RC" preset. The two rooms are capacitors, the walls are resistors, and the heater is a current source. The circuit's step response is the bedroom's warm-up.

```figure:rlc
```

### The math

- Impedances: Z_R = R, Z_L = sL, Z_C = 1/(sC).
- Divider: V_out/V_in = Z₂/(Z₁ + Z₂). Series RLC with the output across C: 1/(LCs² + RCs + 1).
- Inverting op-amp: V_out/V_in = −Z_f/Z_in. With Z_in = R and Z_f = 1/(sC) it is an integrator, −1/(RCs); swap them and it is a differentiator, −RCs. The op-amp PID is built from these stages.
- **Analogy table:**

| thermal (house) | electrical | mechanical (corner) |
|---|---|---|
| temperature (K) | voltage | velocity |
| heat flow (W) | current | force |
| heat capacity C_th (1 MJ/K per room) | capacitance C | mass m |
| 1/conductance: inner wall 3.6 mK/W, each outer wall 18 mK/W | resistance R | 1/c (shock) |
| heater | current source | applied force |
| — | inductance L | 1/k (spring) |

### Worked example: on the house

The node equations of the RC network, C_th·ẋ₁ = u − (x₁ − x₂)/R_in − x₁/R_out and C_th·ẋ₂ = (x₁ − x₂)/R_in − x₂/R_out, are exactly Box 1's heat balances. Dividing by C_th = 10⁶ J/K and timing in hours gives ẋ₁ = −1.2x₁ + x₂ + 0.0036u, and the same G₂ = 0.0036/((s + 0.2)(s + 2.2)) K/W. A thermal network has no inductor, so it can't ring.

### What it can't do

Impedances assume linear parts starting at rest. Real op-amps saturate at their supply rails and have finite bandwidth. The pure differentiator −RCs amplifies noise without limit, which is why practical D terms are filtered.


### Slides

LN1 slides 38–45.
