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

- **Impedance:** in the s-domain each passive part acts like a resistance that depends on s: R for a resistor, sL for an inductor, 1/(sC) for a capacitor.
- **Same rules as resistors:** with impedances in place of resistances, the voltage-divider and op-amp rules give G(s) directly, with no differential equation.
- **Heat too:** heat flow obeys the same rules, so the house is literally an RC circuit.

### See it

Choose the "house as RC" preset. The two rooms are capacitors, the walls are resistors, and the heater is a current source. The circuit's step response is the bedroom's warm-up.

```figure:rlcschem
```

```figure:rlc
```

### The math

- Impedances: Z_R = R, Z_L = sL, Z_C = 1/(sC).
- Divider: V_out/V_in = Z₂/(Z₁ + Z₂). Series RLC with the output across C: 1/(LCs² + RCs + 1).
- Inverting op-amp: V_out/V_in = −Z_f/Z_in. With Z_in = R and Z_f = 1/(sC) it is an integrator, −1/(RCs); swap them and it is a differentiator, −RCs. Op-amp controllers are built from these stages.
- **Analogy table.** Two analogies are in use. The house uses the **force–current** one: temperature is like voltage, heat flow like current. The series RLC in the figure uses the **force–voltage** one: force is like voltage, velocity like current. Both give the same equations; pick one and stay with it.

| electrical | thermal (house; force–current) | mechanical, force–current | mechanical, force–voltage (the figure's RLC) |
|---|---|---|---|
| voltage | temperature (K) | velocity | force |
| current | heat flow (W) | force | velocity |
| capacitance C | heat capacity C_th (1 MJ/K per room) | mass m | 1/k (spring) |
| resistance R | 1/conductance: inner wall 3.6 mK/W, each outer wall 18 mK/W | 1/c (shock) | c (shock) |
| inductance L | none (so heat can't ring) | 1/k (spring) | mass m |
| source | heater = current source | applied force = current source | applied force = voltage source |

In force–voltage form a mass on a spring and damper, z/F = 1/(ms² + cs + k), is the RLC's charge response 1/(Ls² + Rs + 1/C) with L = m, R = c, C = 1/k.

**What each symbol means.**

- **R, L, C**: resistance (Ω), inductance (H), capacitance (F). L and C here are circuit parts only; later boxes reuse both letters for loop quantities.
- **Z**: impedance, the s-domain "resistance" (Ω): Z_R = R, Z_L = sL, Z_C = 1/(sC).
- **V_in, V_out**: input and output voltages (V).
- **Z_in, Z_f**: an op-amp stage's input and feedback impedances (Ω).
- **s**: the Laplace variable (1/s).
- **C_th**: room heat capacity (1 MJ/K), the house's "capacitor".
- **R_in, R_out**: thermal resistances, the wall's 1/conductance: inner 3.6 mK/W, each outer 18 mK/W.
- **u**: heater power (W), the house's "current source".
- **m, c, k, F**: mass (kg), damping (N·s/m), stiffness (N/m) and force (N), for the analogy columns.

### Worked example: on the house

- **Node equations:** C_th·ẋ₁ = u − (x₁ − x₂)/R_in − x₁/R_out and C_th·ẋ₂ = (x₁ − x₂)/R_in − x₂/R_out are exactly the heat balances of *Write the plant down*.
- **Scale:** divide by C_th = 10⁶ J/K and time in hours. That gives ẋ₁ = −1.2x₁ + x₂ + 0.0036u, and the same G₂ = 0.0036/((s + 0.2)(s + 2.2)) K/W.
- **No ringing:** a thermal network has no inductor, so it can't ring.

### What it can't do

Impedances assume linear parts starting at rest. Real op-amps saturate at their supply rails and have finite bandwidth. The pure differentiator −RCs amplifies noise without limit, which is why a practical differentiator always has a filter.

<p class="src">Sources: LN1 s.38–45. The thermal–electrical analogy table: not in lecture notes.</p>
